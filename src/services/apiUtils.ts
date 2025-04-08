// apiUtils.ts - Special fix for API authorization issues
import { checkAuthState } from './authService';

// Base URL for API requests
const API_BASE_URL = 'https://app2.operosus.com';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  timeoutMs?: number;
}

/**
 * A wrapper around fetch that handles common API operations
 * including auth, timeout, and CORS issues
 */
export async function apiRequest<T>(url: string, options: ApiOptions = {}): Promise<T> {
  // Get auth token
  const { token } = checkAuthState();
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  // Detect if on mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const timeoutDuration = options.timeoutMs || (isMobile ? 15000 : 5000);
  
  // Setup controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
  
  // Construct full URL - ensure it starts with either http:// or https://
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
  
  try {
    // Base request options - simplified to avoid CORS issues
    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': window.location.origin
      },
      signal: controller.signal
      // Removed mode: 'cors' and credentials to let the browser handle it
    };
    
    // Add body if provided
    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
    console.log(`Making API request to ${fullUrl} with method ${fetchOptions.method}`);
    if (options.body) {
      console.log('Request payload:', JSON.stringify(options.body, null, 2));
    }
    
    // Make the request
    const response = await fetch(fullUrl, fetchOptions);
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Try to parse the response even if it's an error
    let data;
    let responseText = '';
    
    try {
      // Try to get text first for better error messages
      responseText = await response.text();
      
      // Try to parse as JSON if possible
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.log('Response is not valid JSON, using text response instead');
          data = { message: responseText };
        }
      }
    } catch (responseError) {
      console.error('Error reading response:', responseError);
      data = { message: 'Unable to read response' };
    }
    
    // Handle error responses
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      console.error('Error response data:', data);
      
      // Create a custom error object with more details
      const error: any = new Error(data?.message || `API request failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = data;
      
      // For 500 Internal Server errors, add more context
      if (response.status === 500) {
        error.message = data?.message || 'Internal Server Error: The server encountered an unexpected condition';
        console.error('Server Error Details:', {
          url: fullUrl,
          method: options.method || 'GET',
          requestBody: options.body ? JSON.stringify(options.body) : 'None',
          responseData: data
        });
      }
      
      throw error;
    }
    
    // Return the parsed data or what we already parsed
    if (data) {
      console.log(`API response successful for ${fullUrl}`);
      return data as T;
    } else {
      console.log(`API response successful for ${fullUrl}, parsing response`);
      return {} as T;
    }
  } catch (error) {
    // Clear timeout if there was an error
    clearTimeout(timeoutId);
    
    // Special handling for abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('API request timed out');
      throw new Error('API request timed out');
    }
    
    // Log the full error
    console.error('API request error:', error);
    
    // If the error already has status and we've enhanced it, just rethrow
    if ((error as any).status) {
      throw error;
    }
    
    // Otherwise create a more detailed error
    const enhancedError: any = new Error(error instanceof Error ? error.message : 'Unknown API error');
    enhancedError.originalError = error;
    throw enhancedError;
  }
}
