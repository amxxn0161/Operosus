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
}

interface ThreadMessagesResponse {
  messages: {
    role: string;
    text: string;
  }[];
}

interface ThreadsListResponse {
  threads: { thread_id: string; created_at: string }[];
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
): Promise<{ reply: string; thread_id: string } | null> => {
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
      thread_id: response.thread_id
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
    const response = await apiRequest<ThreadMessagesResponse>(`/api/assistant/threads/${threadId}/messages`);
    
    if (response.messages) {
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