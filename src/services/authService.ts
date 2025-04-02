/**
 * Authentication service for handling Google authentication
 * Converted from Flutter code to React
 */

// Helper functions for cookie-based token storage (fallback for mobile)
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
  console.log(`Set cookie: ${name} (value length: ${value.length})`);
};

const getCookie = (name: string): string => {
  const nameEQ = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const value = c.substring(nameEQ.length, c.length);
      console.log(`Retrieved cookie: ${name} (value length: ${value.length})`);
      return value;
    }
  }
  return '';
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
  console.log(`Deleted cookie: ${name}`);
};

// Safely store token - tries localStorage first, falls back to cookies
const safelyStoreToken = (token: string) => {
  try {
    // Try localStorage first
    localStorage.setItem('authToken', token);
    localStorage.setItem('isAuthenticated', 'true');
    console.log('Successfully stored auth token in localStorage');
  } catch (e) {
    // Fall back to cookies if localStorage fails
    console.warn('localStorage failed, falling back to cookies:', e);
    setCookie('authToken', token, 7); // Store for 7 days
    setCookie('isAuthenticated', 'true', 7);
  }
};

// Safely retrieve token - tries localStorage first, falls back to cookies
const safelyRetrieveToken = (): { token: string; isAuthenticated: boolean } => {
  try {
    // Try localStorage first
    const token = localStorage.getItem('authToken') || '';
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    
    // If token exists in localStorage, return it
    if (token) {
      return { token, isAuthenticated };
    }
  } catch (e) {
    console.warn('Error accessing localStorage:', e);
  }
  
  // Fall back to cookies
  const cookieToken = getCookie('authToken');
  const cookieIsAuthenticated = getCookie('isAuthenticated') === 'true';
  
  return { 
    token: cookieToken, 
    isAuthenticated: cookieIsAuthenticated 
  };
};

// Function to initiate Google authentication
export const startWebAuth = (): void => {
  // Add a safety timeout to navigate back to login page if auth takes too long
  const timeoutId = setTimeout(() => {
    console.warn('Authentication timed out, returning to login page');
    window.location.href = '/login?error=timeout';
  }, 30000); // 30 second timeout
  
  // Store the timeout ID so we can clear it on successful auth
  try {
    localStorage.setItem('authTimeoutId', timeoutId.toString());
  } catch (e) {
    setCookie('authTimeoutId', timeoutId.toString(), 1);
  }
  
  const currentUrl = window.location.href;
  // Log device info for debugging
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log(`Starting auth from ${isMobile ? 'mobile' : 'desktop'} device. UA: ${navigator.userAgent.substring(0, 100)}...`);
  console.log(`Current URL (pre-auth): ${currentUrl}`);
  
  // Open Google auth in the same window/tab - use full URL
  window.open(
    `https://app2.operosus.com/auth/google?returnUrl=${encodeURIComponent(currentUrl)}`,
    '_self'
  );
};

// Function to handle authentication state after redirect
export const initWebAuth = (): { token: string; isAuthenticated: boolean } => {
  console.log('Checking authentication state');
  
  // Clear any auth timeout that might be running
  try {
    const timeoutId = localStorage.getItem('authTimeoutId');
    if (timeoutId) {
      clearTimeout(parseInt(timeoutId));
      localStorage.removeItem('authTimeoutId');
    }
  } catch (e) {
    const cookieTimeoutId = getCookie('authTimeoutId');
    if (cookieTimeoutId) {
      clearTimeout(parseInt(cookieTimeoutId));
      deleteCookie('authTimeoutId');
    }
  }
  
  const currentUrl = window.location.href;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log(`Processing auth return on ${isMobile ? 'mobile' : 'desktop'} device`);
  console.log('Current URL (after auth return):', currentUrl);
  
  // Debug local storage state
  try {
    console.log('LocalStorage available:', typeof localStorage !== 'undefined');
    console.log('LocalStorage items count:', Object.keys(localStorage).length);
  } catch (e) {
    console.error('Cannot access localStorage:', e);
  }
  
  // Check for timeout error
  if (currentUrl.includes('error=timeout')) {
    console.error('Authentication timed out');
    return { token: '', isAuthenticated: false };
  }
  
  let token = '';
  let isAuthenticated = false;
  
  try {
    if (currentUrl.includes('?')) {
      const queryString = currentUrl.split('?')[1];
      const queryParams = queryString.split('&');
      
      for (const param of queryParams) {
        const keyValue = param.split('=');
        if (keyValue.length === 2 && keyValue[0] === 'token') {
          token = decodeURIComponent(keyValue[1]);
          break;
        }
      }
    }
    
    console.log('Extracted token:', token ? `${token.substring(0, 10)}... (length: ${token.length})` : 'No token found');
    
    if (token.length > 0) {
      console.log('Token is valid, updating authentication state');
      isAuthenticated = true;
      
      // Store token using our safe method
      safelyStoreToken(token);
      
      // Clean up URL by removing the token
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.toString());
      
      // Redirect to dashboard after successful authentication
      // Use setTimeout to allow state to update before redirect
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 100);
    } else {
      console.log('Token was not found in the URL');
    }
  } catch (e) {
    console.error('Error parsing URL:', e);
  }
  
  return { token, isAuthenticated };
};

// Function to check if user is already authenticated
export const checkAuthState = (): { token: string; isAuthenticated: boolean } => {
  // Use our safe method to retrieve token
  const { token, isAuthenticated } = safelyRetrieveToken();
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log(`Checking auth state on ${isMobile ? 'mobile' : 'desktop'} device`);
  console.log(`Token available: ${token ? 'Yes' : 'No'}, Authenticated: ${isAuthenticated}`);
  
  return { token, isAuthenticated };
};

// Function to logout
export const logout = (): void => {
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
  } catch (e) {
    console.warn('Error removing items from localStorage:', e);
  }
  
  // Also clear cookies
  deleteCookie('authToken');
  deleteCookie('isAuthenticated');
  
  window.location.href = '/';
};

// Function to fetch user profile from the profile API endpoint
export const fetchProfileData = async (token: string): Promise<any> => {
  try {
    console.log('Fetching profile data from API with token (first 10 chars):', token.substring(0, 10));
    // Use full URL path
    const response = await fetch('https://app2.operosus.com/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
      // No mode or credentials settings to avoid CORS issues
    });

    if (!response.ok) {
      console.error(`Profile API error: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch profile data: ${response.status}`);
    }

    const data = await response.json();
    console.log('Profile API response data:', JSON.stringify(data, null, 2));

    // Save user data to localStorage
    if (data && data.user) {
      console.log('Saving user data to localStorage:', {
        name: data.user.name,
        email: data.user.email,
        id: data.user.id,
        avatar: data.user.avatar ? 'exists' : 'not provided',
        role: data.user.role
      });
      
      try {
        localStorage.setItem('userName', data.user.name || '');
        localStorage.setItem('userEmail', data.user.email || '');
        if (data.user.id) {
          localStorage.setItem('userId', data.user.id.toString());
        }
        if (data.user.avatar) {
          localStorage.setItem('userAvatar', data.user.avatar);
        }
        if (data.user.role) {
          localStorage.setItem('userRole', data.user.role);
        }
      } catch (e) {
        console.warn('Failed to save user data to localStorage, using cookies as fallback', e);
        setCookie('userName', data.user.name || '', 7);
        setCookie('userEmail', data.user.email || '', 7);
        if (data.user.id) {
          setCookie('userId', data.user.id.toString(), 7);
        }
      }
    } else {
      console.warn('No user data found in the API response:', data);
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return null;
  }
}; 