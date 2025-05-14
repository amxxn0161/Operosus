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
  Alert,
  Tab,
  Tabs
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
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
import TodayIcon from '@mui/icons-material/Today';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
// Additional icons for categories and prompts
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import ScheduleIcon from '@mui/icons-material/Schedule';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ReplayIcon from '@mui/icons-material/Replay';
import UpdateIcon from '@mui/icons-material/Update';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import StarIcon from '@mui/icons-material/Star';
import EmailIcon from '@mui/icons-material/Email';
import BatteryAlertIcon from '@mui/icons-material/BatteryAlert';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import FlagIcon from '@mui/icons-material/Flag';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import DoNotDisturbIcon from '@mui/icons-material/DoNotDisturb';
import SummarizeIcon from '@mui/icons-material/Summarize';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ErrorIcon from '@mui/icons-material/Error';
import CompareIcon from '@mui/icons-material/Compare';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import LowPriorityIcon from '@mui/icons-material/LowPriority';
import RepeatIcon from '@mui/icons-material/Repeat';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import { useNavigate } from 'react-router-dom';
import { 
  fetchAssistantThreads, 
  getThreadMessages, 
  Thread,
  updateThreadTitle
} from '../services/assistantService';
import { format, parseISO, isValid } from 'date-fns';
// Import Opo images
import OpoImage from '../assets/Opo.png';
import OpoSmallImage from '../assets/Oposmall.png';

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

// Define interface for prompt items
interface ExamplePrompt {
  text: string;
  icon: React.ReactNode;
}

// Define interface for categorized prompts
interface PromptCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  prompts: ExamplePrompt[];
}

// Example prompts for the AI assistant with associated icons
const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  { text: "Summarise my task list", icon: <AssignmentTurnedInIcon fontSize="small" /> },
  { text: "Summarise my meeting schedule", icon: <EventAvailableIcon fontSize="small" /> },
  { text: "Help me plan my day", icon: <TodayIcon fontSize="small" /> },
  { text: "Prioritise My Week", icon: <DateRangeIcon fontSize="small" /> }
];

