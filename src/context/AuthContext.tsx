import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, setAuthToken, ApiRequestError } from '../services/api';
import { User, LoginRequest, SignupRequest, RegenerateTokenResponse } from '../types';

const TOKEN_STORAGE_KEY = 'joker_auth_token';
const USER_STORAGE_KEY = 'joker_auth_user';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  regenerateToken: (name?: string) => Promise<RegenerateTokenResponse>;
  updateUserName: (name: string) => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to extract user and token from various response formats
const parseAuthResponse = (response: any): { user: User; token: string; apiToken?: string } => {
  // Try nested format: { user: { uid, email }, tokens: { idToken } }
  if (response.user && response.tokens?.idToken) {
    return {
      user: response.user,
      token: response.tokens.idToken,
    };
  }

  // Try flat format: { uid, email, idToken, name?, apiToken? }
  if (response.idToken && (response.uid || response.email || response.localId)) {
    return {
      user: {
        uid: response.uid || response.localId || '',
        email: response.email || '',
        name: response.name,
      },
      token: response.idToken,
      apiToken: response.apiToken,
    };
  }

  // Try Firebase-style format: { localId, email, idToken }
  if (response.idToken && response.localId) {
    return {
      user: {
        uid: response.localId,
        email: response.email || '',
        name: response.name,
      },
      token: response.idToken,
      apiToken: response.apiToken,
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
      const { token } = parseAuthResponse(response);

      // Set token first so getMe() can authenticate
      setAuthToken(token);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      // Fetch complete user profile including apiTokenCreatedAt
      const fullUserProfile = await authApi.getMe();
      setUser(fullUserProfile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUserProfile));
    } catch (err) {
      console.error('Login error:', err);
      // Clear token if getMe fails
      setAuthToken(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  }, []);

  const signup = useCallback(async (data: SignupRequest): Promise<void> => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authApi.signup(data);
      console.log('Signup response:', response);
      const { token } = parseAuthResponse(response);

      // Set token first so getMe() can authenticate
      setAuthToken(token);
      localStorage.setItem(TOKEN_STORAGE_KEY, token);

      // Fetch complete user profile including avatarColor
      const fullUserProfile = await authApi.getMe();
      setUser(fullUserProfile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(fullUserProfile));
    } catch (err) {
      console.error('Signup error:', err);
      // Clear token if getMe fails
      setAuthToken(null);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
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
  }, []);

  const updateUserName = useCallback((name: string) => {
    if (user) {
      const updatedUser = { ...user, name };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  }, [user]);

  const regenerateToken = useCallback(async (name?: string): Promise<RegenerateTokenResponse> => {
    setError(null);
    try {
      const response = await authApi.regenerateToken(name ? { name } : undefined);
      // Update user with new token creation time
      if (user) {
        const updatedUser = { ...user, apiTokenCreatedAt: response.createdAt };
        setUser(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      }
      return response;
    } catch (err) {
      console.error('Regenerate token error:', err);
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      throw err;
    }
  }, [user]);

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
        regenerateToken,
        updateUserName,
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
