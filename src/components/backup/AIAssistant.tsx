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
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import Draggable, { DraggableEvent, DraggableData } from 'react-draggable';

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

// Update the Message interface to match the one in AIAssistantContext
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
  const nodeRef = useRef<HTMLDivElement>(null); // Reference for Draggable
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for position when using Draggable
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Track if we're currently dragging to avoid unnecessary renders
  const [isDragging, setIsDragging] = useState(false);
  
  // Memoize the position to avoid unnecessary updates
  const dragPositionRef = useRef(position);
  
  // Remove old scroll handling effects that may cause choppiness
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setAnchorEl(buttonRef.current);
    }
  }, [isOpen]);
  
  // Efficient scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
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
    // Reset position when closing
    setPosition({ x: 0, y: 0 });
    dragPositionRef.current = { x: 0, y: 0 };
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  
  // Draggable handlers with performance optimizations
  const handleDragStart = () => {
    setIsDragging(true);
    // Apply a class to the body during drag to prevent unwanted text selection
    document.body.classList.add('dragging-ai-assistant');
  };
  
  // Update the drag event handler types
  const handleDrag = (_e: DraggableEvent, data: DraggableData) => {
    // Update ref without causing re-renders during drag
    dragPositionRef.current = { x: data.x, y: data.y };
  };
  
  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    // Only update state once dragging is complete
    setPosition({ x: data.x, y: data.y });
    setIsDragging(false);
    document.body.classList.remove('dragging-ai-assistant');
  };
  
  // Filter out system messages for display
  const displayMessages = messages.filter((msg: Message) => msg.role !== 'system');
  
  return (
    <>
      {/* Hidden reference div positioned where we want the popover to anchor */}
      <div ref={buttonRef} style={{ position: 'fixed', bottom: 24, right: 24 }} />
      
      {isOpen ? (
        <Draggable
          handle=".draggable-handle"
          bounds="body"
          position={position}
          onStart={handleDragStart}
          onDrag={handleDrag}
          onStop={handleDragStop}
          nodeRef={nodeRef}
          // Additional performance options
          scale={1}
          defaultClassName="react-draggable-improved"
        >
          <Paper
            ref={nodeRef}
            elevation={6}
            sx={{
              width: isMobile ? '95vw' : '400px',
              height: '450px',
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
              // Enhanced hardware acceleration
              willChange: 'transform',
              transform: 'translate3d(0,0,0)',
              transition: 'none',
              // Remove pointer-events: none - it breaks draggability
              // Reduce any opacity or filter effects during drag
              opacity: isDragging ? 0.95 : 1,
              '& *:not(.draggable-handle)': isDragging ? {
                // Optimize children rendering during drag
                transition: 'none !important',
                animationDuration: '0s !important'
              } : {}
            }}
          >
            {/* Header - with drag handle */}
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
                cursor: 'grab',
                // Keep touch-action only on mobile
                touchAction: isMobile ? 'none' : 'auto', 
                WebkitUserSelect: 'none', // Prevent text selection during drag
                MozUserSelect: 'none',
                msUserSelect: 'none',
                userSelect: 'none',
                '&:active': {
                  cursor: 'grabbing'
                }
              }}
            >
              <Box display="flex" alignItems="center">
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
                <DragIndicatorIcon sx={{ ml: 1, fontSize: '1rem', opacity: 0.7 }} />
              </Box>
              <Box>
                <IconButton size="small" color="inherit" onClick={clearMessages} title="Clear chat">
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="inherit" onClick={handleClose} aria-label="close">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Messages area with improved scrolling */}
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'auto',
                p: 2,
                backgroundColor: '#f5f7fa',
                overscrollBehavior: 'contain',
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '3px',
                },
                // Prevent repaints during drag for better performance
                transform: isDragging ? 'translateZ(0)' : 'none',
                backfaceVisibility: 'hidden',
                // Freeze scrolling during drag
                overflowY: isDragging ? 'hidden' : 'auto',
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
                  {displayMessages.map((msg: Message, index: number) => (
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
                onChange={handleInputChange}
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
      ) : (
        <Box>
          <AIAssistantButton />
        </Box>
      )}
    </>
  );
};

export default React.memo(AIAssistant); 