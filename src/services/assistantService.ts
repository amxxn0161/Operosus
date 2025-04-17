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
    // Use apiRequest helper for proper authentication
    const response = await apiRequest<AssistantChatResponse>('/api/assistant/chat', {
      method: 'POST',
      body: {
        message,
        thread_id: threadId
      }
    });
    
    return {
      reply: response.reply,
      thread_id: response.thread_id,
      status: response.status || 'success', // Default to success if not provided
      error_message: response.error_message,
      should_refresh: response.should_refresh
    };
  } catch (error) {
    console.error('Error calling assistant API:', error);
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
    // Use the correct endpoint format: /api/assistant/thread/{threadId}
    const response = await apiRequest<ThreadMessagesResponse>(`/api/assistant/thread/${threadId}`);
    
    if (response.messages) {
      // Log the thread title for debugging
      console.log(`Thread title from API: "${response.title}"`);
      
      return response.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.text
      }));
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching thread messages:', error);
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