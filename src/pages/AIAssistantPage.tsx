import React, { useEffect, useState, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container, 
  useTheme, 
  useMediaQuery, 
  IconButton,
  CircularProgress,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  InputAdornment,
  Tooltip,
  SwipeableDrawer,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Snackbar,
  Alert
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import { useNavigate } from 'react-router-dom';
import { 
  fetchAssistantThreads, 
  getThreadMessages, 
  Thread,
  updateThreadTitle
} from '../services/assistantService';
import { format, parseISO, isValid } from 'date-fns';

// Format thread date function
const formatThreadDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) {
      return 'Invalid date';
    }
    return format(date, 'MMM d, yyyy • h:mm a');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown date';
  }
};

// Re-use the formatMessageContent function from AIAssistant.tsx
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

const AIAssistantPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isSmallMobile = useMediaQuery('(max-width:380px)');
  const isVerySmallMobile = useMediaQuery('(max-width:320px)');
  const isShortScreen = useMediaQuery('(max-height:670px)');
  const isVeryShortScreen = useMediaQuery('(max-height:568px)'); // For iPhone SE and similar
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    threadId,
    setThreadId,
    loadThreadMessages,
    clearMessages
  } = useAIAssistant();
  
  const [input, setInput] = useState('');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [showThreadsList, setShowThreadsList] = useState(!isMobile); // Default open on desktop
  const [sidebarWidth, setSidebarWidth] = useState(isMobile ? '100%' : (isTablet ? 350 : 450));
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number | null>(null);
  const initialWidth = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Automatically scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Load threads when page opens
  useEffect(() => {
    loadThreadsList();
  }, []);

  // Function to navigate back to the previous page
  const handleBack = () => {
    navigate(-1);
  };

  const loadThreadsList = async () => {
    try {
      setIsLoadingThreads(true);
      const threadsData = await fetchAssistantThreads();
      if (threadsData) {
        // Sort threads by most recent first
        const sortedThreads = [...threadsData].sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setThreads(sortedThreads);
      }
      setIsLoadingThreads(false);
    } catch (error) {
      console.error("Failed to load threads:", error);
      setIsLoadingThreads(false);
    }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleThreadSelect = async (selectedThreadId: string) => {
    try {
      setThreadId(selectedThreadId);
      const threadMessages = await getThreadMessages(selectedThreadId);
      if (threadMessages) {
        loadThreadMessages(threadMessages);
      }
      if (isMobile) {
        setShowThreadsList(false);
      }
    } catch (error) {
      console.error("Failed to load thread messages:", error);
    }
  };

  const handleNewConversation = () => {
    clearMessages();
    setThreadId(undefined);
  };

  // Handlers for resizable sidebar
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
    resizeStartX.current = e.clientX;
    initialWidth.current = typeof sidebarWidth === 'string' 
      ? parseInt(sidebarWidth) 
      : sidebarWidth;
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing || resizeStartX.current === null || initialWidth.current === null) return;
    
    const diff = e.clientX - resizeStartX.current;
    const newWidth = Math.max(200, Math.min(500, initialWidth.current + diff));
    
    setSidebarWidth(newWidth);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    resizeStartX.current = null;
    initialWidth.current = null;
  };

  // Add event listeners for resize
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  // Add state for thread editing
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [isRenamingThread, setIsRenamingThread] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Handle Snackbar close
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: 'calc(100vh - 64px)', 
      width: '100%', 
      overflow: 'hidden',
      position: 'relative',
      bgcolor: theme.palette.grey[50]
    }}>
      {/* Left sidebar for conversation history */}
      {!isMobile && (
        <>
          {/* Conversation history expand button (visible when sidebar is collapsed) */}
          {!showThreadsList && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <IconButton
                onClick={() => setShowThreadsList(true)}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    bgcolor: theme.palette.primary.dark,
                  },
                  borderTopRightRadius: 16,
                  borderBottomRightRadius: 16,
                  borderTopLeftRadius: 0,
                  borderBottomLeftRadius: 0,
                  boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
                  p: 0
                }}
                size="small"
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          <Paper
            elevation={0}
            sx={{
              width: showThreadsList ? sidebarWidth : 0,
              overflow: 'hidden',
              transition: 'width 0.3s ease',
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              height: '100%',
              bgcolor: theme.palette.background.paper,
              borderRadius: 0
            }}
          >
            {showThreadsList && (
              <>
                <Box sx={{ 
                  p: 2, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Conversation History
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      startIcon={<RefreshIcon />}
                      size="small"
                      onClick={loadThreadsList}
                      disabled={isLoadingThreads}
                      sx={{ mr: 1 }}
                    >
                      Refresh
                    </Button>
                    <IconButton
                      onClick={() => setShowThreadsList(false)}
                      size="small"
                      sx={{ display: { xs: 'flex', md: 'flex' } }}
                    >
                      <ChevronLeftIcon />
                    </IconButton>
                  </Box>
                </Box>

                <ThreadsList 
                  threads={threads} 
                  threadId={threadId} 
                  isLoadingThreads={isLoadingThreads} 
                  handleThreadSelect={handleThreadSelect} 
                  formatThreadDate={formatThreadDate}
                  handleNewConversation={handleNewConversation}
                  onThreadDelete={loadThreadsList}
                />

                {/* Resize handle */}
                <Box
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: 5,
                    cursor: 'col-resize',
                    backgroundColor: 'transparent',
                    zIndex: 5,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.main,
                      opacity: 0.2
                    },
                    '&:active': {
                      backgroundColor: theme.palette.primary.main,
                      opacity: 0.3
                    }
                  }}
                  onMouseDown={handleResizeStart}
                />
              </>
            )}
          </Paper>
        </>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <SwipeableDrawer
          anchor="left"
          open={showThreadsList}
          onClose={() => setShowThreadsList(false)}
          onOpen={() => setShowThreadsList(true)}
          sx={{
            '& .MuiDrawer-paper': {
              width: isVerySmallMobile ? '90%' : (isSmallMobile ? '85%' : '80%'),
              maxWidth: { xs: 280, sm: 350 },
              boxSizing: 'border-box',
              borderTopRightRadius: { xs: 8, sm: 0 },
              borderBottomRightRadius: { xs: 8, sm: 0 },
              zIndex: 1300
            }
          }}
        >
          <Box sx={{ 
            p: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, sm: 2 }), 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
          }}>
            <Typography 
              variant="subtitle1" 
              fontWeight={600}
              sx={{ 
                fontSize: isVerySmallMobile ? '0.875rem' : (isSmallMobile ? '0.9375rem' : '1rem')
              }}
            >
              Conversation History
            </Typography>
            <IconButton 
              onClick={() => setShowThreadsList(false)}
              size={isVerySmallMobile ? "small" : "medium"}
              edge="end"
            >
              <CloseIcon fontSize={isVerySmallMobile ? "small" : "medium"} />
            </IconButton>
          </Box>
          
          <ThreadsList 
            threads={threads} 
            threadId={threadId} 
            isLoadingThreads={isLoadingThreads} 
            handleThreadSelect={handleThreadSelect} 
            formatThreadDate={formatThreadDate}
            handleNewConversation={handleNewConversation}
            onThreadDelete={loadThreadsList}
          />
        </SwipeableDrawer>
      )}

      {/* Main content area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%',
        width: isMobile ? '100%' : (showThreadsList ? `calc(100% - ${sidebarWidth}px)` : '100%'),
        transition: 'width 0.3s ease'
      }}>
        {/* Header */}
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            px: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, sm: 2, md: 3 }),
            py: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1, sm: 1.25, md: 1.5 }),
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
            bgcolor: theme.palette.background.paper,
            minHeight: isVerySmallMobile ? 48 : (isSmallMobile ? 56 : 64)
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <IconButton 
              onClick={handleBack} 
              sx={{ mr: isVerySmallMobile ? 0.5 : 1 }}
              size={isVerySmallMobile ? "small" : (isSmallMobile ? "medium" : "large")}
            >
              <ArrowBackIcon fontSize={isVerySmallMobile ? "small" : (isSmallMobile ? "medium" : "medium")} />
            </IconButton>
            <Typography 
              variant={isVerySmallMobile ? "subtitle2" : (isSmallMobile ? "subtitle1" : "h6")} 
              component="h1" 
              noWrap
              sx={{ 
                fontWeight: 500,
                fontSize: isVerySmallMobile ? '0.9rem' : (isSmallMobile ? '1rem' : { xs: '1.125rem', md: '1.25rem' })
              }}
            >
              AI Assistant
            </Typography>
          </Box>
          <Box>
            {isMobile && (
              <IconButton 
                onClick={() => setShowThreadsList(true)}
                sx={{
                  width: isVerySmallMobile ? '32px' : (isSmallMobile ? '36px' : { xs: '40px', md: '44px' }),
                  height: isVerySmallMobile ? '32px' : (isSmallMobile ? '36px' : { xs: '40px', md: '44px' })
                }}
                size={isVerySmallMobile ? "small" : "medium"}
              >
                <HistoryIcon fontSize={isVerySmallMobile ? "small" : "medium"} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Messages area */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          p: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, sm: 2, md: 3 }),
          bgcolor: theme.palette.grey[50]
        }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: isVerySmallMobile ? 1.5 : (isSmallMobile ? 2 : { xs: 2, sm: 2.5, md: 3 }),
              textAlign: 'center'
            }}>
              <SmartToyIcon sx={{ 
                fontSize: isVerySmallMobile ? 40 : (isSmallMobile ? 45 : { xs: 50, md: 60 }), 
                color: 'primary.main', 
                mb: isVerySmallMobile ? 1.25 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 2 }) 
              }} />
              <Typography 
                variant={isVerySmallMobile ? "body1" : (isSmallMobile ? "h6" : "h5")} 
                sx={{ 
                  mb: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1.5, md: 2 }),
                  fontSize: isVerySmallMobile ? '1rem' : (isSmallMobile ? '1.125rem' : { xs: '1.25rem', md: '1.5rem' }),
                  fontWeight: 500
                }}
              >
                Welcome to Pulse Assistant
              </Typography>
              <Typography 
                variant="body2" 
                color="textSecondary"
                sx={{ 
                  maxWidth: isVerySmallMobile ? '240px' : (isSmallMobile ? '260px' : { xs: '280px', md: '320px' }),
                  fontSize: isVerySmallMobile ? '0.8rem' : (isSmallMobile ? '0.85rem' : { xs: '0.9rem', md: '1rem' }),
                  lineHeight: 1.5
                }}
              >
                Ask me anything about productivity or how to use this app!
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%' }}>
              {messages.map((message, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex',
                    mb: isVerySmallMobile ? 1.5 : (isSmallMobile ? 2 : { xs: 2.5, md: 3 }),
                    alignItems: 'flex-start'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      mr: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, sm: 1.75, md: 2 }), 
                      width: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                      height: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                      bgcolor: message.role === 'assistant' ? 'primary.main' : 'rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {message.role === 'assistant' ? 
                      <SmartToyIcon sx={{ fontSize: isVerySmallMobile ? 16 : (isSmallMobile ? 18 : { xs: 20, md: 24 }) }} /> : 
                      <PersonIcon sx={{ fontSize: isVerySmallMobile ? 16 : (isSmallMobile ? 18 : { xs: 20, md: 24 }) }} />
                    }
                  </Avatar>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: isVerySmallMobile ? 1.25 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 2 }),
                      borderRadius: isVerySmallMobile ? 1.25 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 2 }),
                      bgcolor: message.role === 'assistant' ? 'rgba(16, 86, 245, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                      maxWidth: isVerySmallMobile ? 'calc(100% - 40px)' : (isSmallMobile ? 'calc(100% - 48px)' : { xs: 'calc(100% - 52px)', md: '85%' }),
                      wordBreak: 'break-word',
                      '& .MuiTypography-root': {
                        fontSize: isVerySmallMobile ? '0.85rem' : (isSmallMobile ? '0.9rem' : '1rem')
                      }
                    }}
                  >
                    {formatMessageContent(message.content)}
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: isVerySmallMobile ? 1 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 2 }) }}>
                  <CircularProgress size={isVerySmallMobile ? 20 : (isSmallMobile ? 24 : 30)} />
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Box>

        {/* Input area */}
        <Box 
          component="form" 
          onSubmit={handleSendMessage}
          sx={{ 
            p: isVerySmallMobile ? 1.25 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 2 }),
            borderTop: '1px solid rgba(0, 0, 0, 0.12)',
            bgcolor: theme.palette.background.paper
          }}
        >
          <Box sx={{ maxWidth: '900px', mx: 'auto', width: '100%' }}>
            <TextField
              fullWidth
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              variant="outlined"
              autoComplete="off"
              disabled={isLoading}
              sx={{ 
                mb: 0,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  pr: 0.75,
                  py: isVerySmallMobile ? 0.25 : (isSmallMobile ? 0.5 : { xs: 0.75, md: 1 }),
                  fontSize: isVerySmallMobile ? '0.8125rem' : (isSmallMobile ? '0.875rem' : { xs: '0.9375rem', md: '1rem' }),
                  backgroundColor: theme.palette.background.paper
                },
                '& .MuiOutlinedInput-input': {
                  pl: isVerySmallMobile ? 1.25 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 2 })
                }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      type="submit"
                      color="primary"
                      disabled={!input.trim() || isLoading}
                      size={isVerySmallMobile ? "small" : "medium"}
                      sx={{
                        width: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                        height: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                        mr: isVerySmallMobile ? -0.5 : (isSmallMobile ? -0.25 : 0)
                      }}
                    >
                      <SendIcon fontSize={isVerySmallMobile ? "small" : "medium"} />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Extracted ThreadsList component for cleaner organization