// All categorized prompts
const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'featured',
    name: 'Featured',
    icon: <StarIcon fontSize="small" />,
    prompts: [
      { text: "Summarise my task list", icon: <AssignmentTurnedInIcon fontSize="small" /> },
      { text: "Summarise my meeting schedule", icon: <EventAvailableIcon fontSize="small" /> },
      { text: "Help me plan my day", icon: <TodayIcon fontSize="small" /> },
      { text: "Prioritise My Week", icon: <DateRangeIcon fontSize="small" /> }
    ]
  }
];

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
      width: '100vw', 
      overflow: 'hidden',
      position: 'absolute',
      top: 64, // Position directly below the top bar
      left: 0,
      right: 0,
      bgcolor: '#ffffff',
      m: 0,
      p: 0,
      boxSizing: 'border-box',
      borderTop: 'none',
      boxShadow: 'none', // Remove shadow from content
      zIndex: 1
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
              bgcolor: '#ffffff',
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
              width: isVerySmallMobile ? '85%' : (isSmallMobile ? '80%' : '75%'),
              maxWidth: { xs: 280, sm: 320 },
              boxSizing: 'border-box',
              borderTopRightRadius: { xs: 8, sm: 0 },
              borderBottomRightRadius: { xs: 8, sm: 0 },
              zIndex: 1300
            }
          }}
        >
          <Box sx={{ 
            p: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1.25, sm: 1.5 }), 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
          }}>
            <Typography 
              variant="subtitle1" 
              fontWeight={600}
              sx={{ 
                fontSize: isVerySmallMobile ? '0.85rem' : (isSmallMobile ? '0.9rem' : '1rem')
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
        transition: 'width 0.3s ease',
        bgcolor: '#ffffff',
        borderRadius: 0
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
            bgcolor: '#ffffff',
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
              Opo
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
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: isMobile ? 'flex-start' : 'flex-start',
          bgcolor: '#ffffff',
          width: '100%'
        }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '100%',
              height: '100%',
              width: '100%',
              p: 0,
              pt: isVerySmallMobile ? 4 : (isSmallMobile ? 4.5 : { xs: 5, sm: 5.5, md: 6.5 }),
              textAlign: 'center',
              bgcolor: '#ffffff',
              m: 0,
              borderRadius: 0
            }}>
              <Box sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
                height: '100%',
                bgcolor: '#ffffff',
                p: 0,
                m: 0,
                borderRadius: 0
              }}>
                <Box
                  component="img"
                  src={OpoImage}
                  alt="Opo"
                  sx={{
                    width: isVerySmallMobile ? 100 : (isSmallMobile ? 120 : { xs: 140, md: 160 }),
                    height: 'auto',
                    mb: isVerySmallMobile ? 1.5 : (isSmallMobile ? 1.75 : { xs: 2, md: 2.5 }),
                  }}
                />
                <Typography 
                  variant="h5" 
                  sx={{ 
                    mb: { xs: 1, md: 1.5 },
                    fontSize: isVerySmallMobile ? '1.1rem' : (isSmallMobile ? '1.2rem' : { xs: '1.25rem', md: '1.5rem' }),
                    fontWeight: 500
                  }}
                >
                  Hi, I'm Opo!
                </Typography>
                
                {/* Modified layout to combine the two text elements */}
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  mb: isVerySmallMobile ? 1 : (isSmallMobile ? 1.5 : { xs: 2, md: 2.5 })
                }}>
                  <Typography 
                    variant="body1" 
                    color="textSecondary"
                    sx={{ 
                      fontSize: isVerySmallMobile ? '0.8rem' : (isSmallMobile ? '0.85rem' : { xs: '0.9rem', md: '1rem' }),
                      lineHeight: 1.5
                    }}
                  >
                    Ask me about productivity or how to use this app!
                  </Typography>
                  <Typography 
                    variant="body1" 
                    color="textSecondary"
                    sx={{ 
                      fontSize: isVerySmallMobile ? '0.8rem' : (isSmallMobile ? '0.85rem' : { xs: '0.9rem', md: '1rem' }),
                      color: 'text.secondary'
                    }}
                  >
                    Try asking:
                  </Typography>
                </Box>
                
                {/* Example prompts section - moved up by removing the Try asking text */}
                <Box sx={{ 
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  px: 1,
                  bgcolor: '#ffffff',
                  mt: 0, // Reduced margin top
                  alignItems: 'center' // Center the prompts
                }}>
                  <Box sx={{ 
                    width: '100%',
                    maxWidth: { xs: '90%', sm: '85%', md: '80%' }, // Reduce width of prompts
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, md: 1.25 }),
                    maxHeight: { xs: '320px', sm: '400px', md: '450px' },
                    overflowY: 'auto',
                    pb: 2,
                    bgcolor: '#ffffff'
                  }}>
                    {PROMPT_CATEGORIES[0].prompts.map((prompt, promptIndex) => (
                      <Paper
                        key={promptIndex}
                        elevation={0}
                        onClick={() => {
                          setInput(prompt.text);
                          // Submit after a small delay to allow UI update
                          setTimeout(() => {
                            sendMessage(prompt.text);
                          }, 100);
                        }}
                        sx={{
                          py: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, md: 1.25 }),
                          px: isVerySmallMobile ? 1.25 : (isSmallMobile ? 1.5 : { xs: 1.75, md: 1.5 }),
                          mt: promptIndex === 0 ? 1 : 0,
                          borderRadius: isVerySmallMobile ? 1.5 : 2,
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: 'rgba(26, 115, 232, 0.1)',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          gap: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, md: 1.25 }),
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: 'rgba(26, 115, 232, 0.04)',
                            borderColor: 'rgba(26, 115, 232, 0.3)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                          }
                        }}
                      >
                        <Box sx={{ 
                          color: theme.palette.primary.main,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isVerySmallMobile ? '0.9rem' : (isSmallMobile ? '1rem' : { xs: '1.1rem', md: '1rem' })
                        }}>
                          {prompt.icon}
                        </Box>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            fontSize: isVerySmallMobile ? '0.775rem' : (isSmallMobile ? '0.825rem' : { xs: '0.875rem', md: '0.875rem' }),
                            color: theme.palette.text.primary,
                            fontWeight: 400,
                            lineHeight: 1.4
                          }}
                        >
                          {prompt.text}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ 
              width: '100%',
              height: '100%',
              pt: isVerySmallMobile ? 2 : (isSmallMobile ? 2.5 : { xs: 3, md: 3.5 }),
              px: isVerySmallMobile ? 1.5 : (isSmallMobile ? 2 : { xs: 2.5, md: 3 }),
              bgcolor: '#ffffff',
              m: 0,
              borderRadius: 0
            }}>
              {messages.map((message, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    display: 'flex',
                    mb: isVerySmallMobile ? 1 : (isSmallMobile ? 1.5 : { xs: 2, md: 2.5 }),
                    mt: index === 0 ? (isVerySmallMobile ? 1 : (isSmallMobile ? 1.5 : { xs: 2, md: 2.5 })) : 0,
                    alignItems: 'flex-start',
                    width: '100%'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      bgcolor: 'white',
                      width: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                      height: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                      mr: 1,
                      border: '1px solid rgba(16, 86, 245, 0.2)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                    }}
                  >
                    <Box
                      component="img"
                      src={OpoSmallImage}
                      alt="Opo"
                      sx={{ 
                        width: isVerySmallMobile ? 16 : (isSmallMobile ? 18 : { xs: 20, md: 24 }),
                        height: 'auto'
                      }}
                    />
                  </Avatar>
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, md: 1.75 }),
                      borderRadius: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, md: 1.75 }),
                      bgcolor: message.role === 'assistant' ? 'rgba(16, 86, 245, 0.08)' : 'rgba(0, 0, 0, 0.03)',
                      width: 'calc(100% - 50px)',
                      wordBreak: 'break-word',
                      '& .MuiTypography-root': {
                        fontSize: isVerySmallMobile ? '0.8rem' : (isSmallMobile ? '0.85rem' : { xs: '0.9rem', md: '0.95rem' })
                      }
                    }}
                  >
                    {formatMessageContent(message.content)}
                  </Paper>
                </Box>
              ))}
              {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.25) }}>
                  <CircularProgress 
                    size={isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24)} 
                    thickness={4} 
                  />
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
            p: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : { xs: 1.5, md: 1.75 }),
            pt: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1.25, md: 1.5 }),
            pb: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1.25, md: 1.5 }),
            borderTop: '1px solid rgba(0, 0, 0, 0.12)',
            bgcolor: '#ffffff',
            width: '100%'
          }}
        >
          <Box sx={{ width: '100%' }}>
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
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: isVerySmallMobile ? '16px' : (isSmallMobile ? '18px' : '24px'),
                  pr: 0.75,
                  py: isVerySmallMobile ? 0.15 : (isSmallMobile ? 0.25 : { xs: 0.5, md: 0.75 }),
                  fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : { xs: '0.875rem', md: '0.9375rem' }),
                  backgroundColor: '#ffffff'
                },
                '& .MuiOutlinedInput-input': {
                  pl: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : { xs: 1.5, md: 1.75 })
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
                        width: isVerySmallMobile ? 24 : (isSmallMobile ? 28 : { xs: 32, md: 36 }),
                        height: isVerySmallMobile ? 24 : (isSmallMobile ? 28 : { xs: 32, md: 36 }),
                        mr: isVerySmallMobile ? -0.5 : (isSmallMobile ? -0.25 : 0)
                      }}
                    >
                      <SendIcon fontSize={isVerySmallMobile ? "small" : "medium"} sx={{
                        fontSize: isVerySmallMobile ? '0.9rem' : (isSmallMobile ? '1rem' : { xs: '1.1rem', md: '1.2rem' })
                      }} />
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
      <Box sx={{ p: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : { xs: 1, sm: 1.25 }) }}>
        <Button
          fullWidth
          variant="contained"
          onClick={handleNewConversation}
          startIcon={
            <Box
              component="img"
              src={OpoSmallImage}
              alt="Opo"
              sx={{ width: 16, height: 'auto' }}
            />
          }
          sx={{
            py: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.6 : { xs: 0.75, sm: 0.9 }),
            fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : '0.8rem'),
            borderRadius: '6px',
            bgcolor: 'rgba(240, 247, 255, 1)',
            color: '#1A73E8',
            border: '1px solid rgba(16, 86, 245, 0.3)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            '&:hover': {
              bgcolor: 'rgba(230, 240, 255, 1)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }
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
          <Box sx={{ display: 'flex', justifyContent: 'center', p: isVerySmallMobile ? 1 : (isSmallMobile ? 1.5 : 2) }}>
            <CircularProgress size={isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24)} />
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
                py: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
                px: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.5),
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
                        bgcolor: 'rgba(240, 247, 255, 1)',
                        width: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                        height: isVerySmallMobile ? 28 : (isSmallMobile ? 32 : { xs: 36, md: 40 }),
                        mr: isVerySmallMobile ? 0.5 : undefined,
                        border: '1px solid rgba(16, 86, 245, 0.3)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <Box
                        component="img"
                        src={OpoSmallImage}
                        alt="Opo"
                        sx={{ 
                          width: isVerySmallMobile ? 16 : (isSmallMobile ? 18 : { xs: 20, md: 24 }),
                          height: 'auto'
                        }}
                      />
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