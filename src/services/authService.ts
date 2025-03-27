/**
 * Authentication service for handling Google authentication
 * Converted from Flutter code to React
 */

// Function to initiate Google authentication
export const startWebAuth = (): void => {
  // Add a safety timeout to navigate back to login page if auth takes too long
  const timeoutId = setTimeout(() => {
    console.warn('Authentication timed out, returning to login page');
    window.location.href = '/login?error=timeout';
  }, 30000); // 30 second timeout
  
  // Store the timeout ID so we can clear it on successful auth
  localStorage.setItem('authTimeoutId', timeoutId.toString());
  
  const currentUrl = window.location.href;
  // Open Google auth in the same window/tab
  window.open(
    `https://app2.operosus.com/auth/google?returnUrl=${encodeURIComponent(currentUrl)}`,
    '_self'
  );
};

// Function to handle authentication state after redirect
export const initWebAuth = (): { token: string; isAuthenticated: boolean } => {
  console.log('Checking authentication state');
  
  // Clear any auth timeout that might be running
  const timeoutId = localStorage.getItem('authTimeoutId');
  if (timeoutId) {
    clearTimeout(parseInt(timeoutId));
    localStorage.removeItem('authTimeoutId');
  }
  
  const currentUrl = window.location.href;
  console.log('Current URL (after auth return):', currentUrl);
  
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
    
    console.log('Extracted token:', token);
    
    if (token.length > 0) {
      console.log('Token is valid, updating authentication state');
      isAuthenticated = true;
      // Store in localStorage for persistence
      localStorage.setItem('authToken', token);
      localStorage.setItem('isAuthenticated', 'true');
      
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
  const token = localStorage.getItem('authToken') || '';
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  return { token, isAuthenticated };
};

// Function to logout
export const logout = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('isAuthenticated');
  window.location.href = '/';
};

// Function to fetch user profile from the profile API endpoint
export const fetchProfileData = async (token: string): Promise<any> => {
  try {
    console.log('Fetching profile data from API with token (first 10 chars):', token.substring(0, 10));
    const response = await fetch('https://app2.operosus.com/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
    } else {
      console.warn('No user data found in the API response:', data);
    }

    return data;
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return null;
  }
}; 