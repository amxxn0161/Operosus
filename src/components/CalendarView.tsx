import React, { useState, useEffect, useRef } from 'react';
import { 
  Paper, 
  Box, 
  Typography, 
  IconButton, 
  Button, 
  Grid, 
  useTheme, 
  useMediaQuery,
  Tooltip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  styled,
  Chip,
  Divider,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import SyncIcon from '@mui/icons-material/Sync';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CloseIcon from '@mui/icons-material/Close';
import { useCalendar } from '../contexts/CalendarContext';
import { CalendarEvent, getCalendarEventById } from '../services/calendarService';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isSameMonth, isWithinInterval, addDays } from 'date-fns';
import EventCreationModal from './EventCreationModal';
import EventDetailsPopup from './EventDetailsPopup';
import TaskDetailsPopup from './TaskDetailsPopup';
import TaskListPopup from './TaskListPopup';
import CalendarTaskItem from './CalendarTaskItem';
import { 
  AccessTime as AccessTimeIcon, 
  People as PeopleIcon,
  Event as EventIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  VideoCall as VideoCallIcon,
  TaskAlt as TaskAltIconMui,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

// Styled components for the calendar
const EventCard = styled(Box)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  backgroundColor: bgcolor,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
  marginBottom: theme.spacing(1),
  cursor: 'pointer',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  transition: 'all 0.3s cubic-bezier(.25,.8,.25,1)',
  '&:hover': {
    boxShadow: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
  }
}));

const MonthEventCard = styled(Box)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  backgroundColor: bgcolor,
  borderRadius: theme.shape.borderRadius,
  padding: '3px 6px',
  margin: '2px 0',
  height: '22px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  alignItems: 'center',
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.05)', // Enhanced shadow
  '&:hover': {
    filter: 'brightness(0.95)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)', // Deeper shadow on hover
    transform: 'translateY(-1px)' // Slight lift effect
  }
}));

// Update the WeekEventCard styled component to ensure consistent styling for both day and week views
const WeekEventCard = styled(Box, {
  shouldForwardProp: (prop) => 
    prop !== 'bgcolor' && 
    prop !== 'top' && 
    prop !== 'height' && 
    prop !== 'width' && 
    prop !== 'left'
})<{ 
  bgcolor: string;
  top: number;
  height: number;
  width: string;
  left: string;
}>(({ theme, bgcolor, top, height, width, left }) => ({
  backgroundColor: 'white', // White background for Outlook style
  borderRadius: '4px', // Slightly increased from 3px
  padding: '5px 8px',
  cursor: 'pointer',
  overflow: 'hidden',
  position: 'absolute',
  top: `${top}px`,
  height: `${height}px`,
  width: width,
  left: left,
  boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)', // Enhanced shadow for depth
  transition: 'box-shadow 0.2s ease, filter 0.2s ease, transform 0.1s ease',
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  borderLeft: `4px solid ${bgcolor}`,
  borderTop: '1px solid rgba(0,0,0,0.07)',
  borderRight: '1px solid rgba(0,0,0,0.07)',
  borderBottom: '1px solid rgba(0,0,0,0.07)',
  minHeight: height < 50 ? 'auto' : '30px',
  color: '#333', // Dark text color
  '&:hover': {
    boxShadow: '0 4px 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)', // Deeper shadow on hover
    filter: 'brightness(1.02)',
    transform: 'translateY(-1px)' // Slight lift effect on hover
  }
}));

// Add a styled component for the current time indicator
const CurrentTimeIndicator = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: 0,
  right: 0,
  height: '2px',
  backgroundColor: '#ff5252',
  zIndex: 5,
  '&::before': {
    content: '""',
    position: 'absolute',
    left: '-8px',
    top: '-4px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ff5252'
  }
}));

// Type for color mapping
interface ColorMap {
  [key: string]: {
    background: string;
    text: string;
  };
}

// Define color map for different event types
const colorMap: ColorMap = {
  default: { background: '#1056F5', text: '#FFFFFF' },  // Main Blue
  team: { background: '#1056F5', text: '#FFFFFF' },     // Main Blue
  client: { background: '#1056F5', text: '#FFFFFF' },   // Main Blue
  focus: { background: '#E04330', text: '#FFFFFF' },    // Red for Focus Time
  manager: { background: '#1056F5', text: '#FFFFFF' },  // Main Blue
  review: { background: '#1056F5', text: '#FFFFFF' },   // Main Blue
  task: { background: '#F29702', text: '#FFFFFF' },     // Orange for Tasks
  outOfOffice: { background: '#E8EAED', text: '#071C73' }, // Light Gray for Out of Office
  1: { background: '#1056F5', text: '#FFFFFF' },        // Main Blue
  2: { background: '#1056F5', text: '#FFFFFF' },        // Main Blue
  3: { background: '#1056F5', text: '#FFFFFF' },        // Main Blue
  4: { background: '#1056F5', text: '#FFFFFF' },        // Main Blue
  5: { background: '#F29702', text: '#FFFFFF' },        // Orange (keep for tasks)
  6: { background: '#E04330', text: '#FFFFFF' },        // Red (keep for focus time)
  7: { background: '#1056F5', text: '#FFFFFF' },        // Main Blue
  8: { background: '#E8EAED', text: '#071C73' },        // Light Gray (keep for out of office)
  9: { background: '#F29702', text: '#FFFFFF' },        // Orange (keep for tasks)
  10: { background: '#1056F5', text: '#FFFFFF' },       // Main Blue
  11: { background: '#E04330', text: '#FFFFFF' }        // Red (keep for focus time)
};

// Get color for event based on type
const getEventColor = (event: CalendarEvent): string => {
  // Check for tasks first (highest priority)
  if (event.eventType === 'task') {
    return '#F29702'; // Orange for Tasks
  }
  
  // Check for other special event types
  if (event.eventType) {
    if (event.eventType === 'outOfOffice') {
      return '#E8EAED'; // Light gray for Out of Office
    }
    if (event.eventType === 'focusTime') {
      return '#E04330'; // Red for Focus Time (changed from blue #4285F4)
    }
    // All other event types use the main blue color
    return '#1056F5'; // Main blue for all other event types
  }

  // If the event has a colorId and it's for focus time or out of office, respect that
  if (event.colorId) {
    // Check if this color is meant for focus time (typically red)
    if (event.colorId === '11') { // Google's red
      return '#E04330'; // Red for Focus Time
    }
    // Check if this color is meant for out of office (typically gray)
    if (event.colorId === '8') { // Google's gray
      return '#E8EAED'; // Light gray for Out of Office
    }
  }
  
  // If event title contains "focus" or "focus time", treat as focus time
  if (event.title && event.title.toLowerCase().includes('focus')) {
    return '#E04330'; // Red for Focus Time
  }
  
  // If event title contains "out of office" or "ooo", treat as out of office
  if (event.title && 
      (event.title.toLowerCase().includes('out of office') || 
       event.title.toLowerCase().includes('ooo'))) {
    return '#E8EAED'; // Light gray for Out of Office
  }
  
  // Default to main blue for all other events
  return '#1056F5'; // Main blue for all other events
};

// Extract event type from event summary or title
const extractEventType = (text: string): string => {
  text = text.toLowerCase();
  
  // Keep these special event types for sorting/prioritization purposes
  if (text.includes('focus')) return 'focus';
  if (text.includes('stand') || text.includes('standup')) return 'standup';
  if (text.includes('out of office') || text.includes('ooo')) return 'outOfOffice';
  
  // All other event types are treated as 'default'
  return 'default';
};

// Get text color for event based on background color
const getEventTextColor = (bgColor: string): string => {
  // Always return white for better visibility on all event backgrounds
  return '#FFFFFF';
  
  // Previous code commented out for reference
  /*
  // Check if the background color is a darker shade requiring white text
  const darkColors = ['#1056F5', '#071C73', '#016C9E', '#F29702', '#E04330'];
  if (darkColors.includes(bgColor)) {
    return '#FFFFFF';
  }
  
  // For lighter colors, use the dark blue for better contrast
  return '#071C73';
  */
};

// Format time from Date object or string with more compact display
const formatTime = (time: string | Date): string => {
  const date = typeof time === 'string' ? new Date(time) : time;
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).replace(/\s/g, ''); // Remove spaces for more compact display
};

// Format event time for display
const formatEventTime = (event: CalendarEvent): string => {
  if (event.isAllDay) {
    return 'All day';
  }
  
  // For tasks without explicit time, don't show a time
  if (event.eventType === 'task' && !event.hasExplicitTime) {
    return '';
  }
  
  return `${formatTime(event.start)} - ${formatTime(event.end)}`;
};

// Update the component interface to include containerWidth
interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
  containerWidth?: number;
  hideHeader?: boolean; // Add this prop to optionally hide the header
}

