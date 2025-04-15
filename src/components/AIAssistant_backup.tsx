import React, { useState, useRef, useEffect } from 'react';
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
  Grow
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import RefreshIcon from '@mui/icons-material/Refresh';
import MinimizeIcon from '@mui/icons-material/Minimize';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import Draggable from 'react-draggable';

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
  
  return (
    <Tooltip title="Ask AI Assistant" placement="left">
      <Fab
        color="primary"
        size={isMobile ? "small" : "medium"}
        onClick={openAssistant}
        sx={{
          position: 'fixed',
          bottom: isMobile ? 16 : 24,
          right: isMobile ? 16 : 24,
          boxShadow: theme.shadows[4],
          background: 'linear-gradient(45deg, #1056F5 30%, #4B7FF7 90%)',
          zIndex: 1200,
        }}
      >
        <SmartToyIcon fontSize={isMobile ? "small" : "medium"} />
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
    clearMessages
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
    }
  }, [isOpen]);
  
  // Scroll to bottom of messages when new ones are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages]);
  
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (inputValue.trim()) {
      sendMessage(inputValue);
      setInputValue('');
    }
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
  
  // Filter out system messages for display
  const displayMessages = messages.filter(msg => msg.role !== 'system');
  
  return (
    <>
      {/* Hidden reference div positioned where we want the popover to anchor */}
      <div ref={buttonRef} style={{ position: 'fixed', bottom: isMobile ? 16 : 24, right: isMobile ? 16 : 24 }} />
      
      {isOpen && (
        <Draggable
          nodeRef={nodeRef}
          handle=".draggable-handle"
          bounds="parent"
          position={position}
          onStop={handleDragStop}
          cancel=".cancel-drag"
          disabled={isMobile} // Disable dragging on mobile for better UX
        >
          <Paper
            ref={nodeRef}
            elevation={6}
            sx={{
              width: isMobile ? (isSmallMobile ? '95vw' : '90vw') : '400px',
              height: isMobile ? '60vh' : '500px',
              maxHeight: isMobile ? '70vh' : '70vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              position: 'fixed',
              bottom: isMobile ? 80 : 80,
              right: isMobile ? 8 : 24,
              zIndex: 1300,
              transition: 'all 0.2s ease-out',
              cursor: 'auto',
              touchAction: 'none',
              willChange: 'transform',
              // On mobile, position it centered near the bottom with improved constraints
              ...(isMobile && {
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '95vw',
                minHeight: isSmallMobile ? '350px' : '400px', // Set minimum height for very small devices
              }),
              
              // On mobile, position it centered near the bottom with improved constraints
              ...(isMobile && {
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '95vw',
                minHeight: isSmallMobile ? '300px' : '350px', // Reduced minimum height 
                maxHeight: isSmallMobile ? '65vh' : '70vh', // Set maximum height based on viewport
              }),

              // On mobile, position it centered near the bottom with improved constraints
              ...(isMobile && {
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '95vw',
                minHeight: isSmallMobile ? '300px' : '350px', // Reduced minimum height 
                maxHeight: isSmallMobile ? '65vh' : '70vh', // Set maximum height based on viewport
              }),

              // On mobile, position it centered near the bottom with improved constraints
              ...(isMobile && {
                left: '50%',
                transform: 'translateX(-50%)',
                maxWidth: '95vw',
                minHeight: isSmallMobile ? '300px' : '350px', // Reduced minimum height 
                maxHeight: isSmallMobile ? '65vh' : '70vh', // Set maximum height based on viewport
              }),
            }}
          >
            {/* Header - Made draggable */}
            <Box
              className="draggable-handle"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: isMobile ? 1 : 1.5,
                backgroundColor: theme.palette.primary.main,
                color: 'white',
                borderTopLeftRadius: 2,
                borderTopRightRadius: 2,
                cursor: isMobile ? 'default' : 'move',
                '&:hover': { 
                  backgroundColor: theme.palette.primary.dark 
                },
                userSelect: 'none',
              }}
            >
              <Box display="flex" alignItems="center">
                {!isMobile && <DragIndicatorIcon sx={{ mr: 1, opacity: 0.7 }} />}
                <Avatar
                  sx={{
                    bgcolor: 'white',
                    mr: 1.5,
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                  }}
                >
                  <SmartToyIcon fontSize="small" sx={{ color: theme.palette.primary.main }} />
                </Avatar>
                <Typography variant={isMobile ? "body1" : "subtitle1"} fontWeight="medium">Pulse Assistant</Typography>
              </Box>
              <Box className="cancel-drag">
                <IconButton size="small" color="inherit" onClick={clearMessages} title="Clear chat">
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="inherit" onClick={handleClose} aria-label="close" 
                  sx={{ ml: isMobile ? 0.5 : 1 }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Messages area - Improved scrolling behavior */}
            <Box
              className="cancel-drag"
              sx={{
                flexGrow: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                p: isMobile ? 1 : 2,
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
              {displayMessages.length === 0 ? (
                <Box
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  height="100%"
                  p={isMobile ? 1 : 2}
                  textAlign="center"
                >
                  <SmartToyIcon 
                    fontSize="large" 
                    color="primary" 
                    sx={{ 
                      mb: isMobile ? 0.5 : 1,
                      fontSize: isMobile ? '1.75rem' : '2.5rem',
                      opacity: 0.8 
                    }} 
                  />
                  <Typography 
                    variant={isMobile ? "body1" : "subtitle1"} 
                    gutterBottom 
                    fontWeight="medium"
                    sx={{ mb: isMobile ? 0.5 : 1 }}
                  >
                    Welcome to Pulse Assistant
                  </Typography>
                  <Typography 
                    variant={isMobile ? "caption" : "body2"}
                    color="textSecondary"
                  >
                    Ask me anything about productivity, time management, or how to use this app!
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
                        mb: isMobile ? 1 : 1.5,
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 1,
                            alignSelf: 'flex-start',
                            width: isMobile ? 24 : 28,
                            height: isMobile ? 24 : 28,
                          }}
                        >
                          <SmartToyIcon sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
                        </Avatar>
                      )}

                      <Paper
                        elevation={0}
                        sx={{
                          p: isMobile ? 0.75 : 1.5,
                          maxWidth: isMobile ? '85%' : '75%',
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
                          ? <Typography variant="body2" sx={{ fontSize: isMobile ? '0.85rem' : '0.9rem' }}>
                              {msg.content}
                            </Typography>
                          : <Box sx={{ 
                              '& .MuiTypography-root': { 
                                fontSize: isMobile ? '0.85rem' : '0.9rem' 
                              } 
                            }}>
                              {formatMessageContent(msg.content)}
                            </Box>
                        }
                      </Paper>

                      {msg.role === 'user' && (
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.secondary.main,
                            ml: 1,
                            alignSelf: 'flex-start',
                            width: isMobile ? 24 : 28,
                            height: isMobile ? 24 : 28,
                          }}
                        >
                          <Typography variant="caption" sx={{ 
                            fontWeight: 'bold',
                            fontSize: isMobile ? '0.65rem' : '0.75rem'
                          }}>
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
                          width: isMobile ? 24 : 28,
                          height: isMobile ? 24 : 28,
                        }}
                      >
                        <SmartToyIcon sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }} />
                      </Avatar>

                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: 'white',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          minWidth: '60px',
                        }}
                      >
                        <CircularProgress size={isMobile ? 16 : 20} thickness={5} />
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
                p: isMobile ? 1 : 2,
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
                maxRows={isMobile ? 1 : 3} // Only 1 row on mobile to save space
                disabled={isLoading}
                size="small"
                inputRef={inputRef}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '20px',
                    backgroundColor: theme.palette.background.paper,
                    pr: 1,
                    fontSize: isMobile ? '0.85rem' : '0.9rem',
                    // Make input field more compact on mobile
                    ...(isMobile && {
                      py: 0.5, // Reduced vertical padding
                      minHeight: '36px', // Smaller minimum height
                    }),
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
        </Draggable>
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