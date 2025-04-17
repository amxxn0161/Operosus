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
 * Send a message to the assistant API
 * @param message The user's message to send
 * @param threadId Optional thread ID to continue a conversation
 * @returns The response containing the assistant's reply and thread ID
 */
export const sendAssistantMessage = async (
  message: string,
  threadId?: string
): Promise<{ 
  reply: string; 
  thread_id: string; 
  status?: string; 
  error_message?: string;
  should_refresh?: boolean;
} | null> => {
  try {
    console.log(`Sending message to assistant${threadId ? ` (thread: ${threadId})` : ' (new thread)'}`);
    
    // Use apiRequest helper for proper authentication
    const response = await apiRequest<AssistantChatResponse>('/api/assistant/chat', {
      method: 'POST',
      body: {
        message,
        thread_id: threadId
      }
    });
    
    // CRITICAL: Deep debugging - log the exact response received
    console.log('RAW Assistant API response object:', JSON.stringify(response, null, 2));
    console.log('Response properties:', Object.keys(response));
    console.log('Response reply type:', typeof response.reply);
    console.log('Response thread_id type:', typeof response.thread_id);
    
    // Log the full response for debugging
    console.log('Assistant API response:', {
      status: response.status || 'success',
      thread_id: response.thread_id,
      has_reply: !!response.reply,
      reply_length: response.reply ? response.reply.length : 0,
      should_refresh: !!response.should_refresh
    });
    
    // If the response doesn't have a reply, but has a thread_id and status is success or not provided,
    // let's force a refresh to get the messages directly
    if ((!response.reply || response.reply.trim() === '') && response.thread_id && 
        (!response.status || response.status === 'success' || response.status === 'completed' as any)) {
      console.log(`Response missing reply content but status is ${response.status || 'success'}, forcing refresh flag`);
      return {
        reply: "I'm processing your request. Please wait a moment...",
        thread_id: response.thread_id,
        status: 'partial_success', // Force partial_success to trigger refresh
        error_message: response.error_message,
        should_refresh: true // Force refresh
      };
    }
    
    // Always force a refresh when there's a thread_id, regardless of status
    return {
      reply: response.reply || "I'm processing your request. Please wait a moment...",
      thread_id: response.thread_id,
      status: response.status || 'success', 
      error_message: response.error_message,
      should_refresh: true // ALWAYS force refresh to be safe
    };
  } catch (error) {
    console.error('Error calling assistant API:', error);
    
    // If we have error details, log them
    if (error && typeof error === 'object') {
      if ('response' in error) {
        const errorResponse = (error as any).response;
        console.error('API error response:', {
          status: errorResponse?.status,
          data: errorResponse?.data
        });
      } else if ('message' in error) {
        console.error('Error message:', (error as Error).message);
      }
    }
    
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