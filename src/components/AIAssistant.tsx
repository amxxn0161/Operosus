import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  IconButton,
  Paper,
  CircularProgress,
  Fab,
  Fade,
  Tooltip,
  useTheme,
  useMediaQuery,
  Avatar,
  Popper,
  ClickAwayListener,
  Grow,
  List,
  ListItem,
  ListItemText,
  Divider,
  InputAdornment
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RefreshIcon from '@mui/icons-material/Refresh';
import MinimizeIcon from '@mui/icons-material/Minimize';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import ReplayIcon from '@mui/icons-material/Replay';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import Draggable from 'react-draggable';
import { 
  fetchAssistantThreads, 
  getThreadMessages,
  getThreadMessagesWithRetry,
  Thread,
  updateThreadTitle
} from '../services/assistantService';
import { format } from 'date-fns';

// Function to format message content with markdown-like syntax
const formatMessageContent = (content: string): JSX.Element => {
  // Split by line breaks
  const lines = content.split('\n');
  
  // Function to convert URLs to links in a text
  const convertUrlsToLinks = (text: string): JSX.Element[] => {
    // If no content, return empty
    if (!text) return [];
    
    // More precise pattern for URL detection that won't include trailing punctuation
    const urlPattern = /https?:\/\/[-A-Za-z0-9+&@#/%?=~_|!:,.;]*[-A-Za-z0-9+&@#/%=~_|]/g;
    
    // Find all URLs in the text
    const matches = Array.from(text.matchAll(urlPattern));
    
    // If no URLs found, return the plain text
    if (matches.length === 0) {
      return [<span key="text">{text}</span>];
    }
    
    // Build result with proper links
    const result: JSX.Element[] = [];
    let lastIndex = 0;
    
    matches.forEach((match, i) => {
      const url = match[0];
      const startIndex = match.index!;
      
      // Add text before the URL
      if (startIndex > lastIndex) {
        result.push(
          <span key={`text-${i}`}>
            {text.substring(lastIndex, startIndex)}
          </span>
        );
      }
      
      // Add the URL as a link
      result.push(
        <a 
          key={`url-${i}`} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            color: '#1056F5', 
            textDecoration: 'underline',
            wordBreak: 'break-all'
          }}
        >
          {url}
        </a>
      );
      
      // Update the last index to after this URL
      lastIndex = startIndex + url.length;
    });
    
    // Add any remaining text after the last URL
    if (lastIndex < text.length) {
      result.push(
        <span key={`text-last`}>
          {text.substring(lastIndex)}
        </span>
      );
    }
    
    return result;
  };
  
  return (
    <>
      {lines.map((line, i) => {
        // Check if line is a header (starts with #)
        if (line.startsWith('# ')) {
          return <Typography key={i} variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{convertUrlsToLinks(line.substring(2))}</Typography>;
        }
        // Check if line is a subheader (starts with ##)
        else if (line.startsWith('## ')) {
          return <Typography key={i} variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>{convertUrlsToLinks(line.substring(3))}</Typography>;
        }
        // Check if line is a list item (starts with - or *)
        else if (line.match(/^[\-\*] /)) {
          return <Typography key={i} component="div" sx={{ ml: 2, mb: 0.5 }}>• {convertUrlsToLinks(line.substring(2))}</Typography>;
        }
        // Check if line is empty (for spacing)
        else if (line.trim() === '') {
          return <Box key={i} sx={{ height: '0.5rem' }} />;
        }
        // Regular paragraph
        else {
          return <Typography key={i} paragraph sx={{ mb: 1 }}>{convertUrlsToLinks(line)}</Typography>;
        }
      })}
    </>
  );
};

// Mini button to summon the assistant
export const AIAssistantButton: React.FC = () => {
  const { openAssistant } = useAIAssistant();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallMobile = useMediaQuery('(max-width:380px)');
  
  return (
    <Tooltip title="Ask AI Assistant" placement="left">
      <Fab
        color="primary"
        size={isMobile ? "small" : "medium"}
        onClick={openAssistant}
        sx={{
          position: 'fixed',
          bottom: isMobile 
            ? (isSmallMobile ? 12 : 16) 
            : 24,
          right: isMobile 
            ? (isSmallMobile ? 12 : 16) 
            : 24,
          boxShadow: theme.shadows[4],
          background: 'linear-gradient(45deg, #1056F5 30%, #4B7FF7 90%)',
          zIndex: 1200,
          width: isMobile 
            ? (isSmallMobile ? 36 : 40) 
            : 48,
          height: isMobile 
            ? (isSmallMobile ? 36 : 40) 
            : 48,
          minHeight: 'auto'
        }}
      >
        <SmartToyIcon 
          fontSize={isMobile ? "small" : "medium"} 
          sx={{
            fontSize: isSmallMobile ? '1.1rem' : undefined
          }}
        />
      </Fab>
    </Tooltip>
  );
};

