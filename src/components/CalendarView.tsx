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
  Badge
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import SyncIcon from '@mui/icons-material/Sync';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useCalendar } from '../contexts/CalendarContext';
import { CalendarEvent, getCalendarEventById } from '../services/calendarService';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isSameMonth, isWithinInterval, addDays } from 'date-fns';
import EventCreationModal from './EventCreationModal';
import EventDetailsPopup from './EventDetailsPopup';
import TaskDetailsPopup from './TaskDetailsPopup';
import TaskListPopup from './TaskListPopup';

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
  '&:hover': {
    filter: 'brightness(0.95)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transform: 'scale(1.01)',
    zIndex: 100
  },
  '&:active, &:focus': {
    zIndex: 100
  }
}));

// Update the WeekEventCard styled component to remove hover effects that affect z-index
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
  backgroundColor: bgcolor,
  borderRadius: theme.shape.borderRadius,
  padding: '4px 6px', // Maintain padding
  cursor: 'pointer',
  overflow: 'hidden',
  position: 'absolute',
  top: `${top}px`,
  height: `${height}px`,
  width: width,
  left: left,
  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  transition: 'box-shadow 0.2s ease, transform 0.2s ease', // Remove z-index from transition
  transformOrigin: 'center center',
  zIndex: 1, // Base z-index
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid rgba(0,0,0,0.05)',
  '&:hover': {
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    filter: 'brightness(1.03)'
    // Removed transform and z-index changes
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
  default: { background: '#C6E8F2', text: '#071C73' },  // Light Blue
  team: { background: '#1056F5', text: '#FFFFFF' },     // Main Blue
  client: { background: '#016C9E', text: '#FFFFFF' },   // Rice Blue
  focus: { background: '#F29702', text: '#FFFFFF' },    // Orange
  manager: { background: '#E04330', text: '#FFFFFF' },  // Red
  review: { background: '#49C1E3', text: '#071C73' },   // Aero
  1: { background: '#1056F5', text: '#FFFFFF' },        // Main Blue
  2: { background: '#071C73', text: '#FFFFFF' },        // Dark Blue
  3: { background: '#016C9E', text: '#FFFFFF' },        // Rice Blue
  4: { background: '#C6E8F2', text: '#071C73' },        // Light Blue
  5: { background: '#F29702', text: '#FFFFFF' },        // Orange
  6: { background: '#E04330', text: '#FFFFFF' },        // Red
  7: { background: '#49C1E3', text: '#071C73' },        // Aero
  8: { background: '#C6E8F2', text: '#071C73' },        // Light Blue
  9: { background: '#F29702', text: '#FFFFFF' },        // Orange
  10: { background: '#E04330', text: '#FFFFFF' }        // Red
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
      return '#4285F4'; // Blue for Focus Time 
    }
    if (event.eventType === 'workingLocation') {
      return '#34A853'; // Green for Working Location
    }
  }

  // Get color based on colorId
  if (event.colorId) {
    // If event has a specific colorId, use that from the color map
    if (colorMap[event.colorId]) {
      return colorMap[event.colorId].background;
    }
  }
  
  // Default colors based on event types
  const typeColors: Record<string, string> = {
    'default': '#C6E8F2',   // Light Blue
    'call': '#016C9E',      // Rice Blue
    'meeting': '#016C9E',   // Bice Blue
    'task': '#F29702',      // Orange
    'reminder': '#49C1E3',  // Aero
    'appointment': '#071C73', // Dark Blue
    'travel': '#49C1E3',    // Aero
    'holiday': '#E04330',   // Red
    'personal': '#F29702',  // Orange
    'work': '#016C9E',      // Bice Blue
    'standup': '#1056F5',   // Main Blue - for standup meetings
    'tech': '#1056F5',      // Main Blue - for tech related events
    'develop': '#1056F5'    // Main Blue - for development tasks
  };
  
  // Try to extract event type from title or description
  let eventType = 'default';
  
  if (event.title) {
    eventType = extractEventType(event.title);
  } else if (event.description) {
    eventType = extractEventType(event.description);
  }
    
  return typeColors[eventType.toLowerCase()] || '#C6E8F2'; // default light blue shade
};

