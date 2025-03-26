/**
 * Authentication service for handling Google authentication
 * Converted from Flutter code to React
 */

// Function to initiate Google authentication
export const startWebAuth = (): void => {
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
  
  const currentUrl = window.location.href;
  console.log('Current URL (after auth return):', currentUrl);
  
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