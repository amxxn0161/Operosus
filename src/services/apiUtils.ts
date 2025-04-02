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
    
    // Make the request
    const response = await fetch(fullUrl, fetchOptions);
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Handle error responses
    if (!response.ok) {
      console.error(`API request failed: ${response.status} ${response.statusText}`);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Parse and return the data
    const data = await response.json();
    console.log(`API response successful for ${fullUrl}`);
    return data as T;
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
    
    // Re-throw the error
    throw error;
  }
}