// Extract event type from event summary or title
const extractEventType = (text: string): string => {
  text = text.toLowerCase();
  if (text.includes('meeting') || text.includes('sync')) return 'meeting';
  if (text.includes('call') || text.includes('phone')) return 'call';
  if (text.includes('reminder')) return 'reminder';
  if (text.includes('travel') || text.includes('flight')) return 'travel';
  if (text.includes('appointment')) return 'appointment';
  if (text.includes('holiday') || text.includes('vacation')) return 'holiday';
  if (text.includes('personal')) return 'personal';
  if (text.includes('work')) return 'work';
  if (text.includes('stand') || text.includes('standup')) return 'standup';
  if (text.includes('tech') || text.includes('deploy')) return 'tech';
  if (text.includes('develop') || text.includes('dev')) return 'develop';
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

interface CalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  onEventClick, 
  onAddEvent 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
  
  // Make sure we're loading the data when the component mounts
  useEffect(() => {
    console.log('Initial calendar refresh from CalendarView');
    refreshCalendarData();
    
    // Log current events if available
    if (events.length > 0) {
      console.log(`Calendar has ${events.length} events from context`);
      console.log('First event:', events[0]);
    } else {
      console.log('No events in calendar context yet');
    }
    
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
          targetTime = currentHour >= 9 && currentHour <= 17 
            ? now 
            : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
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
          targetTime = currentHour >= 9 && currentHour <= 17 
            ? now 
            : new Date(new Date().setHours(9, 0, 0, 0)); // Default to 9am
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
    setSelectedDate(new Date());
  };

  // Function to navigate to previous period
  const goToPrevious = () => {
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
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'day' | 'week' | 'month' | 'all' | null) => {
    if (newMode !== null) {
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

  // Update the calculateEventPositions function for better handling of overlaps
  const calculateEventPositions = (events: CalendarEvent[]): {
    event: CalendarEvent;
    column: number;
    columnsInSlot: number;
    width: string;
    left: string;
    zIndex?: number;
    isNested?: boolean;
  }[] => {
    if (events.length === 0) return [];
    
    // Define event type priorities (higher number = higher priority)
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
    
    // Step 1: Sort events by start time, then by priority type
    const sortedEvents = [...events].sort((a, b) => {
      // First sort by start time
      const aStart = new Date(a.start).getTime();
      const bStart = new Date(b.start).getTime();
      if (aStart !== bStart) return aStart - bStart;
      
      // If same start time, sort by event type priority
      const aType = a.title ? extractEventType(a.title.toLowerCase()) : 'default';
      const bType = b.title ? extractEventType(b.title.toLowerCase()) : 'default';
      const aPriority = eventTypePriority[aType] || 2;
      const bPriority = eventTypePriority[bType] || 2;
      
      return bPriority - aPriority; // Higher priority comes first
    });
    
    // Step 2: Group events that overlap with each other
    interface EventGroup {
      events: CalendarEvent[];
      startTime: number;
      endTime: number;
    }
    
    const eventGroups: EventGroup[] = [];
    
    sortedEvents.forEach((event) => {
      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();
      
      // Find an existing group that this event overlaps with
      let foundGroup = false;
      for (const group of eventGroups) {
        if ((eventStart >= group.startTime && eventStart < group.endTime) ||
            (eventEnd > group.startTime && eventEnd <= group.endTime) ||
            (eventStart <= group.startTime && eventEnd >= group.endTime)) {
          
          // Add event to this group
          group.events.push(event);
          // Update group time range
          group.startTime = Math.min(group.startTime, eventStart);
          group.endTime = Math.max(group.endTime, eventEnd);
          foundGroup = true;
          
          // Check if this event connects two groups
          for (let i = 0; i < eventGroups.length; i++) {
            if (eventGroups[i] === group) continue; // Skip the current group
            
            const otherGroup = eventGroups[i];
            if ((group.startTime <= otherGroup.endTime && group.endTime >= otherGroup.startTime)) {
              // Groups overlap, merge them
              group.events = [...group.events, ...otherGroup.events.filter(e => !group.events.includes(e))];
              group.startTime = Math.min(group.startTime, otherGroup.startTime);
              group.endTime = Math.max(group.endTime, otherGroup.endTime);
              
              // Remove the other group
              eventGroups.splice(i, 1);
              i--; // Adjust index since we removed an element
            }
          }
          
          break;
        }
      }
      
      // If no overlapping group found, create a new one
      if (!foundGroup) {
        eventGroups.push({
          events: [event],
          startTime: eventStart,
          endTime: eventEnd
        });
      }
    });
    
    // Step 3: Position events within each group
    const eventPositions: {
      event: CalendarEvent;
      column: number;
      columnsInSlot: number;
      width: string;
      left: string;
      zIndex?: number;
      isNested?: boolean;
    }[] = [];
    
    eventGroups.forEach((group) => {
      // For single events in a group, use full width
      if (group.events.length === 1) {
        const event = group.events[0];
        const eventType = event.title ? extractEventType(event.title.toLowerCase()) : 'default';
        const typePriority = eventTypePriority[eventType] || 2;
        
        eventPositions.push({
          event,
          column: 0,
          columnsInSlot: 1,
          width: '95%',
          left: '2.5%',
          zIndex: typePriority
        });
        return;
      }
      
      // For multiple events, check if we have a focus time event containing other events
      // Separate "Focus time" events from other events
      const focusEvents = group.events.filter(e => 
        e.title?.toLowerCase().includes('focus') || 
        extractEventType(e.title || '').toLowerCase() === 'focus'
      );
      
      const nonFocusEvents = group.events.filter(e => 
        !focusEvents.includes(e)
      );
      
      // Check if we have the focus time + contained event pattern
      const containedEvents: CalendarEvent[] = [];
      
      if (focusEvents.length > 0 && nonFocusEvents.length > 0) {
        focusEvents.forEach(focusEvent => {
          const focusStart = new Date(focusEvent.start).getTime();
          const focusEnd = new Date(focusEvent.end).getTime();
          
          // Find events fully contained within this focus event
          const containedInFocus = nonFocusEvents.filter(e => {
            const eStart = new Date(e.start).getTime();
            const eEnd = new Date(e.end).getTime();
            return eStart >= focusStart && eEnd <= focusEnd;
          });
          
          // If we have fully contained events, handle them specially
          if (containedInFocus.length > 0) {
            // Add the focus event with lowest z-index
            eventPositions.push({
              event: focusEvent,
              column: 0,
              columnsInSlot: 1,
              width: '95%', 
              left: '2.5%',
              zIndex: 1 // Lowest z-index for background
            });
            
            // Position the contained events with special styling
            containedInFocus.forEach((event, index) => {
              const eventType = event.title ? extractEventType(event.title.toLowerCase()) : 'default';
              const typePriority = eventTypePriority[eventType] || 2;
              
              // Special sizing for contained events - make them more distinct
              eventPositions.push({
                event,
                column: index,
                columnsInSlot: containedInFocus.length,
                width: '85%',
                left: '7.5%',
                zIndex: 20 + index, // Higher z-index to appear above focus time
                isNested: true // Mark as nested for special styling
              });
              
              // Mark these events as processed
              containedEvents.push(event);
            });
          } else {
            // If focus events don't contain other events, just add them as usual
            eventPositions.push({
              event: focusEvent,
              column: 0,
              columnsInSlot: 1,
              width: '95%',
              left: '2.5%',
              zIndex: 1 // Low z-index to be in the background
            });
          }
        });
      } else if (focusEvents.length > 0) {
        // If all events are focus events, handle them normally
        focusEvents.forEach(event => {
          eventPositions.push({
            event,
            column: 0,
            columnsInSlot: 1,
            width: '95%',
            left: '2.5%',
            zIndex: 1
          });
        });
      }
      
      // Process remaining non-focus events that aren't contained in focus events
      const remainingEvents = nonFocusEvents.filter(e => !containedEvents.includes(e));
      
      // Position standup events (they should be more visible)
      const standupEvents = remainingEvents.filter(e => 
        e.title?.toLowerCase().includes('stand') || 
        extractEventType(e.title || '').toLowerCase() === 'standup'
      );
      
      const regularEvents = remainingEvents.filter(e => 
        !standupEvents.includes(e)
      );
      
      // Position standup events in a special way
      standupEvents.forEach((event, index) => {
        const totalEvents = standupEvents.length;
        const width = '75%';
        const left = '12.5%';
        
        eventPositions.push({
          event,
          column: index,
          columnsInSlot: totalEvents,
          width,
          left,
          zIndex: 10 + index // High z-index to be on top
        });
      });
      
      // Distribute regular events with a staggered offset for better visibility
      if (regularEvents.length > 0) {
        const totalEvents = regularEvents.length;
        
        regularEvents.forEach((event, index) => {
          const eventType = event.title ? extractEventType(event.title.toLowerCase()) : 'default';
          const typePriority = eventTypePriority[eventType] || 2;
          
          let width: string, left: string;
          
          // Different positioning strategies based on number of concurrent events
          if (totalEvents === 2) {
            // For 2 events, use nice side-by-side layout with slight overlap
            width = '65%';
            left = index === 0 ? '5%' : '30%';
          } else if (totalEvents === 3) {
            // For 3 events, use a staggered layout
            width = '60%';
            left = `${5 + index * 15}%`;
          } else {
            // For 4+ events, use a more condensed layout
            width = `${Math.min(60, 90 / totalEvents)}%`;
            left = `${5 + index * (90 / totalEvents)}%`;
          }
          
          eventPositions.push({
            event,
            column: index,
            columnsInSlot: totalEvents,
            width,
            left,
            zIndex: typePriority + index // Base z-index on type priority plus position
          });
        });
      }
    });
    
    return eventPositions;
  };

  // Constants for time grid
  const CALENDAR_ITEM_HEIGHT = 30;
  const HOUR_HEIGHT = 60; // Height in pixels for one hour
  const GRID_GAP = 8;
  const DEFAULT_EVENT_WIDTH = 80;
  const DAY_START_HOUR = 1; // Start the day view at 1 AM
  const DAY_END_HOUR = 23; // End the day view at 11 PM
  const TIME_LABELS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

  // Update the renderWeekView and renderDayView event rendering to improve title visibility
  // Inside the renderWeekView function, update the event rendering:
  const renderEventContent = (event: CalendarEvent, eventColor: string, textColor: string, height: number, isNested?: boolean) => {
    // Check if the current user has declined this event
    const isDeclined = event.attendees?.some(attendee => 
      (attendee.self === true && attendee.responseStatus === 'declined')
    );

    // Calculate border styling for declined events
    const declinedStyle = isDeclined ? {
      backgroundColor: 'white',
      border: `${eventColor}`,
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
          borderLeft: `4px solid ${eventColor}`,
          borderRadius: '4px',
          ...declinedStyle
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            pl: 0.5
          }}>
            <TaskAltIcon 
              sx={{ 
                fontSize: '0.9rem', 
                color: textColor,
                mr: 0.5 
              }} 
            />
            <Typography 
              variant="subtitle2" 
              sx={{
                color: textColor,
                fontWeight: 'bold', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.8rem',
                lineHeight: 1.2
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
                color: textColor,
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
          ...declinedStyle
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{
              color: '#5F6368', // Standard gray text for OOO events
              fontWeight: 'bold', 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.8rem', // Standardized font size
              lineHeight: 1.2,
              pl: 0.5,
              textAlign: 'center',
              textDecoration: isDeclined ? 'line-through' : 'none'
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
                textDecoration: isDeclined ? 'line-through' : 'none'
              }}
            >
              {event.description}
            </Typography>
          )}
        </Box>
      );
    }
    
    // For very small events, skip the time display
    if (height < 30) {
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
              color: isDeclined ? eventColor : textColor, // Use event color for declined events text
              fontWeight: 'medium', // Standardized font weight
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.8rem', // Standardized font size
              lineHeight: 1.2,
              pl: 0.5,
              width: '100%',
              textDecoration: isDeclined ? 'line-through' : 'none' // Keep strikethrough for declined events
            }}
          >
            {event.title}
          </Typography>
        </Box>
      );
    }
    
    // For normal sized events, show the title and time
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        ...declinedStyle
      }}>
        {/* Title and time in a horizontal layout */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          mb: 0.2
        }}>
          <Typography 
            variant="subtitle2" 
            sx={{
              color: isDeclined ? eventColor : textColor, // Use event color for declined events text
              fontWeight: 'medium', // Standardized font weight
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: '0.8rem', // Standardized font size
              lineHeight: 1.2,
              pl: 0.5,
              flexGrow: 1,
              mr: 1, // Add margin to separate from time
              textDecoration: isDeclined ? 'line-through' : 'none' // Keep strikethrough for declined events
            }}
          >
            {event.title}
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.7rem', // Slightly increased for better readability
              fontWeight: 'medium',
              whiteSpace: 'nowrap',
              color: isDeclined ? eventColor : textColor, // Use event color for declined events text
              flexShrink: 0,
              pr: 0.5,
              textDecoration: isDeclined ? 'line-through' : 'none', // Keep strikethrough for declined events
              display: (event.eventType === 'task' && !event.hasExplicitTime) ? 'none' : 'block' // Hide time for tasks without explicit time
            }}
          >
            {formatTime(event.start)}-{formatTime(event.end)}
          </Typography>
        </Box>
        
        {/* Only show location if there's enough height */}
        {height > 45 && event.location && (
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: '0.7rem', // Slightly increased for better readability
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: isDeclined ? eventColor : textColor, // Use event color for declined events text
              mt: 0.2,
              pl: 0.5,
              textDecoration: isDeclined ? 'line-through' : 'none' // Keep strikethrough for declined events
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
    
    // Separate tasks from regular events
    const { tasks, regularEvents } = separateTasksAndEvents(dayEvents);
    
    // Log for debugging
    console.log(`Current hour: ${currentHour}, isVisible: ${isCurrentTimeVisible}, position: ${currentTimePosition}`);
    
    const eventPositions = calculateEventPositions(regularEvents);
    
    // Define height for the task row
    const TASK_ROW_HEIGHT = 60;
    
    return (
      <Box sx={{ p: 2, position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT + 50 + TASK_ROW_HEIGHT }}>
        <Typography variant="h6" gutterBottom>
          {selectedDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Time grid with current time indicator */}
        <Box sx={{ position: 'relative', mt: 2, ml: 6 }}>
          {/* Time labels column with Tasks label */}
          <Box sx={{ position: 'absolute', left: -60, top: 0, width: 50 }}>
            {/* Task row label */}
            <Box sx={{
              height: TASK_ROW_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              pr: 1
            }}>
              <Typography variant="caption" color="text.secondary">
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
                <Typography variant="caption" color="text.secondary">
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
                  p: 1,
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
                    p: 1,
                    bgcolor: '#F29702',
                    borderRadius: '4px',
                    color: 'white',
                    height: '100%'
                  }}
                >
                  <TaskAltIcon sx={{ fontSize: '1rem', mr: 1 }} />
                  <Typography variant="body2">
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
                color: 'text.secondary'
              }}>
                <Typography variant="caption">No tasks</Typography>
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
                  top: currentTimePosition
                }}
              />
            )}
            
            {/* No events message */}
            {regularEvents.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, zIndex: 1 }}>
                <Typography variant="body1" color="text.secondary">
                  No events scheduled for this day
                </Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT }}>
                {/* Regular events */}
                {eventPositions.map(({ event, column, columnsInSlot, width, left, zIndex, isNested }, index) => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  
                  // Calculate position and size
                  const startPx = timeToPixels(start) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                  const endPx = timeToPixels(end) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                  const height = Math.max(endPx - startPx, 25); // Minimum height of 25px
                  
                  const eventColor = getEventColor(event);
                  const textColor = getEventTextColor(eventColor);
                  
                  // Check if this is the active/clicked event
                  const isActive = activeEventId === event.id;
                  
                  // Check if the event is declined
                  const isDeclined = event.attendees?.some(attendee => 
                    (attendee.self === true && attendee.responseStatus === 'declined')
                  );
                
                  return (
                    <WeekEventCard
                      key={event.id}
                      bgcolor={eventColor}
                      top={startPx}
                      height={height}
                      width={width}
                      left={left}
                      onClick={(e) => handleEventClick(event, e)}
                      sx={{
                        zIndex: isActive ? 100 : (zIndex || 1),
                        border: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(255,255,255,0.3)',
                        borderRadius: '4px',
                        boxShadow: isActive 
                          ? '0 3px 8px rgba(0,0,0,0.2)' 
                          : '0 1px 2px rgba(0,0,0,0.1)',
                        backgroundColor: isDeclined ? 'white' : eventColor,
                        '&:hover': {
                          boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                          filter: 'brightness(1.03)'
                        }
                      }}
                    >
                      {renderEventContent(event, eventColor, textColor, height, isNested || columnsInSlot > 1)}
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
    
    // Log for debugging
    console.log(`Week view - Current hour: ${currentHour}, isVisible: ${isCurrentTimeVisible}, position: ${currentTimePosition}`);
    
    // Define height for the task row
    const TASK_ROW_HEIGHT = 60;
    
    return (
      <Grid container sx={{ position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT + 50 + TASK_ROW_HEIGHT }}>
        {/* Time labels column */}
        <Grid item xs={1} sx={{ 
          borderRight: 1, 
          borderColor: 'divider',
          position: 'sticky',
          left: 0,
          backgroundColor: 'background.paper',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column'
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
              fontSize: '0.7rem',
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
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </Typography>
            </Box>
          ))}
        </Grid>
        
        {/* Day columns */}
        <Grid item xs={11}>
          <Grid container>
            {/* Days header */}
            <Grid container sx={{ height: '50px', backgroundColor: '#f9f9f9' }}>
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
                      alignItems: 'center'
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
                          fontSize: '0.75rem'
                        }}
                      >
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Typography>
                      
                      {/* Date number with conditional blue circle for today */}
                      {isToday ? (
                        <Box sx={{
                          width: '22px',
                          height: '22px',
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
                              fontSize: '0.85rem'
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
                            fontSize: '0.85rem'
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
                          width: '90%',
                          height: 40,
                          backgroundColor: '#F29702',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          border: '1px solid rgba(255,255,255,0.3)',
                          '&:hover': {
                            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                            filter: 'brightness(1.03)'
                          }
                        }}
                        onClick={(e) => handleTaskGroupClick(tasks, e)}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                          <TaskAltIcon 
                            sx={{ 
                              fontSize: '0.8rem', 
                              color: 'white',
                              mr: 0.5 
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.8rem', 
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
                    {eventPositions.map(({ event, column, columnsInSlot, width, left, zIndex, isNested }, index) => {
                      const start = new Date(event.start);
                      const end = new Date(event.end);
                      
                      // Calculate position and size
                      const startPx = timeToPixels(start) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                      const endPx = timeToPixels(end) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                      const height = Math.max(endPx - startPx, 25); // Minimum height of 25px
                      
                      const eventColor = getEventColor(event);
                      const textColor = getEventTextColor(eventColor);
                      
                      // Check if this is the active/clicked event
                      const isActive = activeEventId === event.id;
                      
                      // Check if the event is declined
                      const isDeclined = event.attendees?.some(attendee => 
                        (attendee.self === true && attendee.responseStatus === 'declined')
                      );
                    
                      return (
                        <WeekEventCard
                          key={event.id}
                          bgcolor={eventColor}
                          top={startPx}
                          height={height}
                          width={width}
                          left={left}
                          onClick={(e) => handleEventClick(event, e)}
                          sx={{
                            zIndex: isActive ? 100 : (zIndex || 1),
                            border: isDeclined ? `1px dashed ${eventColor}` : '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '4px',
                            boxShadow: isActive 
                              ? '0 3px 8px rgba(0,0,0,0.2)' 
                              : '0 1px 2px rgba(0,0,0,0.1)',
                            backgroundColor: isDeclined ? 'white' : eventColor,
                            '&:hover': {
                              boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                              filter: 'brightness(1.03)'
                            }
                          }}
                        >
                          {renderEventContent(event, eventColor, textColor, height, isNested || columnsInSlot > 1)}
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
                    setSelectedDate(day.date);
                    setViewMode('day');
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
                      <TaskAltIcon sx={{ fontSize: '0.7rem', color: 'white', mr: 0.5 }} />
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
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 0.5,
                          backgroundColor: isDeclined ? 'transparent' : eventColor,
                          border: isDeclined ? `1px dashed ${eventColor}` : 'none',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          color: isDeclined ? 'text.primary' : getEventTextColor(eventColor)
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event, e);
                        }}
                      >
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.7rem',
                          textDecoration: isDeclined ? 'line-through' : 'none'
                        }}>
                          {format(new Date(event.start), 'h:mm a')} {event.title}
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
                        color: 'text.secondary',
                        mt: 'auto'
                      }}
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
    refreshCalendarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);
  
  // Add effect to refresh data when selected date changes
  useEffect(() => {
    console.log(`Selected date changed to: ${selectedDate.toDateString()}`);
    refreshCalendarData();
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
                            <TaskAltIcon 
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
                            <TaskAltIcon 
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
                    setSelectedDate(day.date);
                    setViewMode('day');
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

  // Modify the return statement to use the mobile views when isMobile is true
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 0,
        borderRadius: 2,
        overflow: 'hidden',
        height: '100%', // Ensure the paper takes full height of its container
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Calendar header */}
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
            size={isMobile ? "small" : "medium"}
            sx={{ 
              minWidth: isMobile ? 0 : 64,
              px: isMobile ? 1 : 2,
              mr: 1,
              display: isMobile ? 'none' : 'block'
            }}
            onClick={goToToday}
          >
            Today
          </Button>
          
          <IconButton
            size="small"
            sx={{ 
              mr: isMobile ? 0 : 1,
              display: isMobile ? 'flex' : 'none'
            }}
            onClick={goToToday}
          >
            <TodayIcon fontSize="small" />
          </IconButton>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange} 
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiToggleButton-root': {
                px: isMobile ? 1 : 2
              }
            }}
          >
            {isMobile ? (
              <>
                <ToggleButton value="day">D</ToggleButton>
                <ToggleButton value="week">W</ToggleButton>
                <ToggleButton value="month">M</ToggleButton>
              </>
            ) : (
              <>
                <ToggleButton value="day">DAY</ToggleButton>
                <ToggleButton value="week">WEEK</ToggleButton>
                <ToggleButton value="month">MONTH</ToggleButton>
                <ToggleButton value="all">ALL</ToggleButton>
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
          height: 'calc(100% - 130px)', // Ensure the content area has a defined height
          minHeight: isMobile ? '350px' : '400px' // Set a minimum height so it's always scrollable
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
            {/* Use mobile or desktop views based on screen size */}
            {isMobile && viewMode === 'day' && renderMobileDayView()}
            {isMobile && viewMode === 'week' && renderMobileWeekView()}
            {isMobile && viewMode === 'month' && renderMobileMonthView()}
            {!isMobile && viewMode === 'day' && renderDayView()}
            {!isMobile && viewMode === 'week' && renderWeekView()}
            {!isMobile && viewMode === 'month' && renderMonthView()}
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
    </Paper>
  );
};

export default CalendarView; 