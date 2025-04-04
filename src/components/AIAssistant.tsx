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
  
  return (
    <>
      {lines.map((line, i) => {
        // Check if line is a header (starts with #)
        if (line.startsWith('# ')) {
          return <Typography key={i} variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{line.substring(2)}</Typography>;
        }
        // Check if line is a subheader (starts with ##)
        else if (line.startsWith('## ')) {
          return <Typography key={i} variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>{line.substring(3)}</Typography>;
        }
        // Check if line is a list item (starts with - or *)
        else if (line.match(/^[\-\*] /)) {
          return <Typography key={i} component="div" sx={{ ml: 2, mb: 0.5 }}>• {line.substring(2)}</Typography>;
        }
        // Check if line is empty (for spacing)
        else if (line.trim() === '') {
          return <Box key={i} sx={{ height: '0.5rem' }} />;
        }
        // Regular paragraph
        else {
          return <Typography key={i} paragraph sx={{ mb: 1 }}>{line}</Typography>;
        }
      })}
    </>
  );
};

// Mini button to summon the assistant
export const AIAssistantButton: React.FC = () => {
  const { openAssistant } = useAIAssistant();
  const theme = useTheme();
  
  return (
    <Tooltip title="Ask AI Assistant" placement="left">
      <Fab
        color="primary"
        size="medium"
        onClick={openAssistant}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          boxShadow: theme.shadows[4],
          background: 'linear-gradient(45deg, #1056F5 30%, #4B7FF7 90%)',
          zIndex: 1200,
        }}
      >
        <SmartToyIcon />
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
      <div ref={buttonRef} style={{ position: 'fixed', bottom: 24, right: 24 }} />
      
      {isOpen && (
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
              width: isMobile ? '90vw' : '400px',
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
              zIndex: 1300,
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
                <IconButton size="small" color="inherit" onClick={clearMessages} title="Clear chat">
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="inherit" onClick={handleClose} aria-label="close">
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
                          ? <Typography variant="body2">{msg.content}</Typography>
                          : <Box sx={{ '& .MuiTypography-root': { fontSize: '0.9rem' } }}>
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
                            width: 28,
                            height: 28,
                          }}
                        >
                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
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
                          justifyContent: 'center',
                          alignItems: 'center',
                          minWidth: '60px',
                        }}
                      >
                        <CircularProgress size={20} thickness={5} />
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
                    fontSize: '0.9rem',
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