interface ThreadsListProps {
  threads: Thread[];
  threadId?: string;
  isLoadingThreads: boolean;
  handleThreadSelect: (threadId: string) => Promise<void>;
  formatThreadDate: (dateString: string) => string;
  handleNewConversation: () => void;
  onThreadDelete?: () => void;
}

const ThreadsList: React.FC<ThreadsListProps> = ({ 
  threads, 
  threadId, 
  isLoadingThreads, 
  handleThreadSelect,
  formatThreadDate,
  handleNewConversation,
  onThreadDelete
}) => {
  const theme = useTheme();
  const { deleteThread } = useAIAssistant();
  const [isDeleting, setIsDeleting] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery('(max-width:380px)');
  const isVerySmallMobile = useMediaQuery('(max-width:320px)');
  
  // Add state for thread editing
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [isRenamingThread, setIsRenamingThread] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  // Add snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  
  // Handle thread menu click
  const handleThreadMenuClick = (event: React.MouseEvent<HTMLElement>, threadId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setActiveThreadId(threadId);
  };
  
  // Handle menu close
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveThreadId(null);
  };
  
  // Handle delete click from menu
  const handleDeleteClick = (threadId: string) => {
    setThreadToDelete(threadId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  // Handle edit click from menu
  const handleEditClick = (threadId: string) => {
    const thread = threads.find(t => t.thread_id === threadId);
    if (thread) {
      setEditingThreadId(threadId);
      setNewThreadTitle(thread.title || '');
      setRenameError(null);
    }
    handleMenuClose();
  };
  
  // Handle deletion confirmation
  const handleConfirmDelete = async () => {
    if (!threadToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteThread(threadToDelete);
      if (success) {
        // Call the callback to reload the threads list
        if (onThreadDelete) {
          onThreadDelete();
        }
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setThreadToDelete(null);
    }
  };
  
  // Handle cancel delete
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setThreadToDelete(null);
  };
  
  // Handle rename/edit thread
  const handleRenameThread = async () => {
    if (!editingThreadId || !newThreadTitle || newThreadTitle.trim() === '') return;
    
    try {
      setIsRenamingThread(true);
      setRenameError(null);
      
      const updatedThread = await updateThreadTitle(editingThreadId, newThreadTitle.trim());
      
      if (updatedThread) {
        // Show success message
        setSnackbarMessage('Thread renamed successfully');
        setSnackbarOpen(true);
        
        // Call the callback to reload the threads list
        if (onThreadDelete) {
          onThreadDelete();
        }
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
  
  // Cancel thread title editing
  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent thread selection if event is provided
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
  
  // Handle Snackbar close
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1.25, sm: 1.5 }) }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleNewConversation}
          startIcon={<SmartToyIcon sx={{ fontSize: isVerySmallMobile ? 14 : (isSmallMobile ? 16 : 20) }} />}
          sx={{
            py: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
            fontSize: isVerySmallMobile ? '0.75rem' : (isSmallMobile ? '0.8125rem' : '0.875rem'),
            borderRadius: '6px'
          }}
        >
          {isVerySmallMobile ? "New" : (isSmallMobile ? "New Chat" : "New Conversation")}
        </Button>
      </Box>
      
      <List sx={{ 
        overflow: 'auto', 
        flexGrow: 1,
        py: 0
      }}>
        {isLoadingThreads ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: isVerySmallMobile ? 1.5 : (isSmallMobile ? 2 : 3) }}>
            <CircularProgress size={isVerySmallMobile ? 20 : (isSmallMobile ? 24 : 30)} />
          </Box>
        ) : threads.length > 0 ? (
          threads.map((thread) => (
            <ListItem 
              button 
              key={thread.thread_id}
              onClick={() => thread.thread_id !== editingThreadId && handleThreadSelect(thread.thread_id)}
              selected={threadId === thread.thread_id}
              divider
              sx={{ 
                py: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.5),
                px: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : 2),
                bgcolor: threadId === thread.thread_id ? 'rgba(16, 86, 245, 0.08)' : 'transparent',
                '&:hover': {
                  bgcolor: threadId === thread.thread_id 
                    ? 'rgba(16, 86, 245, 0.12)' 
                    : 'rgba(0, 0, 0, 0.04)'
                },
                position: 'relative'
              }}
              secondaryAction={
                thread.thread_id !== editingThreadId && (
                  <IconButton 
                    edge="end" 
                    aria-label="thread menu"
                    onClick={(e) => handleThreadMenuClick(e, thread.thread_id)}
                    size={isVerySmallMobile ? "small" : "medium"}
                    sx={{ 
                      color: 'text.secondary',
                      padding: isVerySmallMobile ? 0.5 : undefined
                    }}
                  >
                    <MoreVertIcon fontSize={isVerySmallMobile ? "small" : "medium"} />
                  </IconButton>
                )
              }
            >
              {thread.thread_id === editingThreadId ? (
                // Edit mode
                <Box sx={{ 
                  width: '100%', 
                  display: 'flex', 
                  alignItems: 'center',
                  py: isVerySmallMobile ? 0.25 : 0.5
                }}>
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
                    sx={{
                      '& .MuiInputBase-root': {
                        fontSize: isVerySmallMobile ? '0.8125rem' : (isSmallMobile ? '0.875rem' : '0.9375rem'),
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          {isRenamingThread ? (
                            <CircularProgress size={isVerySmallMobile ? 16 : 20} />
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
                  />
                </Box>
              ) : (
                // Normal display mode
                <>
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: 'primary.main',
                        width: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                        height: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                        mr: isVerySmallMobile ? 0.5 : undefined
                      }}
                    >
                      <SmartToyIcon sx={{ 
                        fontSize: isVerySmallMobile ? 16 : (isSmallMobile ? 18 : { xs: 20, md: 24 })
                      }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={thread.title || "New Conversation"} 
                    secondary={formatThreadDate(thread.created_at)}
                    primaryTypographyProps={{
                      noWrap: true,
                      fontWeight: threadId === thread.thread_id ? 600 : 400,
                      fontSize: isVerySmallMobile ? '0.8125rem' : (isSmallMobile ? '0.875rem' : { xs: '0.9375rem', md: '1rem' })
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      sx: { 
                        fontSize: isVerySmallMobile ? '0.65rem' : (isSmallMobile ? '0.7rem' : { xs: '0.75rem', md: '0.8rem' }),
                        mt: 0.25
                      }
                    }}
                  />
                </>
              )}
            </ListItem>
          ))
        ) : (
          <Box sx={{ p: isVerySmallMobile ? 1 : (isSmallMobile ? 1.5 : 2), textAlign: 'center' }}>
            <Typography 
              color="textSecondary"
              sx={{ fontSize: isVerySmallMobile ? '0.8rem' : (isSmallMobile ? '0.85rem' : { xs: '0.9rem', md: '1rem' }) }}
            >
              No conversations yet
            </Typography>
          </Box>
        )}
      </List>
      
      {/* Thread action menu */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          zIndex: 1400,
          '& .MuiPaper-root': {
            minWidth: isVerySmallMobile ? 120 : 150,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.15)'
          }
        }}
      >
        <MenuItem 
          onClick={() => activeThreadId && handleEditClick(activeThreadId)}
          sx={{ 
            py: isVerySmallMobile ? 0.75 : 1,
            fontSize: isVerySmallMobile ? '0.8125rem' : '0.875rem'
          }}
        >
          <EditIcon 
            fontSize="small" 
            sx={{ 
              mr: 1, 
              fontSize: isVerySmallMobile ? '1rem' : '1.25rem',
              color: theme.palette.primary.main
            }} 
          />
          Edit
        </MenuItem>
        <MenuItem 
          onClick={() => activeThreadId && handleDeleteClick(activeThreadId)}
          sx={{ 
            color: 'error.main',
            py: isVerySmallMobile ? 0.75 : 1,
            fontSize: isVerySmallMobile ? '0.8125rem' : '0.875rem'
          }}
        >
          <DeleteOutlineIcon 
            fontSize="small" 
            sx={{ 
              mr: 1, 
              fontSize: isVerySmallMobile ? '1rem' : '1.25rem'
            }} 
          />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        sx={{ 
          zIndex: 1500,
          '& .MuiDialog-paper': {
            width: isMobile ? 'calc(100% - 32px)' : 'auto',
            maxWidth: '450px',
            m: isMobile ? 2 : 'auto',
          }
        }}
      >
        <DialogTitle id="delete-dialog-title" sx={{
          fontSize: isVerySmallMobile ? '1rem' : (isSmallMobile ? '1.125rem' : '1.25rem'),
          pt: isVerySmallMobile ? 1.5 : 2
        }}>
          Delete Conversation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description" sx={{
            fontSize: isVerySmallMobile ? '0.875rem' : '1rem'
          }}>
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: isVerySmallMobile ? 1.5 : 2, pb: isVerySmallMobile ? 1.5 : 2 }}>
          <Button 
            onClick={handleCancelDelete} 
            color="primary"
            disabled={isDeleting}
            size={isVerySmallMobile ? "small" : "medium"}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            autoFocus
            disabled={isDeleting}
            size={isVerySmallMobile ? "small" : "medium"}
            startIcon={isDeleting ? <CircularProgress size={isVerySmallMobile ? 14 : 16} /> : <DeleteOutlineIcon />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AIAssistantPage; 