// Main Assistant component
const AIAssistant: React.FC = () => {
  const { 
    isOpen, 
    closeAssistant, 
    messages, 
    isLoading, 
    sendMessage,
    clearMessages,
    loadThreadMessages,
    setThreadId,
    threadId
  } = useAIAssistant();
  const [inputValue, setInputValue] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallMobile = useMediaQuery('(max-width:380px)');
  const isVerySmallMobile = useMediaQuery('(max-width:320px)');
  const isShortScreen = useMediaQuery('(max-height:670px)');
  
  // Thread state management
  const [showThreads, setShowThreads] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [threadError, setThreadError] = useState<string | null>(null);
  const historyButtonRef = useRef<HTMLButtonElement>(null);
  
  // Thread renaming state
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [isRenamingThread, setIsRenamingThread] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  
  // Add state for refresh loading
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // State to track the last prompt for retry functionality
  const [lastPrompt, setLastPrompt] = useState<string>('');
  
  // Calculate center position for mobile
  const mobilePosition = useMemo(() => {
    return { x: 0, y: 0 };
  }, []);
  
  // Reset position when closing
  useEffect(() => {
    if (!isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);
  
  // Set the anchor element when the component mounts
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setAnchorEl(buttonRef.current);
      
      // Auto-refresh current thread data if we have a thread ID
      if (threadId) {
        setTimeout(async () => {
          try {
            const messages = await getThreadMessages(threadId);
            if (messages && messages.length > 0) {
              loadThreadMessages(messages);
            }
          } catch (error) {
            console.error("Error auto-refreshing thread data:", error);
          }
        }, 500);
      }
    }
  }, [isOpen, threadId]);
  
  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);
  
  // Auto-refresh data when loading is active for more than a few seconds
  useEffect(() => {
    // Only activate when we're showing a loading spinner
    if (isLoading && threadId) {
      // Set up a refresh interval when loading is active
      const refreshInterval = setInterval(async () => {
        try {
          console.log('Auto-refreshing conversation data while loading...');
          const messages = await getThreadMessages(threadId);
          if (messages && messages.length > 0) {
            // If we get messages, load them and stop the loading state
            loadThreadMessages(messages);
          }
        } catch (error) {
          console.error('Error auto-refreshing thread data:', error);
        }
      }, 3000); // Check every 3 seconds while loading is active
      
      // Clean up interval on unmount or when loading stops
      return () => clearInterval(refreshInterval);
    }
  }, [isLoading, threadId]);
  
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Store the current message for potential retry
    setLastPrompt(inputValue.trim());
    
    // Send message through context
    sendMessage(inputValue)
      .catch(error => {
        console.error('Error sending message:', error);
        // Don't show UI errors - this will be handled by AIAssistantContext
      });
    
    // Clear input
    setInputValue('');
  };
  
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleClose = () => {
    closeAssistant();
    setAnchorEl(null);
  };
  
  const handleDragStop = (e: any, data: any) => {
    setPosition({ x: data.x, y: data.y });
  };
  
  // Load threads when the dropdown is opened
  const handleThreadsOpen = () => {
    setShowThreads(true);
    loadThreadsList();
  };
  
  // Close threads dropdown
  const handleThreadsClose = () => {
    setShowThreads(false);
  };
  
  // Load the list of threads
  const loadThreadsList = async () => {
    try {
      setLoadingThreads(true);
      setThreadError(null);
      const threadsList = await fetchAssistantThreads();
      
      if (threadsList) {
        // Sort threads by creation date (newest first)
        const sortedThreads = [...threadsList].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setThreads(sortedThreads);
      } else {
        setThreadError("Failed to load conversation history");
      }
    } catch (err) {
      console.error("Error loading threads:", err);
      setThreadError("An error occurred while loading your conversation history");
    } finally {
      setLoadingThreads(false);
    }
  };
  
  // Handle thread selection
  const handleThreadSelect = async (threadId: string) => {
    try {
      setLoadingThreads(true);
      setShowThreads(false);
      
      // Find the selected thread to get its title
      const selectedThread = threads.find(t => t.thread_id === threadId);
      const threadTitle = selectedThread?.title || `Conversation ${threadId.substring(0, 8)}`;
      
      console.log(`Loading thread: "${threadTitle}" (${threadId})`);
      const messages = await getThreadMessages(threadId);
      
      if (messages) {
        console.log(`Loaded ${messages.length} messages from thread "${threadTitle}"`);
        // Set the thread ID first
        setThreadId(threadId);
        // Then load the messages into the UI
        loadThreadMessages(messages);
      } else {
        setThreadError(`Failed to load conversation: ${threadTitle}`);
        console.error(`No messages returned for thread ${threadId}`);
      }
    } catch (err) {
      console.error("Error loading thread messages:", err);
      setThreadError("An error occurred while loading this conversation");
    } finally {
      setLoadingThreads(false);
    }
  };
  
  // Format date for display
  const formatThreadDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  };
  
  // Extract preview of conversation from the thread title
  const getThreadPreview = (thread: Thread) => {
    // Use the thread title that was set by the backend
    return thread.title || `Conversation ${thread.thread_id.substring(0, 8)}`;
  };
  
  // Filter out system messages for display
  const displayMessages = messages.filter(msg => msg.role !== 'system');
  
  // Handle renaming a thread
  const handleRenameThread = async () => {
    if (!editingThreadId || !newThreadTitle || newThreadTitle.trim() === '') return;
    
    try {
      setIsRenamingThread(true);
      setRenameError(null);
      
      const updatedThread = await updateThreadTitle(editingThreadId, newThreadTitle.trim());
      
      if (updatedThread) {
        // Update the thread in the local state
        setThreads(threads.map(thread => 
          thread.thread_id === editingThreadId 
            ? { ...thread, title: updatedThread.title } 
            : thread
        ));
        
        // Exit edit mode
        setEditingThreadId(null);
        setNewThreadTitle('');
      } else {
        setRenameError("Failed to update thread title");
      }
    } catch (err) {
      console.error("Error renaming thread:", err);
      setRenameError("An error occurred while renaming the thread");
    } finally {
      setIsRenamingThread(false);
    }
  };
  
  // Start editing a thread title
  const handleStartRename = (thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent thread selection
    setEditingThreadId(thread.thread_id);
    setNewThreadTitle(thread.title || '');
    setRenameError(null);
  };
  
  // Cancel thread title editing
  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent thread selection
    setEditingThreadId(null);
    setNewThreadTitle('');
    setRenameError(null);
  };
  
  // Handle keydown events in the rename input
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameThread();
    } else if (e.key === 'Escape') {
      setEditingThreadId(null);
      setNewThreadTitle('');
    }
  };
  
  // Update the thread list rendering for both mobile and desktop with rename functionality
  const renderThreadList = () => (
    <List sx={{ p: 0 }}>
      {threads.map((thread, index) => (
        <React.Fragment key={thread.thread_id}>
          <ListItem 
            button 
            onClick={() => thread.thread_id !== editingThreadId && handleThreadSelect(thread.thread_id)}
            sx={{ 
              py: 1.5,
              '&:hover': {
                backgroundColor: 'rgba(16, 86, 245, 0.04)',
              }
            }}
          >
            {thread.thread_id === editingThreadId ? (
              // Edit mode
              <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  autoFocus
                  value={newThreadTitle || ''}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  placeholder="Enter thread title"
                  error={!!renameError}
                  helperText={renameError}
                  disabled={isRenamingThread}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {isRenamingThread ? (
                          <CircularProgress size={20} />
                        ) : (
                          <>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={handleRenameThread}
                              disabled={!newThreadTitle || newThreadTitle.trim() === ''}
                              sx={{ mr: 0.5 }}
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={handleCancelRename}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                      </InputAdornment>
                    ),
                  }}
                  sx={{ pr: 0.5 }}
                />
              </Box>
            ) : (
              // Display mode
              <>
                <ListItemText
                  primary={thread.title || `Conversation ${thread.thread_id.substring(0, 8)}`}
                  secondary={formatThreadDate(thread.created_at)}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: 500,
                    sx: { 
                      color: 'text.primary',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    sx: { color: 'text.secondary' }
                  }}
                />
                <IconButton 
                  size="small" 
                  onClick={(e) => handleStartRename(thread, e)}
                  sx={{ 
                    opacity: 0.6,
                    '&:hover': { opacity: 1 }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </ListItem>
          {index < threads.length - 1 && <Divider component="li" />}
        </React.Fragment>
      ))}
    </List>
  );
  
  // Add refreshConversation handler
  const refreshConversation = async () => {
    // Allow refreshing even if loading, to help recover from stuck states
    if (isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      
      if (threadId) {
        console.log(`Manually refreshing conversation for thread ${threadId}`);
        
        // Use the retry function for more reliability
        const refreshedMessages = await getThreadMessagesWithRetry(threadId, 2, 1000);
        
        if (refreshedMessages && refreshedMessages.length > 0) {
          console.log(`Successfully refreshed ${refreshedMessages.length} messages`);
          loadThreadMessages(refreshedMessages);
          return; // Exit early on success
        } else {
          console.warn(`No messages found during manual refresh for thread ${threadId}`);
        }
      } else {
        console.log('No thread ID available for refresh, attempting to find most recent thread');
        
        // Try to get the most recent thread if we don't have a threadId
        try {
          const threads = await fetchAssistantThreads();
          
          if (threads && threads.length > 0) {
            // Sort by creation time (newest first)
            threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            // Get the most recent thread
            const mostRecentThread = threads[0];
            console.log(`Found most recent thread: ${mostRecentThread.thread_id}`);
            
            // Set the thread ID
            setThreadId(mostRecentThread.thread_id);
            
            // Try to fetch messages
            const recentMessages = await getThreadMessagesWithRetry(mostRecentThread.thread_id, 3, 800);
            if (recentMessages && recentMessages.length > 0) {
              console.log(`Successfully fetched ${recentMessages.length} messages from most recent thread`);
              loadThreadMessages(recentMessages);
              return; // Exit early on success
            }
          } else {
            console.log('No threads found during refresh attempt');
          }
        } catch (findThreadError) {
          console.error('Error finding recent threads during refresh:', findThreadError);
        }
      }
      
      // If we get here, neither approach worked
      console.warn('Refresh was not successful');
      // We could show a notification here if desired
      
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Function to retry sending the last prompt
  const handleRetry = () => {
    if (lastPrompt) {
      console.log('Retrying last prompt:', lastPrompt);
      
      // If we have a thread ID, try refreshing first to see if the message is already there
      if (threadId) {
        console.log(`Thread ID exists (${threadId}), trying to refresh before resending`);
        refreshConversation().then(() => {
          // If we still need to retry after refresh, use sendMessage
          // We could add logic here to check if the last message matches what we're retrying
          // For now, always resend to be safe
          sendMessage(lastPrompt);
        }).catch(error => {
          console.error('Error during pre-retry refresh:', error);
          // Fall back to sendMessage if refresh fails
          sendMessage(lastPrompt);
        });
      } else {
        // If no thread ID, just send the message normally
        sendMessage(lastPrompt);
      }
    } else {
      console.warn('No last prompt available to retry');
    }
  };
  
  // Remove the separate thread view rendering and keep just the regular assistant view
  return (
    <>
      {/* Hidden reference div positioned where we want the popover to anchor */}
      <div 
        ref={buttonRef} 
        style={{ 
          position: 'fixed', 
          bottom: isMobile ? undefined : 24, 
          right: isMobile ? undefined : 24,
          top: isMobile ? '50%' : undefined,
          left: isMobile ? '50%' : undefined,
          zIndex: 9998
        }} 
      />
      
      {isOpen && (
        isMobile ? (
          // Mobile view - use a fixed position dialog
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paper
              ref={nodeRef}
              elevation={6}
              sx={{
                width: isVerySmallMobile ? '90%' : (isSmallMobile ? '85%' : '80%'),
                height: isShortScreen ? '70%' : '75%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: isSmallMobile ? 0.75 : 1,
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              >
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: 'white',
                      mr: 1.5,
                      width: isSmallMobile ? 24 : 28,
                      height: isSmallMobile ? 24 : 28,
                    }}
                  >
                    <SmartToyIcon 
                      fontSize="small" 
                      sx={{ 
                        color: theme.palette.primary.main,
                        fontSize: isSmallMobile ? '0.8rem' : undefined
                      }} 
                    />
                  </Avatar>
                  <Typography 
                    variant={isSmallMobile ? "body2" : "body1"} 
                    fontWeight="medium"
                  >
                    Pulse Assistant
                  </Typography>
                </Box>
                <Box>
                  {/* Refresh button */}
                  <IconButton 
                    size="small" 
                    color="inherit" 
                    onClick={refreshConversation}
                    disabled={isRefreshing || isLoading}
                    title="Refresh conversation"
                    sx={{ opacity: !threadId ? 0.7 : 1, mr: isSmallMobile ? 0.5 : 1 }}
                  >
                    {isRefreshing ? (
                      <CircularProgress size={isSmallMobile ? 16 : 20} color="inherit" thickness={5} />
                    ) : (
                      <RefreshIcon fontSize="small" />
                    )}
                  </IconButton>
                  {/* History button with popover menu */}
                  <IconButton 
                    ref={historyButtonRef}
                    size="small" 
                    color="inherit" 
                    onClick={handleThreadsOpen}
                    title="View conversation history"
                    sx={{ mr: isSmallMobile ? 0.5 : 1 }}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                  {/* Threads menu popover */}
                  <Popper
                    open={showThreads}
                    anchorEl={historyButtonRef.current}
                    placement="bottom-end"
                    transition
                    style={{ zIndex: 9999 }}
                  >
                    {({ TransitionProps }) => (
                      <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: 'right top' }}
                      >
                        <Paper
                          elevation={6}
                          sx={{
                            width: isSmallMobile ? 240 : 280,
                            maxHeight: 400,
                            overflowY: 'auto',
                            mt: 1,
                            borderRadius: 1,
                          }}
                        >
                          <ClickAwayListener onClickAway={handleThreadsClose}>
                            <Box>
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  backgroundColor: theme.palette.primary.main,
                                  color: 'white',
                                }}
                              >
                                <Typography variant="subtitle2">Conversation History</Typography>
                              </Box>
                              {loadingThreads ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                  <CircularProgress size={24} />
                                </Box>
                              ) : threadError ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                  <Typography color="error" variant="body2">{threadError}</Typography>
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ mt: 1 }} 
                                    onClick={loadThreadsList}
                                  >
                                    Try Again
                                  </Button>
                                </Box>
                              ) : threads.length === 0 ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                  <Typography color="textSecondary" variant="body2">
                                    No saved conversations found
                                  </Typography>
                                </Box>
                              ) : (
                                renderThreadList()
                              )}
                            </Box>
                          </ClickAwayListener>
                        </Paper>
                      </Grow>
                    )}
                  </Popper>
                  <IconButton size="small" color="inherit" onClick={clearMessages} title="New conversation">
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="inherit" onClick={handleClose} aria-label="close" 
                    sx={{ ml: isSmallMobile ? 0.5 : 1 }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages area */}
              <Box
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  p: isSmallMobile ? 0.75 : 1,
                  backgroundColor: '#f5f7fa',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d4d4d4 #f5f7fa',
                  '&::-webkit-scrollbar': {
                    width: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#d4d4d4',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f5f7fa',
                  },
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Rest of the message area code */}
                {displayMessages.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  p={isSmallMobile ? 0.5 : 0.75}
                  textAlign="center"
                  sx={{
                    maxWidth: '85%',
                    margin: '0 auto'
                  }}
                >
                  <SmartToyIcon 
                    fontSize="large" 
                    color="primary" 
                    sx={{ 
                      mb: 0.5, 
                      fontSize: isSmallMobile ? '1.2rem' : '1.4rem',
                      opacity: 0.8 
                    }} 
                  />
                  <Typography 
                    variant={isSmallMobile ? "body2" : "body1"} 
                    gutterBottom 
                    fontWeight="medium"
                    sx={{ mb: 0.4 }}
                  >
                    Welcome to Pulse Assistant
                  </Typography>
                  <Typography 
                    variant="caption"
                    color="textSecondary"
                    sx={{ 
                      fontSize: isSmallMobile ? '0.68rem' : '0.75rem',
                      lineHeight: 1.2,
                    }}
                  >
                    Ask me about productivity or app usage!
                  </Typography>
                </Box>
              ) : (
                <>
                  {displayMessages.map((msg, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        mb: isSmallMobile ? 1 : 1.25,
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 1,
                            alignSelf: 'flex-start',
                            width: isSmallMobile ? 20 : 24,
                            height: isSmallMobile ? 20 : 24,
                          }}
                        >
                          <SmartToyIcon sx={{ 
                            fontSize: isSmallMobile ? '0.65rem' : '0.75rem'
                          }} />
                        </Avatar>
                      )}

                      <Paper
                        elevation={0}
                        sx={{
                          p: isSmallMobile ? 0.75 : 1,
                          maxWidth: isSmallMobile ? '80%' : '82%',
                          borderRadius: 2,
                          backgroundColor: msg.role === 'user'
                            ? theme.palette.primary.main
                            : 'white',
                          color: msg.role === 'user'
                            ? 'white'
                            : theme.palette.text.primary,
                          ml: msg.role === 'user' ? 1 : 0,
                          mr: msg.role === 'assistant' ? 1 : 0,
                        }}
                      >
                        {msg.role === 'user'
                          ? <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: isSmallMobile ? '0.75rem' : '0.8rem',
                                wordBreak: 'break-word' 
                              }}
                            >
                              {msg.content}
                            </Typography>
                          : <Box sx={{ 
                              '& .MuiTypography-root': { 
                                fontSize: isSmallMobile ? '0.75rem' : '0.8rem',
                                wordBreak: 'break-word'
                              } 
                            }}>
                              {formatMessageContent(msg.content)}
                              
                              {/* Add Retry button for error messages */}
                              {msg.role === 'assistant' && 
                                (msg.content.toLowerCase().includes('error') || 
                                 msg.content.toLowerCase().includes('apologize') ||
                                 msg.content.toLowerCase().includes('sorry') ||
                                 msg.content.toLowerCase().includes('couldn\'t process') ||
                                 msg.content.toLowerCase().includes('issue') ||
                                 msg.content.toLowerCase().includes('couldn\'t retrieve')) && 
                                lastPrompt && (
                                <Box sx={{ mt: 1, textAlign: 'right' }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleRetry}
                                    startIcon={<ReplayIcon fontSize="small" />}
                                    sx={{ 
                                      fontSize: isSmallMobile ? '0.7rem' : '0.75rem',
                                      py: isSmallMobile ? 0.5 : 0.75
                                    }}
                                  >
                                    Retry
                                  </Button>
                                </Box>
                              )}
                            </Box>
                        }
                      </Paper>

                      {msg.role === 'user' && (
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            ml: 1,
                            alignSelf: 'flex-start',
                            width: 28,
                            height: 28
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {localStorage.getItem('userName')?.[0] || 'U'}
                          </Typography>
                        </Avatar>
                      )}
                    </Box>
                  ))}

                  {isLoading && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-start',
                        mb: isSmallMobile ? 1 : 1.25,
                      }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: theme.palette.primary.main,
                          mr: 1,
                          alignSelf: 'flex-start',
                          width: isSmallMobile ? 20 : 24,
                          height: isSmallMobile ? 20 : 24,
                        }}
                      >
                        <SmartToyIcon sx={{ 
                          fontSize: isSmallMobile ? '0.65rem' : '0.75rem'
                        }} />
                      </Avatar>

                      <Paper
                        elevation={0}
                        sx={{
                          p: isSmallMobile ? 1 : 1.5,
                          borderRadius: 2,
                          backgroundColor: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          minWidth: isSmallMobile ? '60px' : '80px',
                        }}
                      >
                        <CircularProgress 
                          size={isSmallMobile ? 16 : 20}
                          thickness={5} 
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: isSmallMobile ? '0.7rem' : '0.8rem' }}>
                          Processing...
                        </Typography>
                      </Paper>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
              </Box>

              {/* Input area */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{
                  p: isSmallMobile ? 0.75 : 1, 
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: 'white',
                  pt: isSmallMobile ? 0.4 : 0.6,
                  pb: isSmallMobile ? 0.4 : 0.6
                }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Ask a question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  multiline
                  maxRows={2}
                  disabled={isLoading}
                  size="small"
                  inputRef={inputRef}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                      backgroundColor: theme.palette.background.paper,
                      pr: 1,
                      fontSize: isSmallMobile ? '0.8rem' : '0.85rem',
                      ...(isSmallMobile && {
                        py: 0.5,
                        px: 1
                      })
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        size="small"
                        sx={{
                          ml: 1,
                          bgcolor: inputValue.trim() ? theme.palette.primary.main : 'transparent',
                          color: inputValue.trim() ? 'white' : theme.palette.text.disabled,
                          '&:hover': {
                            bgcolor: inputValue.trim() ? theme.palette.primary.dark : 'transparent',
                          },
                          '&.Mui-disabled': {
                            bgcolor: 'transparent'
                          },
                          width: isMobile ? 26 : 30,
                          height: isMobile ? 26 : 30,
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    )
                  }}
                />
              </Box>
            </Paper>
          </Box>
        ) : (
          // Desktop view - use draggable approach
          <Draggable
            nodeRef={nodeRef}
            handle=".draggable-handle"
            bounds="parent"
            position={position}
            onStop={handleDragStop}
            cancel=".cancel-drag"
          >
            <Paper
              ref={nodeRef}
              elevation={6}
              sx={{
                width: '400px',
                height: '500px',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                position: 'fixed',
                bottom: 80,
                right: 24,
                zIndex: 9999,
                transition: 'all 0.2s ease-out',
                cursor: 'auto',
                touchAction: 'none',
                willChange: 'transform',
              }}
            >
              {/* Header - Made draggable */}
              <Box
                className="draggable-handle"
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 1.5,
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                  cursor: 'move',
                  '&:hover': { 
                    backgroundColor: theme.palette.primary.dark 
                  },
                  userSelect: 'none',
                }}
              >
                <Box display="flex" alignItems="center">
                  <DragIndicatorIcon sx={{ mr: 1, opacity: 0.7 }} />
                  <Avatar
                    sx={{
                      bgcolor: 'white',
                      mr: 1.5,
                      width: 32,
                      height: 32,
                    }}
                  >
                    <SmartToyIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight="medium">Pulse Assistant</Typography>
                </Box>
                <Box className="cancel-drag">
                  {/* Refresh button */}
                  <IconButton 
                    size="small" 
                    color="inherit" 
                    onClick={refreshConversation}
                    disabled={isRefreshing || isLoading}
                    title="Refresh conversation"
                    sx={{ opacity: !threadId ? 0.7 : 1, mr: isSmallMobile ? 0.5 : 1 }}
                  >
                    {isRefreshing ? (
                      <CircularProgress size={isSmallMobile ? 16 : 20} color="inherit" thickness={5} />
                    ) : (
                      <RefreshIcon fontSize="small" />
                    )}
                  </IconButton>
                  {/* History button with dropdown */}
                  <IconButton 
                    ref={historyButtonRef}
                    size="small" 
                    color="inherit" 
                    onClick={handleThreadsOpen}
                    title="View conversation history"
                    className="cancel-drag"
                    sx={{ mr: 0.5 }}
                  >
                    <HistoryIcon fontSize="small" />
                  </IconButton>
                  {/* Threads menu popover */}
                  <Popper
                    open={showThreads}
                    anchorEl={historyButtonRef.current}
                    placement="bottom-end"
                    transition
                    style={{ zIndex: 9999 }}
                    className="cancel-drag"
                  >
                    {({ TransitionProps }) => (
                      <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: 'right top' }}
                      >
                        <Paper
                          elevation={6}
                          sx={{
                            width: 280,
                            maxHeight: 400,
                            overflowY: 'auto',
                            mt: 1,
                            borderRadius: 1,
                          }}
                        >
                          <ClickAwayListener onClickAway={handleThreadsClose}>
                            <Box>
                              <Box
                                sx={{
                                  p: 1.5,
                                  borderBottom: '1px solid',
                                  borderColor: 'divider',
                                  backgroundColor: theme.palette.primary.main,
                                  color: 'white',
                                }}
                              >
                                <Typography variant="subtitle2">Conversation History</Typography>
                              </Box>
                              {loadingThreads ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                  <CircularProgress size={24} />
                                </Box>
                              ) : threadError ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                  <Typography color="error" variant="body2">{threadError}</Typography>
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    sx={{ mt: 1 }} 
                                    onClick={loadThreadsList}
                                  >
                                    Try Again
                                  </Button>
                                </Box>
                              ) : threads.length === 0 ? (
                                <Box sx={{ p: 2, textAlign: 'center' }}>
                                  <Typography color="textSecondary" variant="body2">
                                    No saved conversations found
                                  </Typography>
                                </Box>
                              ) : (
                                renderThreadList()
                              )}
                            </Box>
                          </ClickAwayListener>
                        </Paper>
                      </Grow>
                    )}
                  </Popper>
                  <IconButton size="small" color="inherit" onClick={clearMessages} title="New conversation" className="cancel-drag">
                    <AddIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="inherit" onClick={handleClose} aria-label="close" sx={{ ml: 1 }} className="cancel-drag">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {/* Messages area */}
              <Box
                className="cancel-drag"
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  p: 2,
                  backgroundColor: '#f5f7fa',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#d4d4d4 #f5f7fa',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: '#d4d4d4',
                    borderRadius: '4px',
                  },
                  '&::-webkit-scrollbar-track': {
                    backgroundColor: '#f5f7fa',
                  },
                  overscrollBehavior: 'contain',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {/* Desktop messages - reuse existing code */}
                {displayMessages.length === 0 ? (
                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    height="100%"
                    p={2}
                    textAlign="center"
                  >
                    <SmartToyIcon fontSize="large" color="primary" sx={{ mb: 1, fontSize: '2.5rem', opacity: 0.8 }} />
                    <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                      Welcome to Pulse Assistant
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Ask me anything about productivity or how to use this app!
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {displayMessages.map((msg, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          mb: 1.5,
                        }}
                      >
                        {msg.role === 'assistant' && (
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              mr: 1,
                              alignSelf: 'flex-start',
                              width: 28,
                              height: 28,
                            }}
                          >
                            <SmartToyIcon sx={{ fontSize: '0.875rem' }} />
                          </Avatar>
                        )}

                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            maxWidth: '75%',
                            borderRadius: 2,
                            backgroundColor: msg.role === 'user'
                              ? theme.palette.primary.main
                              : 'white',
                            color: msg.role === 'user'
                              ? 'white'
                              : theme.palette.text.primary,
                            ml: msg.role === 'user' ? 1 : 0,
                            mr: msg.role === 'assistant' ? 1 : 0,
                          }}
                        >
                          {msg.role === 'user'
                            ? <Typography variant="body2" sx={{ fontSize: '0.9rem' }}>
                                {msg.content}
                              </Typography>
                            : <Box sx={{ '& .MuiTypography-root': { fontSize: '0.9rem' } }}>
                                {formatMessageContent(msg.content)}
                                
                                {/* Add Retry button for error messages */}
                                {msg.role === 'assistant' && 
                                  (msg.content.toLowerCase().includes('error') || 
                                   msg.content.toLowerCase().includes('apologize') ||
                                   msg.content.toLowerCase().includes('sorry') ||
                                   msg.content.toLowerCase().includes('couldn\'t process') ||
                                   msg.content.toLowerCase().includes('issue') ||
                                   msg.content.toLowerCase().includes('couldn\'t retrieve')) && 
                                  lastPrompt && (
                                  <Box sx={{ mt: 1, textAlign: 'right' }}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      onClick={handleRetry}
                                      startIcon={<ReplayIcon fontSize="small" />}
                                      sx={{ 
                                        fontSize: '0.75rem',
                                        py: 0.75
                                      }}
                                    >
                                      Retry
                                    </Button>
                                  </Box>
                                )}
                              </Box>
                          }
                        </Paper>

                        {msg.role === 'user' && (
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.secondary.main,
                              ml: 1,
                              alignSelf: 'flex-start',
                              width: 28,
                              height: 28
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                              {localStorage.getItem('userName')?.[0] || 'U'}
                            </Typography>
                          </Avatar>
                        )}
                      </Box>
                    ))}

                    {isLoading && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          mb: 1.5,
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 1,
                            alignSelf: 'flex-start',
                            width: 28,
                            height: 28,
                          }}
                        >
                          <SmartToyIcon sx={{ fontSize: '0.875rem' }} />
                        </Avatar>

                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            backgroundColor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: '90px',
                          }}
                        >
                          <CircularProgress size={20} thickness={5} sx={{ mr: 1.5 }} />
                          <Typography variant="body2" color="text.secondary">
                            Processing...
                          </Typography>
                        </Paper>
                      </Box>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </Box>

              {/* Input area */}
              <Box
                component="form"
                onSubmit={handleSendMessage}
                className="cancel-drag"
                sx={{
                  p: 2, 
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: 'white',
                }}
              >
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Ask a question..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  multiline
                  maxRows={3}
                  disabled={isLoading}
                  size="small"
                  inputRef={inputRef}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                      backgroundColor: theme.palette.background.paper,
                      pr: 1,
                      fontSize: '0.9rem'
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <IconButton
                        color="primary"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isLoading}
                        size="small"
                        sx={{
                          ml: 1,
                          bgcolor: inputValue.trim() ? theme.palette.primary.main : 'transparent',
                          color: inputValue.trim() ? 'white' : theme.palette.text.disabled,
                          '&:hover': {
                            bgcolor: inputValue.trim() ? theme.palette.primary.dark : 'transparent',
                          },
                          '&.Mui-disabled': {
                            bgcolor: 'transparent'
                          },
                          width: 30,
                          height: 30,
                        }}
                      >
                        <SendIcon fontSize="small" />
                      </IconButton>
                    )
                  }}
                />
              </Box>
            </Paper>
          </Draggable>
        )
      )}

      {/* Floating button to open assistant */}
      {!isOpen && (
        <Box>
          <AIAssistantButton />
        </Box>
      )}
    </>
  );
};

export default AIAssistant; 