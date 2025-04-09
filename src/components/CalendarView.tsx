import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import SyncIcon from '@mui/icons-material/Sync';
import { useCalendar } from '../contexts/CalendarContext';
import { CalendarEvent, getCalendarEventById } from '../services/calendarService';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameDay, isSameMonth, isWithinInterval, addDays } from 'date-fns';
import EventCreationModal from './EventCreationModal';
import EventDetailsPopup from './EventDetailsPopup';

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
  // Check for special event types first
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

// Format time from Date object with more compact display
const formatTime = (time: string): string => {
  const date = new Date(time);
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
  
  // Event creation modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [clickedDate, setClickedDate] = useState<Date>(new Date());
  const [clickedTime, setClickedTime] = useState<{ hour: number; minute: number } | undefined>(undefined);
  
  // Add state to track clicked event
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  
  // State for event details popup
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popupAnchorEl, setPopupAnchorEl] = useState<HTMLElement | null>(null);
  
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
  
  // Use events directly from calendar context, no task conversion
  const allEvents = events;
  console.log(`Total events in calendar: ${allEvents.length} events`);
  
  // Loading state is only from calendar
  const isLoading = calendarLoading;
  
  // Error state is only from calendar
  const error = calendarError;

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
  const HOUR_HEIGHT = 60; // Height in pixels for one hour
  const DAY_START_HOUR = 7; // Start the day view at 7 AM
  const DAY_END_HOUR = 19; // End the day view at 7 PM
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
              fontSize: '0.85rem',
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
              fontWeight: isNested ? 'bold' : 'medium',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: isNested ? '0.85rem' : '0.8rem', // Slightly larger font for nested events
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
              fontWeight: isNested ? 'bold' : 'medium', 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontSize: isNested ? '0.9rem' : '0.8rem', // Larger font for nested events
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
              fontSize: '0.65rem', 
              fontWeight: 'medium',
              whiteSpace: 'nowrap',
              color: isDeclined ? eventColor : textColor, // Use event color for declined events text
              flexShrink: 0,
              pr: 0.5,
              textDecoration: isDeclined ? 'line-through' : 'none' // Keep strikethrough for declined events
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
              fontSize: '0.65rem',
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
    
    // Store the clicked element as anchor for the popup
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
          console.log(`Event summary: ${fullEventDetails.summary}`);
          
          // Log attendees if available to verify data is correctly structured
          if (fullEventDetails.attendees && fullEventDetails.attendees.length > 0) {
            console.log(`Event has ${fullEventDetails.attendees.length} attendees:`, 
              fullEventDetails.attendees.map(a => a.email).join(', '));
          }
          
          // Toggle clicked state - if same event, unselect it
          if (activeEventId === event.id) {
            setActiveEventId(null);
            setSelectedEvent(null);
          } else {
            setActiveEventId(event.id);
            setSelectedEvent(fullEventDetails); // Use the full event details from API
          }
        } else {
          // We got an event, but it's not the one we requested - this shouldn't happen
          console.error(`API returned the wrong event. Requested ID: ${event.id}, Got ID: ${fullEventDetails.id}`);
          // Fall back to the basic event info
          if (activeEventId === event.id) {
            setActiveEventId(null);
            setSelectedEvent(null);
          } else {
            setActiveEventId(event.id);
            setSelectedEvent(event);
          }
        }
      } else {
        console.warn(`Failed to fetch details for event ID: ${event.id}, falling back to basic event info`);
        // Fall back to the basic event info we already have
        if (activeEventId === event.id) {
          setActiveEventId(null);
          setSelectedEvent(null);
        } else {
          setActiveEventId(event.id);
          setSelectedEvent(event);
        }
      }
    } catch (error) {
      console.error(`Error fetching details for event ID: ${event.id}:`, error);
      
      // Fall back to the basic event info we already have
      if (activeEventId === event.id) {
        setActiveEventId(null);
        setSelectedEvent(null);
      } else {
        setActiveEventId(event.id);
        setSelectedEvent(event);
      }
    }
    
    // Call the parent click handler if provided
    if (onEventClick) {
      onEventClick(event);
    }
  };
  
  // Function to close the event details popup
  const handleClosePopup = () => {
    setPopupAnchorEl(null);
    // We keep the activeEventId to maintain the visual focus state
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
    const currentTimePosition = timeToPixels(now) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
    const isCurrentTimeVisible = now.getHours() >= DAY_START_HOUR && now.getHours() <= DAY_END_HOUR;
    const eventPositions = calculateEventPositions(dayEvents);
    
    return (
      <Box sx={{ p: 2, position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT + 50 }}>
        <Typography variant="h6" gutterBottom>
          {selectedDate.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Time grid with current time indicator */}
        <Box sx={{ position: 'relative', mt: 2, ml: 6 }}>
          {/* Time labels */}
          <Box sx={{ position: 'absolute', left: -60, top: 0, width: 50 }}>
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
                  // Only call handleEventClick if there is an event at this index
                  if (dayEvents[index]) {
                    handleEventClick(dayEvents[index], e);
                  } else {
                    // Handle empty slot click - could open event creation modal instead
                    // For now, just prevent the error by not calling handleEventClick
                    console.log(`Clicked on empty time slot: ${hour}:00`);
                    
                    // Optionally, you could open the event creation modal here
                    // with the time pre-filled based on the clicked hour
                    const clickedDate = new Date(selectedDate);
                    clickedDate.setHours(hour, 0, 0, 0);
                    setClickedDate(clickedDate);
                    setClickedTime({ hour, minute: 0 });
                    setIsEventModalOpen(true);
                  }
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
            
            {/* Events */}
            {dayEvents.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, zIndex: 1 }}>
                <Typography variant="body1" color="text.secondary">
                  No events scheduled for this day
                </Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT }}>
                {eventPositions.map(({ event, column, columnsInSlot, width, left, zIndex, isNested }, index) => {
                  const start = new Date(event.start);
                  const end = new Date(event.end);
                  
                  // Calculate position and size
                  const startPx = timeToPixels(start) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                  const endPx = timeToPixels(end) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                  const height = Math.max(endPx - startPx, 30);
                  
                  const eventColor = getEventColor(event);
                  const textColor = getEventTextColor(eventColor);
                  
                  // Check if this is the active/clicked event
                  const isActive = activeEventId === event.id;
                  
                  // Special styling for Out of Office events
                  if (event.eventType === 'outOfOffice') {
                    return (
                      <WeekEventCard
                        key={event.id}
                        bgcolor="#E8EAED" // Light gray background for Out of Office
                        top={startPx}
                        height={height}
                        width={width}
                        left={left}
                        onClick={(e) => handleEventClick(event, e)}
                        sx={{ 
                          zIndex: isActive ? 100 : (zIndex || 1),
                          border: '1px dashed #5F6368', // Dashed border for Out of Office
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.3)' : 'none', // Less shadow
                          transform: isActive ? 'scale(1.02)' : 'none',
                          opacity: 0.9, // Slightly transparent
                          borderRadius: '4px',
                          '&:hover': {
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            opacity: 1
                          }
                        }}
                      >
                        <Box sx={{ 
                          height: '100%', 
                          display: 'flex', 
                          flexDirection: 'column',
                          overflow: 'hidden',
                          width: '100%',
                          justifyContent: 'center'
                        }}>
                          <Typography 
                            variant="subtitle2" 
                            sx={{
                              color: '#5F6368', // Standard gray text for OOO events
                              fontWeight: 'bold', 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontSize: '0.85rem',
                              lineHeight: 1.2,
                              pl: 0.5,
                              textAlign: 'center'
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
                                mt: 0.5
                              }}
                            >
                              {event.description}
                            </Typography>
                          )}
                        </Box>
                      </WeekEventCard>
                    );
                  }
                  
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
                        zIndex: isActive ? 100 : (zIndex || 1), // Bring to front when clicked
                        border: isNested || columnsInSlot > 1 ? '2px solid white' : '1px solid rgba(0,0,0,0.05)',
                        boxShadow: isActive 
                          ? '0 4px 12px rgba(0,0,0,0.3)' 
                          : (isNested || columnsInSlot > 1 ? '0 2px 5px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.15)'),
                        transform: isActive ? 'scale(1.02)' : 'none',
                        filter: isActive ? 'brightness(1.05)' : 'none',
                        // No hover effects that change z-index
                        
                        // Override styles for declined events
                        ...(event.attendees?.some(attendee => (attendee.self === true && attendee.responseStatus === 'declined')) && {
                          bgcolor: 'white',
                          border: `0.5px dashed ${eventColor}`,
                          boxShadow: 'none'
                        })
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
    const isCurrentTimeVisible = now.getHours() >= DAY_START_HOUR && now.getHours() <= DAY_END_HOUR;
    
    return (
      <Grid container sx={{ position: 'relative', minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT + 50 }}>
        {/* Time labels column */}
        <Grid item xs={1} sx={{ 
          borderRight: 1, 
          borderColor: 'divider',
          position: 'sticky',
          left: 0,
          backgroundColor: 'background.paper',
          zIndex: 2
        }}>
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
              <Typography variant="caption" color="text.secondary">
                {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
              </Typography>
            </Box>
          ))}
        </Grid>
        
        {/* Day columns */}
        <Grid item xs={11}>
          <Grid container>
        {/* Days header */}
        <Grid container>
          {weekDays.map((date, index) => (
            <Grid 
              item 
              key={index} 
              sx={{ 
                    width: `${100 / 7}%`,
                p: 1, 
                textAlign: 'center',
                fontWeight: 'medium',
                borderBottom: 1,
                    borderRight: 1,
                    borderColor: 'divider',
                    backgroundColor: date.getDate() === today.getDate() && 
                                  date.getMonth() === today.getMonth() && 
                                  date.getFullYear() === today.getFullYear() ? 'rgba(1, 108, 158, 0.05)' : 'transparent'
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontFamily: 'Poppins',
                  display: 'block'
                }}
              >
                {date.toLocaleDateString('en-US', { weekday: isMobile ? 'short' : 'long' })}
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: 'Poppins',
                  fontWeight: 'bold',
                  color: date.getDate() === today.getDate() && 
                         date.getMonth() === today.getMonth() && 
                            date.getFullYear() === today.getFullYear() ? '#016C9E' : 'inherit'
                }}
              >
                {date.getDate()}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
            {/* Days content */}
            <Grid container>
              {weekDays.map((date, dayIndex) => {
            const dayEvents = getEventsForDay(date);
                const eventPositions = calculateEventPositions(dayEvents);
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
                      borderRight: 1,
                  borderColor: 'divider',
                      minHeight: (DAY_END_HOUR - DAY_START_HOUR + 1) * HOUR_HEIGHT,
                      backgroundColor: isToday ? 'rgba(1, 108, 158, 0.05)' : 'transparent'
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
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(1, 108, 158, 0.05)'
                          }
                        }}
                        onClick={(e) => {
                          // Only call handleEventClick if there is an event at this index
                          if (dayEvents[hourIndex]) {
                            handleEventClick(dayEvents[hourIndex], e);
                          } else {
                            // Handle empty slot click - could open event creation modal instead
                            // For now, just prevent the error by not calling handleEventClick
                            console.log(`Clicked on empty time slot: ${hour}:00`);
                            
                            // Optionally, you could open the event creation modal here
                            // with the time pre-filled based on the clicked hour
                            const clickedDate = new Date(selectedDate);
                            clickedDate.setHours(hour, 0, 0, 0);
                            setClickedDate(clickedDate);
                            setClickedTime({ hour, minute: 0 });
                            setIsEventModalOpen(true);
                          }
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
                    
                    {/* Events */}
                    {eventPositions.map(({ event, column, columnsInSlot, width, left, zIndex, isNested }, index) => {
                      const start = new Date(event.start);
                      const end = new Date(event.end);
                      
                      // Calculate position and size
                      const startPx = timeToPixels(start) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                      const endPx = timeToPixels(end) - timeToPixels(new Date(new Date().setHours(DAY_START_HOUR, 0, 0, 0)));
                      const height = Math.max(endPx - startPx, 25); // Minimum height of 25px
                      
                      const eventColor = getEventColor(event);
                      const textColor = getEventTextColor(eventColor);
                    
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
                            zIndex: (activeEventId === event.id) ? 100 : (zIndex || 1), // Bring to front when clicked
                            border: isNested || columnsInSlot > 1 ? '2px solid white' : '1px solid rgba(0,0,0,0.05)',
                            boxShadow: (activeEventId === event.id) ? '0 4px 12px rgba(0,0,0,0.3)' : (isNested || columnsInSlot > 1 ? '0 2px 5px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.15)'),
                            transform: (activeEventId === event.id) ? 'scale(1.02)' : 'none',
                            filter: (activeEventId === event.id) ? 'brightness(1.05)' : 'none',
                            // No hover effects that change z-index
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
          
          // Determine how many events to show and if there are more
          const eventsToShow = dayEvents.slice(0, MAX_EVENTS_PER_DAY);
          const hasMoreEvents = dayEvents.length > MAX_EVENTS_PER_DAY;
          const moreEventsCount = dayEvents.length - MAX_EVENTS_PER_DAY;
          
          days.push(
            <Grid 
              item 
              key={format(currentDay, 'yyyy-MM-dd')} 
              xs={12/7}
                        sx={{
                p: 0.5,
                border: 1,
                borderColor: 'divider',
                opacity: isCurrentMonth ? 1 : 0.4,
                backgroundColor: isToday ? 'rgba(1, 108, 158, 0.08)' : 'transparent',
                minHeight: '100px',
                          display: 'flex', 
                flexDirection: 'column',
                '&:hover': {
                  backgroundColor: isToday ? 'rgba(1, 108, 158, 0.12)' : 'rgba(1, 108, 158, 0.05)'
                },
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onClick={(e) => {
                setSelectedDate(new Date(currentDay));
                setViewMode('day');
              }}
            >
              {/* Date number in circle for today */}
              <Box 
                sx={{ 
                          display: 'flex', 
                  justifyContent: 'center',
                          alignItems: 'center',
                  mb: 0.5
                }}
              >
                <Box 
                  sx={{
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    backgroundColor: isToday ? '#016C9E' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                textAlign: 'center',
                      fontWeight: isToday ? 'bold' : 'medium',
                      color: isToday ? 'white' : 'inherit',
                      fontFamily: 'Poppins',
                      fontSize: '0.8rem'
                    }}
                  >
                    {format(currentDay, 'd')}
                  </Typography>
                </Box>
              </Box>
              
              {/* Events container */}
              <Box sx={{ 
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                          overflow: 'hidden', 
                pb: 0.5,
                gap: 0.5
              }}>
                {/* Display limited events with improved spacing */}
                {eventsToShow.map((event) => (
                  <MonthEventCard 
                    key={event.id}
                    bgcolor={getEventColor(event)}
                    onClick={(e) => handleEventClick(event, e)}
                  >
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: '0.75rem', 
                fontWeight: 'medium',
                        color: getEventTextColor(getEventColor(event)),
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        display: 'block',
                        paddingLeft: '3px'
                      }}
                    >
                            {event.title}
                          </Typography>
                  </MonthEventCard>
                ))}
                
                {/* Show more indicator with improved styling */}
                {hasMoreEvents && (
                  <Box
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the day cell click
                      // Change to day view for this date when clicking on "more"
                      setSelectedDate(new Date(currentDay));
                      setViewMode('day');
                    }}
                    sx={{
                      backgroundColor: 'rgba(1, 108, 158, 0.08)',
                      borderRadius: '4px',
                      p: '2px 4px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      '&:hover': {
                        backgroundColor: 'rgba(1, 108, 158, 0.15)',
                      }
              }}
            >
              <Typography 
                      variant="caption" 
                sx={{ 
                        color: '#071C73',
                        fontSize: '0.65rem',
                        fontWeight: 'medium',
                  fontFamily: 'Poppins'
                }}
              >
                      +{moreEventsCount} more
                        </Typography>
                  </Box>
                )}
                </Box>
              </Grid>
            );
          
          day = addDays(day, 1);
        }
        
        weeks.push(
          <Grid container key={`week-${format(day, 'yyyy-MM-dd')}`}>
            {days}
      </Grid>
    );
        
        days = [];
      }
      
      return weeks;
    };
    
    return (
      <Grid container direction="column" sx={{ minHeight: 300 }}>
        {/* Day names header */}
        <Grid container>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Grid 
              item 
              key={index} 
              xs={12/7}
              sx={{ 
                p: 1, 
                textAlign: 'center',
                fontWeight: 'medium',
                borderBottom: 1,
                borderColor: 'divider'
              }}
            >
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontFamily: 'Poppins'
                }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        {/* Calendar grid */}
        {generateCalendarGrid()}
      </Grid>
    );
  };

  // Render all events view
  const renderAllEventsView = () => {
    // Sort events by start date
    const sortedEvents = [...allEvents].sort((a, b) => {
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
            
            return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins', fontWeight: 'bold' }}>
          All Events
                </Typography>
                
        {sortedEvents.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {sortedEvents.map((event: CalendarEvent) => {
              // Format the event date
              const eventDate = new Date(event.start);
              const formattedDate = eventDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              });
                    
                    return (
                <Paper
                        key={event.id}
                  elevation={1}
                        sx={{ 
                    p: 2, 
                    borderLeft: `4px solid ${getEventColor(event)}`,
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: 3,
                      transform: 'scale(1.01)',
                      zIndex: 100
                    }
                  }}
                  onClick={(e) => handleEventClick(event, e)}
                      >
                        <Box sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ 
                        fontWeight: 'bold', 
                        fontFamily: 'Poppins'
                          }}>
                            {event.title}
                          </Typography>
                        </Box>
                    <Typography variant="caption" sx={{ 
                      color: 'text.secondary', 
                      fontFamily: 'Poppins',
                      fontWeight: 'medium'
                    }}>
                      {formattedDate}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'Poppins' }}>
                    {formatEventTime(event)}
                  </Typography>
                  
                  {event.location && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'Poppins', mt: 1 }}>
                      Location: {event.location}
                    </Typography>
                  )}
                  
                  {event.description && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'Poppins', mt: 1 }}>
                      {event.description}
                    </Typography>
                  )}
                </Paper>
                    );
                  })}
          </Box>
        ) : (
          <Box sx={{ 
            height: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
              No events found
                    </Typography>
          </Box>
                  )}
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

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 0,
        borderRadius: 2,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Calendar header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'rgba(198, 232, 242, 0.3)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="h6" 
            sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#071C73' }}
          >
            Calendar
          </Typography>
            <Chip 
            label="API Connected"
              size="small" 
            sx={{ 
              ml: 1, 
              fontSize: '0.7rem', 
              bgcolor: '#49C1E3',
              color: '#071C73',
              fontWeight: 'medium'
            }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isLoading ? (
            <CircularProgress size={24} sx={{ mr: 1, color: '#016C9E' }} />
          ) : (
            <Tooltip title="Refresh">
              <IconButton 
                onClick={refreshAllData} 
                size="small"
                sx={{ color: '#016C9E' }}
              >
                <SyncIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Add Event">
            <IconButton 
              onClick={() => {
                setClickedDate(new Date(selectedDate));
                setClickedTime(undefined); // No specific time
                setIsEventModalOpen(true);
              }}
              size="small" 
              sx={{ ml: 1, color: '#016C9E' }}
              disabled={!isConnected}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Navigation bar */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
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
              px: 2, 
              fontWeight: 'medium',
              fontFamily: 'Poppins',
              color: '#071C73'
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
            size="small" 
            onClick={goToToday}
            startIcon={<TodayIcon />}
            sx={{ 
              mr: 2,
              display: { xs: 'none', sm: 'flex' },
              color: '#016C9E',
              '&:hover': {
                backgroundColor: 'rgba(1, 108, 158, 0.08)'
              }
            }}
            disabled={viewMode === 'all'}
          >
            Today
          </Button>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newValue) => {
              if (newValue !== null) {
                setViewMode(newValue);
              }
            }}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#071C73',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(1, 108, 158, 0.15)',
                  color: '#016C9E',
                  fontWeight: 'bold'
                },
                '&:hover': {
                  backgroundColor: 'rgba(1, 108, 158, 0.08)'
                }
              }
            }}
          >
            <ToggleButton value="day">
              Day
            </ToggleButton>
            <ToggleButton value="week">
              Week
            </ToggleButton>
            <ToggleButton value="month">
              Month
            </ToggleButton>
            <ToggleButton value="all">
              All
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      {/* Calendar content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
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
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
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
    </Paper>
  );
};

export default CalendarView; 