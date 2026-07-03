{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
module Main where
import Servant
import Network.Wai.Handler.Warp (defaultSettings, setPort, run)
import Network.Wai.Handler.WarpTLS (runTLS, tlsSettings)
import Network.Wai.Middleware.Cors (cors, simpleCorsResourcePolicy, corsRequestHeaders)
import Data.Time
import Data.Aeson (ToJSON, FromJSON)
import GHC.Generics (Generic)
import Control.Monad.IO.Class (liftIO)
import Data.Text
import qualified Data.Text as T
import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.Types (Only(..))
import Database.PostgreSQL.Simple.FromRow (FromRow(..), field)
import Data.Maybe (fromMaybe)
import Control.Exception (try, SomeException)
import Network.HTTP.Simple (httpLbs, getResponseBody, getResponseStatusCode, parseRequest, setRequestBodyJSON, setRequestMethod, Response)
import Data.Aeson (eitherDecode)
import qualified Data.ByteString.Lazy.Char8 as LBS

data Comment = Comment
    { commentId :: Int
    , userId :: String
    , postId :: Int
    , commentText :: String
    , postTime :: UTCTime
    , userName :: String
    } deriving (Show, Generic)

instance ToJSON Comment
instance FromJSON Comment

instance FromRow Comment where
    fromRow = Comment <$> field <*> field <*> field <*> field <*> field <*> field

-- Data type for the incoming request body
data NewComment = NewComment
    { newUserId :: String
    , newPostId :: Int
    , newCommentText :: String
    } deriving (Show, Generic)

instance ToJSON NewComment
instance FromJSON NewComment

-- Data type for creating a new user
data NewUser = NewUser
    { newUserUuid :: String
    , newUserName :: String
    } deriving (Show, Generic)

instance ToJSON NewUser
instance FromJSON NewUser

-- Data type for Google Token Info (now Firebase)
data FirebaseUser = FirebaseUser
    { localId :: String
    } deriving (Show, Generic)

data FirebaseResponse = FirebaseResponse
    { users :: [FirebaseUser]
    } deriving (Show, Generic)

instance FromJSON FirebaseUser
instance FromJSON FirebaseResponse
instance ToJSON FirebaseUser
instance ToJSON FirebaseResponse

-- Data type for the Firebase request body
data FirebaseRequest = FirebaseRequest
    { idToken :: String
    } deriving (Show, Generic)

instance ToJSON FirebaseRequest
instance FromJSON FirebaseRequest


-- Update API to have endpoints including user creation
type MyAPI = Header "User-Agent" Text :> Get '[JSON] Comment
        :<|> "comments" :> Header "Authorization" Text :> ReqBody '[JSON] NewComment :> Post '[JSON] Comment
        :<|> "posts" :> Capture "postId" Int :> "comments" :> QueryParam "offset" Int :> QueryParam "limit" Int :> Get '[JSON] [Comment]
        :<|> "users" :> ReqBody '[JSON] NewUser :> Post '[JSON] String

-- We need to pass the `Connection` to the server to query the database
server :: Connection -> Server MyAPI
server conn = handleGet :<|> handlePost :<|> handleGetPostComments :<|> handlePostUser
  where
    handleGet :: Maybe Text -> Handler Comment
    handleGet userAgent = do
        x <- liftIO getCurrentTime
        let responseText = case userAgent of
                Just agent -> "Your User-Agent is: " ++ unpack agent
                Nothing    -> "No User-Agent header was provided."
        return (Comment (-1) "0" 0 responseText x "System")

    handlePost :: Maybe Text -> NewComment -> Handler Comment
    handlePost mAuth newComment = do
        -- 1. Ensure the Authorization header is present
        authHeader <- case mAuth of
            Nothing -> throwError err401 { errBody = "Missing Authorization header" }
            Just auth -> return auth

        -- 2. Validate the format is "Bearer <token>"
        if not ("Bearer " `T.isPrefixOf` authHeader)
            then throwError err401 { errBody = "Invalid Authorization header format. Expected 'Bearer <token>'" }
            else do
                -- 3. Verify the token with Firebase's own REST API
                let token = T.unpack $ T.drop 7 authHeader
                let apiKey = "AIzaSyCw50RiNb7HeK9_-fDpzGqVGDcPFC4U0JI" -- Your Firebase Web API Key
                let url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" ++ apiKey

                initialReq <- liftIO $ parseRequest url
                let req = setRequestMethod "POST"
                        $ setRequestBodyJSON (FirebaseRequest { idToken = token })
                        $ initialReq

                res <- liftIO $ httpLbs req
                let status = getResponseStatusCode res
                let body = getResponseBody res

                if status /= 200
                    then do
                        liftIO $ putStrLn "Firebase token validation failed with non-200 status."
                        liftIO $ LBS.putStrLn body
                        throwError err401 { errBody = "Unauthorized: Invalid token (rejected by Firebase)." }
                    else do
                        -- Try to parse the successful response
                        case eitherDecode body :: Either String FirebaseResponse of
                            Left err -> do
                                liftIO $ putStrLn "Failed to parse Firebase's token info response:"
                                liftIO $ LBS.putStrLn body
                                throwError err401 { errBody = "Unauthorized: Could not parse token info." }
                            Right firebaseRes -> case users firebaseRes of
                                [] -> throwError err401 { errBody = "Unauthorized: Token is valid but represents no user." }
                                (user:_) -> do
                                    let firebaseUid = localId user
                                    let requestUid = newUserId newComment

                                    if firebaseUid /= requestUid
                                        then throwError err401 { errBody = "Unauthorized: Token UID does not match request UID." }
                                        else do
                                            -- 4. Proceed with insertion
                                            liftIO $ putStrLn $ "Successfully validated token for UID: " ++ requestUid
                                            let q = "WITH inserted AS (INSERT INTO comments (user_id, post_id, comment) VALUES (?, ?, ?) RETURNING id, user_id, post_id, comment, post_time) SELECT i.id, i.user_id, i.post_id, i.comment, i.post_time, COALESCE(u.username, 'Unknown') FROM inserted i LEFT JOIN usernames u ON i.user_id = u.uuid"
                                            inserted <- liftIO (query conn q (requestUid, newPostId newComment, newCommentText newComment) :: IO [Comment])
                                            case inserted of
                                                [c] -> return c
                                                _   -> throwError err500 { errBody = "Failed to insert comment" }

    handleGetPostComments :: Int -> Maybe Int -> Maybe Int -> Handler [Comment]
    handleGetPostComments pId mOffset mLimit = do
        let off = fromMaybe 0 mOffset
            lim = fromMaybe 10 mLimit  -- default limit to 10 comments if not specified
            q = "SELECT c.id, c.user_id, c.post_id, c.comment, c.post_time, COALESCE(u.username, 'Unknown') FROM comments c LEFT JOIN usernames u ON c.user_id = u.uuid WHERE c.post_id = ? ORDER BY c.id ASC OFFSET ? LIMIT ?"

        liftIO $ putStrLn $ "Fetching comments for post " ++ show pId ++ " with offset " ++ show off ++ " and limit " ++ show lim
        liftIO (query conn q (pId, off, lim) :: IO [Comment])

    handlePostUser :: NewUser -> Handler String
    handlePostUser newUser = do
        liftIO $ putStrLn $ "Received POST request to /users with data: " ++ show newUser
        let q = "INSERT INTO usernames (uuid, username) VALUES (?, ?) ON CONFLICT (uuid) DO NOTHING"

        -- We execute the query to insert the new user, ignoring if they already exist
        _ <- liftIO (execute conn q (newUserUuid newUser, newUserName newUser))
        return "User created successfully"



main :: IO ()
main = do
    -- TODO: Replace "your_password" with your actual PostgreSQL database password
    conn <- connect defaultConnectInfo {
            connectHost = "localhost",
            connectUser = "postgres",
            connectPassword = "Rabaraba123___",
            connectDatabase = "test_db"
        }

    putStrLn "--- Fetching Comments from Database ---"
    commentsList <- query_ conn "SELECT c.id, c.user_id, c.post_id, c.comment, c.post_time, COALESCE(u.username, 'Unknown') FROM comments c LEFT JOIN usernames u ON c.user_id = u.uuid" :: IO [Comment]
    mapM_ print commentsList
    putStrLn "---------------------------------------"

    putStrLn "Running on port 8081 with CORS and HTTPS enabled"

    -- Configure CORS to explicitly allow the Content-Type and Authorization headers
    let corsPolicy = simpleCorsResourcePolicy
            { corsRequestHeaders = ["Content-Type", "Authorization"] }
        corsMiddleware = cors (const $ Just corsPolicy)

    -- --- HTTPS / TLS Configuration ---
    -- TODO: Replace these placeholder paths with the actual paths to your SSL certificates
    let certPath = "/etc/letsencrypt/live/srv915664.hstgr.cloud/cert.pem"
        keyPath  = "/etc/letsencrypt/live/srv915664.hstgr.cloud/privkey.pem"

        tlsOpts  = tlsSettings certPath keyPath
        warpOpts = setPort 8081 defaultSettings

    -- Run the server using runTLS for HTTPS
    runTLS tlsOpts warpOpts (corsMiddleware (serve (Proxy :: Proxy MyAPI) (server conn)))

    -- Note: If you ever need to run HTTP locally without certs, comment out the `runTLS` line above
    -- and uncomment the line below:
    -- run 8080 (corsMiddleware (serve (Proxy :: Proxy MyAPI) (server conn)))
