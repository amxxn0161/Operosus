// apiUtils.ts - Special fix for API authorization issues
import { checkAuthState } from './authService';

// Base URL for API requests
const API_BASE_URL = process.env.REACT_APP_API_TARGET || 'https://app2.operosus.com';

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  timeoutMs?: number;
  signal?: AbortSignal;
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
  const constructApiUrl = (baseUrl: string, path: string) => {
    // Start with the base URL
    let url = baseUrl;
    
    // Add a slash if needed
    if (!path.startsWith('/')) {
      url += '/';
    }
    
    // Split the path into segments
    const segments = path.split('/');
    
    // Properly encode each segment except for query parameters
    const encodedSegments = segments.map(segment => {
      // Check if the segment contains query parameters
      if (segment.includes('?')) {
        // Split at the ? and encode only the path part
        const [pathPart, queryPart] = segment.split('?');
        return `${encodeURIComponent(pathPart)}?${queryPart}`;
      } else {
        // Encode the whole segment
        return encodeURIComponent(segment);
      }
    });
    
    // Join the segments back together with slashes
    return url + encodedSegments.join('/');
  };
  
  // Analyze URL to check if it's a task-related endpoint that needs special handling
  const isTaskEndpoint = url.includes('/tasks/') && 
                         (url.includes('/move') || 
                          url.includes('/star') || 
                          url.includes('/duration'));
  
  // For task endpoints, use the special encoding to prevent ID issues
  const fullUrl = url.startsWith('http') 
    ? url 
    : isTaskEndpoint 
      ? constructApiUrl(API_BASE_URL, url)
      : `${API_BASE_URL}${url.startsWith('/') ? url : '/' + url}`;
  
  console.log(`Final URL for request: ${fullUrl}`);
  
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
      signal: options.signal || controller.signal
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
      
      // Special handling for assistant API errors
      if (url.includes('/api/assistant/')) {
        console.error('Assistant API Error:', {
          endpoint: url,
          method: options.method || 'GET',
          requestBody: options.body ? JSON.stringify(options.body, null, 2) : 'None',
          status: response.status,
          responseData: data
        });
        
        // If it's a chat request that failed, provide more information
        if (url.includes('/api/assistant/chat')) {
          error.isAssistantError = true;
          error.message = data?.message || 'The assistant service encountered an error processing your request.';
          console.error('Assistant Chat API Error:', { error });
        }
        
        // If it's a thread messages request that failed
        if (url.includes('/api/assistant/thread/')) {
          error.isThreadError = true;
          error.message = data?.message || 'Could not retrieve conversation messages.';
          
          // Try to extract thread ID for better debugging
          const threadIdMatch = url.match(/\/thread\/([^\/]+)/);
          if (threadIdMatch && threadIdMatch[1]) {
            error.threadId = threadIdMatch[1];
            console.error(`Thread load error for thread ID: ${error.threadId}`);
          }
        }
      }
      
      // Special handling for authentication errors (401)
      if (response.status === 401) {
        error.message = data?.message || 'Authentication failed: Your session may have expired';
        console.error('Authentication Error:', {
          url: fullUrl,
          method: options.method || 'GET',
          responseData: data
        });
      }
      
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
      
      // Special handling for assistant chat endpoint responses
      if (url.includes('/api/assistant/chat')) {
        console.log('Post-processing assistant chat response:', data);
        
        // Ensure the thread_id is always included and properly processed
        if (data.thread_id) {
          // Check if run is completed but reply is missing - this is likely our issue
          if (data.status === 'success' || data.status === 'completed') {
            console.log('Assistant API success response - ensuring reply exists');
            
            // If reply is missing, add a placeholder
            if (!data.reply || data.reply.trim() === '') {
              console.log('Adding placeholder reply for completed run with missing reply');
              data.reply = "I'm processing your request. Please wait a moment...";
              data.should_refresh = true;
            }
          }
        }
      }
      
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
