{-# LANGUAGE DataKinds #-}
{-# LANGUAGE TypeOperators #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE ScopedTypeVariables #-}
module Main where

import Servant
import Network.Wai.Handler.Warp (defaultSettings, setPort, run)
import Network.Wai.Handler.WarpTLS (runTLS, tlsSettings)
import Network.Wai.Middleware.Cors (cors, simpleCorsResourcePolicy, corsRequestHeaders, corsMethods)
import Data.Time
import Data.Aeson (ToJSON, FromJSON)
import GHC.Generics (Generic)
import Control.Monad.IO.Class (liftIO)
import Data.Text (Text, unpack)
import qualified Data.Text as T
import Database.PostgreSQL.Simple
import Database.PostgreSQL.Simple.Types (Only(..))
import Database.PostgreSQL.Simple.FromRow (FromRow(..), field)
import Data.Maybe (fromMaybe)
import Control.Exception (try, SomeException)
import Network.HTTP.Simple (httpLbs, getResponseBody, getResponseStatusCode, parseRequest, setRequestBodyJSON, setRequestMethod, Response)
import Data.Aeson (eitherDecode)
import qualified Data.ByteString.Lazy.Char8 as LBS
import System.Environment (lookupEnv)
import Text.Read (readMaybe)

-- Reads an environment variable, falling back to a default if unset (keeps
-- production behaviour unchanged unless the corresponding env var is set).
getEnvDefault :: String -> String -> IO String
getEnvDefault name def = fromMaybe def <$> lookupEnv name

-- Reads a required environment variable, erroring out if it is unset.
requireEnv :: String -> IO String
requireEnv name = lookupEnv name >>= maybe (error (name ++ " environment variable is required")) return

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

-- Data type for blog posts in PostgreSQL
data BlogPost = BlogPost
    { pId :: Int
    , pTitle :: String
    , pBlurb :: String
    , pContent :: String
    , pDateTime :: UTCTime
    , pAuthorUuid :: Maybe String
    , pAuthorName :: String
    } deriving (Show, Generic)

instance ToJSON BlogPost
instance FromJSON BlogPost

instance FromRow BlogPost where
    fromRow = BlogPost <$> field <*> field <*> field <*> field <*> field <*> field <*> field

-- Data type for incoming new blog post request body
data NewPost = NewPost
    { newPostTitle :: String
    , newPostBlurb :: String
    , newPostContent :: String
    } deriving (Show, Generic)

instance ToJSON NewPost
instance FromJSON NewPost

-- Data type for creating a new user
data NewUser = NewUser
    { newUserUuid :: String
    , newUserName :: String
    } deriving (Show, Generic)

instance ToJSON NewUser
instance FromJSON NewUser

-- Data type for Firebase token info validation
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


-- Update API to have endpoints including post creation, comment deletion, and role retrieval
type MyAPI = Header "User-Agent" Text :> Get '[JSON] Comment
        :<|> "comments" :> Header "Authorization" Text :> ReqBody '[JSON] NewComment :> Post '[JSON] Comment
        :<|> "comments" :> Capture "commentId" Int :> Header "Authorization" Text :> Delete '[JSON] String
        :<|> "posts" :> Get '[JSON] [BlogPost]
        :<|> "posts" :> Header "Authorization" Text :> ReqBody '[JSON] NewPost :> Post '[JSON] BlogPost
        :<|> "posts" :> Capture "postId" Int :> "comments" :> QueryParam "offset" Int :> QueryParam "limit" Int :> Get '[JSON] [Comment]
        :<|> "users" :> ReqBody '[JSON] NewUser :> Post '[JSON] String
        :<|> "users" :> "me" :> "roles" :> Header "Authorization" Text :> Get '[JSON] [String]

-- Helper function to validate Firebase Token and return the Firebase User's UID
validateFirebaseToken :: Maybe Text -> Handler String
validateFirebaseToken mAuth = do
    authHeader <- case mAuth of
        Nothing -> throwError err401 { errBody = "Missing Authorization header" }
        Just auth -> return auth

    if not ("Bearer " `T.isPrefixOf` authHeader)
        then throwError err401 { errBody = "Invalid Authorization header format. Expected 'Bearer <token>'" }
        else do
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
                    case eitherDecode body :: Either String FirebaseResponse of
                        Left err -> do
                            liftIO $ putStrLn "Failed to parse Firebase's token info response:"
                            liftIO $ LBS.putStrLn body
                            throwError err401 { errBody = "Unauthorized: Could not parse token info." }
                        Right firebaseRes -> case users firebaseRes of
                            [] -> throwError err401 { errBody = "Unauthorized: Token is valid but represents no user." }
                            (user:_) -> return (localId user)

-- Helper functions to check roles for a user ID
getUserRoles :: Connection -> String -> IO [String]
getUserRoles conn uid = do
    let q = "SELECT r.name FROM roles r JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_uuid = ?"
    rows <- query conn q (Only uid) :: IO [Only String]
    return (Prelude.map (\(Only r) -> r) rows)

checkHasRole :: Connection -> String -> String -> Handler ()
checkHasRole conn uid roleName = do
    rolesList <- liftIO $ getUserRoles conn uid
    if roleName `elem` rolesList
        then return ()
        else throwError err403 { errBody = "Forbidden: Insufficient permissions" }

checkHasAnyRole :: Connection -> String -> [String] -> Handler ()
checkHasAnyRole conn uid rolesList = do
    userRolesList <- liftIO $ getUserRoles conn uid
    let hasAny = Prelude.any (`elem` userRolesList) rolesList
    if hasAny
        then return ()
        else throwError err403 { errBody = "Forbidden: Insufficient permissions" }


-- We need to pass the `Connection` to the server to query the database
server :: Connection -> Server MyAPI
server conn = handleGet
         :<|> handlePost
         :<|> handleDeleteComment
         :<|> handleGetPosts
         :<|> handlePostPost
         :<|> handleGetPostComments
         :<|> handlePostUser
         :<|> handleGetUserRoles
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
        firebaseUid <- validateFirebaseToken mAuth
        let requestUid = newUserId newComment

        if firebaseUid /= requestUid
            then throwError err401 { errBody = "Unauthorized: Token UID does not match request UID." }
            else do
                liftIO $ putStrLn $ "Successfully validated token for UID: " ++ requestUid
                let q = "WITH inserted AS (INSERT INTO comments (user_id, post_id, comment) VALUES (?, ?, ?) RETURNING id, user_id, post_id, comment, post_time) SELECT i.id, i.user_id, i.post_id, i.comment, i.post_time, COALESCE(u.username, 'Unknown') FROM inserted i LEFT JOIN usernames u ON i.user_id = u.uuid"
                inserted <- liftIO (query conn q (requestUid, newPostId newComment, newCommentText newComment) :: IO [Comment])
                case inserted of
                    [c] -> return c
                    _   -> throwError err500 { errBody = "Failed to insert comment" }

    handleDeleteComment :: Int -> Maybe Text -> Handler String
    handleDeleteComment cId mAuth = do
        uid <- validateFirebaseToken mAuth
        checkHasAnyRole conn uid ["admin", "moderator"]
        let q = "DELETE FROM comments WHERE id = ?"
        rowsDeleted <- liftIO $ execute conn q (Only cId)
        if rowsDeleted > 0
            then return "Comment deleted successfully"
            else throwError err404 { errBody = "Comment not found" }

    handleGetPosts :: Handler [BlogPost]
    handleGetPosts = do
        let q = "SELECT p.id, p.title, p.blurb, p.content, p.date_time, p.author_uuid, COALESCE(u.username, 'Unknown') FROM posts p LEFT JOIN usernames u ON p.author_uuid = u.uuid ORDER BY p.date_time DESC"
        liftIO $ query_ conn q

    handlePostPost :: Maybe Text -> NewPost -> Handler BlogPost
    handlePostPost mAuth newPost = do
        uid <- validateFirebaseToken mAuth
        checkHasAnyRole conn uid ["admin", "writer"]
        let q = "WITH inserted AS (INSERT INTO posts (title, blurb, content, author_uuid) VALUES (?, ?, ?, ?) RETURNING id, title, blurb, content, date_time, author_uuid) SELECT i.id, i.title, i.blurb, i.content, i.date_time, i.author_uuid, COALESCE(u.username, 'Unknown') FROM inserted i LEFT JOIN usernames u ON i.author_uuid = u.uuid"
        inserted <- liftIO (query conn q (newPostTitle newPost, newPostBlurb newPost, newPostContent newPost, uid) :: IO [BlogPost])
        case inserted of
            [p] -> return p
            _   -> throwError err500 { errBody = "Failed to insert post" }

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

    handleGetUserRoles :: Maybe Text -> Handler [String]
    handleGetUserRoles mAuth = do
        uid <- validateFirebaseToken mAuth
        liftIO $ getUserRoles conn uid


main :: IO ()
main = do
    -- DB host/user/name and TLS settings default to the production values so
    -- deploying with no environment variables set behaves exactly as before;
    -- set these env vars (e.g. via docker-compose) to run locally instead.
    -- DB_PASSWORD has no default and must always be set explicitly.
    dbHost     <- getEnvDefault "DB_HOST" "localhost"
    dbUser     <- getEnvDefault "DB_USER" "postgres"
    dbPassword <- requireEnv "DB_PASSWORD"
    dbName     <- getEnvDefault "DB_NAME" "test_db"
    portStr    <- getEnvDefault "PORT" "8081"
    useTlsStr  <- getEnvDefault "USE_TLS" "true"
    certPath   <- getEnvDefault "TLS_CERT_PATH" "/etc/letsencrypt/live/srv915664.hstgr.cloud/cert.pem"
    keyPath    <- getEnvDefault "TLS_KEY_PATH" "/etc/letsencrypt/live/srv915664.hstgr.cloud/privkey.pem"

    let port = fromMaybe 8081 (readMaybe portStr)
        useTls = useTlsStr /= "false"

    conn <- connect defaultConnectInfo {
            connectHost = dbHost,
            connectUser = dbUser,
            connectPassword = dbPassword,
            connectDatabase = dbName
        }

    putStrLn "--- Fetching Comments from Database ---"
    commentsList <- query_ conn "SELECT c.id, c.user_id, c.post_id, c.comment, c.post_time, COALESCE(u.username, 'Unknown') FROM comments c LEFT JOIN usernames u ON c.user_id = u.uuid" :: IO [Comment]
    mapM_ print commentsList
    putStrLn "---------------------------------------"

    -- Configure CORS to explicitly allow the Content-Type and Authorization headers,
    -- and DELETE (used by comment moderation) alongside the simple GET/HEAD/POST methods.
    let corsPolicy = simpleCorsResourcePolicy
            { corsRequestHeaders = ["Content-Type", "Authorization"]
            , corsMethods = "DELETE" : corsMethods simpleCorsResourcePolicy
            }
        corsMiddleware = cors (const $ Just corsPolicy)
        app = corsMiddleware (serve (Proxy :: Proxy MyAPI) (server conn))
        warpOpts = setPort port defaultSettings

    if useTls
        then do
            putStrLn $ "Running on port " ++ show port ++ " with CORS and HTTPS enabled"
            runTLS (tlsSettings certPath keyPath) warpOpts app
        else do
            putStrLn $ "Running on port " ++ show port ++ " with CORS enabled (HTTP, TLS disabled)"
            run port app
