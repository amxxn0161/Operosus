import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { initWebAuth, checkAuthState, logout } from '../services/authService';

interface AuthContextType {
  token: string;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // Check if coming back from auth redirect
    if (window.location.search.includes('token=')) {
      const { token, isAuthenticated } = initWebAuth();
      setToken(token);
      setIsAuthenticated(isAuthenticated);
    } else {
      // Check existing auth state
      const { token, isAuthenticated } = checkAuthState();
      setToken(token);
      setIsAuthenticated(isAuthenticated);
    }
  }, []);

  const handleLogout = () => {
    logout();
    setToken('');
    setIsAuthenticated(false);
  };

  const value = {
    token,
    isAuthenticated,
    logout: handleLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 