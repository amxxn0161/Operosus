/**
 * assistantService.ts - Service for interacting with the Assistant API
 * This service replaces the direct OpenAI integration with backend API calls
 */

import axios from 'axios';
import { apiRequest } from './apiUtils';

// Message interface to keep compatibility with existing code
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Response interfaces
interface AssistantChatResponse {
  reply: string;
  thread_id: string;
  status?: 'success' | 'partial_success' | 'processing' | 'error';
  error_message?: string;
  should_refresh?: boolean;
}

interface ThreadMessagesResponse {
  thread_id: string;
  title: string;
  messages: {
    role: string;
    text: string;
  }[];
}

interface ThreadsListResponse {
  threads: { thread_id: string; title: string; created_at: string }[];
}

interface UpdateThreadTitleResponse {
  success: boolean;
  thread: {
    thread_id: string;
    title: string;
    created_at: string;
  };
}

/**
 * Send a message to the assistant API (new logic)
 * @param message The user's message to send
 * @param threadId Optional thread ID to continue a conversation
 * @param abortSignal Optional AbortSignal to cancel the request
 * @returns The response containing the assistant's reply, thread ID, and run ID
 */
export const sendAssistantMessage = async (
  message: string,
  threadId?: string,
  abortSignal?: AbortSignal
): Promise<{
  thread_id: string;
  run_id?: string | null;
  status?: string;
  error_message?: string;
  response?: {
    text?: string;
    [key: string]: any;
  };
} | null> => {
  try {
    const cacheBuster = new Date().getTime();
    const requestBody = {
      message,
      thread_id: threadId,
      timestamp: new Date().toISOString(),
      cache_buster: cacheBuster
    };
    // POST to /api/assistant/chat
    const response = await apiRequest<any>(`/api/assistant/chat?_=${cacheBuster}`, {
      method: 'POST',
      body: requestBody,
      timeoutMs: 30000,
      signal: abortSignal
    });
    // Expect response to contain thread_id and run_id
    return {
      thread_id: response.thread_id,
      run_id: response.run_id,
      status: response.status,
      error_message: response.error_message,
      response: response.response
    };
  } catch (error) {
    console.error('Error calling assistant API:', error);
    return null;
  }
};

/**
 * Poll for the assistant's response using the new minimal endpoint
 * @param threadId The thread ID
 * @param runId The run ID
 * @returns The response object from the poll endpoint
 */
export const pollAssistantRun = async (
  threadId: string,
  runId: string
): Promise<any> => {
  try {
    // GET /api/assistant/run/{threadId}/{runId}
    const response = await apiRequest<any>(`/api/assistant/run/${threadId}/${runId}`);
    return response;
  } catch (error) {
    console.error('Error polling assistant run:', error);
    return null;
  }
};

/**
 * Get messages for a specific thread
 * @param threadId The thread ID to fetch messages for
 * @returns Array of messages in the thread
 */
export const getThreadMessages = async (threadId: string): Promise<Message[] | null> => {
  try {
    console.log(`Fetching messages for thread ${threadId}`);
    
    // Use the correct endpoint format: /api/assistant/thread/{threadId}
    const response = await apiRequest<ThreadMessagesResponse>(`/api/assistant/thread/${threadId}`);
    
    if (response && response.messages) {
      // Log the thread title and message count for debugging
      console.log(`Thread data retrieved: "${response.title}" with ${response.messages.length} messages`);
      
      // Check if we have a proper assistant message with content
      const hasAssistantMessageWithContent = response.messages.some(msg => 
        msg.role === 'assistant' && msg.text && msg.text.trim().length > 0);
      
      if (!hasAssistantMessageWithContent && response.messages.length > 0) {
        console.warn(`Found ${response.messages.length} messages but no assistant message with content`);
        
        // Try again after a short delay - this is an immediate retry, not using the retry function
        console.log('Attempting single immediate retry with delay...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryResponse = await apiRequest<ThreadMessagesResponse>(`/api/assistant/thread/${threadId}`);
        if (retryResponse && retryResponse.messages) {
          console.log(`Retry got ${retryResponse.messages.length} messages`);
          
          // Check again for assistant message with content
          const hasContentAfterRetry = retryResponse.messages.some(msg => 
            msg.role === 'assistant' && msg.text && msg.text.trim().length > 0);
            
          if (hasContentAfterRetry) {
            console.log('Retry successfully found messages with content');
            
            // Map the messages to the expected format
            return retryResponse.messages.map((msg) => ({
              role: msg.role as 'user' | 'assistant' | 'system',
              content: msg.text
            }));
          }
        }
      }
      
      // Map the messages to the expected format
      return response.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.text
      }));
    } else {
      console.warn(`No messages found in response for thread ${threadId}`, response);
      return null;
    }
  } catch (error) {
    // More detailed error logging
    console.error(`Error fetching thread messages for thread ${threadId}:`, error);
    
    // Check if it's an Axios error to get more details
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('API response error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data
      });
    }
    
    return null;
  }
};

