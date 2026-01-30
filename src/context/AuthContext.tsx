import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, setAuthToken, ApiRequestError } from '../services/api';
import { User, LoginRequest, SignupRequest } from '../types';

const TOKEN_STORAGE_KEY = 'joker_auth_token';
const USER_STORAGE_KEY = 'joker_auth_user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to extract user and token from various response formats
const parseAuthResponse = (response: any): { user: User; token: string } => {
  // Try nested format: { user: { uid, email }, tokens: { idToken } }
  if (response.user && response.tokens?.idToken) {
    return {
      user: response.user,
      token: response.tokens.idToken,
    };
  }

  // Try flat format: { uid, email, idToken }
  if (response.idToken && (response.uid || response.email)) {
    return {
      user: {
        uid: response.uid || response.localId || '',
        email: response.email || '',
      },
      token: response.idToken,
    };
  }

  // Try Firebase-style format: { localId, email, idToken }
  if (response.idToken && response.localId) {
    return {
      user: {
        uid: response.localId,
        email: response.email || '',
      },
      token: response.idToken,
    };
  }

  // Log for debugging
  console.error('Unexpected auth response format:', response);
  throw new Error('Invalid authentication response format');
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state from storage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);

        if (storedToken && storedUser) {
          setAuthToken(storedToken);

          // Verify token is still valid by calling getMe
          try {
            const currentUser = await authApi.getMe();
            setUser(currentUser);
            // Update stored user in case it changed
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(currentUser));
          } catch (err) {
            // Token is invalid, clear storage
            console.log('Token validation failed, clearing auth state');
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(USER_STORAGE_KEY);
            setAuthToken(null);
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const saveAuthData = useCallback((token: string, userData: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setAuthToken(token);
    setUser(userData);
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      console.log('Login response:', response);
      const { user: userData, token } = parseAuthResponse(response);
      saveAuthData(token, userData);
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthData]);

  const signup = useCallback(async (data: SignupRequest) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.signup(data);
      console.log('Signup response:', response);
      const { user: userData, token } = parseAuthResponse(response);
      saveAuthData(token, userData);
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [saveAuthData]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