// Update the component to use containerWidth
const CalendarView: React.FC<CalendarViewProps> = ({ 
  onEventClick, 
  onAddEvent,
  containerWidth = 0,
  hideHeader = false // Default to showing the header
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Add this: determine if we should use mobile view based on container width
  // Use 500px as the threshold to switch to mobile view (typical small widget width)
  const useMobileView = isMobile || (containerWidth > 0 && containerWidth < 500);
  
  const { 
    events, 
    selectedDate,
    viewMode,
    setSelectedDate,
    setViewMode,
    isLoading: calendarLoading,
    error: calendarError,
    isConnected,
    connectCalendar,
    refreshCalendarData,
    removeEvent
  } = useCalendar();
  
  // Loading state is only from calendar
  const isLoading = calendarLoading;
  
  // Error state is only from calendar
  const error = calendarError;
  
  // Add a ref for the scrollable container
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Event creation modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [clickedDate, setClickedDate] = useState<Date>(new Date());
  const [clickedTime, setClickedTime] = useState<{ hour: number; minute: number } | undefined>(undefined);
  
  // Add state to track clicked event
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  
  // State for event details popup
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupAnchorEl, setPopupAnchorEl] = useState<HTMLElement | null>(null);
  
  // State for task details popup
  const [selectedTask, setSelectedTask] = useState<CalendarEvent | null>(null);
  const [taskPopupAnchorEl, setTaskPopupAnchorEl] = useState<HTMLElement | null>(null);
  
  // State for task list popup (multiple tasks)
  const [tasksForDay, setTasksForDay] = useState<CalendarEvent[]>([]);
  const [taskListPopupAnchorEl, setTaskListPopupAnchorEl] = useState<HTMLElement | null>(null);
  
  // State for day events popup
  const [dayEventsForPopup, setDayEventsForPopup] = useState<CalendarEvent[]>([]);
  const [dayDateForPopup, setDayDateForPopup] = useState<Date | null>(null);
  const [dayEventsPopupAnchorEl, setDayEventsPopupAnchorEl] = useState<HTMLElement | null>(null);
  
  // Add a state variable to track if navigation is being performed manually or through interaction
  // Add this near the other state variables (around line 350)
  const [isManualNavigation, setIsManualNavigation] = useState(false);
  
  // Add a new state variable for showing out-of-range events
  // Add this near the other state variables around line 350
  const [showOutOfRangeEvents, setShowOutOfRangeEvents] = useState(false);
  
  // Debug logging
  useEffect(() => {
    console.log(`Calendar containerWidth: ${containerWidth}, isMobile: ${isMobile}, useMobileView: ${useMobileView}`);
  }, [containerWidth, isMobile, useMobileView]);
  
  // Make sure we're loading the data when the component mounts
  useEffect(() => {
    console.log('Initial calendar refresh from CalendarView');
    
    // Initial data load with retry mechanism
    const fetchCalendarData = async (retryCount = 0, maxRetries = 2) => {
      try {
        await refreshCalendarData();
        console.log('Calendar data refreshed successfully');
      } catch (error) {
        console.error(`Error refreshing calendar data (attempt ${retryCount + 1}):`, error);
        
        if (retryCount < maxRetries) {
          // Exponential backoff for retries
          const delay = 1000 * Math.pow(2, retryCount);
          console.log(`Retrying calendar refresh in ${delay}ms...`);
          
          setTimeout(() => {
            fetchCalendarData(retryCount + 1, maxRetries);
          }, delay);
        } else {
          console.error('Maximum retry attempts reached for calendar refresh');
        }
      }
    };
    
    // Start the initial fetch with retry capability
    fetchCalendarData();
    
    // Set up periodic refresh to keep calendar data updated
    const refreshInterval = setInterval(() => {
      console.log('Performing periodic calendar refresh');
      refreshCalendarData().catch(error => {
        console.error('Error during periodic calendar refresh:', error);
      });
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    
    // Log current events if available
    if (events.length > 0) {
      console.log(`Calendar has ${events.length} events from context`);
      console.log('First event:', events[0]);
    } else {
      console.log('No events in calendar context yet');
    }
    
    // Clean up on unmount
    return () => {
      clearInterval(refreshInterval);
    };
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Add effect to log events when they change
  useEffect(() => {
    console.log(`Events updated: ${events.length} events available`);
    if (events.length > 0) {
      console.log('Sample event titles:', events.slice(0, 3).map(e => e.title).join(', '));
      console.log('Current view mode:', viewMode);
      
      // Log events for current view
      const now = new Date();
      const currentDayEvents = getEventsForDay(now);
      console.log(`Events for today (${now.toDateString()}):`, currentDayEvents.length);
    }
  }, [events, viewMode]);

  // Add a new effect specifically for initial scroll on first render
  useEffect(() => {
    // Only run this effect once on component mount
    if (scrollContainerRef.current && (viewMode === 'day' || viewMode === 'week')) {
      const initialScrollToContent = () => {
        // Get current date events
        const currentDayEvents = getEventsForDay(selectedDate);
        const now = new Date();
        const currentHour = now.getHours();
        
        // Find the earliest non-all-day event time or use the current time
        let targetTime;
        
        if (currentDayEvents.length > 0) {
          // Sort events by start time, filtering out all-day events
          const sortedEvents = [...currentDayEvents]
            .filter(event => !event.isAllDay)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          
          if (sortedEvents.length > 0) {
            // Use the first event's start time, but back up by 30 minutes for context
            const firstEventStart = new Date(sortedEvents[0].start);
            // Cap the earliest scroll to 7am unless events start earlier
            const earliestStartHour = Math.max(7, firstEventStart.getHours() - 1);
            
            if (firstEventStart.getHours() < earliestStartHour) {
              // If the first event is before our earliest preferred time, use the event time
              targetTime = firstEventStart;
            } else {
              // Otherwise use our preferred earliest time (ex: 7am)
              targetTime = new Date(new Date(firstEventStart).setHours(earliestStartHour, 0, 0, 0));
            }
          } else {
            // If all events are all-day events, use current time or business hours
            targetTime = currentHour >= 9 && currentHour <= 17 
              ? now 
              : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
          }
        } else {
          // No events, use current time if it's during business hours, otherwise use 9am
          // For desktop view, ensure we're targeting a time within our view range
          if (!isMobile) {
            // For desktop view (8am-6pm), use 9am as default or current time if within range
            targetTime = (currentHour >= 9 && currentHour <= 17) 
              ? now 
              : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
          } else {
            // For mobile view (1am-11pm), use current time if within business hours or 9am
            targetTime = (currentHour >= 9 && currentHour <= 17) 
              ? now 
              : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
          }
        }
        
        // Ensure the target time is within our view range
        const targetHour = targetTime.getHours();
        
        if (targetHour >= DAY_START_HOUR && targetHour <= DAY_END_HOUR && scrollContainerRef.current) {
          console.log(`Initial scroll to: ${targetTime.toLocaleTimeString()}`);
          
          // Calculate position based on target time
          const timePosition = timeToPixels(targetTime) - 
                              timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
          
          // Use immediate scroll for initial rendering
          scrollContainerRef.current.scrollTop = Math.max(0, timePosition - 20); // Small offset for better viewing
        }
      };
      
      // Apply a very short timeout to ensure the calendar is rendered
      const initialScrollTimer = setTimeout(initialScrollToContent, 50);
      return () => clearTimeout(initialScrollTimer);
    }
  }, [selectedDate, viewMode]); // Add dependencies to avoid linter errors

  // Also update the auto-scroll effect for when events load or view changes
  useEffect(() => {
    if (!isLoading && scrollContainerRef.current && (viewMode === 'day' || viewMode === 'week')) {
      const scrollToContent = () => {
        // Get current date events
        const currentDayEvents = getEventsForDay(selectedDate);
        const now = new Date();
        const currentHour = now.getHours();
        
        // Find the earliest non-all-day event time or use the current time
        let targetTime;
        
        if (currentDayEvents.length > 0) {
          // Sort events by start time, filtering out all-day events
          const sortedEventsFiltered = [...currentDayEvents]
            .filter(event => !event.isAllDay)
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
          
          if (sortedEventsFiltered.length > 0) {
            // Use the first event's start time, but back up by 30 minutes for context
            const firstEventStart = new Date(sortedEventsFiltered[0].start);
            // Cap the earliest scroll to 7am unless events start earlier
            const earliestStartHour = Math.max(7, firstEventStart.getHours() - 1);
            
            if (firstEventStart.getHours() < earliestStartHour) {
              // If the first event is before our earliest preferred time, use the event time
              targetTime = firstEventStart;
            } else {
              // Otherwise use our preferred earliest time (ex: 7am)
              targetTime = new Date(new Date(firstEventStart).setHours(earliestStartHour, 0, 0, 0));
            }
          } else {
            // If all events are all-day events, use current time or business hours
            targetTime = currentHour >= 9 && currentHour <= 17 
              ? now 
              : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
          }
        } else {
          // No events, use current time if it's during business hours, otherwise use 9am
          // For desktop view, ensure we're targeting a time within our view range
          if (!isMobile) {
            // For desktop view (8am-6pm), use 9am as default or current time if within range
            targetTime = (currentHour >= 9 && currentHour <= 17) 
              ? now 
              : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
          } else {
            // For mobile view (1am-11pm), use current time if within business hours or 9am
            targetTime = (currentHour >= 9 && currentHour <= 17) 
              ? now 
              : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
          }
        }
        
        // Ensure the target time is within our view range
        const targetHour = targetTime.getHours();
        
        if (targetHour >= DAY_START_HOUR && targetHour <= DAY_END_HOUR && scrollContainerRef.current) {
          console.log(`Scrolling to: ${targetTime.toLocaleTimeString()}`);
          
          // Calculate position based on target time
          const timePosition = timeToPixels(targetTime) - 
                              timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
          
          // Apply the scroll with smooth animation
          scrollContainerRef.current.scrollTo({
            top: Math.max(0, timePosition - 20),
            behavior: 'smooth'
          });
        }
      };
      
      // Delay to ensure DOM is fully rendered
      const scrollTimer = setTimeout(scrollToContent, 150);
      
      // Cleanup timer on unmount
      return () => clearTimeout(scrollTimer);
    }
  }, [events, isLoading, viewMode, selectedDate]);
  
  // Use events directly from calendar context, no task conversion
  const allEvents = events;
  console.log(`Total events in calendar: ${allEvents.length} events`);
  
  // Function to refresh all data
  const refreshAllData = async () => {
    console.log('Refreshing calendar data...');
    refreshCalendarData();
  };

  // Function to navigate to today
  const goToToday = () => {
    console.log('Navigating to today');
    setIsManualNavigation(true);
    const today = new Date();
    setSelectedDate(today);
  };

  // Function to navigate to previous period
  const goToPrevious = () => {
    console.log('Navigating to previous period');
    setIsManualNavigation(true);
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setSelectedDate(newDate);
  };

  // Function to navigate to next period
  const goToNext = () => {
    console.log('Navigating to next period');
    setIsManualNavigation(true);
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setSelectedDate(newDate);
  };

  // Function to handle view mode change
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'day' | 'week' | 'month' | null) => {
    if (newMode !== null && newMode !== viewMode) {
      console.log(`Changing view mode from ${viewMode} to ${newMode}`);
      setViewMode(newMode);
    }
  };

  // Function to format the date range for display
  const formatDateRange = (): string => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    
    if (viewMode === 'day') {
      return selectedDate.toLocaleDateString('en-US', options);
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, etc.
      startOfWeek.setDate(startOfWeek.getDate() - day); // Go to the beginning of the week (Sunday)
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6); // Go to the end of the week (Saturday)
      
      const formattedStart = startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      const formattedEnd = endOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      return `${formattedStart} - ${formattedEnd}`;
    } else if (viewMode === 'month') {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      // "All" view
      return 'All Events';
    }
  };

  // Helper functions for getting events
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return isSameDay(date, eventStart) || 
             (isWithinInterval(date, { start: eventStart, end: eventEnd }) && 
              !isSameDay(date, eventStart));
    });
  };

  const getEventsForDateRange = (start: Date, end: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return (
        // Event starts within the range
        (eventStart >= start && eventStart <= end) ||
        // Event ends within the range
        (eventEnd >= start && eventEnd <= end) ||
        // Event spans the entire range
        (eventStart <= start && eventEnd >= end)
      );
    });
  };

  // Generate days for the week view
  const generateWeekDays = (): Date[] => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day); // Go to Sunday
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // Generate days for the month view
  const generateMonthDays = (): Date[] => {
    const firstDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    const startDay = firstDayOfMonth.getDay(); // Day of the week for the first day (0 = Sunday)
    const endDay = lastDayOfMonth.getDate(); // Last day of the month
    
    const days: Date[] = [];
    
    // Add days from previous month to fill the first week
    const prevMonth = new Date(firstDayOfMonth);
    prevMonth.setDate(0); // Last day of previous month
    const prevMonthLastDay = prevMonth.getDate();
    
    for (let i = 0; i < startDay; i++) {
      const date = new Date(prevMonth);
      date.setDate(prevMonthLastDay - startDay + i + 1);
      days.push(date);
    }
    
    // Add days of the current month
    for (let i = 1; i <= endDay; i++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
      days.push(date);
    }
    
    // Add days from next month to complete the grid (if needed)
    const totalDaysAdded = startDay + endDay;
    const remainingDays = Math.ceil(totalDaysAdded / 7) * 7 - totalDaysAdded;
    
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, i);
      days.push(date);
    }
    
    return days;
  };

  // Helper function to convert time to pixels for positioning
  const timeToPixels = (time: Date): number => {
    const hours = time.getHours();
    const minutes = time.getMinutes();
    return (hours * 60 + minutes) * (HOUR_HEIGHT / 60);
  };

  // Improved function to calculate event positions for a list-like display without overlaps
  const calculateEventPositions = (events: CalendarEvent[]): {
    event: CalendarEvent;
    column: number;
    columnsInSlot: number;
    width: string;
    left: string;
    zIndex?: number;
    isNested?: boolean;
    verticalAdjustment?: number;
  }[] => {
    if (events.length === 0) return [];
    
    // Define event type priorities for z-index layering
    const eventTypePriority: Record<string, number> = {
      'standup': 5,
      'meeting': 4,
      'call': 4,
      'appointment': 4,
      'test': 3,
      'planning': 3,
      'review': 3, 
      'focus': 1,
      'default': 2
    };
    
    // Sort events by start time first
    const sortedEvents = [...events].sort((a, b) => {
      const aStart = new Date(a.start).getTime();
      const bStart = new Date(b.start).getTime();
      
      // If start times are equal, sort by end time (longer events first)
      if (aStart === bStart) {
        const aEnd = new Date(a.end).getTime();
        const bEnd = new Date(b.end).getTime();
        return bEnd - aEnd; // Longer events first
      }
      
      return aStart - bStart; // Earlier events first
    });
    
    // Create an array to track column assignments for events
    interface ColumnTrack {
      end: number; // End time of the last event in this column
      events: CalendarEvent[]; // Events in this column
    }

    const columns: ColumnTrack[] = [];
    
    // Map to store column assignments for each event by ID
    const eventColumns = new Map<string, number>();
    // Map to store the total number of columns needed for each time slot
    const timeSlotColumns = new Map<string, number>();
    
    // First pass: assign columns to events
    sortedEvents.forEach(event => {
      const startTime = new Date(event.start).getTime();
      const endTime = new Date(event.end).getTime();
      
      // Try to find a column where this event doesn't overlap
      let columnIndex = 0;
      let placed = false;
      
      // Check each existing column
      for (let i = 0; i < columns.length; i++) {
        // If this column's last event ends before our event starts
        if (columns[i].end <= startTime) {
          columns[i].end = endTime; // Update the column's end time
          columns[i].events.push(event); // Add event to this column
          eventColumns.set(event.id, i); // Store column assignment
          placed = true;
          columnIndex = i;
          break;
        }
      }
      
      // If we couldn't place the event in an existing column, create a new one
      if (!placed) {
        columns.push({
          end: endTime,
          events: [event]
        });
        eventColumns.set(event.id, columns.length - 1);
        columnIndex = columns.length - 1;
      }
      
      // Record the max column needed for this time slot
      // We'll use the start time as the key for the time slot
      const timeSlotKey = startTime.toString();
      const currentMax = timeSlotColumns.get(timeSlotKey) || 0;
      // Update if this event's column is higher
      if (columnIndex + 1 > currentMax) {
        timeSlotColumns.set(timeSlotKey, columnIndex + 1);
      }
    });
    
    // Second pass: create the final event positions with proper widths
    return sortedEvents.map(event => {
      const eventType = event.title ? extractEventType(event.title.toLowerCase()) : 'default';
      const typePriority = eventTypePriority[eventType] || 2;
      
      const column = eventColumns.get(event.id) || 0;
      const startTime = new Date(event.start).getTime();
      const timeSlotKey = startTime.toString();
      const columnsInSlot = timeSlotColumns.get(timeSlotKey) || 1;
      
      // Calculate width and left position based on column assignment
      const width = columnsInSlot > 1 ? `${94 / columnsInSlot}%` : '94%';
      const left = columnsInSlot > 1 ? `${(column * (94 / columnsInSlot)) + 3}%` : '3%';
      
      return {
        event,
        column,
        columnsInSlot,
        width,
        left,
        zIndex: typePriority,
        isNested: columnsInSlot > 1,
        verticalAdjustment: 0 // No vertical adjustment needed now that we're using columns
      };
    });
  };

  // Constants for time grid
  const CALENDAR_ITEM_HEIGHT = 35; // Increased from 30
  const HOUR_HEIGHT = 75; // Increased from 60 - Height in pixels for one hour
  const GRID_GAP = 10; // Increased from 8
  const DEFAULT_EVENT_WIDTH = 85; // Increased from 80
  const TASK_ROW_HEIGHT = 70; // Define task row height
  
  // Use different time ranges for mobile and desktop
  const DAY_START_HOUR = isMobile ? 1 : 8; // Start at 8 AM for desktop, 1 AM for mobile
  const DAY_END_HOUR = isMobile ? 23 : 18; // End at 6 PM for desktop, 11 PM for mobile
  const TIME_LABELS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

  // Update the renderWeekView and renderDayView event rendering to improve title visibility
  // Inside the renderWeekView function, update the event rendering:
  const renderEventContent = (event: CalendarEvent, eventColor: string, textColor: string, height: number, isNested?: boolean) => {
    // Check if the current user has declined this event
    const isDeclined = event.attendees?.some(attendee => 
      (attendee.self === true && attendee.responseStatus === 'declined')
    );

    // Check if event has attachments
    const hasAttachments = event.attachments && event.attachments.length > 0;

    // Calculate border styling for declined events
    const declinedStyle = isDeclined ? {
      backgroundColor: 'white', 
      opacity: 0.9
    } : {};

    // Special handling for Task events
    if (event.eventType === 'task') {
      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          justifyContent: 'center',
          backgroundColor: 'white', // White background for Outlook style
          ...declinedStyle
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            pl: 0.5
          }}>
            <TaskAltIconMui 
              sx={{ 
                fontSize: '0.9rem', 
                color: eventColor, // Use event color for icon
                mr: 0.5 
              }} 
            />
            <Typography 
              variant="subtitle2" 
              sx={{
                color: '#333', // Dark text for Outlook style
                fontWeight: 'medium', 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.8rem',
                lineHeight: 1.2,
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
                whiteSpace: 'normal',
                maxWidth: 'calc(100% - 16px)'
              }}
            >
              {event.title}
            </Typography>
          </Box>
          {event.description && height > 30 && (
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.7rem',
                color: '#666', // Medium gray for description
                pl: 2.5, // Align with the icon
                mt: 0.2,
                fontStyle: 'italic',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {event.description.split('\n')[0]} {/* Show only first line of description */}
            </Typography>
          )}
        </Box>
      );
    }

    // Special handling for Out of Office events
    if (event.eventType === 'outOfOffice') {
      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          justifyContent: 'center',
          backgroundColor: 'white', // White background for Outlook style
          ...declinedStyle
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{
              color: '#5F6368', // Standard gray text for OOO events
              fontWeight: 'bold', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.8rem',
              lineHeight: 1.2,
              pl: 0.5,
              textAlign: 'center',
              textDecoration: isDeclined ? 'line-through' : 'none',
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              whiteSpace: 'normal'
            }}
          >
            Out of office
          </Typography>
          {event.description && height > 30 && (
            <Typography 
              variant="caption" 
              sx={{ 
                fontSize: '0.7rem',
                color: '#5F6368',
                textAlign: 'center',
                fontStyle: 'italic',
                mt: 0.5,
                textDecoration: isDeclined ? 'line-through' : 'none',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {event.description}
            </Typography>
          )}
        </Box>
      );
    }
    
    // For very small events (30px or less), show just the title
    if (height <= 30) {
      return (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center',
          overflow: 'hidden',
          width: '100%',
          ...declinedStyle
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              color: '#333', // Dark text for Outlook style
              fontWeight: 'medium', 
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.8rem',
              lineHeight: 1.2,
              pl: 0.5,
              width: '100%',
              textDecoration: isDeclined ? 'line-through' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {event.title}
          </Typography>
        </Box>
      );
    }

    // For standard events, use a clean Outlook-style format
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center',
        overflow: 'hidden',
        width: '100%',
        ...declinedStyle
      }}>
        {/* Title as main text */}
        <Typography 
          variant="subtitle2" 
          sx={{
            color: '#333', // Dark text for title (Outlook style)
            fontWeight: 'medium', 
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '0.85rem',
            lineHeight: 1.2,
            pl: 0.5,
            textDecoration: isDeclined ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            mb: height > 45 ? 0.3 : 0
          }}
        >
          {event.title}
          {hasAttachments && (
            <AttachFileIcon 
              sx={{ 
                fontSize: '0.7rem', 
                ml: 0.5,
                verticalAlign: 'middle',
                opacity: 0.7
              }} 
            />
          )}
        </Typography>
        
        {/* Only show time for events tall enough */}
        {height > 45 && !event.isAllDay && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.75rem',
              color: eventColor, // Use event color for time (Outlook style)
              fontWeight: 'medium',
              opacity: 0.95,
              pl: 0.5,
              textDecoration: isDeclined ? 'line-through' : 'none',
              whiteSpace: 'nowrap'
            }}
          >
            {formatTime(event.start)} - {formatTime(event.end)}
          </Typography>
        )}
        
        {/* Location if there's enough space */}
        {height > 60 && event.location && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.75rem',
              color: '#666', // Medium gray for location (Outlook style)
              opacity: 0.9,
              pl: 0.5,
              textDecoration: isDeclined ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            📍 {event.location}
          </Typography>
        )}
      </Box>
    );
  };

  // Function to handle event click
  const handleEventClick = async (event: CalendarEvent, e: React.MouseEvent) => {
    // Guard clause to prevent errors with undefined events
    if (!event || !event.id) {
      console.warn('Attempted to handle click on undefined event or event without ID');
      return;
    }
    
    e.stopPropagation(); // Prevent grid click handlers
    
    // Handle differently for task events
    if (event.eventType === 'task') {
      setSelectedTask(event);
      setTaskPopupAnchorEl(e.currentTarget as HTMLElement);
      return;
    }
    
    // Regular event handling
    setPopupAnchorEl(e.currentTarget as HTMLElement);
    
    try {
      // Log that we're fetching with the specific event ID
      console.log(`Fetching specific event details using ID: ${event.id}`);
      
      // Call the updated getCalendarEventById which now uses the proper eventId parameter
      const fullEventDetails = await getCalendarEventById(event.id);
      
      // Debug logging for attachments
      console.log('Full API response event details:', fullEventDetails);
      console.log('Response has attachments:', !!fullEventDetails?.attachments);
      if (fullEventDetails?.attachments) {
        console.log('API response attachments:', fullEventDetails.attachments);
      }
      
      if (fullEventDetails) {
        // Verify the returned event ID matches what we requested
        if (fullEventDetails.id === event.id) {
          console.log(`Successfully received specific event details for ID ${event.id}:`, fullEventDetails);
          console.log(`Event title: ${fullEventDetails.title}`);
          setSelectedEvent(fullEventDetails);
        } else {
          console.error(`Received event ID ${fullEventDetails.id} does not match requested ID ${event.id}`);
          setSelectedEvent(event); // Fallback to the event we have
        }
      } else {
        console.warn(`Failed to fetch specific event details for ID ${event.id}; using event from context`);
        setSelectedEvent(event); // Fallback to the event we have
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setSelectedEvent(event); // Fallback to the event we have
    }
  };
  
  // Handle clicking on a day cell that has tasks
  const handleTaskGroupClick = (tasks: CalendarEvent[], e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent grid click handlers
    setTasksForDay(tasks);
    setTaskListPopupAnchorEl(e.currentTarget as HTMLElement);
  };
  
  // Close regular event popup
  const handleClosePopup = () => {
    setPopupAnchorEl(null);
    setSelectedEvent(null);
  };
  
  // Close task detail popup
  const handleCloseTaskPopup = () => {
    setTaskPopupAnchorEl(null);
    setSelectedTask(null);
  };
  
  // Close task list popup
  const handleCloseTaskListPopup = () => {
    setTaskListPopupAnchorEl(null);
    setTasksForDay([]);
  };
  
  // Handle click on task from task list popup
  const handleTaskFromListClick = (task: CalendarEvent, e: React.MouseEvent) => {
    handleCloseTaskListPopup();
    handleEventClick(task, e);
  };

  // Handler function for deleting events
  const handleDeleteEvent = async (event: CalendarEvent) => {
    // Guard clause to prevent errors with undefined events
    if (!event || !event.id) {
      console.warn('Attempted to delete undefined event or event without ID');
      return;
    }
    
    try {
      console.log(`Deleting specific event with ID: ${event.id}`);
      
      const success = await removeEvent(event.id);
      
      if (success) {
        console.log(`Successfully deleted event with ID: ${event.id}`);
        // Close popup and refresh data
        setSelectedEvent(null);
        setActiveEventId(null);
        setPopupAnchorEl(null);
        
        // Refresh events to make sure we're up to date
        refreshCalendarData();
      } else {
        console.error(`Failed to delete event with ID: ${event.id}`);
      }
    } catch (error) {
      console.error(`Error deleting event with ID: ${event.id}:`, error);
    }
  };

  // Add handler function for editing events
  const handleEditEvent = (event: CalendarEvent) => {
    // Guard clause to prevent errors with undefined events
    if (!event || !event.id) {
      console.warn('Attempted to edit undefined event or event without ID');
      return;
    }
    
    console.log('Editing event:', event);
    // The actual edit functionality is handled by the EventEditForm component
    // This is just a placeholder for any additional logic needed when edit is clicked
  };

  // Render day view
  const renderDayView = () => {
    const dayEvents = getEventsForDay(selectedDate);
    const now = new Date();
    
    // Calculate current time indicator position
    const currentTimePosition = timeToPixels(now) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
    
    // Fix: Ensure current time is only visible if it's actually within the displayed range
    const currentHour = now.getHours();
    const isCurrentTimeVisible = currentHour >= DAY_START_HOUR && currentHour < DAY_END_HOUR;
    
    // Function to separate tasks from other events
    const separateTasksAndEvents = (events: CalendarEvent[]): {
      tasks: CalendarEvent[];
      regularEvents: CalendarEvent[];
      outOfRangeEvents: CalendarEvent[];
    } => {
      const tasks: CalendarEvent[] = [];
      const regularEvents: CalendarEvent[] = [];
      const outOfRangeEvents: CalendarEvent[] = [];
      
      events.forEach(event => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const startHour = start.getHours();
        const endHour = end.getHours();
        const endMinutes = end.getMinutes();
        
        if (event.eventType === 'task') {
          tasks.push(event);
        } else if (
          // Event starts before visible hours
          (startHour < DAY_START_HOUR && endHour <= DAY_START_HOUR) ||
          // Event starts after visible hours (after 7pm or exactly at 7pm with minutes)
          (startHour >= 19 || (startHour === 19 && endMinutes > 0))
        ) {
          outOfRangeEvents.push(event);
        } else {
          regularEvents.push(event);
        }
      });
      
      return { tasks, regularEvents, outOfRangeEvents };
    };
    
    // Separate tasks from regular events
    const { tasks, regularEvents, outOfRangeEvents } = separateTasksAndEvents(dayEvents);
    
    // Log for debugging
    console.log(`Current hour: ${currentHour}, isVisible: ${isCurrentTimeVisible}, position: ${currentTimePosition}`);
    
    const eventPositions = calculateEventPositions(regularEvents);
    
    return (
      <Box sx={{ p: 2, position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT + 50 + TASK_ROW_HEIGHT }}>
        <Typography variant="h6" gutterBottom sx={{ 
          fontWeight: 'medium', 
          color: '#333',
          mb: 1.5, // Add more space below the title
          fontSize: '1.25rem', // Slightly larger font
          display: 'flex',
          alignItems: 'center',
          '&::after': {
            content: '""',
            display: 'block',
            ml: 2,
            flexGrow: 1,
            height: '1px',
            backgroundColor: 'rgba(0,0,0,0.08)' // Subtle line extending from title
          }
        }}>
          {selectedDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography>
        
        {/* Out of range events section - only shown when filter is enabled */}
        {showOutOfRangeEvents && outOfRangeEvents.length > 0 && (
          <OutOfRangeEventsSection 
            events={outOfRangeEvents} 
            onEventClick={handleEventClick}
          />
        )}
        
        <Divider sx={{ my: 2 }} />
        
        {/* Time grid with current time indicator */}
        <Box sx={{ position: 'relative', mt: 2, ml: 8 }}> {/* Increased left margin from 6 to 8 */}
          {/* Time labels column with Tasks label */}
          <Box sx={{ position: 'absolute', left: -70, top: 0, width: 60 }}> {/* Increased width from 50 to 60 */}
            {/* Task row label */}
            <Box sx={{
              height: TASK_ROW_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 1
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem', fontWeight: 'medium' }}>
                Tasks
              </Typography>
            </Box>
            
            {TIME_LABELS.map((hour, index) => (
              <Box 
                key={hour} 
                sx={{ 
                  height: HOUR_HEIGHT, 
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  pr: 1,
                  pt: 1
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                  {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </Typography>
              </Box>
            ))}
          </Box>
          
          {/* Tasks section at the top */}
          <Box sx={{ 
            position: 'relative', 
            borderLeft: 1, 
            borderColor: 'divider',
            ml: 1,
            height: TASK_ROW_HEIGHT,
            borderBottom: 1
          }}>
            {tasks.length > 0 ? (
              <Box 
                sx={{ 
                  cursor: 'pointer',
                  height: '100%',
                  width: '100%',
                  p: 1.5, // Increased padding
                  '&:hover': {
                    backgroundColor: 'rgba(1, 108, 158, 0.05)'
                  }
                }}
                onClick={(e) => handleTaskGroupClick(tasks, e)}
              >
                <Box 
                  sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    p: 1.5, // Increased padding
                    bgcolor: '#F29702',
                    borderRadius: '4px',
                    color: 'white',
                    height: '100%',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)', // Enhanced shadow for depth
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)', // Deeper shadow on hover
                      filter: 'brightness(1.03)',
                      transform: 'translateY(-1px)' // Slight lift effect on hover
                    }
                  }}
                >
                  <TaskAltIconMui sx={{ fontSize: '1.1rem', mr: 1.5 }} /> {/* Increased size */}
                  <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 'medium' }}>
                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} pending
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'text.secondary',
                borderRadius: '4px',
                border: '1px dashed rgba(0,0,0,0.1)',
                backgroundColor: 'rgba(0,0,0,0.01)'
              }}>
                <Typography variant="caption" sx={{ fontSize: '0.85rem' }}>No tasks</Typography>
              </Box>
            )}
          </Box>
                  
          {/* Hour grid lines */}
          <Box sx={{ position: 'relative', borderLeft: 1, borderColor: 'divider', ml: 1 }}>
            {TIME_LABELS.map((hour, index) => (
              <Box 
                key={index} 
                sx={{ 
                  position: 'absolute',
                  top: index * HOUR_HEIGHT,
                  left: 0,
                  right: 0,
                  height: HOUR_HEIGHT,
                  borderBottom: 1,
                  borderColor: 'divider',
                  zIndex: 0,
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(1, 108, 158, 0.05)'
                  }
                }}
                onClick={(e) => {
                  // Handle empty slot click - opening event creation modal
                  const clickedDate = new Date(selectedDate);
                  clickedDate.setHours(hour, 0, 0, 0);
                  setClickedDate(clickedDate);
                  setClickedTime({ hour, minute: 0 });
                  setIsEventModalOpen(true);
                }}
              />
            ))}
            
            {/* Current time indicator */}
            {isCurrentTimeVisible && (
              <CurrentTimeIndicator 
                sx={{ 
                  top: currentTimePosition,
                  height: '3px' // Increased from default 2px
                }}
              />
            )}
            
            {/* No events message */}
            {regularEvents.length === 0 ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: 200, 
                zIndex: 1,
                borderRadius: '4px',
                border: '1px dashed rgba(0,0,0,0.1)',
                backgroundColor: 'rgba(0,0,0,0.01)',
                my: 2
              }}>
                <Typography variant="body1" color="text.secondary">
                  No events scheduled for this day
                </Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT }}>
                {/* Regular events */}
                {eventPositions.map(({ event, column, columnsInSlot, width, left, zIndex, isNested, verticalAdjustment }, index) => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  
                  // Calculate position and size
                  const startPx = timeToPixels(start) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                  const endPx = timeToPixels(end) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                  const height = Math.max(endPx - startPx, 30); // Minimum height of 30px (increased from 25px)
                  
                  const eventColor = getEventColor(event);
                  const textColor = getEventTextColor(eventColor);
                  
                  // Check if this is the active/clicked event
                  const isActive = activeEventId === event.id;
                  
                  // Check if the event is declined
                  const isDeclined = event.attendees?.some(attendee => 
                    (attendee.self === true && attendee.responseStatus === 'declined')
                  );
                
                  // Add vertical adjustment to prevent overlapping events
                  const topAdjustment = verticalAdjustment || 0;

                  return (
                    <WeekEventCard
                      key={event.id}
                      bgcolor={eventColor}
                      top={startPx + topAdjustment}
                      height={height}
                      width={width}
                      left={left}
                      onClick={(e) => handleEventClick(event, e)}
                      sx={{
                        zIndex: isActive ? 100 : (zIndex || 1),
                        borderTop: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(0,0,0,0.07)',
                        borderRight: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(0,0,0,0.07)',
                        borderBottom: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(0,0,0,0.07)',
                        backgroundColor: 'white', // Always white background 
                        boxShadow: isActive 
                          ? '0 6px 12px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.15)' 
                          : '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
                        p: '6px 10px', // Ensure this padding is applied consistently
                        '&:hover': {
                          boxShadow: '0 4px 8px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.15)',
                          filter: 'brightness(1.05)',
                          transform: 'translateY(-1px)' // Add lift effect
                        },
                        // Add min-height to ensure adequate space for title
                        minHeight: height < 50 ? 'auto' : '45px'
                      }}
                    >
                      {renderEventContent(
                        event, 
                        eventColor,
                        isDeclined ? '#666' : '#333', // For Outlook style, text color depends on the background being white 
                        height, 
                        isNested || columnsInSlot > 1
                      )}
                    </WeekEventCard>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDays = generateWeekDays();
    const today = new Date();
    const now = new Date();
    
    // Calculate current time indicator position
    const currentTimePosition = timeToPixels(now) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
    
    // Fix: Ensure current time is only visible if it's actually within the displayed range
    const currentHour = now.getHours();
    const isCurrentTimeVisible = currentHour >= DAY_START_HOUR && currentHour < DAY_END_HOUR;
    
    // Function to separate tasks from other events
    const separateTasksAndEvents = (events: CalendarEvent[]): {
      tasks: CalendarEvent[];
      regularEvents: CalendarEvent[];
      outOfRangeEvents: CalendarEvent[];
    } => {
      const tasks: CalendarEvent[] = [];
      const regularEvents: CalendarEvent[] = [];
      const outOfRangeEvents: CalendarEvent[] = [];
      
      events.forEach(event => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const startHour = start.getHours();
        const endHour = end.getHours();
        const endMinutes = end.getMinutes();
        
        if (event.eventType === 'task') {
          tasks.push(event);
        } else if (
          // Event starts before visible hours
          (startHour < DAY_START_HOUR && endHour <= DAY_START_HOUR) ||
          // Event starts after visible hours (after 7pm or exactly at 7pm with minutes)
          (startHour >= 19 || (startHour === 19 && endMinutes > 0))
        ) {
          outOfRangeEvents.push(event);
        } else {
          regularEvents.push(event);
        }
      });
      
      return { tasks, regularEvents, outOfRangeEvents };
    };
    
    // Log for debugging
    console.log(`Week view - Current hour: ${currentHour}, isVisible: ${isCurrentTimeVisible}, position: ${currentTimePosition}`);
    
    // Define height for the task row
    const TASK_ROW_HEIGHT = 60;
    
    // Fix this line to use the updated function return that includes outOfRangeEvents
    const { tasks: weekTasks, regularEvents: weekRegularEvents, outOfRangeEvents: weekOutOfRangeEvents } = 
      separateTasksAndEvents(getEventsForDateRange(weekDays[0], new Date(weekDays[6].getTime() + 24 * 60 * 60 * 1000)));
    
    return (
      <Grid container sx={{ 
        position: 'relative', 
        minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT + 50 + TASK_ROW_HEIGHT,
        width: '100%',
        maxWidth: '100%'
      }}>
        {/* Out of range events section - only shown when filter is enabled */}
        {showOutOfRangeEvents && weekOutOfRangeEvents.length > 0 && (
          <Grid item xs={12} sx={{ p: 2, pb: 0 }}>
            <OutOfRangeEventsSection 
              events={weekOutOfRangeEvents} 
              onEventClick={handleEventClick}
            />
          </Grid>
        )}
        
        {/* Time labels column */}
        <Grid item xs={1} sx={{ 
          borderRight: 1, 
          borderColor: 'divider',
          position: 'sticky',
          left: 0,
          backgroundColor: 'background.paper',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          minWidth: '60px', // Adjusted for better spacing
          width: '60px'
        }}>
          {/* Empty header space to align with day headers */}
          <Box sx={{ 
            height: '50px', 
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: '#f9f9f9'
          }} />
          
          {/* Task row label */}
          <Box sx={{ 
            height: TASK_ROW_HEIGHT, 
            borderBottom: 1, 
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            pr: 1
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ 
              fontSize: '0.8rem', // Increased from 0.7rem
              fontWeight: 'medium' 
            }}>
              Tasks
            </Typography>
          </Box>
          
          {/* Time labels */}
          {TIME_LABELS.map((hour) => (
            <Box 
              key={hour} 
              sx={{ 
                height: HOUR_HEIGHT, 
                borderBottom: 1, 
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                pr: 1,
                pt: 1
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </Typography>
            </Box>
          ))}
        </Grid>
        
        {/* Day columns */}
        <Grid item xs={11} sx={{ width: 'calc(100% - 60px)', maxWidth: 'calc(100% - 60px)' }}>
          <Grid container sx={{ width: '100%' }}>
            {/* Days header */}
            <Grid container sx={{ height: '50px', backgroundColor: '#f9f9f9', width: '100%' }}>
              {weekDays.map((date, index) => {
                const isToday = date.getDate() === today.getDate() && 
                              date.getMonth() === today.getMonth() && 
                              date.getFullYear() === today.getFullYear();
                return (
                  <Grid 
                    item 
                    key={index} 
                    sx={{ 
                      width: `${100 / 7}%`,
                      p: 0.5, 
                      textAlign: 'center',
                      fontWeight: 'medium',
                      borderBottom: 1,
                      borderRight: index < 6 ? 1 : 0,
                      borderColor: 'divider',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minWidth: 0 // Allow grid to shrink below minimum width
                    }}
                  >
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 0.5
                    }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontFamily: 'inherit',
                          color: 'text.secondary',
                          fontSize: '0.8rem' // Increased from 0.75rem
                        }}
                      >
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Typography>
                      
                      {/* Date number with conditional blue circle for today */}
                      {isToday ? (
                        <Box sx={{
                          width: '24px', // Increased from 22px
                          height: '24px', // Increased from 22px
                          borderRadius: '50%',
                          backgroundColor: '#1056F5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'medium',
                              color: 'white',
                              fontSize: '0.9rem' // Increased from 0.85rem
                            }}
                          >
                            {date.getDate()}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            color: 'text.primary',
                            fontSize: '0.9rem' // Increased from 0.85rem
                          }}
                        >
                          {date.getDate()}
                        </Typography>
                      )}
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Tasks row */}
            <Grid container sx={{ height: TASK_ROW_HEIGHT, borderBottom: 1, borderColor: 'divider' }}>
              {weekDays.map((date, dayIndex) => {
                const dayEvents = getEventsForDay(date);
                const { tasks, regularEvents } = separateTasksAndEvents(dayEvents);
                const isToday = date.getDate() === today.getDate() && 
                              date.getMonth() === today.getMonth() && 
                              date.getFullYear() === today.getFullYear();
                
                return (
                  <Grid 
                    item 
                    key={`task-${dayIndex}`}
                    sx={{ 
                      width: `${100 / 7}%`,
                      height: TASK_ROW_HEIGHT,
                      position: 'relative',
                      borderRight: dayIndex < 6 ? 1 : 0,
                      borderColor: 'divider',
                      backgroundColor: isToday ? 'rgba(1, 108, 158, 0.03)' : 'transparent',
                      overflow: 'hidden'
                    }}
                  >
                    {tasks.length > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '92%', // Increased from 90%
                          height: 45, // Increased from 40
                          backgroundColor: '#F29702',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.15)', // Increased shadow
                          border: '1px solid rgba(255,255,255,0.3)',
                          '&:hover': {
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // Enhanced shadow on hover
                            filter: 'brightness(1.05)'
                          }
                        }}
                        onClick={(e) => handleTaskGroupClick(tasks, e)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                          <TaskAltIconMui 
                            sx={{ 
                              fontSize: '0.9rem', // Increased from 0.8rem
                              color: 'white',
                              mr: 0.5 
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.85rem', // Increased from 0.8rem
                              fontWeight: 'medium',
                              color: 'white',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                          </Typography>
                        </Box>
                      </Box>
                    )}
                  </Grid>
                );
              })}
            </Grid>
        
            {/* Days content - Time grid */}
            <Grid container>
              {weekDays.map((date, dayIndex) => {
                const dayEvents = getEventsForDay(date);
                
                // Separate tasks from regular events
                const { tasks, regularEvents } = separateTasksAndEvents(dayEvents);
                
                // Create positions only for regular events
                const eventPositions = calculateEventPositions(regularEvents);
                
                const isToday = date.getDate() === today.getDate() && 
                              date.getMonth() === today.getMonth() && 
                              date.getFullYear() === today.getFullYear();
                
                return (
                  <Grid 
                    item 
                    key={dayIndex}
                    sx={{ 
                      width: `${100 / 7}%`,
                      position: 'relative',
                      borderRight: dayIndex < 6 ? 1 : 0,
                      borderColor: 'divider',
                      minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT,
                      backgroundColor: isToday ? 'rgba(1, 108, 158, 0.03)' : 'transparent'
                    }}
                  >
                    {/* Time grid lines */}
                    {TIME_LABELS.map((hour, hourIndex) => (
                      <Box 
                        key={hourIndex} 
                        sx={{ 
                          position: 'absolute',
                          top: hourIndex * HOUR_HEIGHT,
                          left: 0,
                          right: 0,
                          height: HOUR_HEIGHT,
                          borderBottom: 1,
                          borderColor: 'divider',
                          zIndex: 0,
                          cursor: 'pointer'
                        }}
                        onClick={(e) => {
                          // Handle empty slot click
                          const clickedDate = new Date(date);
                          clickedDate.setHours(hour, 0, 0, 0);
                          setClickedDate(clickedDate);
                          setClickedTime({ hour, minute: 0 });
                          setIsEventModalOpen(true);
                        }}
                      />
                    ))}
                    
                    {/* Current time indicator */}
                    {isToday && isCurrentTimeVisible && (
                      <CurrentTimeIndicator 
                        sx={{ 
                          top: currentTimePosition
                        }}
                      />
                    )}
                    
                    {/* Regular Events */}
                    {eventPositions.map(({ event, column, columnsInSlot, width, left, zIndex, isNested, verticalAdjustment }, index) => {
                      const start = new Date(event.start);
                      const end = new Date(event.end);
                      
                      // Calculate position and size
                      const startPx = timeToPixels(start) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                      const endPx = timeToPixels(end) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                      const height = Math.max(endPx - startPx, 30); // Minimum height of 30px (increased from 25px)
                      
                      const eventColor = getEventColor(event);
                      const textColor = getEventTextColor(eventColor);
                      
                      // Check if this is the active/clicked event
                      const isActive = activeEventId === event.id;
                      
                      // Check if the event is declined
                      const isDeclined = event.attendees?.some(attendee => 
                        (attendee.self === true && attendee.responseStatus === 'declined')
                      );
                    
                      // Add vertical adjustment to prevent overlapping events
                      const topAdjustment = verticalAdjustment || 0;

                      return (
                        <WeekEventCard
                          key={event.id}
                          bgcolor={eventColor}
                          top={startPx + topAdjustment}
                          height={height}
                          width={width}
                          left={left}
                          onClick={(e) => handleEventClick(event, e)}
                          sx={{
                            zIndex: isActive ? 100 : (zIndex || 1),
                            borderTop: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(0,0,0,0.07)',
                            borderRight: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(0,0,0,0.07)',
                            borderBottom: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(0,0,0,0.07)',
                            backgroundColor: 'white', // Always white background 
                            boxShadow: isActive 
                              ? '0 6px 12px rgba(0,0,0,0.25), 0 3px 6px rgba(0,0,0,0.15)' 
                              : '0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)',
                            p: '6px 10px', // Ensure this padding is applied consistently
                            '&:hover': {
                              boxShadow: '0 4px 8px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.15)',
                              filter: 'brightness(1.05)',
                              transform: 'translateY(-1px)' // Add lift effect
                            },
                            // Add min-height to ensure adequate space for title
                            minHeight: height < 50 ? 'auto' : '45px'
                          }}
                        >
                          {renderEventContent(
                            event, 
                            eventColor,
                            isDeclined ? '#666' : '#333', // For Outlook style, text color depends on the background being white 
                            height, 
                            isNested || columnsInSlot > 1
                          )}
                        </WeekEventCard>
                      );
                    })}
                  </Grid>
                );
              })}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const today = new Date();
    
    // Get all events for the month view date range
    const monthViewEvents = getEventsForDateRange(startDate, endDate);
    
    // Function to get events for a specific day
    const getDayEvents = (date: Date): CalendarEvent[] => {
      return monthViewEvents.filter(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        return isSameDay(date, eventStart) || 
               (isWithinInterval(date, { start: eventStart, end: eventEnd }) && 
                !isSameDay(date, eventStart));
      });
    };
    
    // Function to separate tasks from other events
    const separateTasksAndEvents = (events: CalendarEvent[]): {
      tasks: CalendarEvent[];
      regularEvents: CalendarEvent[];
    } => {
      const tasks: CalendarEvent[] = [];
      const regularEvents: CalendarEvent[] = [];
      
      events.forEach(event => {
        if (event.eventType === 'task') {
          tasks.push(event);
        } else {
          regularEvents.push(event);
        }
      });
      
      return { tasks, regularEvents };
    };
    
    // Maximum events to show per day cell
    const MAX_EVENTS_PER_DAY = 2;
    
    // Generate week rows
    const generateCalendarGrid = () => {
      let weeks = [];
      let days = [];
      let day = startDate;
      
      while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
          const currentDay = new Date(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);
          const dayEvents = getDayEvents(currentDay);
          
          // Separate tasks from regular events
          const { tasks, regularEvents } = separateTasksAndEvents(dayEvents);
          
          // Sort events by start time
          const sortedEvents = [...regularEvents].sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
          );
          
          days.push({
            date: currentDay,
            isCurrentMonth,
            isToday,
            events: sortedEvents,
            tasks: tasks,
            dayStr: format(day, 'd')
          });
          
          day = addDays(day, 1);
        }
        
        weeks.push(days);
        days = [];
      }
      
      return weeks;
    };
    
    const calendarGrid = generateCalendarGrid();
    
    return (
      <Box>
        {/* Weekday header */}
        <Grid container sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f9f9f9' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <Grid item key={dayName} xs sx={{ py: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                {dayName}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        {/* Calendar grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateRows: `repeat(${calendarGrid.length}, 1fr)`,
          height: `calc(100vh - 240px)`,
          minHeight: 500,
          maxHeight: 800
        }}>
          {calendarGrid.map((week, weekIndex) => (
            <Box 
              key={weekIndex} 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: weekIndex < calendarGrid.length - 1 ? 1 : 0,
                borderColor: 'divider'
              }}
            >
              {week.map((day, dayIndex) => (
                <Box 
                  key={`${weekIndex}-${dayIndex}`}
                  sx={{ 
                    p: 0.5,
                    position: 'relative',
                    height: '100%',
                    borderRight: dayIndex < 6 ? 1 : 0,
                    borderColor: 'divider',
                    backgroundColor: day.isToday ? 'rgba(1, 108, 158, 0.03)' : (day.isCurrentMonth ? 'transparent' : 'rgba(0, 0, 0, 0.02)'),
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: day.isToday ? 'rgba(1, 108, 158, 0.05)' : 'rgba(0, 0, 0, 0.01)'
                    }
                  }}
                  onClick={() => {
                    console.log('Clicked on day:', day.date.toDateString());
                    // Set flag for manual navigation
                    setIsManualNavigation(true);
                    // First update view mode, then set the date
                    setViewMode('day');
                    setTimeout(() => {
                      setSelectedDate(day.date);
                    }, 10);
                  }}
                >
                  {/* Date display at top right */}
                  <Box sx={{ 
                    mb: 0.5, 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                  }}>
                    {day.isToday ? (
                      <Box sx={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#1056F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'medium',
                            color: 'white'
                          }}
                        >
                          {day.dayStr}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'medium',
                          color: day.isCurrentMonth ? 'text.primary' : 'text.disabled'
                        }}
                      >
                        {day.dayStr}
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Tasks indicator */}
                  {day.tasks.length > 0 && (
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        mb: 0.5,
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        backgroundColor: '#F29702',
                        width: 'fit-content'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskGroupClick(day.tasks, e);
                      }}
                    >
                      <TaskAltIconMui sx={{ fontSize: '0.7rem', color: 'white', mr: 0.5 }} />
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'white' }}>
                        {day.tasks.length}
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Event indicators */}
                  {day.events.slice(0, MAX_EVENTS_PER_DAY).map((event, index) => {
                    const eventColor = getEventColor(event);
                    
                    // Check if the event is declined
                    const isDeclined = event.attendees?.some(attendee => 
                      (attendee.self === true && attendee.responseStatus === 'declined')
                    );
                    
                    return (
                      <Box 
                        key={event.id} 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          mb: 0.5,
                          px: 1.5, // Increased from 1
                          py: 0.5,  // Increased from 0.25
                          borderRadius: 1,
                          backgroundColor: isDeclined ? 'transparent' : eventColor,
                          border: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(255,255,255,0.3)',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          color: isDeclined ? 'text.primary' : getEventTextColor(eventColor),
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                          minHeight: '22px', // Increased from 20px
                          maxWidth: '97%',   // Increased from 95%
                          '&:hover': {
                            filter: 'brightness(0.95)',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event, e);
                        }}
                      >
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.75rem', // Increased from 0.7rem
                          fontWeight: 'medium', // Added medium font weight
                          textDecoration: isDeclined ? 'line-through' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%'
                        }}>
                          {!event.isAllDay && format(new Date(event.start), 'h:mm')} {event.title}
                        </Typography>
                      </Box>
                    );
                  })}
                  
                  {/* More events indicator */}
                  {day.events.length > MAX_EVENTS_PER_DAY && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: '0.7rem', 
                        color: 'primary.main',
                        mt: 'auto',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: 'rgba(16, 86, 245, 0.1)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignSelf: 'flex-start',
                        '&:hover': {
                          backgroundColor: 'rgba(16, 86, 245, 0.15)',
                        }
                      }}
                      onClick={(e) => handleMoreEventsClick(day.date, day.events, e)}
                    >
                      +{day.events.length - MAX_EVENTS_PER_DAY} more
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Render all events view
  const renderAllEventsView = () => {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>All Upcoming Events</Typography>
        <Typography variant="body1">This view is not implemented yet.</Typography>
      </Box>
    );
  };

  // Add effect to refresh data when view mode changes
  useEffect(() => {
    console.log(`View mode changed to: ${viewMode}`);
    
    // Only refresh data if it's not a manual navigation
    if (!isManualNavigation) {
      setTimeout(() => {
        console.log('Refreshing data after view mode change');
        refreshCalendarData();
      }, 10);
    } else {
      console.log('Skipping refresh due to manual navigation');
      // Reset the flag for next time
      setIsManualNavigation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);
  
  // Add effect to refresh data when selected date changes
  useEffect(() => {
    console.log(`Selected date changed to: ${selectedDate.toDateString()}`);
    
    // Only refresh data if it's not a manual navigation
    if (!isManualNavigation) {
      setTimeout(() => {
        console.log('Refreshing data after date change');
        refreshCalendarData();
      }, 10);
    } else {
      console.log('Skipping refresh due to manual navigation');
      // Reset the flag after this effect runs
      setIsManualNavigation(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Add this function to calculate the current time position
  const calculateCurrentTimePosition = (): number => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // If outside the visible range, return -999 (will not be visible)
    if (hours < DAY_START_HOUR || hours > DAY_END_HOUR) {
      return -999;
    }
    
    // Calculate pixels from day start
    const hoursFraction = hours + (minutes / 60);
    const hoursFromStart = hoursFraction - DAY_START_HOUR;
    return hoursFromStart * HOUR_HEIGHT;
  };
  
  // Define helper function to separate tasks and events
  const separateTasksAndEvents = (events: CalendarEvent[]): {
    tasks: CalendarEvent[];
    regularEvents: CalendarEvent[];
  } => {
    const tasks: CalendarEvent[] = [];
    const regularEvents: CalendarEvent[] = [];
    
    events.forEach(event => {
      // Check if this is a task based on title or eventType
      if ((event.eventType && event.eventType.includes('task')) || 
          event.title.toLowerCase().includes('task') ||
          (event.taskListId !== undefined)) {
        tasks.push(event);
      } else {
        regularEvents.push(event);
      }
    });
    
    return { tasks, regularEvents };
  };
  
  // Define the generateCalendarGrid function for the mobile month view
  const generateCalendarGrid = () => {
    const monthDays = generateMonthDays();
    const today = new Date();
    
    // Split the array into weeks
    const weeks = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      const week = monthDays.slice(i, i + 7);
      
      // For each day, get the events and add a structure
      const structuredWeek = week.map(date => {
        const dayEvents = getEventsForDay(date);
        const isToday = date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear();
        const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
        
        return {
          date,
          events: dayEvents,
          isToday,
          isCurrentMonth
        };
      });
      
      weeks.push(structuredWeek);
    }
    
    return weeks;
  };

  // Define the variable today for use in mobile views
  const today = new Date();
  
  // Add a new mobile-specific day view renderer
  const renderMobileDayView = () => {
    // Similar to renderDayView but optimized for mobile screens with a list format like week view
    const dayEvents = getEventsForDay(selectedDate);
    
    // Separate tasks from regular events
    const { tasks, regularEvents } = separateTasksAndEvents(dayEvents);
    
    // Sort tasks and regular events separately
    const sortedTasks = [...tasks].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    
    const sortedRegularEvents = [...regularEvents].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    
    // Put tasks at the top followed by regular events
    const allEvents = [...sortedTasks, ...sortedRegularEvents];
    
    // Check if selected date is today
    const isToday = selectedDate.getDate() === today.getDate() && 
                  selectedDate.getMonth() === today.getMonth() && 
                  selectedDate.getFullYear() === today.getFullYear();
    
    return (
      <Box sx={{ overflow: 'hidden' }}>
        {/* Day header */}
        <Box sx={{ 
          display: 'flex', 
          backgroundColor: isToday ? 'rgba(1, 108, 158, 0.1)' : '#f9f9f9',
          borderBottom: 1,
          borderColor: 'divider',
          p: 1.5,
        }}>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              fontWeight: 'medium',
              flex: 1
            }}
          >
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
        </Box>
        
        {/* Event list */}
        <Box sx={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
          {allEvents.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body1" color="text.secondary">
                No events scheduled for this day
              </Typography>
            </Box>
          ) : (
            <>
              {/* Tasks section with heading if tasks exist */}
              {sortedTasks.length > 0 && (
                <>
                  <Box sx={{ 
                    backgroundColor: 'rgba(242, 151, 2, 0.1)', 
                    p: 1, 
                    pl: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider' 
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tasks
                    </Typography>
                  </Box>
                  {sortedTasks.map((event) => {
                    const eventColor = getEventColor(event);
                    const isDeclined = event.attendees?.some(attendee => 
                      (attendee.self === true && attendee.responseStatus === 'declined')
                    );
                    
                    return (
                      <Box 
                        key={event.id} 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          p: 1.5,
                          borderLeft: `4px solid ${eventColor}`,
                          backgroundColor: isDeclined ? 'transparent' : 'rgba(0, 0, 0, 0.01)',
                          borderBottom: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)'
                          }
                        }}
                        onClick={(e) => handleTaskFromListClick(event, e)}
                      >
                        <Box sx={{ mr: 1.5, minWidth: '65px' }}>
                          <Typography variant="caption" color="text.secondary">
                            {/* Empty time slot for tasks */}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TaskAltIconMui 
                              sx={{ 
                                fontSize: '0.8rem', 
                                color: eventColor,
                                mr: 0.5 
                              }} 
                            />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'medium',
                                textDecoration: isDeclined ? 'line-through' : 'none'
                              }}
                            >
                              {event.title}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </>
              )}
              
              {/* Events section with heading if events exist */}
              {sortedRegularEvents.length > 0 && (
                <>
                  <Box sx={{ 
                    backgroundColor: 'rgba(16, 86, 245, 0.1)', 
                    p: 1, 
                    pl: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider' 
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Events
                    </Typography>
                  </Box>
                  {sortedRegularEvents.map((event) => {
                    const eventColor = getEventColor(event);
                    const textColor = getEventTextColor(eventColor);
                    
                    const isDeclined = event.attendees?.some(attendee => 
                      (attendee.self === true && attendee.responseStatus === 'declined')
                    );
                    
                    return (
                      <Box 
                        key={event.id} 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          p: 1.5,
                          borderLeft: `4px solid ${eventColor}`,
                          backgroundColor: isDeclined ? 'transparent' : 'rgba(0, 0, 0, 0.01)',
                          borderBottom: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)'
                          }
                        }}
                        onClick={(e) => handleEventClick(event, e)}
                      >
                        <Box sx={{ mr: 1.5, minWidth: '65px' }}>
                          <Typography variant="caption" color="text.secondary">
                            {event.isAllDay ? 'All day' : formatTime(event.start)}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'medium',
                                textDecoration: isDeclined ? 'line-through' : 'none'
                              }}
                            >
                              {event.title}
                            </Typography>
                          </Box>
                          {event.location && (
                            <Typography variant="caption" color="text.secondary">
                              {event.location}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  };
  
  // Add a new mobile-specific week view renderer
  const renderMobileWeekView = () => {
    const weekDays = generateWeekDays();
    const today = new Date();
    
    // Separate tasks and events across all days of the week
    const allWeekTasks: CalendarEvent[] = [];
    const dayEventsMap: Record<string, CalendarEvent[]> = {};
    
    weekDays.forEach((date, index) => {
      const dayEvents = getEventsForDay(date);
      const { tasks, regularEvents } = separateTasksAndEvents(dayEvents);
      
      // Add tasks to the combined tasks list
      if (tasks.length > 0) {
        allWeekTasks.push(...tasks);
      }
      
      // Keep regular events grouped by day
      if (regularEvents.length > 0) {
        // Use date string as the key
        const dateKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        dayEventsMap[dateKey] = regularEvents.sort((a, b) => 
          new Date(a.start).getTime() - new Date(b.start).getTime()
        );
      }
    });
    
    // Sort all tasks by due date
    const sortedTasks = [...allWeekTasks].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    
    return (
      <Box sx={{ overflow: 'hidden' }}>
        {/* Days header */}
        <Box sx={{ 
          display: 'flex', 
          backgroundColor: '#f9f9f9',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          {weekDays.map((date, index) => {
            const isToday = date.getDate() === today.getDate() && 
                          date.getMonth() === today.getMonth() && 
                          date.getFullYear() === today.getFullYear();
            return (
              <Box 
                key={index} 
                sx={{ 
                  flex: 1,
                  p: 0.5, 
                  textAlign: 'center',
                  fontWeight: 'medium',
                  borderRight: index < 6 ? 1 : 0,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isToday ? 'rgba(1, 108, 158, 0.1)' : 'transparent',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedDate(date);
                  setViewMode('day');
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: isToday ? 'bold' : 'medium' }}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isToday ? 'bold' : 'regular',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: isToday ? 'primary.main' : 'transparent',
                    color: isToday ? 'white' : 'inherit'
                  }}
                >
                  {date.getDate()}
                </Typography>
              </Box>
            );
          })}
        </Box>
        
        {/* Content area with tasks and events */}
        <Box sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
          {sortedTasks.length === 0 && Object.keys(dayEventsMap).length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
              <Typography variant="body1" color="text.secondary">
                No events scheduled for this week
              </Typography>
            </Box>
          ) : (
            <>
              {/* Tasks section with heading if tasks exist */}
              {sortedTasks.length > 0 && (
                <>
                  <Box sx={{ 
                    backgroundColor: 'rgba(242, 151, 2, 0.1)', 
                    p: 1, 
                    pl: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider' 
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tasks
                    </Typography>
                  </Box>
                  {sortedTasks.map((event) => {
                    const eventColor = getEventColor(event);
                    const isDeclined = event.attendees?.some(attendee => 
                      (attendee.self === true && attendee.responseStatus === 'declined')
                    );
                    
                    // Get the day of the task for display
                    const taskDate = new Date(event.start);
                    const dayName = taskDate.toLocaleDateString('en-US', { weekday: 'short' });
                    
                    return (
                      <Box 
                        key={event.id} 
                        sx={{ 
                          display: 'flex',
                          alignItems: 'center',
                          p: 1.5,
                          borderLeft: `4px solid ${eventColor}`,
                          backgroundColor: isDeclined ? 'transparent' : 'rgba(0, 0, 0, 0.01)',
                          borderBottom: 1,
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)'
                          }
                        }}
                        onClick={(e) => handleTaskFromListClick(event, e)}
                      >
                        <Box sx={{ mr: 1.5, minWidth: '65px' }}>
                          <Typography variant="caption" color="text.secondary">
                            {dayName}
                            {event.hasExplicitTime && (
                              <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                {formatTime(event.start)}
                              </Box>
                            )}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <TaskAltIconMui 
                              sx={{ 
                                fontSize: '0.8rem', 
                                color: eventColor,
                                mr: 0.5 
                              }} 
                            />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'medium',
                                textDecoration: isDeclined ? 'line-through' : 'none'
                              }}
                            >
                              {event.title}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </>
              )}
              
              {/* Regular events grouped by day */}
              {Object.keys(dayEventsMap).length > 0 && (
                <>
                  <Box sx={{ 
                    backgroundColor: 'rgba(16, 86, 245, 0.1)', 
                    p: 1, 
                    pl: 2, 
                    borderBottom: 1, 
                    borderColor: 'divider' 
                  }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Events
                    </Typography>
                  </Box>
                  
                  {Object.entries(dayEventsMap).map(([dateKey, events]) => (
                    <Box key={dateKey}>
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          pl: 2, 
                          py: 0.5, 
                          backgroundColor: 'rgba(0, 0, 0, 0.02)',
                          borderBottom: 1,
                          borderColor: 'divider',
                          fontWeight: 'medium'
                        }}
                      >
                        {dateKey}
                      </Typography>
                      
                      {events.map((event) => {
                        const eventColor = getEventColor(event);
                        const textColor = getEventTextColor(eventColor);
                        
                        const isDeclined = event.attendees?.some(attendee => 
                          (attendee.self === true && attendee.responseStatus === 'declined')
                        );
                        
                        return (
                          <Box 
                            key={event.id} 
                            sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              p: 1.5,
                              borderLeft: `4px solid ${eventColor}`,
                              backgroundColor: isDeclined ? 'transparent' : 'rgba(0, 0, 0, 0.01)',
                              borderBottom: 1,
                              borderColor: 'divider',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.03)'
                              }
                            }}
                            onClick={(e) => handleEventClick(event, e)}
                          >
                            <Box sx={{ mr: 1.5, minWidth: '65px' }}>
                              <Typography variant="caption" color="text.secondary">
                                {event.isAllDay ? 'All day' : formatTime(event.start)}
                              </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 'medium',
                                    textDecoration: isDeclined ? 'line-through' : 'none'
                                  }}
                                >
                                  {event.title}
                                </Typography>
                              </Box>
                              {event.location && (
                                <Typography variant="caption" color="text.secondary">
                                  {event.location}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </>
              )}
            </>
          )}
        </Box>
      </Box>
    );
  };
  
  // Add a new mobile-specific month view renderer
  const renderMobileMonthView = () => {
    // Similar structure to renderMonthView but with larger touch targets and simplified UI
    const calendarGrid = generateCalendarGrid();
    
    return (
      <Box>
        {/* Weekday header */}
        <Grid container sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f9f9f9' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayName) => (
            <Grid item key={dayName} xs sx={{ py: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="medium">
                {dayName}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        {/* Calendar grid */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateRows: `repeat(${calendarGrid.length}, 1fr)`,
          minHeight: 400,
          maxHeight: 'calc(100vh - 240px)'
        }}>
          {calendarGrid.map((week, weekIndex) => (
            <Box 
              key={weekIndex} 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)',
                borderBottom: weekIndex < calendarGrid.length - 1 ? 1 : 0,
                borderColor: 'divider'
              }}
            >
              {week.map((day, dayIndex) => (
                <Box 
                  key={dayIndex} 
                  sx={{ 
                    p: 0.5,
                    height: '100%',
                    minHeight: 60,
                    borderRight: dayIndex < 6 ? 1 : 0,
                    borderColor: 'divider',
                    backgroundColor: day.isToday ? 'rgba(1, 108, 158, 0.05)' : day.isCurrentMonth ? 'transparent' : '#f9f9f9',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    console.log('Clicked on day:', day.date.toDateString());
                    // Set flag for manual navigation
                    setIsManualNavigation(true);
                    // First update view mode, then set the date
                    setViewMode('day');
                    setTimeout(() => {
                      setSelectedDate(day.date);
                    }, 10);
                  }}
                >
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: day.isToday ? 'bold' : day.isCurrentMonth ? 'medium' : 'regular',
                      color: day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                      textAlign: 'center',
                      width: '100%',
                      mb: 0.5,
                      alignSelf: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Box 
                      sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: day.isToday ? 'primary.main' : 'transparent',
                        color: day.isToday ? 'white' : 'inherit'
                      }}
                    >
                      {day.date.getDate()}
                    </Box>
                  </Typography>
                  
                  {/* Show event count indicator instead of individual events for mobile */}
                  {day.events.length > 0 && (
                    <Box 
                      sx={{ 
                        display: 'flex',
                        justifyContent: 'center',
                        mt: 1
                      }}
                    >
                      <Chip
                        size="small"
                        label={`${day.events.length} event${day.events.length > 1 ? 's' : ''}`}
                        sx={{ 
                          height: 24,
                          fontSize: '0.65rem',
                          fontWeight: 'medium',
                          backgroundColor: 'primary.light',
                          color: 'primary.contrastText'
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  // Handle clicking on "+ more" in month view to show all events for a day
  const handleMoreEventsClick = (date: Date, events: CalendarEvent[], e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent day cell click handler
    setDayEventsForPopup(events);
    setDayDateForPopup(date);
    setDayEventsPopupAnchorEl(e.currentTarget as HTMLElement);
  };

  // Close day events popup
  const handleCloseDayEventsPopup = () => {
    setDayEventsPopupAnchorEl(null);
    setDayEventsForPopup([]);
    setDayDateForPopup(null);
  };

  // Handle navigating to day view from popup
  const handleGoToDayView = () => {
    if (dayDateForPopup) {
      // Set the manual navigation flag to true
      setIsManualNavigation(true);
      
      setViewMode('day');
      // Use a slightly longer timeout to ensure view mode change completes first
      setTimeout(() => {
        setSelectedDate(dayDateForPopup);
      }, 50);
      handleCloseDayEventsPopup();
    }
  };

  // Day Events Popup component
  const DayEventsPopup: React.FC<{
    events: CalendarEvent[];
    date: Date | null;
    anchorEl: HTMLElement | null;
    onClose: () => void;
    onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
    onGoToDayView: () => void;
  }> = ({ events, date, anchorEl, onClose, onEventClick, onGoToDayView }) => {
    
    // Format the date
    const formatPopupDate = () => {
      if (!date) return '';
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
      });
    };

    // Group events by type
    const groupedEvents = React.useMemo(() => {
      const groups: Record<string, CalendarEvent[]> = {
        'Focus Time': [],
        'Meetings': [],
        'Other': []
      };
      
      events.forEach(event => {
        if (event.title?.toLowerCase().includes('focus')) {
          groups['Focus Time'].push(event);
        } else if (event.eventType === 'task') {
          // Skip tasks - they have their own popup
        } else {
          groups['Meetings'].push(event);
        }
      });

      // Remove empty groups
      return Object.fromEntries(
        Object.entries(groups).filter(([_, groupEvents]) => groupEvents.length > 0)
      );
    }, [events]);

    return (
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { 
            width: 400,
            maxWidth: '95vw',
            borderRadius: 2,
            height: 'auto',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
        className="day-events-popup"
      >
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: '#1056F5', // Blue color for events
            color: 'white',
            flexShrink: 0 // Prevent header from shrinking
          }}
        >
          <EventIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold', fontFamily: 'Poppins' }}>
            Events for {formatPopupDate()}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Events List - This is the scrollable area */}
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'rgba(0,0,0,0.05)',
            },
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,0,0,0.2) rgba(0,0,0,0.05)',
          }}
          className="events-section"
        >
          {Object.entries(groupedEvents).map(([groupName, groupEvents]) => (
            <Box key={groupName} sx={{ mb: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  px: 2, 
                  py: 1, 
                  bgcolor: groupName === 'Focus Time' 
                    ? 'rgba(224, 67, 48, 0.1)' // Light red for focus time
                    : 'rgba(16, 86, 245, 0.1)', // Light blue for meetings
                  fontWeight: 'bold',
                  color: groupName === 'Focus Time' 
                    ? '#E04330' // Red for focus time
                    : '#1056F5' // Blue for meetings
                }}
              >
                {groupName} ({groupEvents.length})
              </Typography>
              <List dense disablePadding>
                {groupEvents.map(event => {
                  const eventColor = getEventColor(event);
                  const isDeclined = event.attendees?.some(attendee => 
                    (attendee.self === true && attendee.responseStatus === 'declined')
                  );
                  return (
                    <ListItem 
                      key={event.id} 
                      button 
                      onClick={(e) => onEventClick(event, e)}
                      sx={{ 
                        pl: 2,
                        borderLeft: `4px solid ${eventColor}`,
                        marginLeft: '8px',
                        marginRight: '8px',
                        marginBottom: '4px',
                        borderRadius: '4px',
                        '&:hover': { 
                          bgcolor: 'rgba(0, 0, 0, 0.04)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            sx={{ 
                              textDecoration: isDeclined ? 'line-through' : 'none',
                              color: isDeclined ? 'text.disabled' : 'text.primary'
                            }}
                          >
                            {event.title}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {event.isAllDay 
                              ? 'All day'
                              : `${formatTime(event.start)} - ${formatTime(event.end)}`}
                          </Typography>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider', 
          display: 'flex', 
          justifyContent: 'flex-end',
          flexShrink: 0 // Prevent footer from shrinking
        }}>
          <Button 
            variant="outlined"
            onClick={onClose}
            sx={{ mr: 1 }}
          >
            Close
          </Button>
          <Button 
            variant="contained"
            onClick={onGoToDayView}
            sx={{ bgcolor: '#1056F5', '&:hover': { bgcolor: '#0A3BB3' } }}
          >
            View Full Day
          </Button>
        </Box>
      </Popover>
    );
  };

  // Add a new component for displaying out-of-range events - add this after the renderEventContent function
  const OutOfRangeEventsSection: React.FC<{
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent, e: React.MouseEvent) => void;
  }> = ({ events, onEventClick }) => {
    if (events.length === 0) return null;

    return (
      <Box sx={{ 
        borderRadius: '4px',
        border: '1px solid rgba(0,0,0,0.09)',
        backgroundColor: 'rgba(236, 236, 255, 0.2)',
        p: 1.5,
        mb: 2,
        mt: 1,
        boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)'
      }}>
        <Typography variant="subtitle2" sx={{ 
          mb: 1, 
          color: 'text.secondary', 
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5
        }}>
          <AccessTimeIcon sx={{ fontSize: '1rem' }} />
          {events.length} {events.length === 1 ? 'event' : 'events'} outside visible hours ({DAY_START_HOUR}:00 - {DAY_END_HOUR}:00)
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {events.map(event => {
            const startTime = new Date(event.start);
            const endTime = new Date(event.end);
            const eventColor = getEventColor(event);
            const textColor = getEventTextColor(eventColor);
            const isEarlyMorning = startTime.getHours() < DAY_START_HOUR;
            const isLateEvening = startTime.getHours() >= DAY_END_HOUR;
            
            // Show when the event occurs
            const timeIndicator = isEarlyMorning 
              ? "Early Morning" 
              : isLateEvening 
                ? "Evening/Night" 
                : "Extended Hours";
                
            return (
              <Box 
                key={event.id}
                sx={{ 
                  display: 'flex',
                  p: 1,
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  cursor: 'pointer',
                  borderLeft: `4px solid ${eventColor}`,
                  '&:hover': {
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease'
                  }
                }}
                onClick={(e) => onEventClick(event, e)}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#333' }}>
                      {event.title}
                    </Typography>
                    <Chip 
                      label={timeIndicator} 
                      size="small" 
                      sx={{ 
                        height: '22px', 
                        fontSize: '0.7rem',
                        fontWeight: 'medium',
                        backgroundColor: isEarlyMorning 
                          ? '#E3F2FD' // Light blue for morning
                          : isLateEvening 
                            ? '#EDE7F6' // Light purple for evening
                            : '#E8F5E9', // Light green for other
                        color: isEarlyMorning 
                          ? '#1565C0' // Blue for morning
                          : isLateEvening 
                            ? '#5E35B1' // Purple for evening
                            : '#2E7D32', // Green for other
                        ml: 1,
                        border: '1px solid',
                        borderColor: isEarlyMorning 
                          ? 'rgba(21, 101, 192, 0.2)' 
                          : isLateEvening 
                            ? 'rgba(94, 53, 177, 0.2)' 
                            : 'rgba(46, 125, 50, 0.2)',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                      }} 
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5 }}>
                    {formatTime(startTime)} - {formatTime(endTime)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Add the countOutOfRangeEvents function to calculate total out-of-range events
  // Add this after the calculateCurrentTimePosition function around line 2350
  const countOutOfRangeEvents = (): number => {
    if (viewMode === 'day') {
      const dayEvents = getEventsForDay(selectedDate);
      const { outOfRangeEvents } = separateTasksAndEventsWithOutOfRange(dayEvents);
      return outOfRangeEvents.length;
    } else if (viewMode === 'week') {
      const weekDays = generateWeekDays();
      let count = 0;
      
      weekDays.forEach(day => {
        const dayEvents = getEventsForDay(day);
        const { outOfRangeEvents } = separateTasksAndEventsWithOutOfRange(dayEvents);
        count += outOfRangeEvents.length;
      });
      
      return count;
    }
    
    return 0;
  };

  // Rename the enhanced separateTasksAndEvents function that includes outOfRangeEvents to avoid conflicts
  // Update the existing function to have a consistent name wherever it's used
  const separateTasksAndEventsWithOutOfRange = (events: CalendarEvent[]): {
    tasks: CalendarEvent[];
    regularEvents: CalendarEvent[];
    outOfRangeEvents: CalendarEvent[];
  } => {
    const tasks: CalendarEvent[] = [];
    const regularEvents: CalendarEvent[] = [];
    const outOfRangeEvents: CalendarEvent[] = [];
    
    events.forEach(event => {
      const start = new Date(event.start);
      const end = new Date(event.end);
      const startHour = start.getHours();
      const endHour = end.getHours();
      const endMinutes = end.getMinutes();
      
      if (event.eventType === 'task') {
        tasks.push(event);
      } else if (
        // Event starts before visible hours
        (startHour < DAY_START_HOUR && endHour <= DAY_START_HOUR) ||
        // Event starts after visible hours (after 7pm or exactly at 7pm with minutes)
        (startHour >= 19 || (startHour === 19 && endMinutes > 0))
      ) {
        outOfRangeEvents.push(event);
      } else {
        regularEvents.push(event);
      }
    });
    
    return { tasks, regularEvents, outOfRangeEvents };
  };

  // Modify the return statement to use the mobile views when isMobile is true
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 0,
        borderRadius: hideHeader ? 0 : 2, // Remove border radius when header is hidden (desktop mode)
        overflow: 'hidden',
        height: '100%', 
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100%',
        boxShadow: hideHeader ? 'none' : 1, // Remove shadow in desktop mode
        border: 'none'
      }}
    >
      {/* Calendar header - Only show if hideHeader is false */}
      {!hideHeader && (
        <Box sx={{ 
          p: isMobile ? 1.5 : 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'rgba(198, 232, 242, 0.3)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography 
              variant={isMobile ? "body1" : "h6"} 
              sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: 'black' }}
            >
              Calendar
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex' }}>
            <Tooltip title={`${showOutOfRangeEvents ? 'Hide' : 'Show'} events outside visible hours`}>
              <Badge 
                badgeContent={countOutOfRangeEvents()} 
                color="primary"
                sx={{ 
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    minWidth: '18px',
                    height: '18px',
                    fontWeight: 'bold',
                    display: countOutOfRangeEvents() > 0 ? 'flex' : 'none'
                  }
                }}
              >
                <IconButton 
                  onClick={() => setShowOutOfRangeEvents(!showOutOfRangeEvents)}
                  size={isMobile ? "small" : "medium"}
                  sx={{ 
                    mr: 0.5,
                    color: showOutOfRangeEvents ? 'primary.main' : 'action.active',
                    bgcolor: showOutOfRangeEvents ? 'rgba(16, 86, 245, 0.1)' : 'transparent',
                  }}
                >
                  <AccessTimeIcon />
                </IconButton>
              </Badge>
            </Tooltip>
            
            <IconButton 
              onClick={refreshCalendarData} 
              size={isMobile ? "small" : "medium"}
              sx={{ mr: 0.5 }}
            >
              <RefreshIcon />
            </IconButton>
            
            <IconButton 
              onClick={(e) => {
                if (onAddEvent) onAddEvent();
                setIsEventModalOpen(true);
              }}
              size={isMobile ? "small" : "medium"}
              sx={{ color: '#1056F5' }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
        </Box>
      )}
      
      {/* Date navigation */}
      <Box sx={{ 
        px: isMobile ? 1.5 : 2, 
        py: isMobile ? 1 : 1.5, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'rgba(198, 232, 242, 0.15)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={goToPrevious} 
            size="small"
            disabled={viewMode === 'all'}
            sx={{ 
              opacity: viewMode === 'all' ? 0.5 : 1,
              color: '#016C9E'
            }}
          >
            <NavigateBeforeIcon />
          </IconButton>
          
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            sx={{ 
              px: isMobile ? 1 : 2, 
              fontWeight: 'medium',
              fontFamily: 'Poppins',
              color: 'black'
            }}
          >
            {formatDateRange()}
          </Typography>
          
          <IconButton 
            onClick={goToNext} 
            size="small"
            disabled={viewMode === 'all'}
            sx={{ 
              opacity: viewMode === 'all' ? 0.5 : 1,
              color: '#016C9E'
            }}
          >
            <NavigateNextIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            variant="outlined"
            size={useMobileView ? "small" : "medium"}
            sx={{ 
              minWidth: useMobileView ? 0 : 64,
              px: useMobileView ? 1 : 2,
              mr: 1,
              display: useMobileView ? 'none' : 'block'
            }}
            onClick={goToToday}
          >
            Today
          </Button>
          
          <IconButton
            size="small"
            sx={{ 
              mr: useMobileView ? 0 : 1,
              display: useMobileView ? 'flex' : 'none'
            }}
            onClick={goToToday}
          >
            <TodayIcon fontSize="small" />
          </IconButton>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange} 
            size={useMobileView ? "small" : "medium"}
            sx={{
              '& .MuiToggleButton-root': {
                px: useMobileView ? 1 : 2
              }
            }}
          >
            {useMobileView ? (
              <>
                <ToggleButton value="day">D</ToggleButton>
                <ToggleButton value="week">W</ToggleButton>
                <ToggleButton value="month">M</ToggleButton>
              </>
            ) : (
              <>
                <ToggleButton value="day" sx={{ px: 3 }}>DAY</ToggleButton>
                <ToggleButton value="week" sx={{ px: 3 }}>WEEK</ToggleButton>
                <ToggleButton value="month" sx={{ px: 3 }}>MONTH</ToggleButton>
              </>
            )}
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      <Box 
        ref={scrollContainerRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          height: hideHeader ? 'calc(100% - 56px)' : 'calc(100% - 130px)', // Adjust height based on whether header is shown
          minHeight: useMobileView ? '350px' : '400px', // Set a minimum height so it's always scrollable
          width: '100%', // Ensure it takes full width
          '& .MuiGrid-container': {
            width: '100%',
            maxWidth: '100%'
          },
          '& .MuiGrid-item': {
            maxWidth: '100%'
          }
        }}
      >
        {error ? (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            p: 4
          }}>
            <Typography 
              variant="body1" 
              color="error" 
              sx={{ mb: 2, textAlign: 'center', fontFamily: 'Poppins' }}
            >
              {error}
            </Typography>
            <Button 
              variant="outlined" 
              onClick={refreshAllData}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Try Again'}
            </Button>
          </Box>
        ) : isLoading ? (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 4
          }}>
            <CircularProgress />

          </Box>
        ) : (
          <>
            {/* Use mobile or desktop views based on screen size OR container width */}
            {useMobileView && viewMode === 'day' && renderMobileDayView()}
            {useMobileView && viewMode === 'week' && renderMobileWeekView()}
            {useMobileView && viewMode === 'month' && renderMobileMonthView()}
            {!useMobileView && viewMode === 'day' && renderDayView()}
            {!useMobileView && viewMode === 'week' && renderWeekView()}
            {!useMobileView && viewMode === 'month' && renderMonthView()}
            {viewMode === 'all' && renderAllEventsView()}
          </>
        )}
      </Box>

      {/* Event Creation Modal */}
      <EventCreationModal
        open={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          refreshCalendarData(); // Refresh events after modal closes
        }}
        selectedDate={clickedDate}
        selectedTime={clickedTime}
      />
      
      {/* Event Details Popup */}
      <EventDetailsPopup
        event={selectedEvent}
        anchorEl={popupAnchorEl}
        onClose={handleClosePopup}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
      
      {/* Task Details Popup */}
      <TaskDetailsPopup
        event={selectedTask}
        anchorEl={taskPopupAnchorEl}
        onClose={handleCloseTaskPopup}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />
      
      {/* Task List Popup */}
      <TaskListPopup
        tasks={tasksForDay}
        anchorEl={taskListPopupAnchorEl}
        onClose={handleCloseTaskListPopup}
        onTaskClick={handleTaskFromListClick}
      />
      
      {/* Day Events Popup */}
      <DayEventsPopup
        events={dayEventsForPopup}
        date={dayDateForPopup}
        anchorEl={dayEventsPopupAnchorEl}
        onClose={handleCloseDayEventsPopup}
        onEventClick={handleEventClick}
        onGoToDayView={handleGoToDayView}
      />
    </Paper>
  );
};

export default CalendarView;
