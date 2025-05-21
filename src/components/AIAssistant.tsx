import React, { useState, useRef, useEffect, useMemo, KeyboardEvent, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
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
  InputAdornment,
  Menu,
  MenuItem,
  Tab,
  Tabs
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import MinimizeIcon from '@mui/icons-material/Minimize';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import ReplayIcon from '@mui/icons-material/Replay';
import StopIcon from '@mui/icons-material/Stop';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
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
import StarIcon from '@mui/icons-material/Star';
import UpdateIcon from '@mui/icons-material/Update';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DateRangeIcon from '@mui/icons-material/DateRange';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
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
import Draggable from 'react-draggable';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  fetchAssistantThreads, 
  getThreadMessages,
  getThreadMessagesWithRetry,
  Thread,
  updateThreadTitle
} from '../services/assistantService';
import { format } from 'date-fns';
// Import Opo images
import OpoImage from '../assets/Opo.png';
import OpoSmallImage from '../assets/Oposmall.png';

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

// Create a component for categorized prompts in the popup assistant
interface PopupCategorizedPromptsProps {
  categories: PromptCategory[];
  onPromptClick: (promptText: string) => void;
  isSmallMobile?: boolean;
  isVerySmallMobile?: boolean;
}

const PopupCategorizedPrompts: React.FC<PopupCategorizedPromptsProps> = ({
  categories,
  onPromptClick,
  isSmallMobile = false,
  isVerySmallMobile = false
}) => {
  const theme = useTheme();
  const category = categories[0]; // Always use the first (and only) category

  return (
    <Box sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{ 
          width: '100%', 
          display: 'flex',
          flexDirection: 'column', 
          gap: isVerySmallMobile ? 0.6 : (isSmallMobile ? 0.8 : 1.25),
          maxHeight: { 
            xs: isVerySmallMobile ? '300px' : '350px', 
            sm: '400px', 
            md: '450px' 
          },
          overflowY: 'auto',
          pr: 1,
          mr: -1,
          flexGrow: 1,
          pb: 1
        }}
      >
        {category.prompts.map((prompt, promptIndex) => (
          <Paper
            key={promptIndex}
            elevation={0}
            onClick={() => onPromptClick(prompt.text)}
            sx={{
              py: isVerySmallMobile ? 0.6 : (isSmallMobile ? 0.8 : 1.25),
              px: isVerySmallMobile ? 1 : (isSmallMobile ? 1.25 : 1.5),
              borderRadius: 1.5,
              backgroundColor: 'white',
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'rgba(26, 115, 232, 0.1)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
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
              fontSize: isVerySmallMobile ? '0.8rem' : (isSmallMobile ? '0.85rem' : '0.9rem')
            }}>
              {prompt.icon}
            </Box>
            <Typography 
              variant="body1" 
              sx={{ 
                fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : '0.8rem'),
                color: theme.palette.text.primary,
                fontWeight: 400,
                lineHeight: 1.35
              }}
            >
              {prompt.text}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

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
  const isVerySmallMobile = useMediaQuery('(max-width:320px)');
  
  return (
    <Tooltip title="Ask AI Assistant" placement="left">
      <Fab
        size={isMobile ? "small" : "medium"}
        onClick={openAssistant}
        sx={{
          position: 'fixed',
          bottom: isMobile 
            ? (isVerySmallMobile ? 8 : (isSmallMobile ? 12 : 16))
            : 24,
          right: isMobile 
            ? (isVerySmallMobile ? 8 : (isSmallMobile ? 12 : 16))
            : 24,
          boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
          background: 'white',
          zIndex: 1200,
          width: isMobile 
            ? (isVerySmallMobile ? 32 : (isSmallMobile ? 36 : 40)) 
            : 48,
          height: isMobile 
            ? (isVerySmallMobile ? 32 : (isSmallMobile ? 36 : 40)) 
            : 48,
          minHeight: 'auto',
          border: '1px solid rgba(230, 230, 230, 0.9)',
          '&:hover': {
            background: 'white',
            boxShadow: '0px 6px 15px rgba(0, 0, 0, 0.25)',
          }
        }}
      >
        <Box
          component="img"
          src={OpoSmallImage}
          alt="Opo"
          sx={{
            width: isMobile ? 
              (isVerySmallMobile ? 16 : (isSmallMobile ? 18 : 20)) 
              : 24,
            height: 'auto'
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
    threadId,
    cancelRequest,
    deleteThread
  } = useAIAssistant();
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const theme = useTheme();
  
  // Improved breakpoints for better mobile responsiveness
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallMobile = useMediaQuery('(max-width:380px)');
  const isVerySmallMobile = useMediaQuery('(max-width:320px)');
  const isShortScreen = useMediaQuery('(max-height:670px)');
  const isVeryShortScreen = useMediaQuery('(max-height:568px)'); // For iPhone SE and similar
  
  // Check if we're on the AI Assistant page
  const isOnAssistantPage = location.pathname === '/ai-assistant';
  
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
  
  // Add state for thread deletion
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [lastResponseStatus, setLastResponseStatus] = useState<string | null>(null);
  
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
      
      // No need to auto-refresh thread data with the new polling model
      // Only fetch thread data when first opening a thread, not after sending messages
      /*
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
      */
    }
  }, [isOpen, threadId]);
  
  // Auto-refresh data when loading is active for more than a few seconds
  useEffect(() => {
    // This auto-refresh logic is no longer needed with the new polling model
    // The sendMessage function in AIAssistantContext now handles polling
    // We'll leave this commented out for reference but disable it
    /*
    if (isLoading && threadId) {
      const refreshInterval = setInterval(async () => {
        try {
          console.log('Auto-refreshing conversation data while loading...');
          const messages = await getThreadMessages(threadId);
          if (messages && messages.length > 0) {
            loadThreadMessages(messages);
          }
        } catch (error) {
          console.error('Error auto-refreshing thread data:', error);
        }
      }, 3000);
      
      return () => clearInterval(refreshInterval);
    }
    */
  }, [isLoading, threadId]);
  
  // Add new state to track if user is at the bottom of the chat
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Add ref to track the message container
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  // Keep the scroll tracking logic to potentially use for a "scroll to bottom" button later
  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Check if user is at or very near the bottom (within 100px)
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      setIsAtBottom(isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);
  
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    
    // Store the current message for potential retry
    setLastPrompt(inputValue.trim());
    
    console.log('Sending message to AI Assistant', {
      message: inputValue.trim(),
      currentThreadId: threadId
    });
    
    // Remove automatic scrolling when sending message
    // setIsAtBottom(true);
    
    // Send message through context
    sendMessage(inputValue)
      .then((response) => {
        console.log('Message sent successfully, waiting for response');
        // Track the response status
        if (response) {
          setLastResponseStatus(response.status || null);
        }
      })
      .catch(error => {
        console.error('Error sending message:', error);
        setLastResponseStatus('error');
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
        // Remove automatic scrolling when loading a thread
        // setIsAtBottom(true);
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
  
  // Handle direct deletion click from the thread list item
  // This shows the confirmation dialog before actually deleting the thread
  const handleDeleteClick = (threadId: string) => {
    if (!threadId) {
      console.error('No thread ID provided for deletion');
      return;
    }
    
    try {
      console.log(`Initiating delete for thread: ${threadId}`);
      // Store the thread ID to delete
      setThreadToDelete(threadId);
      // Open the confirmation dialog
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error preparing thread deletion:', error);
    }
  };
  
  // Handle confirmation of thread deletion when user confirms in the dialog
  // This actually calls the API to delete the thread
  const handleConfirmDelete = async () => {
    if (!threadToDelete) {
      console.error('Cannot confirm deletion: No thread ID specified');
      setDeleteDialogOpen(false);
      return;
    }
    
    console.log(`Starting deletion of thread: ${threadToDelete}`);
    setIsDeleting(true);
    
    try {
      // Call the deleteThread function from the AIAssistantContext
      const success = await deleteThread(threadToDelete);
      
      if (success) {
        console.log(`Successfully deleted thread: ${threadToDelete}`);
        
        // Reload the threads list to reflect the change
        await loadThreadsList();
        
        // If the deleted thread was the current one, reset the conversation
        if (threadToDelete === threadId) {
          console.log('Deleted the current active thread, clearing conversation');
          setInputValue('');
          clearMessages();
        }
      } else {
        console.error(`Failed to delete thread: ${threadToDelete}`);
      }
    } catch (error) {
      console.error(`Error during thread deletion for ${threadToDelete}:`, error);
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
  
  // Update the thread list rendering to include delete option
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
                <Box sx={{ display: 'flex' }}>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleStartRename(thread, e)}
                    sx={{ 
                      opacity: 0.6,
                      '&:hover': { opacity: 1 },
                      p: 0.75
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(thread.thread_id);
                    }}
                    aria-label="delete thread"
                    title="Delete conversation"
                    sx={{ 
                      opacity: 0.75,
                      '&:hover': { 
                        opacity: 1,
                        color: 'error.main',
                        bgcolor: 'rgba(211, 47, 47, 0.04)'
                      },
                      p: 0.75,
                      ml: 0.5,
                      color: 'text.secondary'
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
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
  const handleRetry = async () => {
    if (messages.length > 0) {
      // Find the last user message
      const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
      
      if (lastUserMsg) {
        setLastResponseStatus(null);
        
        try {
          // SendMessage now returns response data
          const response = await sendMessage(lastUserMsg.content);
          if (response) {
            setLastResponseStatus(response.status || null);
          }
        } catch (error) {
          setLastResponseStatus('error');
          console.error('Error retrying message:', error);
        }
      }
    }
  };
  
  // Handler to cancel an in-progress request
  const handleCancelRequest = () => {
    console.log('Cancelling current request');
    cancelRequest();
  };
  
  // Function to navigate to dedicated AI Assistant page
  const navigateToAssistantPage = () => {
    closeAssistant();
    navigate('/ai-assistant');
  };
  
  // Handle clicking on an example prompt
  const handleExamplePromptClick = (promptText: string) => {
    setInputValue(promptText);
    
    // Small delay to allow UI update then send message
    setTimeout(() => {
      // Add user message immediately to the UI for better responsiveness
      const userMessage = { role: 'user', content: promptText };
      
      // Force update to immediately show the message
      if (isMobile) {
        // Clear input right away for mobile
        setInputValue('');
      }
      
      // Then send message through context
      sendMessage(promptText)
        .then(() => {
          console.log('Message sent successfully');
          
          // For mobile view, make sure we scroll to the messages area
          if (isMobile && messagesEndRef.current) {
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 200);
          }
        })
        .catch(error => {
          console.error('Error sending message:', error);
        });
    }, 50); // Shorter delay for better responsiveness
  };
  
  const PaperComponent = (props: any) => {
    return (
      <Draggable
        handle="#draggable-dialog-title"
        cancel={'[class*="MuiDialogContent-root"]'}
        bounds="parent"
        onStop={handleDragStop}
      >
        <Paper {...props} />
      </Draggable>
    );
  };

  // Add useEffect to scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current && displayMessages.length > 0) {
      // Add a small delay to allow rendering to complete
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [displayMessages.length]);

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
              zIndex: 1300, // Adjusted to ensure it's below the Dialog
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
                width: isVerySmallMobile ? '94%' : (isSmallMobile ? '92%' : '90%'),
                height: isVeryShortScreen ? '92%' : (isShortScreen ? '90%' : '85%'),
                maxWidth: '550px',
                maxHeight: '92vh',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                m: 'auto',
              }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                  minHeight: isVerySmallMobile ? 40 : (isSmallMobile ? 48 : 56),
                }}
              >
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: 'white',
                      mr: isVerySmallMobile ? 0.75 : 1.5,
                      width: isVerySmallMobile ? 20 : (isSmallMobile ? 24 : 28),
                      height: isVerySmallMobile ? 20 : (isSmallMobile ? 24 : 28),
                    }}
                  >
                    <Box
                      component="img"
                      src={OpoSmallImage}
                      alt="Opo"
                      sx={{ 
                        width: isVerySmallMobile ? 14 : (isSmallMobile ? 16 : 18),
                        height: 'auto',
                        color: theme.palette.primary.main,
                      }} 
                    />
                  </Avatar>
                  <Typography 
                    variant={isVerySmallMobile ? "caption" : (isSmallMobile ? "body2" : "body1")} 
                    fontWeight="medium"
                  >
                    Opo
                  </Typography>
                </Box>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    '& .MuiIconButton-root': {
                      mx: isVerySmallMobile ? 0.25 : 0.5,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      }
                    }
                  }}
                >
                  {/* Refresh button */}
                  <Tooltip title="Refresh conversation" arrow>
                    <span>
                  <IconButton 
                    size={isVerySmallMobile ? "small" : "small"} 
                    color="inherit" 
                    onClick={refreshConversation}
                    disabled={isRefreshing || isLoading}
                    sx={{ 
                      opacity: !threadId ? 0.7 : 1, 
                      p: isVerySmallMobile ? 0.5 : undefined
                    }}
                  >
                    {isRefreshing ? (
                          <CircularProgress 
                            size={isVerySmallMobile ? 14 : (isSmallMobile ? 16 : 20)} 
                            color="inherit" 
                            thickness={5} 
                          />
                        ) : (
                          <RefreshIcon 
                            fontSize={isVerySmallMobile ? "small" : "small"} 
                            sx={{ fontSize: isVerySmallMobile ? '0.9rem' : undefined }}
                          />
                    )}
                  </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* History button with popover menu */}
                  <Tooltip title="Conversation history" arrow>
                    <span>
                  <IconButton 
                    ref={historyButtonRef}
                    size={isVerySmallMobile ? "small" : "small"}
                    color="inherit" 
                    onClick={handleThreadsOpen}
                        sx={{ p: isVerySmallMobile ? 0.5 : undefined }}
                      >
                        <HistoryIcon 
                          fontSize={isVerySmallMobile ? "small" : "small"} 
                          sx={{ fontSize: isVerySmallMobile ? '0.9rem' : undefined }}
                        />
                  </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* Expand to full page button */}
                  <Tooltip title="Open in full page" arrow>
                    <span>
                  <IconButton
                    size={isVerySmallMobile ? "small" : "small"}
                    color="inherit"
                    onClick={navigateToAssistantPage}
                        sx={{ p: isVerySmallMobile ? 0.5 : undefined }}
                      >
                        <OpenInFullIcon 
                          fontSize={isVerySmallMobile ? "small" : "small"} 
                          sx={{ fontSize: isVerySmallMobile ? '0.9rem' : undefined }}
                        />
                  </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* New conversation button */}
                  <Tooltip title="New conversation" arrow>
                    <span>
                      <IconButton 
                        size="small" 
                        color="inherit" 
                        onClick={clearMessages}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* Close button */}
                  <Tooltip title="Close" arrow>
                    <span>
                      <IconButton 
                        size="small" 
                        color="inherit" 
                        onClick={handleClose} 
                        aria-label="close"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* Threads menu popover */}
                  <Popper
                    open={showThreads}
                    anchorEl={historyButtonRef.current}
                    placement="bottom-end"
                    transition
                    style={{ zIndex: 10100 }}
                  >
                    {({ TransitionProps }) => (
                      <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: 'right top' }}
                      >
                        <Paper
                          elevation={6}
                          sx={{
                            width: isVerySmallMobile ? 200 : (isSmallMobile ? 240 : 280),
                            maxHeight: isShortScreen ? 300 : 400,
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
                </Box>
              </Box>

              {/* Messages area */}
              <Box
                ref={messageContainerRef}
                sx={{
                  flexGrow: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  p: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.5),
                  pt: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1.5),
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
                  display: 'flex',
                  flexDirection: 'column',
                  // Ensure the message container content is always visible on mobile
                  ...(isMobile && displayMessages.length > 0 && {
                    scrollBehavior: 'smooth'
                  })
                }}
              >
                {displayMessages.length === 0 ? (
                  // Empty state with example prompts
                  <>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="flex-start"
                      height="auto"
                      p={isVerySmallMobile ? 0.25 : (isSmallMobile ? 0.5 : 0.75)}
                      textAlign="center"
                      sx={{
                        maxWidth: isVerySmallMobile ? '100%' : (isSmallMobile ? '90%' : '80%'),
                        margin: '0 auto',
                        mb: 2
                      }}
                    >
                      <Box
                        component="img"
                        src={OpoImage}
                        alt="Opo"
                        sx={{ 
                          mb: 0.5, 
                          width: isSmallMobile ? 70 : 90,
                          height: 'auto',
                          opacity: 0.8 
                        }} 
                      />
                      <Typography 
                        variant={isSmallMobile ? "body2" : "body1"} 
                        gutterBottom 
                        fontWeight="medium"
                        sx={{ mb: 0.4 }}
                      >
                        Hi, I'm Opo!
                      </Typography>
                      <Typography 
                        variant="caption"
                        color="textSecondary"
                        sx={{ 
                          fontSize: isSmallMobile ? '0.68rem' : '0.75rem',
                          lineHeight: 1.2,
                          mb: isVerySmallMobile ? 1.5 : 2
                        }}
                      >
                        Ask me about productivity or app usage!
                      </Typography>
                    </Box>

                    {/* Example prompts section */}
                    <Box sx={{ 
                      width: '100%', 
                      mb: 1,
                      mt: isMobile ? 0.5 : 1,
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <Typography 
                        variant="body1" 
                        fontWeight="medium"
                        sx={{ 
                          mb: isVerySmallMobile ? 1 : 1.5,
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          textAlign: 'left'
                        }}
                      >
                        Try asking:
                      </Typography>
                      
                      <PopupCategorizedPrompts
                        categories={PROMPT_CATEGORIES}
                        onPromptClick={handleExamplePromptClick}
                        isSmallMobile={isSmallMobile}
                        isVerySmallMobile={isVerySmallMobile}
                      />
                    </Box>
                  </>
                ) : (
                  // Message view
                  <>
                    {displayMessages.map((msg, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          mb: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.25),
                        }}
                      >
                        {msg.role === 'assistant' && (
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              mr: 1,
                              alignSelf: 'flex-start',
                              width: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                              height: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                            }}
                          >
                            <Box
                              component="img"
                              src={OpoSmallImage}
                              alt="Opo"
                              sx={{ 
                                width: isVerySmallMobile ? 12 : (isSmallMobile ? 14 : 16),
                                height: 'auto'
                              }}
                            />
                          </Avatar>
                        )}

                        <Paper
                          elevation={0}
                          sx={{
                            p: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
                            maxWidth: isVerySmallMobile ? '85%' : (isSmallMobile ? '80%' : '82%'),
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
                                  fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : '0.8rem'),
                                  wordBreak: 'break-word' 
                                }}
                              >
                                {msg.content}
                              </Typography>
                            : <Box sx={{ 
                                '& .MuiTypography-root': { 
                                  fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : '0.8rem'),
                                  wordBreak: 'break-word'
                                } 
                              }}>
                                  {/* Don't display cancellation messages */}
                                  {!msg.content.includes('request was cancelled') && formatMessageContent(msg.content)}
                                  
                                  {/* Add Retry button for error messages */}
                                  {msg.role === 'assistant' && 
                                    index === messages.length - 1 &&
                                    (lastResponseStatus === 'error' || lastResponseStatus === 'failed') && 
                                    lastPrompt && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={async () => {
                                          // Retry logic: resend the last prompt and poll for run status
                                          if (!lastPrompt) return;
                                          // Use the same sendMessage logic as before
                                          await sendMessage(lastPrompt);
                                        }}
                                        startIcon={<ReplayIcon fontSize="small" />}
                                        sx={{ 
                                          fontSize: isVerySmallMobile ? '0.6rem' : (isSmallMobile ? '0.65rem' : '0.75rem'),
                                          py: isVerySmallMobile ? 0.25 : (isSmallMobile ? 0.5 : 0.75)
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
                              width: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                              height: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24)
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
                          mb: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.25),
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 1,
                            alignSelf: 'flex-start',
                            width: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                            height: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                          }}
                        >
                          <Box
                            component="img"
                            src={OpoSmallImage}
                            alt="Opo"
                            sx={{ 
                              width: isVerySmallMobile ? 12 : (isSmallMobile ? 14 : 16),
                              height: 'auto'
                            }}
                          />
                        </Avatar>

                        <Paper
                          elevation={0}
                          sx={{
                            p: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.5),
                            borderRadius: 2,
                            backgroundColor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: isVerySmallMobile ? '50px' : (isSmallMobile ? '60px' : '80px'),
                          }}
                        >
                          <CircularProgress 
                            size={isVerySmallMobile ? 14 : (isSmallMobile ? 16 : 20)}
                            thickness={5} 
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            fontSize: isVerySmallMobile ? '0.65rem' : (isSmallMobile ? '0.7rem' : '0.8rem')
                          }}>
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
                  p: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1.5), 
                  borderTop: '1px solid #e0e0e0',
                  backgroundColor: 'white',
                  pt: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
                  pb: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
                  mt: 'auto' // Push to bottom
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
                  maxRows={isVeryShortScreen ? 1 : (isVerySmallMobile ? 1 : (isSmallMobile ? 2 : 3))}
                  disabled={isLoading}
                  size="small"
                  inputRef={inputRef}
                  onClick={() => {
                    // When text field is clicked in mobile mode, make sure we're in message view
                    if (isMobile && messageContainerRef.current) {
                      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '20px',
                      backgroundColor: theme.palette.background.paper,
                      pr: 1,
                      fontSize: isVerySmallMobile ? '0.75rem' : (isSmallMobile ? '0.8rem' : '0.85rem'),
                      ...(isVerySmallMobile && {
                        py: 0.25,
                        px: 0.75
                      }),
                      ...(isSmallMobile && {
                        py: 0.4,
                        px: 1
                      })
                    }
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {isLoading ? (
                          <IconButton 
                            aria-label="stop processing" 
                            onClick={handleCancelRequest}
                            edge="end"
                            size="small"
                            sx={{ 
                              mr: -0.5,
                              bgcolor: theme.palette.primary.main,
                              color: 'white',
                              width: isSmallMobile ? 24 : 28,
                              height: isSmallMobile ? 24 : 28,
                              '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                              }
                            }}
                          >
                            <StopIcon fontSize={isSmallMobile ? "small" : "small"} />
                          </IconButton>
                        ) : (
                          <IconButton 
                            aria-label="send" 
                            color="primary"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            edge="end"
                            sx={{ mr: -1 }}
                          >
                            <SendIcon />
                          </IconButton>
                        )}
                      </InputAdornment>
                    ),
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
                height: '550px', // Increased height to accommodate the tabs and more prompts
                maxHeight: '80vh', // Increased max-height percentage
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
                    <Box
                      component="img"
                      src={OpoSmallImage}
                      alt="Opo"
                      sx={{ 
                        width: 18,
                        height: 'auto',
                        color: theme.palette.primary.main
                      }}
                    />
                  </Avatar>
                  <Typography variant="subtitle1" fontWeight="medium">Opo</Typography>
                </Box>
                <Box 
                  className="cancel-drag"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    '& .MuiIconButton-root': {
                      mx: 0.5,
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      }
                    }
                  }}
                >
                  {/* Refresh button */}
                  <Tooltip title="Refresh conversation" arrow>
                    <span className="cancel-drag">
                  <IconButton 
                        size="small" 
                    color="inherit" 
                    onClick={refreshConversation}
                    disabled={isRefreshing || isLoading}
                        className="cancel-drag"
                        sx={{ opacity: !threadId ? 0.7 : 1 }}
                  >
                    {isRefreshing ? (
                          <CircularProgress size={20} color="inherit" thickness={5} />
                    ) : (
                          <RefreshIcon fontSize="small" />
                    )}
                  </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* History button with popover menu */}
                  <Tooltip title="Conversation history" arrow>
                    <span className="cancel-drag">
                  <IconButton 
                    ref={historyButtonRef}
                        size="small"
                    color="inherit" 
                    onClick={handleThreadsOpen}
                        className="cancel-drag"
                      >
                        <HistoryIcon fontSize="small" />
                  </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* Expand to full page button */}
                  <Tooltip title="Open in full page" arrow>
                    <span className="cancel-drag">
                  <IconButton
                        size="small"
                    color="inherit"
                    onClick={navigateToAssistantPage}
                        className="cancel-drag"
                      >
                        <OpenInFullIcon fontSize="small" />
                  </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* New conversation button */}
                  <Tooltip title="New conversation" arrow>
                    <span className="cancel-drag">
                      <IconButton 
                        size="small" 
                        color="inherit" 
                        onClick={clearMessages}
                        className="cancel-drag"
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* Close button */}
                  <Tooltip title="Close" arrow>
                    <span className="cancel-drag">
                      <IconButton 
                        size="small" 
                        color="inherit" 
                        onClick={handleClose} 
                        aria-label="close"
                        className="cancel-drag"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  
                  {/* Threads menu popover */}
                  <Popper
                    open={showThreads}
                    anchorEl={historyButtonRef.current}
                    placement="bottom-end"
                    transition
                    style={{ zIndex: 10100 }}
                  >
                    {({ TransitionProps }) => (
                      <Grow
                        {...TransitionProps}
                        style={{ transformOrigin: 'right top' }}
                      >
                        <Paper
                          elevation={6}
                          sx={{
                            width: isVerySmallMobile ? 200 : (isSmallMobile ? 240 : 280),
                            maxHeight: isShortScreen ? 300 : 400,
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
                </Box>
              </Box>

              {/* Messages area */}
              <Box
                className="cancel-drag"
                ref={messageContainerRef}
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
                  <>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="flex-start"
                      height="auto"
                      p={isVerySmallMobile ? 0.25 : (isSmallMobile ? 0.5 : 0.75)}
                      textAlign="center"
                      sx={{
                        maxWidth: isVerySmallMobile ? '100%' : (isSmallMobile ? '90%' : '80%'),
                        margin: '0 auto',
                        mb: 2
                      }}
                    >
                      <Box
                        component="img"
                        src={OpoImage}
                        alt="Opo"
                        sx={{ 
                          mb: 0.5, 
                          width: isSmallMobile ? 70 : 90,
                          height: 'auto',
                          opacity: 0.8 
                        }} 
                      />
                      <Typography 
                        variant={isSmallMobile ? "body2" : "body1"} 
                        gutterBottom 
                        fontWeight="medium"
                        sx={{ mb: 0.4 }}
                      >
                        Hi, I'm Opo!
                      </Typography>
                      <Typography 
                        variant="caption"
                        color="textSecondary"
                        sx={{ 
                          fontSize: isSmallMobile ? '0.68rem' : '0.75rem',
                          lineHeight: 1.2,
                          mb: isVerySmallMobile ? 1.5 : 2
                        }}
                      >
                        Ask me about productivity or app usage!
                      </Typography>
                    </Box>
                    {/* Example prompts section for both desktop and mobile */}
                    <Box sx={{ 
                      width: '100%', 
                      mb: 1,
                      mt: isMobile ? 0.5 : 1,
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                    }}>
                      <Typography 
                        variant="body1" 
                        fontWeight="medium"
                        sx={{ 
                          mb: isVerySmallMobile ? 1 : 1.5,
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          textAlign: 'left'
                        }}
                      >
                        Try asking:
                      </Typography>
                      <PopupCategorizedPrompts
                        categories={PROMPT_CATEGORIES}
                        onPromptClick={handleExamplePromptClick}
                        isSmallMobile={isSmallMobile}
                        isVerySmallMobile={isVerySmallMobile}
                      />
                    </Box>
                  </>
                ) : (
                  <>
                    {displayMessages.map((msg, index) => (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          mb: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.25),
                        }}
                      >
                        {msg.role === 'assistant' && (
                          <Avatar
                            sx={{
                              bgcolor: theme.palette.primary.main,
                              mr: 1,
                              alignSelf: 'flex-start',
                              width: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                              height: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                            }}
                          >
                            <Box
                              component="img"
                              src={OpoSmallImage}
                              alt="Opo"
                              sx={{ 
                                width: isVerySmallMobile ? 12 : (isSmallMobile ? 14 : 16),
                                height: 'auto'
                              }}
                            />
                          </Avatar>
                        )}

                        <Paper
                          elevation={0}
                          sx={{
                            p: isVerySmallMobile ? 0.5 : (isSmallMobile ? 0.75 : 1),
                            maxWidth: isVerySmallMobile ? '85%' : (isSmallMobile ? '80%' : '82%'),
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
                                  fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : '0.8rem'),
                                  wordBreak: 'break-word' 
                                }}
                              >
                                {msg.content}
                              </Typography>
                            : <Box sx={{ 
                                '& .MuiTypography-root': { 
                                  fontSize: isVerySmallMobile ? '0.7rem' : (isSmallMobile ? '0.75rem' : '0.8rem'),
                                  wordBreak: 'break-word'
                                } 
                              }}>
                                  {/* Don't display cancellation messages */}
                                  {!msg.content.includes('request was cancelled') && formatMessageContent(msg.content)}
                                  
                                  {/* Add Retry button for error messages */}
                                  {msg.role === 'assistant' && 
                                    index === messages.length - 1 &&
                                    (lastResponseStatus === 'error' || lastResponseStatus === 'failed') && 
                                    lastPrompt && (
                                    <Box sx={{ mt: 1, textAlign: 'right' }}>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        onClick={async () => {
                                          // Retry logic: resend the last prompt and poll for run status
                                          if (!lastPrompt) return;
                                          // Use the same sendMessage logic as before
                                          await sendMessage(lastPrompt);
                                        }}
                                        startIcon={<ReplayIcon fontSize="small" />}
                                        sx={{ 
                                          fontSize: isVerySmallMobile ? '0.6rem' : (isSmallMobile ? '0.65rem' : '0.75rem'),
                                          py: isVerySmallMobile ? 0.25 : (isSmallMobile ? 0.5 : 0.75)
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
                              width: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                              height: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24)
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
                          mb: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.25),
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: theme.palette.primary.main,
                            mr: 1,
                            alignSelf: 'flex-start',
                            width: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                            height: isVerySmallMobile ? 18 : (isSmallMobile ? 20 : 24),
                          }}
                        >
                          <Box
                            component="img"
                            src={OpoSmallImage}
                            alt="Opo"
                            sx={{ 
                              width: isVerySmallMobile ? 12 : (isSmallMobile ? 14 : 16),
                              height: 'auto'
                            }}
                          />
                        </Avatar>

                        <Paper
                          elevation={0}
                          sx={{
                            p: isVerySmallMobile ? 0.75 : (isSmallMobile ? 1 : 1.5),
                            borderRadius: 2,
                            backgroundColor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            minWidth: isVerySmallMobile ? '50px' : (isSmallMobile ? '60px' : '80px'),
                          }}
                        >
                          <CircularProgress 
                            size={isVerySmallMobile ? 14 : (isSmallMobile ? 16 : 20)}
                            thickness={5} 
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            fontSize: isVerySmallMobile ? '0.65rem' : (isSmallMobile ? '0.7rem' : '0.8rem')
                          }}>
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
                      <InputAdornment position="end">
                        {isLoading ? (
                          <IconButton 
                            aria-label="stop processing" 
                            onClick={handleCancelRequest}
                            edge="end"
                            size="small"
                            sx={{ 
                              mr: -0.5,
                              bgcolor: theme.palette.primary.main,
                              color: 'white',
                              width: isSmallMobile ? 24 : 28,
                              height: isSmallMobile ? 24 : 28,
                              '&:hover': {
                                bgcolor: theme.palette.primary.dark,
                              }
                            }}
                          >
                            <StopIcon fontSize={isSmallMobile ? "small" : "small"} />
                          </IconButton>
                        ) : (
                          <IconButton 
                            aria-label="send" 
                            color="primary"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            edge="end"
                            sx={{ mr: -1 }}
                          >
                            <SendIcon />
                          </IconButton>
                        )}
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Paper>
          </Draggable>
        )
      )}

      {/* Floating button to open assistant - don't show on the dedicated page */}
      {!isOpen && !isOnAssistantPage && (
        <Box>
          <AIAssistantButton />
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        sx={{ 
          zIndex: 1500, // Higher than any other component
          '& .MuiDialog-paper': {
            width: isMobile ? 'calc(100% - 32px)' : 'auto',
            maxWidth: '450px',
            mx: 'auto',
          }
        }}
      >
        <DialogTitle id="delete-dialog-title">
          Delete Conversation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this conversation? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete} 
            color="primary"
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            autoFocus
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteOutlineIcon />}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AIAssistant; 