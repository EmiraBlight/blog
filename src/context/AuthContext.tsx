import React, { createContext, useContext, useState } from 'react';

interface User {
  userId: string;
  userName: string;
  email: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  roles: string[];
  isAdmin: boolean;
  isModerator: boolean;
  isWriter: boolean;
  signIn: (idToken: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('auth_user');
    return u ? JSON.parse(u) as User : null;
  });
  const [roles, setRoles] = useState<string[]>(() => {
    const r = localStorage.getItem('auth_roles');
    return r ? JSON.parse(r) as string[] : [];
  });

  const signIn = async (googleIdToken: string) => {
    // 1. Exchange Google ID Token for Firebase ID Token using Firebase REST API
    const firebaseApiKey = 'AIzaSyCw50RiNb7HeK9_-fDpzGqVGDcPFC4U0JI';
    const firebaseExchangeUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' + firebaseApiKey;
    
    let firebaseToken: string;
    let userId: string;
    let userName: string;
    let email: string;
    let picture: string;

    try {
      const response = await fetch(firebaseExchangeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: 'id_token=' + googleIdToken + '&providerId=google.com',
          requestUri: 'http://localhost',
          returnSecureToken: true
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Firebase token exchange failed: ' + errorText);
      }

      const data = (await response.json()) as {
        idToken: string;
        localId: string;
        displayName?: string;
        fullName?: string;
        email?: string;
        photoUrl?: string;
      };
      
      firebaseToken = data.idToken;
      userId = data.localId;
      userName = data.displayName || data.fullName || 'Google User';
      email = data.email || '';
      picture = data.photoUrl || '';
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('Error exchanging Google token for Firebase token:', err);
      throw new Error('Failed to authenticate with Firebase: ' + errorMsg, { cause: err });
    }

    const userData: User = {
      userId,
      userName,
      email,
      picture,
    };

    // 2. Call /users endpoint to register/sync the user's name in the usernames database
    const commentsApiUrl = import.meta.env.VITE_COMMENTS_API_URL || 'https://srv915664.hstgr.cloud:8081';
    try {
      await fetch(commentsApiUrl + '/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUserUuid: userData.userId,
          newUserName: userData.userName,
        }),
      });
    } catch (err) {
      console.warn('User database registration failed:', err);
    }

    // 3. Fetch user roles from the Haskell API
    let userRoles: string[] = [];
    try {
      const rolesRes = await fetch(commentsApiUrl + '/users/me/roles', {
        headers: {
          'Authorization': 'Bearer ' + firebaseToken
        }
      });
      if (rolesRes.ok) {
        userRoles = (await rolesRes.json()) as string[];
      }
    } catch (err) {
      console.warn('Failed to fetch user roles:', err);
    }

    setToken(firebaseToken);
    setUser(userData);
    setRoles(userRoles);
    localStorage.setItem('auth_token', firebaseToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    localStorage.setItem('auth_roles', JSON.stringify(userRoles));
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    setRoles([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_roles');
  };

  const isAdmin = roles.includes('admin');
  const isModerator = roles.includes('moderator') || roles.includes('admin');
  const isWriter = roles.includes('writer') || roles.includes('admin');

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, roles, isAdmin, isModerator, isWriter, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
