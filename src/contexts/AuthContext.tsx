import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { 
  initWebAuth, 
  checkAuthState, 
  logout, 
  fetchProfileData, 
  refreshGoogleToken, 
  isTokenNearingExpiration 
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
  checkTokenValidity: () => Promise<boolean>;
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
  const [isRefreshingToken, setIsRefreshingToken] = useState<boolean>(false);

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

  // Function to check token validity and proactively refresh if needed
  const checkTokenValidity = async (): Promise<boolean> => {
    // Skip if we're already refreshing
    if (isRefreshingToken) return false;
    
    try {
      setIsRefreshingToken(true);
      console.log('Checking token validity...');
      
      // If no token, nothing to refresh
      if (!token) {
        console.log('No token available to refresh');
        setIsRefreshingToken(false);
        return false;
      }
      
      // Check if token is nearing expiration (proactive approach)
      if (isTokenNearingExpiration()) {
        console.log('Token is nearing expiration, refreshing proactively');
        const { success, message } = await refreshGoogleToken();
        
        if (success) {
          console.log('Token refreshed successfully (proactive refresh)');
          // Update with new token
          const { token: newToken, isAuthenticated: isAuth } = checkAuthState();
          setToken(newToken);
          setIsAuthenticated(isAuth);
          setIsRefreshingToken(false);
          return true;
        } else {
          console.error('Failed to refresh token proactively:', message);
          // Continue with validity check even if proactive refresh failed
        }
      }
      
      // Try to make a simple API call to verify token validity
      const response = await fetch(`${API_BASE_URL}/api/ping`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // If success, token is still valid
      if (response.ok) {
        console.log('Token is still valid');
        setIsRefreshingToken(false);
        return true;
      }
      
      // If 401, token is invalid - try to refresh
      if (response.status === 401) {
        console.log('Token has expired, attempting to refresh...');
        const { success, message } = await refreshGoogleToken();
        
        if (success) {
          console.log('Token refreshed successfully');
          // Update with new token
          const { token: newToken, isAuthenticated: isAuth } = checkAuthState();
          setToken(newToken);
          setIsAuthenticated(isAuth);
          setIsRefreshingToken(false);
          return true;
        } else {
          console.error('Failed to refresh token:', message);
          setIsRefreshingToken(false);
          return false;
        }
      }
      
      setIsRefreshingToken(false);
      return false;
    } catch (error) {
      console.error('Error checking token validity:', error);
      setIsRefreshingToken(false);
      return false;
    }
  };

  // Set up an interval for proactive token refreshing
  useEffect(() => {
    // Only set up the refresh interval if we have a valid token
    if (!token || !isAuthenticated) return;
    
    console.log('Setting up proactive token refresh check interval');
    // Check every 5 minutes if token needs refreshing
    const refreshInterval = setInterval(() => {
      // If token is nearing expiration, refresh it silently
      if (isTokenNearingExpiration()) {
        console.log('Proactive token refresh triggered by interval check');
        refreshGoogleToken()
          .then(({ success }) => {
            if (success) {
              console.log('Token refreshed successfully by interval check');
              // Update token state with the new token
              const { token: newToken } = checkAuthState();
              setToken(newToken);
            } else {
              console.warn('Proactive token refresh failed during interval check');
            }
          })
          .catch(error => {
            console.error('Error during proactive token refresh:', error);
          });
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    // Clean up the interval when component unmounts or token changes
    return () => {
      clearInterval(refreshInterval);
    };
  }, [token, isAuthenticated]);

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
            await checkTokenValidity();
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
        console.log('Page became visible, checking token validity...');
        
        // First check if token is nearing expiration
        if (isTokenNearingExpiration()) {
          console.log('Token is nearing expiration on tab focus, refreshing proactively');
          await refreshGoogleToken();
          // Update token state
          const { token: newToken } = checkAuthState();
          setToken(newToken);
        } else {
          await checkTokenValidity();
        }
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
    refreshUserProfile,
    checkTokenValidity
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