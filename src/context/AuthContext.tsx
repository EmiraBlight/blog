import React, { createContext, useContext, useState, useEffect } from 'react';

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
  signIn: (idToken: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const signIn = async (googleIdToken: string) => {
    // 1. Exchange Google ID Token for Firebase ID Token using Firebase REST API
    const firebaseApiKey = 'AIzaSyCw50RiNb7HeK9_-fDpzGqVGDcPFC4U0JI';
    const firebaseExchangeUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=' + firebaseApiKey;
    
    let firebaseToken = '';
    let userId = '';
    let userName = 'Google User';
    let email = '';
    let picture = '';

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

      const data = await response.json();
      firebaseToken = data.idToken;
      userId = data.localId;
      userName = data.displayName || data.fullName || 'Google User';
      email = data.email || '';
      picture = data.photoUrl || '';
    } catch (err: any) {
      console.error('Error exchanging Google token for Firebase token:', err);
      throw new Error('Failed to authenticate with Firebase: ' + err.message);
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

    setToken(firebaseToken);
    setUser(userData);
    localStorage.setItem('auth_token', firebaseToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, signIn, signOut }}>
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
