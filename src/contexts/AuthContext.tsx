import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  initWebAuth, 
  checkAuthState, 
  logout, 
  fetchProfileData
} from '../services/authService';

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface AuthContextType {
  token: string;
  isAuthenticated: boolean;
  user: User | null;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE_URL = process.env.REACT_APP_API_TARGET || 'https://app2.operosus.com';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  // Function to fetch user profile from API
  const refreshUserProfile = async () => {
    console.log('refreshUserProfile called with token:', token ? token.substring(0, 10) + '...' : 'no token');
    
    // First, try to initialize user from localStorage
    const initUserFromLocalStorage = () => {
      const userName = localStorage.getItem('userName');
      const userEmail = localStorage.getItem('userEmail');
      const userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId') || '0') : 0;
      const userAvatar = localStorage.getItem('userAvatar');
      const userRole = localStorage.getItem('userRole');
      
      if (userName && userEmail) {
        const localUser = {
          id: userId,
          name: userName,
          email: userEmail,
          avatar: userAvatar || undefined,
          role: userRole || undefined
        };
        console.log('Setting user from localStorage:', localUser);
        setUser(localUser);
        return true;
      }
      return false;
    };
    
    // If no token available, try local storage
    if (!token) {
      initUserFromLocalStorage();
      return;
    }
    
    // Then try to fetch from API
    try {
      const profileData = await fetchProfileData(token);
      console.log('Profile data received in refreshUserProfile:', profileData);
      
      if (profileData && profileData.user) {
        const userData = {
          id: profileData.user.id,
          name: profileData.user.name,
          email: profileData.user.email,
          avatar: profileData.user.avatar,
          role: profileData.user.role
        };
        console.log('Setting user state in AuthContext from API:', userData);
        setUser(userData);
      } else {
        console.warn('No valid user data in profile response, falling back to localStorage');
        initUserFromLocalStorage();
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
      console.log('Falling back to localStorage for user data');
      initUserFromLocalStorage();
    }
  };

  // Main initialization effect
  useEffect(() => {
    const initAuth = async () => {
      console.log('AuthContext initialization started');
      
      // Check if coming back from auth redirect
      if (window.location.search.includes('token=')) {
        const { token: newToken, isAuthenticated: isAuth } = await initWebAuth();
        setToken(newToken);
        setIsAuthenticated(isAuth);
        
        // Fetch profile data if authenticated
        if (isAuth && newToken) {
          await fetchProfileData(newToken);
          // Get user info from localStorage (set by fetchProfileData)
          const userName = localStorage.getItem('userName') || '';
          const userEmail = localStorage.getItem('userEmail') || '';
          const userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId') || '0') : 0;
          const userAvatar = localStorage.getItem('userAvatar') || '';
          const userRole = localStorage.getItem('userRole') || '';
          
          setUser({
            id: userId,
            name: userName,
            email: userEmail,
            avatar: userAvatar,
            role: userRole
          });
        }
      } else {
        // Check existing auth state
        const { token: existingToken, isAuthenticated: isAuth } = checkAuthState();
        setToken(existingToken);
        setIsAuthenticated(isAuth);
        
        // If we have a token, check its validity and refresh if needed
        if (existingToken && isAuth) {
          // Only check validity if the page was just loaded (not on component remount)
          const pageJustLoaded = performance.navigation ? 
            (performance.navigation.type === 0 || performance.navigation.type === 1) : 
            true;
            
          if (pageJustLoaded) {
            console.log('Page was just loaded/reloaded, checking token validity...');
            await refreshUserProfile();
          }
          
          // Get user info regardless
          const userName = localStorage.getItem('userName') || '';
          const userEmail = localStorage.getItem('userEmail') || '';
          const userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId') || '0') : 0;
          const userAvatar = localStorage.getItem('userAvatar') || '';
          const userRole = localStorage.getItem('userRole') || '';
          
          setUser({
            id: userId,
            name: userName,
            email: userEmail,
            avatar: userAvatar,
            role: userRole
          });
          
          // Also refresh profile data from API
          if (existingToken) {
            fetchProfileData(existingToken);
          }
        }
      }
    };
    
    initAuth();
    
    // Add event listener for page visibility changes
    const handleVisibilityChange = async () => {
      // When page becomes visible again (user returns to tab)
      if (document.visibilityState === 'visible' && isAuthenticated && token) {
        console.log('Page became visible, refreshing user profile...');
        await refreshUserProfile();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Add an effect to monitor user state changes
  useEffect(() => {
    console.log('User state changed:', user);
  }, [user]);

  const handleLogout = () => {
    logout();
    setToken('');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    token,
    isAuthenticated,
    user,
    logout: handleLogout,
    refreshUserProfile
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