/**
 * Get a list of the user's conversation threads
 * @returns Array of thread objects with thread_id and created_at fields
 */
export const listThreads = async (): Promise<{ thread_id: string; created_at: string }[] | null> => {
  try {
    const response = await apiRequest<ThreadsListResponse>('/api/assistant/threads');
    return response.threads || null;
  } catch (error) {
    console.error('Error fetching threads:', error);
    return null;
  }
};

/**
 * Interface for Thread objects returned by the API
 */
export interface Thread {
  thread_id: string;
  title: string;
  created_at: string;
}

/**
 * Interface for the response from the threads API
 */
export interface ThreadsResponse {
  threads: Thread[];
}

/**
 * Fetch the list of saved conversation threads
 * @returns An array of threads or null if the request fails
 */
export const fetchAssistantThreads = async (): Promise<Thread[] | null> => {
  try {
    // Use apiRequest helper for proper authentication
    const response = await apiRequest<ThreadsResponse>('/api/assistant/threads', {
      method: 'GET'
    });
    
    return response.threads;
  } catch (error) {
    console.error('Error fetching assistant threads:', error);
    return null;
  }
};

/**
 * Update the title of a conversation thread
 * @param threadId The ID of the thread to update
 * @param title The new title for the thread
 * @returns The updated thread object or null if the request fails
 */
export const updateThreadTitle = async (threadId: string, title: string): Promise<Thread | null> => {
  try {
    const response = await apiRequest<UpdateThreadTitleResponse>(`/api/assistant/thread/${threadId}/title`, {
      method: 'PUT',
      body: {
        title
      }
    });
    
    if (response.success && response.thread) {
      console.log(`Thread title updated successfully to: "${response.thread.title}"`);
      return response.thread;
    }
    
    return null;
  } catch (error) {
    console.error('Error updating thread title:', error);
    return null;
  }
};

/**
 * Get thread messages with automatic retry with exponential backoff
 * Useful for new threads that might need some time for messages to be available
 * 
 * @param threadId The thread ID to fetch
 * @param maxRetries Maximum number of retries (default: 3)
 * @param initialDelayMs Initial delay in milliseconds (default: 1000)
 * @returns Array of messages or null if unsuccessful after retries
 */
export const getThreadMessagesWithRetry = async (
  threadId: string,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<Message[] | null> => {
  let attempt = 0;
  let delay = initialDelayMs;
  
  while (attempt <= maxRetries) {
    try {
      console.log(`Fetching thread messages attempt ${attempt + 1}/${maxRetries + 1} for thread ${threadId}`);
      
      // Try to get messages
      const messages = await getThreadMessages(threadId);
      
      // If we have messages with content, return them
      if (messages && messages.length > 0) {
        const hasContent = messages.some(msg => msg.content && msg.content.trim() !== '');
        
        if (hasContent) {
          console.log(`Successfully retrieved ${messages.length} messages with content on attempt ${attempt + 1}`);
          return messages;
        } else {
          console.warn(`Retrieved ${messages.length} messages but none have content. Retrying...`);
        }
      }
      
      // If we're on the last attempt, return whatever we got (might be null)
      if (attempt === maxRetries) {
        console.warn(`Final attempt ${attempt + 1} completed without success for thread ${threadId}`);
        return messages; // This could be null or empty
      }
      
      // Otherwise wait with exponential backoff and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
      attempt++;
      
    } catch (error) {
      console.error(`Error in getThreadMessagesWithRetry attempt ${attempt + 1}:`, error);
      
      // If we're on the last attempt, give up
      if (attempt === maxRetries) {
        console.error(`All ${maxRetries + 1} attempts failed for thread ${threadId}`);
        return null;
      }
      
      // Otherwise wait with exponential backoff and retry
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
      attempt++;
    }
  }
  
  return null;
};

/**
 * Delete a conversation thread
 * @param threadId The ID of the thread to delete
 * @returns True if the thread was deleted successfully, false otherwise
 */
export const deleteThread = async (threadId: string): Promise<boolean> => {
  try {
    console.log(`Attempting to delete thread ${threadId}`);
    
    const response = await apiRequest<{status: string; message: string}>(`/api/assistant/thread/${threadId}`, {
      method: 'DELETE'
    });
    
    if (response && response.status === 'success') {
      console.log(`Thread ${threadId} deleted successfully`);
      return true;
    } else {
      console.warn(`Failed to delete thread ${threadId}:`, response);
      return false;
    }
  } catch (error) {
    console.error(`Error deleting thread ${threadId}:`, error);
    
    // Log more detailed error information
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('API response error details:', {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data
      });
    }
    
    return false;
  }
}; 