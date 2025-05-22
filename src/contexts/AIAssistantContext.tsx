import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Message, sendAssistantMessage, getThreadMessages, getThreadMessagesWithRetry, deleteThread as apiDeleteThread, pollAssistantRun } from '../services/assistantService';

interface ScreenContext {
  currentPath: string;
  currentComponent: string;
  currentData?: any;
  journalEntries?: any[];
}

interface AIAssistantContextType {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  threadId?: string;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (content: string) => Promise<AssistantResponse | null>;
  clearMessages: () => void;
  loadThreadMessages: (messages: Message[]) => void;
  setThreadId: (threadId: string | undefined) => void;
  updateScreenContext: (context: Partial<ScreenContext>) => void;
  cancelRequest: () => void;
  deleteThread: (threadId: string) => Promise<boolean>;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};

interface AIAssistantProviderProps {
  children: ReactNode;
}

// Add a type definition for the AssistantResponse
interface AssistantResponse {
  thread_id: string;
  run_id?: string | null;
  status?: 'success' | 'partial_success' | 'processing' | 'error' | 'complete' | string;
  error_message?: string;
  should_refresh?: boolean;
  response?: {
    text?: string;
    [key: string]: any;
  };
}

// The provider implementation
export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // State to track the current conversation thread ID
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  
  // Use useRef for the safety timeout to avoid issues with React hooks
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track active polling intervals
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track message timeout
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref to track if a request has been cancelled
  const requestCancelledRef = useRef<boolean>(false);
  
  // Ref to track active AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Make sure to clear the safety timeout when the component unmounts
  useEffect(() => {
    return () => {
      clearAllTimeouts();
    };
  }, []);

  // Function to clear all timeouts and intervals
  const clearAllTimeouts = () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
    
    // Also abort any in-progress fetch requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Function to cancel an in-progress request
  const cancelRequest = () => {
    if (!isLoading) {
      // Nothing to cancel if not loading
      return;
    }
    
    console.log('Cancelling in-progress assistant request');
    
    // Mark the request as cancelled
    requestCancelledRef.current = true;
    
    // Clear all timeouts and intervals
    clearAllTimeouts();
    
    // Reset loading state without adding a cancellation message
    setIsLoading(false);
    
    // Create a new clean AbortController for the next request
    abortControllerRef.current = null;
  };

  // Add back updateScreenContext as a no-op function to maintain compatibility
  const updateScreenContext = (context: Partial<ScreenContext>) => {
    // This function is now a no-op since context is handled by the backend
    // Just log that it was called for debugging purposes
    console.log('updateScreenContext called with:', context);
    // No local state updates needed anymore
  };

  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);
  
  const sendMessage = async (content: string): Promise<AssistantResponse | null> => {
    if (!content || content.trim() === '') {
      console.warn('Attempted to send empty message - ignoring');
      return null;
    }

    let hasFetchedThreadOnError = false; // Track if we've already fetched the thread for this error

    try {
      requestCancelledRef.current = false;
      abortControllerRef.current = new AbortController();
      const userMessage: Message = { role: 'user', content };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      // Timeout for long-running requests
      messageTimeoutRef.current = setTimeout(() => {
        if (isLoading && !requestCancelledRef.current) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'The request is taking longer than expected. You can try refreshing the conversation or sending your message again.'
          }]);
          setIsLoading(false);
        }
      }, 30000);

      // 1. Send message (POST)
      const response = await sendAssistantMessage(
        content,
        threadId,
        abortControllerRef.current.signal
      );
      if (!response || !response.thread_id) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Failed to send message. Please try again.'
        }]);
        setIsLoading(false);
        return null;
      }
      setThreadId(response.thread_id);

      // If the response is already complete, show it immediately
      if (response.status === 'complete' && response.response && typeof response.response.text === 'string') {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response.response?.text || ''
        }]);
        setIsLoading(false);
        return response;
      }

      // Otherwise, poll for the response if run_id is present
      if (response.run_id) {
        const runId = response.run_id;
        let polling = true;
        let finalResponse = null;
        let pollError = false;
        while (polling && !requestCancelledRef.current) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const pollResponse = await pollAssistantRun(response.thread_id, runId);
          finalResponse = pollResponse;

          if (!pollResponse) {
            pollError = true;
            polling = false;
            break;
          }

          if (pollResponse.status === 'processing') {
            // Keep polling
            continue;
          } else if (pollResponse.status === 'complete' && pollResponse.response && pollResponse.response.text) {
            // Stop polling and display the assistant's reply
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: pollResponse.response.text
            }]);
            setIsLoading(false);
            polling = false;
          } else if (pollResponse.status === 'error') {
            pollError = true;
            polling = false;
            break;
          } else {
            // Unknown status, stop polling
            pollError = true;
            polling = false;
            break;
          }
        }

        // If polling failed, fetch the thread ONCE as a fallback
        if (pollError && !hasFetchedThreadOnError) {
          hasFetchedThreadOnError = true;
          if (response.thread_id) {
            const threadMessages = await getThreadMessages(response.thread_id);
            if (threadMessages && threadMessages.length > 0) {
              loadThreadMessages(threadMessages);
              setIsLoading(false);
              return null;
            }
          }
          // If thread fetch fails, show error as before
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'An error occurred while waiting for the assistant response.'
          }]);
          setIsLoading(false);
          return null;
        }

        return finalResponse;
      } else {
        // No run_id and not complete: fallback error
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Failed to send message. Please try again.'
        }]);
        setIsLoading(false);
        return null;
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'An error occurred. Please try again.'
      }]);
      setIsLoading(false);
      return null;
    }
  };

  // Function to load and display thread messages
  const loadThreadMessages = useCallback((messages: Message[]) => {
    console.log(`Loading ${messages.length} thread messages`);
    
    // Map API messages to display format
    const mappedMessages = messages.map(message => ({
      content: message.content,
      role: message.role,
      timestamp: new Date().toISOString(),
    }));
    
    // Update the messages in state
    setMessages(mappedMessages);
    
    // If there's a cancelled request, don't update UI states
    if (requestCancelledRef.current) {
      console.log('Request was cancelled, not updating UI states');
      return;
    }
    
    // Manage loading state based on message content
    const lastMessage = messages[messages.length - 1];
    
    // Check if it's likely that we have a complete response
    const lastMessageIsFromUser = lastMessage?.role === 'user';
    const lastMessageIsAssistant = lastMessage?.role === 'assistant';
    const hasSubstantialContent = lastMessageIsAssistant && lastMessage?.content && lastMessage.content.trim().length > 50;
    const isNotProcessingMessage = lastMessageIsAssistant && 
      !lastMessage.content.includes("I'm processing") && 
      !lastMessage.content.includes("wait a moment") && 
      !lastMessage.content.includes("Please wait") &&
      !lastMessage.content.includes("thinking about");
    
    if (lastMessageIsFromUser) {
      console.log('Last message is from user, keeping loading state active');
    } else if (messages.length <= 1) {
      console.log('Thread only has one message, keeping loading state active');
    } else if (!hasSubstantialContent) {
      console.log('Assistant response is too short, keeping loading state active');
    } else if (!isNotProcessingMessage) {
      console.log('Assistant is still processing, keeping loading state active');
    } else {
      console.log('Complete response detected in loadThreadMessages, will stop loading after delay');
      // The response appears complete, but add a delay before changing loading state
      // This ensures the UI doesn't abruptly change and allows time for any final updates
      setTimeout(() => {
        // Double-check that the request wasn't cancelled during the timeout
        if (!requestCancelledRef.current) {
          console.log('Stopping loading state after delay');
          setIsLoading(false);
        }
      }, 1000);
    }
  }, []);
  
  const clearMessages = () => {
    setMessages([]);
    setThreadId(undefined);
  };

  // Function to delete a thread
  const handleDeleteThread = async (threadIdToDelete: string): Promise<boolean> => {
    try {
      console.log(`Attempting to delete thread ${threadIdToDelete}`);
      
      // If the thread to delete is the current thread, reset state
      if (threadIdToDelete === threadId) {
        clearMessages();
      }
      
      // Call the API to delete the thread
      const success = await apiDeleteThread(threadIdToDelete);
      
      return success;
    } catch (error) {
      console.error(`Error deleting thread ${threadIdToDelete}:`, error);
      return false;
    }
  };

  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        threadId,
        openAssistant,
        closeAssistant,
        sendMessage,
        clearMessages,
        loadThreadMessages,
        setThreadId,
        updateScreenContext,
        cancelRequest,
        deleteThread: handleDeleteThread
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
};