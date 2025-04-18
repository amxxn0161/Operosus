import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Message, sendAssistantMessage, getThreadMessages, getThreadMessagesWithRetry } from '../services/assistantService';

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
  
  // Make sure to clear the safety timeout when the component unmounts
  useEffect(() => {
    return () => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      
      // Also clear any polling intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

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
      // Immediately add the user message to the conversation for better UX
      const userMessage: Message = { role: 'user', content };
      setMessages(prev => [...prev, userMessage]);
      
      setIsLoading(true);
      
      // Set a maximum timeout to ensure we don't leave users hanging
      const messageTimeout = setTimeout(() => {
        if (isLoading) {
          console.warn('Message processing timeout reached, stopping loading state');
          const timeoutMessage: Message = {
            role: 'assistant',
            content: 'The request is taking longer than expected. You can try refreshing the conversation or sending your message again.'
          };
          setMessages(prev => [...prev, timeoutMessage]);
          setIsLoading(false);
        }
      }, 30000); // 30 second maximum timeout

      // Define error recovery function to avoid duplication
      const attemptRecoveryWithThread = async (recoveryThreadId: string, context: string): Promise<boolean> => {
        console.log(`${context}: Attempting recovery with thread ${recoveryThreadId}`);
        try {
          const recoveredMessages = await getThreadMessagesWithRetry(recoveryThreadId, 3, 800);
          if (recoveredMessages && recoveredMessages.length > 0) {
            console.log(`${context}: Successfully recovered ${recoveredMessages.length} messages`);
            loadThreadMessages(recoveredMessages);
            clearTimeout(messageTimeout);
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
        // Call the backend API with the message and thread ID
        let response: AssistantResponse | null = null;
        
        // IMPORTANT: Add explicit flag to track if a POST request was made
        let madePostRequest = false;
        
        try {
          // Always make the POST request and log it clearly
          console.log(`Making POST request to /api/assistant/chat with thread_id: ${threadId || 'new thread'}`);
          response = await sendAssistantMessage(content, threadId);
          madePostRequest = true;
          console.log('Successfully received response from sendAssistantMessage:', response?.status);
          
          // Add detailed logging about the response
          if (response) {
            console.log(`API response details - threadId: ${response.thread_id}, status: ${response.status}, hasReply: ${!!response.reply}`);
          } else {
            console.warn('API response is null');
          }
        } catch (postError) {
          console.error('POST request to sendAssistantMessage failed:', postError);
          // Don't show error yet, we'll try to recover
          
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
        clearTimeout(messageTimeout);
        
        // CRITICAL IMPROVEMENT: Set up a safety fallback that will always try to fetch messages 
        // regardless of the response type, to ensure we show proper messages if the backend creates them
        if (response && response.thread_id) {
          const newThreadId = response.thread_id;
          setThreadId(newThreadId); // Ensure thread ID is set immediately
          
          // Always attempt an immediate fetch to get the latest messages
          try {
            console.log(`Attempting immediate verification fetch for thread ${newThreadId}`);
            const verificationMessages = await getThreadMessagesWithRetry(newThreadId, 2, 500);
            
            if (verificationMessages && verificationMessages.length > 0) {
              console.log(`Immediate verification retrieved ${verificationMessages.length} messages!`);
              // Load the messages
              loadThreadMessages(verificationMessages);
              // Ensure loading state is cleared
              setIsLoading(false);
              return; // Skip the rest of the processing since we have verified messages
            } else {
              console.log("Immediate verification didn't find messages, continuing with normal processing");
              
              // Try a second immediate fetch with longer delay
              console.log("Attempting secondary immediate verification with longer delay");
              const secondVerificationMessages = await getThreadMessagesWithRetry(newThreadId, 3, 1000);
              
              if (secondVerificationMessages && secondVerificationMessages.length > 0) {
                console.log(`Secondary verification retrieved ${secondVerificationMessages.length} messages!`);
                loadThreadMessages(secondVerificationMessages);
                setIsLoading(false);
                return;
              }
            }
          } catch (verificationError) {
            console.warn('Error in immediate verification:', verificationError);
            // Continue with normal processing if verification fails
          }
          
          // Also set up a delayed fallback in case immediate fetch didn't work
          const fallbackDelay = 3000;
          console.log(`Setting up delayed fallback for thread ${newThreadId} to execute in ${fallbackDelay}ms`);
          
          setTimeout(async () => {
            try {
              // Only execute if we're still loading or if an error was shown
              if (isLoading || messages[messages.length - 1]?.content?.toLowerCase().includes('error')) {
                console.log(`Delayed fallback executing for thread ${newThreadId}`);
                const safetyMessages = await getThreadMessagesWithRetry(newThreadId, 2, 1000);
                
                if (safetyMessages && safetyMessages.length > 0) {
                  console.log(`Delayed fallback retrieved ${safetyMessages.length} messages!`);
                  
                  // Check if the last message was an error message
                  const lastMessage = messages[messages.length - 1];
                  const isLastMessageError = lastMessage?.role === 'assistant' && 
                                          lastMessage?.content?.toLowerCase().includes('error');
                  
                  if (isLastMessageError) {
                    // If the last message was an error, remove it and replace with the actual messages
                    console.log('Replacing error message with actual response');
                    setMessages(prev => {
                      // Create a new array without the last error message
                      const withoutError = prev.slice(0, prev.length - 1);
                      // Add a recovery notification
                      return [
                        ...withoutError,
                        {
                          role: 'assistant',
                          content: 'I found the response to your message:'
                        },
                        ...safetyMessages.filter(msg => msg.role === 'assistant')
                      ];
                    });
                  } else {
                    // Just load the messages normally
                    loadThreadMessages(safetyMessages);
                  }
                  
                  // Ensure loading state is cleared
                  setIsLoading(false);
                }
              } else {
                console.log('Delayed fallback not needed - already resolved');
              }
            } catch (fallbackError) {
              console.error('Error in delayed fallback:', fallbackError);
              // If we're still loading, clear it but don't show an error
              if (isLoading) {
                setIsLoading(false);
              }
            }
          }, fallbackDelay);
          
          // Continue with normal response processing only if we don't have verified messages
          if (response) {
            // Set a final safety timeout that will clear the loading state no matter what
            // Clear any existing safety timeout first
            if (safetyTimeoutRef.current) {
              clearTimeout(safetyTimeoutRef.current);
            }
            
            safetyTimeoutRef.current = setTimeout(() => {
              if (isLoading) {
                console.log(`Final safety timeout reached for thread ${response?.thread_id}, forcing loading state to clear`);
                
                // Add a message indicating we're still trying to get the response
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: "I've processed your message, but I'm having trouble displaying the response. Please try refreshing the conversation."
                }]);
                
                setIsLoading(false);
              }
              safetyTimeoutRef.current = null;
            }, 15000); // After 15 seconds, give up and clear loading state

            // Handle different response status types
            switch (response.status) {
              case 'success':
                // Success case - show the response
                const assistantMessage: Message = {
                  role: 'assistant',
                  content: response.reply
                };
                
                // Clear any safety timeouts on success
                if (safetyTimeoutRef.current) {
                  clearTimeout(safetyTimeoutRef.current);
                  safetyTimeoutRef.current = null;
                }
                
                // Check if the response has actual content
                if (response.reply && response.reply.trim() !== '') {
                  setMessages(prev => [...prev, assistantMessage]);
                  setIsLoading(false);
                } else {
                  console.log('Success status but empty reply, will attempt to fetch messages directly');
                  
                  // Try to fetch messages directly even though we got a success status
                  try {
                    const successMessages = await getThreadMessagesWithRetry(response.thread_id, 3, 800);
                    if (successMessages && successMessages.length > 0) {
                      console.log(`Retrieved ${successMessages.length} messages directly after success status`);
                      loadThreadMessages(successMessages);
                      setIsLoading(false);
                      return;
                    } else {
                      // If we can't get messages, fall back to the original (possibly empty) reply
                      console.log('Could not retrieve messages, using original reply');
                      setMessages(prev => [...prev, assistantMessage]);
                      setIsLoading(false);
                    }
                  } catch (successFetchError) {
                    console.error('Error fetching messages after success:', successFetchError);
                    // Fall back to the original response
                    setMessages(prev => [...prev, assistantMessage]);
                    setIsLoading(false);
                  }
                }
                break;
                
              case 'partial_success':
              case 'processing':
                // For partial_success or processing - keep loading state until refresh completes
                console.log(`Received ${response.status} status, waiting for refresh to complete`);
                
                // Track retries in a ref to avoid creating a new variable each time
                let retryCount = 0;
                const maxRetries = 3;
                
                // Clear any existing polling interval before creating a new one
                if (pollingIntervalRef.current) {
                  console.log('Clearing existing polling interval before starting a new one');
                  clearInterval(pollingIntervalRef.current);
                  pollingIntervalRef.current = null;
                }
                
                // Set a shorter timeout for these intermediate states to ensure we don't get stuck
                pollingIntervalRef.current = setInterval(() => {
                  if (!isLoading) {
                    // If we're no longer loading, clear the interval
                    console.log('Clearing polling interval - loading state already cleared');
                    clearInterval(pollingIntervalRef.current!);
                    pollingIntervalRef.current = null;
                    return;
                  }
                  
                  retryCount++;
                  console.log(`Polling attempt ${retryCount}/${maxRetries} for thread ${response?.thread_id || 'unknown'}`);
                  
                  // Try to fetch messages
                  if (response && response.thread_id) {
                    getThreadMessagesWithRetry(response.thread_id, 1, 500)
                      .then(messages => {
                        if (messages && messages.length > 0) {
                          console.log(`Polling retrieved ${messages.length} messages!`);
                          loadThreadMessages(messages);
                          setIsLoading(false);
                          clearInterval(pollingIntervalRef.current!);
                          pollingIntervalRef.current = null;
                        } else if (retryCount >= maxRetries) {
                          // If we've reached max retries, stop polling and clear loading state
                          console.log(`Max polling retries (${maxRetries}) reached, clearing loading state`);
                          setIsLoading(false);
                          clearInterval(pollingIntervalRef.current!);
                          pollingIntervalRef.current = null;
                          
                          // Add a message indicating we're still processing
                          setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: "I'm still processing your request. The response should appear soon, or you can try refreshing the conversation."
                          }]);
                        }
                      })
                      .catch(e => {
                        console.warn('Error during polling attempt:', e);
                        if (retryCount >= maxRetries) {
                          console.log(`Max polling retries (${maxRetries}) reached after error, clearing loading state`);
                          setIsLoading(false);
                          clearInterval(pollingIntervalRef.current!);
                          pollingIntervalRef.current = null;
                        }
                      });
                  } else if (retryCount >= maxRetries) {
                    // If no thread ID or max retries reached, clear loading state
                    console.log('No thread ID or max retries reached, clearing loading state');
                    setIsLoading(false);
                    clearInterval(pollingIntervalRef.current!);
                    pollingIntervalRef.current = null;
                  }
                }, 2000); // Poll every 2 seconds
                
                // Also set a maximum time limit for the polling
                setTimeout(() => {
                  if (pollingIntervalRef.current) {
                    console.log(`Maximum polling time reached for ${response?.status || 'unknown'} status, clearing interval`);
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                    
                    // Only update if we're still loading
                    if (isLoading) {
                      setIsLoading(false);
                      // Add a message indicating we're still trying to get the response
                      setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: "I've processed your request, but I'm having trouble retrieving the full response. You can try refreshing the conversation."
                      }]);
                    }
                  }
                }, 8000); // Maximum 8 seconds of polling
                
                break;
                
              case 'error':
                // For error status - wait for verification before showing error
                console.log('Received error status, waiting for verification before showing error');
                // The verification or fallback will handle errors, no need to show one now
                
                // But set a timeout to show error if verification doesn't complete
                setTimeout(() => {
                  // Only show error if we're still loading (verification didn't succeed)
                  if (isLoading) {
                    showErrorMessage(response?.error_message);
                  }
                }, 5000); // Wait 5 seconds before showing error
                break;
                
              default:
                // Default case - treat as success but let verification handle it
                console.log(`Received unknown status: ${response.status || 'undefined'}, waiting for verification`);
                // The verification or fallback will handle unknown status
                
                // Set a timeout to show error if verification doesn't complete
                setTimeout(() => {
                  // Only show error if we're still loading (verification didn't succeed)
                  if (isLoading) {
                    showErrorMessage();
                  }
                }, 5000); // Wait 5 seconds before showing error
            }
          } else {
            // Handle null response - wait for verification before showing error
            console.warn('Null response from sendAssistantMessage, waiting for verification');
            // The verification or fallback will handle null response
            
            // But set a timeout to show error if verification doesn't complete
            setTimeout(() => {
              // Only show error if we're still loading (verification didn't succeed)
              if (isLoading) {
                showErrorMessage();
              }
            }, 5000); // Wait 5 seconds before showing error
          }
        }
      } catch (innerError) {
        // Clear the timeout in case of error
        clearTimeout(messageTimeout);
        
        console.error('Error in inner try-catch of sendMessage:', innerError);
        
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

  // Function to load messages from a thread
  const loadThreadMessages = (threadMessages: Message[]) => {
    console.log(`Loading ${threadMessages.length} thread messages`);
    
    if (!threadMessages || threadMessages.length === 0) {
      console.warn('Attempted to load empty thread messages array');
      return;
    }
    
    setMessages(threadMessages);
  };
  
  const clearMessages = () => {
    setMessages([]);
    setThreadId(undefined);
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
        updateScreenContext
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
}; 