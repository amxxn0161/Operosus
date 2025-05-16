import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { Message, sendAssistantMessage, getThreadMessages, getThreadMessagesWithRetry, deleteThread as apiDeleteThread } from '../services/assistantService';

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
  sendMessage: (content: string) => Promise<void>;
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
  reply: string;
  thread_id: string;
  status?: 'success' | 'partial_success' | 'processing' | 'error' | string;
  error_message?: string;
  should_refresh?: boolean;
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
  
  const sendMessage = async (content: string) => {
    if (!content || content.trim() === '') {
      console.warn('Attempted to send empty message - ignoring');
      return;
    }

    try {
      // Reset the cancelled flag when starting a new request
      requestCancelledRef.current = false;
      
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      
      // Immediately add the user message to the conversation for better UX
      const userMessage: Message = { role: 'user', content };
      setMessages(prev => [...prev, userMessage]);
      
      setIsLoading(true);
      
      // Set a maximum timeout to ensure we don't leave users hanging
      messageTimeoutRef.current = setTimeout(() => {
        if (isLoading && !requestCancelledRef.current) {
          console.warn('Message processing timeout reached, stopping loading state');
          const timeoutMessage: Message = {
            role: 'assistant',
            content: 'The request is taking longer than expected. You can try refreshing the conversation or sending your message again.'
          };
          setMessages(prev => [...prev, timeoutMessage]);
          setIsLoading(false);
        }
      }, 30000); // 30 second maximum timeout
      
      // Set up a polling mechanism to periodically check the thread for responses
      // This helps catch responses that might otherwise be missed
      if (threadId) {
        console.log(`Setting up polling for thread ${threadId}`);
        const threadIdForPolling = threadId; // Capture in local variable to avoid closure issues
        
        pollingIntervalRef.current = setInterval(async () => {
          if (requestCancelledRef.current) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            return;
          }
          
          try {
            console.log(`Polling thread ${threadIdForPolling} for new messages...`);
            const threadMessages = await getThreadMessages(threadIdForPolling);
            if (threadMessages && threadMessages.length > 0) {
              // Always update the messages since they might be different
              console.log(`Found ${threadMessages.length} messages in thread, updating UI`);
              loadThreadMessages(threadMessages);
              
              // Check if we have a completed response
              const lastMessage = threadMessages[threadMessages.length - 1];
              
              // Check if it's a complete response based on multiple factors
              const lastMessageIsFromUser = lastMessage?.role === 'user';
              const lastMessageIsAssistant = lastMessage?.role === 'assistant';
              const hasSubstantialContent = lastMessage?.content && lastMessage.content.trim().length > 50;
              const isNotProcessingMessage = lastMessageIsAssistant && !lastMessage.content.includes("I'm processing") && 
                                            !lastMessage.content.includes("wait a moment") && 
                                            !lastMessage.content.includes("Please wait");
              
              if (!lastMessageIsFromUser && 
                  lastMessageIsAssistant && 
                  hasSubstantialContent && 
                  isNotProcessingMessage && 
                  threadMessages.length > 1) {
                  
                console.log('Complete response detected in polling, stopping polling and loading state');
                // We have a complete response, stop polling and loading
                if (pollingIntervalRef.current) {
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                
                // Add delay to ensure UI updates before stopping loading
                setTimeout(() => {
                  setIsLoading(false);
                }, 1000);
              } else {
                console.log('Response still incomplete, continuing to poll');
                if (lastMessageIsFromUser) {
                  console.log('Last message is from user, waiting for assistant response');
                }
              }
            }
          } catch (error) {
            console.error('Error polling for messages:', error);
          }
        }, 1500); // Poll more frequently (1.5 seconds)
      }

      // Define error recovery function to avoid duplication
      const attemptRecoveryWithThread = async (recoveryThreadId: string, context: string): Promise<boolean> => {
        if (requestCancelledRef.current) {
          console.log(`${context}: Request was cancelled, skipping recovery`);
          return false;
        }
        
        console.log(`${context}: Attempting recovery with thread ${recoveryThreadId}`);
        try {
          const recoveredMessages = await getThreadMessagesWithRetry(recoveryThreadId, 3, 800);
          if (recoveredMessages && recoveredMessages.length > 0) {
            console.log(`${context}: Successfully recovered ${recoveredMessages.length} messages`);
            loadThreadMessages(recoveredMessages);
            clearTimeout(messageTimeoutRef.current!);
            messageTimeoutRef.current = null;
            setIsLoading(false);
            return true; // Successfully recovered
          }
        } catch (recoveryError) {
          console.error(`${context}: Recovery failed:`, recoveryError);
        }
        return false; // Recovery failed
      };

      // Define function to attempt recovery using most recent thread
      const attemptRecoveryWithRecentThread = async (context: string): Promise<boolean> => {
        if (requestCancelledRef.current) {
          console.log(`${context}: Request was cancelled, skipping recovery with recent thread`);
          return false;
        }
        
        console.log(`${context}: Attempting recovery with most recent thread`);
        try {
          const { fetchAssistantThreads } = await import('../services/assistantService');
          const threads = await fetchAssistantThreads();
          
          if (threads && threads.length > 0) {
            // Sort by creation time (newest first)
            threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            // Get the most recent thread
            const mostRecentThread = threads[0];
            console.log(`${context}: Found most recent thread: ${mostRecentThread.thread_id}`);
            
            // Set the thread ID
            setThreadId(mostRecentThread.thread_id);
            
            // Try to recover using this thread ID
            return await attemptRecoveryWithThread(mostRecentThread.thread_id, `${context}: Recent thread`);
          }
        } catch (fetchError) {
          console.error(`${context}: Failed to fetch recent threads:`, fetchError);
        }
        return false; // Recovery failed
      };

      // Define function to show error message after all recovery attempts fail
      const showErrorMessage = (errorMsg?: string) => {
        if (requestCancelledRef.current) {
          console.log('Request was cancelled, skipping error message');
          return;
        }
        
        const defaultError = 'I apologize, but I encountered an error while processing your request. Please try again.';
        const errorMessage: Message = {
          role: 'assistant',
          content: errorMsg || defaultError
        };
        
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        
        // After showing the error, set up a delayed auto-refresh attempt
        console.log('Setting up final delayed auto-refresh after showing error message');
        setTimeout(async () => {
          if (requestCancelledRef.current) return;
          
          const success = await attemptRecoveryWithRecentThread('Final auto-refresh');
          
          if (success) {
            // Replace the error message with the recovered content
            setMessages(prev => {
              // Check if the last message is an error
              const lastMessage = prev[prev.length - 1];
              if (lastMessage?.role === 'assistant' && lastMessage?.content?.includes('error')) {
                // Remove the error message
                const withoutError = prev.slice(0, prev.length - 1);
                
                // Add a recovery message
                return [
                  ...withoutError,
                  {
                    role: 'assistant',
                    content: 'I found the response to your message:'
                  },
                  // The actual messages are loaded by the recovery function
                ];
              }
              return prev; // If last message wasn't an error, don't modify
            });
          }
        }, 3000); // Wait 3 seconds before auto-refresh attempt
      };

      // Main processing logic starts here
      try {
        // Check for cancellation at key points
        if (requestCancelledRef.current) {
          console.log('Request was cancelled, exiting early');
          return;
        }

        // Call the backend API with the message and thread ID
        let response: AssistantResponse | null = null;
        
          // Always make the POST request and log it clearly
          console.log(`Making POST request to /api/assistant/chat with thread_id: ${threadId || 'new thread'}`);
        try {
          response = await sendAssistantMessage(
            content, 
            threadId, 
            abortControllerRef.current?.signal
          );
          console.log('Successfully received response from sendAssistantMessage:', response?.status);
          
          // Add detailed logging about the response
          if (response) {
            console.log(`API response details - threadId: ${response.thread_id}, status: ${response.status}, hasReply: ${!!response.reply}`);
          } else {
            console.warn('API response is null');
          }
        } catch (postError) {
          console.error('POST request to sendAssistantMessage failed:', postError);
          
          if (requestCancelledRef.current) {
            console.log('Request was cancelled after POST error');
            return;
          }
          
          // Extract the thread ID from the error if it's available (for new conversations)
          let extractedThreadId: string | undefined = undefined;
          
          // Check if the error contains thread_id in error data or response data
          if (postError && typeof postError === 'object') {
            // Check various possible locations for thread_id
            const errorObj = postError as any;
            
            if (errorObj.response?.data?.thread_id) {
              extractedThreadId = errorObj.response.data.thread_id;
            } else if (errorObj.response?.data?.response?.thread_id) {
              extractedThreadId = errorObj.response.data.response.thread_id;
            } else if (errorObj.thread_id) {
              extractedThreadId = errorObj.thread_id;
            }
            
            if (extractedThreadId) {
              console.log(`Found thread_id in error: ${extractedThreadId}`);
            }
          }
          
          // If we have an existing thread ID, or extracted one from the error, try to fetch messages
          const recoveryThreadId = threadId || extractedThreadId;
          
          if (recoveryThreadId) {
            // If we extracted a thread ID from the error but it's different from our current one, update it
            if (extractedThreadId && extractedThreadId !== threadId) {
              console.log(`Setting new threadId from error response: ${extractedThreadId}`);
              setThreadId(extractedThreadId);
            }
            
            // Try to recover using this thread ID
            const recovered = await attemptRecoveryWithThread(recoveryThreadId, 'Primary recovery');
            if (recovered) return; // Exit early if recovery succeeded
          }
          
          // If direct recovery failed, try using most recent thread
          const recentThreadRecovered = await attemptRecoveryWithRecentThread('Secondary recovery');
          if (recentThreadRecovered) return; // Exit early if recovery succeeded
          
          // If we get here, all immediate recovery attempts failed
          // Set up delayed auto-refresh instead of showing error immediately
          console.log('Initial recovery failed, will attempt automatic refresh after delay');
          setTimeout(async () => {
            if (requestCancelledRef.current) return;
            
            const delayedRecoverySuccess = await attemptRecoveryWithRecentThread('Delayed auto-refresh');
            
            if (!delayedRecoverySuccess) {
              // Only show error if all recovery attempts failed and we're still loading
              if (isLoading) {
                showErrorMessage();
              }
            }
          }, 2000); // Wait 2 seconds before final recovery attempt
          
          // Exit without showing error yet
          return;
        }
        
        // Clear the timeout since we got a response
        clearTimeout(messageTimeoutRef.current!);
        messageTimeoutRef.current = null;
        
        // Continue with processing the response
        // We need to be careful about stopping too soon
        
        // If we have a valid response, update the thread ID
        if (response && response.thread_id) {
          console.log('Valid response received, updating thread_id');
          
          // Set or update the thread ID
          setThreadId(response.thread_id);
          
          // Add the assistant response to the messages if it contains a substantial reply
          if (response.reply && response.reply.trim() !== '') {
                const assistantMessage: Message = {
                  role: 'assistant',
                  content: response.reply
                };
                  setMessages(prev => [...prev, assistantMessage]);
            
            // For now, we'll keep the loading state active
            // Even if we have a response, to make sure we get the full message
            console.log('Response received but keeping loading state active to ensure complete response');
            
            // Capture the thread ID before the setTimeout to avoid "possibly null" errors
            const responseThreadId = response.thread_id;
            
            // Set a timer to check for a complete response after a short delay
            setTimeout(async () => {
              if (requestCancelledRef.current) return;
              
              try {
                console.log(`Checking thread ${responseThreadId} for complete response`);
                const messages = await getThreadMessages(responseThreadId);
                        if (messages && messages.length > 0) {
                  // Update messages with the latest from the thread
                          loadThreadMessages(messages);
                  
                  // Now we can safely stop the loading state
                          setIsLoading(false);
                }
              } catch (error) {
                console.error('Error checking for complete response:', error);
                // Still stop loading even if there's an error checking
                    setIsLoading(false);
              }
            }, 1000); // Wait 1 second to check for complete response
          }
          
          return; // Exit early once we've handled the response
        }
        
      } catch (innerError) {
        // Clear the timeout in case of error
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current);
          messageTimeoutRef.current = null;
        }
        
        console.error('Error in inner try-catch of sendMessage:', innerError);
        
        if (requestCancelledRef.current) {
          console.log('Request was cancelled, skipping error recovery');
                      return;
        }
        
        // Before showing an error, try to fetch messages directly if we have a thread ID
        if (threadId) {
          const recovered = await attemptRecoveryWithThread(threadId, 'Inner error recovery');
          if (recovered) return; // Exit early if recovery succeeded
        }
        
        // Try to recover with recent thread if direct recovery failed
        const recentRecovered = await attemptRecoveryWithRecentThread('Inner error recent thread recovery');
        if (recentRecovered) return; // Exit early if recovery succeeded
        
        // Only show error message if all recovery attempts failed
        showErrorMessage();
      }
    } catch (outerError) {
      console.error('Error in outer try-catch of sendMessage:', outerError);
      
      if (requestCancelledRef.current) {
        console.log('Request was cancelled, skipping final error recovery');
        return;
      }
      
      // Try to get latest threads for recovery
      try {
        // Import the function here to avoid circular dependencies
        const { fetchAssistantThreads } = await import('../services/assistantService');
        const threads = await fetchAssistantThreads();
        
        if (threads && threads.length > 0) {
          // Sort by creation time (newest first)
          threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const mostRecentThread = threads[0];
          
          // Set the thread ID
          setThreadId(mostRecentThread.thread_id);
          
          // Try to fetch messages
          const recentMessages = await getThreadMessagesWithRetry(mostRecentThread.thread_id, 2, 1000);
          if (recentMessages && recentMessages.length > 0) {
            console.log(`Successfully retrieved ${recentMessages.length} messages in final recovery`);
            loadThreadMessages(recentMessages);
            setIsLoading(false);
            return; // Exit successfully
          }
        }
      } catch (finalRecoveryError) {
        console.error('Final recovery attempt failed:', finalRecoveryError);
      }
      
      // Only show error if recovery failed
      const errorMessage: Message = {
        role: 'assistant',
        content: `I apologize, but I encountered an error while processing your request. Please try again.`
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
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