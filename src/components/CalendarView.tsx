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
  styled
} from '@mui/material';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import AddIcon from '@mui/icons-material/Add';
import TodayIcon from '@mui/icons-material/Today';
import SyncIcon from '@mui/icons-material/Sync';
import { useCalendar } from '../contexts/CalendarContext';
import { CalendarEvent } from '../services/calendarService';

// Event card styles
const EventCard = styled(Box)<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  backgroundColor: bgcolor || '#1056F5',
  color: 'white',
  borderRadius: '6px',
  padding: theme.spacing(1),
  fontSize: '0.75rem',
  marginBottom: theme.spacing(0.5),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  boxShadow: '0px 1px 3px rgba(0,0,0,0.2)',
  '&:hover': {
    opacity: 0.9,
    transform: 'translateY(-1px)',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.3)',
  },
  transition: 'all 0.2s'
}));

// Type for color mapping
interface ColorMap {
  [key: string]: string;
}

// Color mapping for different events based on colorId
const colorMap: ColorMap = {
  '1': '#7986CB', // Lavender
  '2': '#33B679', // Sage
  '3': '#8E24AA', // Grape
  '4': '#E67C73', // Flamingo
  '5': '#F6BF26', // Banana
  '6': '#F4511E', // Tangerine
  '7': '#039BE5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3F51B5', // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
  // Default colors for events without colorId
  'team': '#4285F4',     // Team Meeting
  'client': '#9C27B0',   // Client Call
  'focus': '#F9A825',    // Focus Time
  'manager': '#E53935',  // Manager 1:1
  'review': '#4CAF50',   // Project Review
  'default': '#1056F5',  // Default blue
};

// Function to get event color
const getEventColor = (event: CalendarEvent): string => {
  if (event.colorId && colorMap[event.colorId]) {
    return colorMap[event.colorId];
  }
  
  // Check title for keywords and assign colors
  const title = event.title.toLowerCase();
  if (title.includes('team') || title.includes('meeting')) {
    return colorMap.team;
  } else if (title.includes('client') || title.includes('call')) {
    return colorMap.client;
  } else if (title.includes('focus')) {
    return colorMap.focus;
  } else if (title.includes('1:1') || title.includes('manager')) {
    return colorMap.manager;
  } else if (title.includes('review') || title.includes('project')) {
    return colorMap.review;
  }
  
  return colorMap.default;
};

// Function to format time (24h -> 12h)
const formatTime = (timeString: string): string => {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Function to extract time from ISO string
const extractTime = (timeString: string): string => {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

// Generate mock calendar data
const generateMockEvents = (baseDate: Date): CalendarEvent[] => {
  const mockEvents: CalendarEvent[] = [];
  const today = new Date(baseDate);
  
  // Set to the beginning of the month for consistent generation
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Generate events for team meetings (weekly on Mondays)
  for (let i = 0; i < 4; i++) {
    const meetingDate = new Date(startDate);
    // Find the next Monday
    while (meetingDate.getDay() !== 1) {
      meetingDate.setDate(meetingDate.getDate() + 1);
    }
    // Add i weeks
    meetingDate.setDate(meetingDate.getDate() + (i * 7));
    
    if (meetingDate.getMonth() === startDate.getMonth()) {
      const startTime = new Date(meetingDate);
      startTime.setHours(10, 0, 0);
      const endTime = new Date(meetingDate);
      endTime.setHours(11, 0, 0);
      
      mockEvents.push({
        id: `team-meeting-${i}`,
        title: 'Team Meeting',
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        location: 'Conference Room A'
      });
    }
  }
  
  // Generate events for client calls (bi-weekly on Wednesdays)
  for (let i = 0; i < 2; i++) {
    const callDate = new Date(startDate);
    // Find the first Wednesday
    while (callDate.getDay() !== 3) {
      callDate.setDate(callDate.getDate() + 1);
    }
    // Add i * 2 weeks
    callDate.setDate(callDate.getDate() + (i * 14));
    
    if (callDate.getMonth() === startDate.getMonth()) {
      const startTime = new Date(callDate);
      startTime.setHours(11, 0, 0);
      const endTime = new Date(callDate);
      endTime.setHours(12, 0, 0);
      
      mockEvents.push({
        id: `client-call-${i}`,
        title: 'Client Call',
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        description: 'Quarterly review with client'
      });
    }
  }
  
  // Generate focused work time (3 days a week)
  const focusDays = [2, 4]; // Tuesday and Thursday
  for (let week = 0; week < 4; week++) {
    for (const day of focusDays) {
      const focusDate = new Date(startDate);
      // Find the first occurrence of this day
      while (focusDate.getDay() !== day) {
        focusDate.setDate(focusDate.getDate() + 1);
      }
      // Add weeks
      focusDate.setDate(focusDate.getDate() + (week * 7));
      
      if (focusDate.getMonth() === startDate.getMonth()) {
        const startTime = new Date(focusDate);
        startTime.setHours(9, 0, 0);
        const endTime = new Date(focusDate);
        endTime.setHours(12, 0, 0);
        
        mockEvents.push({
          id: `focus-time-${week}-${day}`,
          title: 'Focus Time',
          start: startTime.toISOString(),
          end: endTime.toISOString(),
          colorId: '5' // Yellow
        });
      }
    }
  }
  
  // Generate 1:1 with manager (bi-weekly on Friday)
  for (let i = 0; i < 2; i++) {
    const oneOnOneDate = new Date(startDate);
    // Find the first Friday
    while (oneOnOneDate.getDay() !== 5) {
      oneOnOneDate.setDate(oneOnOneDate.getDate() + 1);
    }
    // Add i * 2 weeks
    oneOnOneDate.setDate(oneOnOneDate.getDate() + (i * 14));
    
    if (oneOnOneDate.getMonth() === startDate.getMonth()) {
      const startTime = new Date(oneOnOneDate);
      startTime.setHours(15, 0, 0);
      const endTime = new Date(oneOnOneDate);
      endTime.setHours(16, 0, 0);
      
      mockEvents.push({
        id: `one-on-one-${i}`,
        title: '1:1 with Manager',
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        location: 'Manager\'s Office'
      });
    }
  }
  
  // Generate project review meetings (monthly)
  const reviewDate = new Date(startDate);
  reviewDate.setDate(15); // Mid-month review
  
  const reviewStartTime = new Date(reviewDate);
  reviewStartTime.setHours(14, 0, 0);
  const reviewEndTime = new Date(reviewDate);
  reviewEndTime.setHours(15, 30, 0);
  
  mockEvents.push({
    id: 'project-review',
    title: 'Project Review',
    start: reviewStartTime.toISOString(),
    end: reviewEndTime.toISOString(),
    location: 'Project Room',
    description: 'Monthly project status review'
  });
  
  // Add a few random events
  const eventTitles = [
    'Coffee with Team', 
    'Brainstorming Session', 
    'Client Proposal Preparation', 
    'Training Workshop',
    'Code Review'
  ];
  
  for (let i = 0; i < 3; i++) {
    const randomDay = Math.floor(Math.random() * 28) + 1; // Random day of month
    const randomDate = new Date(startDate.getFullYear(), startDate.getMonth(), randomDay);
    
    // Skip weekends
    if (randomDate.getDay() === 0 || randomDate.getDay() === 6) {
      continue;
    }
    
    const startHour = 9 + Math.floor(Math.random() * 7); // Between 9 AM and 4 PM
    const durationHours = 1 + Math.floor(Math.random() * 2); // 1-2 hours
    
    const randomStartTime = new Date(randomDate);
    randomStartTime.setHours(startHour, 0, 0);
    const randomEndTime = new Date(randomDate);
    randomEndTime.setHours(startHour + durationHours, 0, 0);
    
    mockEvents.push({
      id: `random-event-${i}`,
      title: eventTitles[Math.floor(Math.random() * eventTitles.length)],
      start: randomStartTime.toISOString(),
      end: randomEndTime.toISOString()
    });
  }
  
  return mockEvents;
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
    events: realEvents, 
    selectedDate,
    viewMode,
    setSelectedDate,
    setViewMode,
    isLoading,
    error,
    isConnected,
    connectCalendar,
    refreshCalendarData
  } = useCalendar();

  // Generate mock events based on the selected date
  const [mockEvents, setMockEvents] = useState<CalendarEvent[]>([]);
  
  // Update mock events when the selected date changes
  useEffect(() => {
    if (!isConnected) {
      setMockEvents(generateMockEvents(selectedDate));
    }
  }, [selectedDate, isConnected]);
  
  // Use real events if connected, otherwise use mock events
  const events = isConnected ? realEvents : mockEvents;

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
  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: 'day' | 'week' | 'month' | null) => {
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
    } else {
      return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  // Function to get events for a specific day
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear();
    
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.getDate() === day && 
             eventDate.getMonth() === month && 
             eventDate.getFullYear() === year;
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

  // Render day view
  const renderDayView = () => {
    const todayEvents = getEventsForDay(selectedDate);
    
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins', fontWeight: 'bold' }}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography>
        
        {todayEvents.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {todayEvents.map((event) => (
              <Paper
                key={event.id}
                elevation={1}
                sx={{ 
                  p: 2, 
                  borderLeft: `4px solid ${getEventColor(event)}`,
                  cursor: 'pointer',
                  '&:hover': {
                    boxShadow: 3
                  }
                }}
                onClick={() => onEventClick && onEventClick(event)}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                  {event.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'Poppins' }}>
                  {extractTime(event.start)} - {extractTime(event.end)}
                </Typography>
                {event.location && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'Poppins', mt: 1 }}>
                    Location: {event.location}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
        ) : (
          <Box sx={{ 
            height: 100, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
              No events scheduled for today
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDays = generateWeekDays();
    const today = new Date();
    
    return (
      <Grid container sx={{ minHeight: 300 }}>
        {/* Days header */}
        <Grid container>
          {weekDays.map((date, index) => (
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
                         date.getFullYear() === today.getFullYear() ? 'primary.main' : 'inherit'
                }}
              >
                {date.getDate()}
              </Typography>
            </Grid>
          ))}
        </Grid>
        
        {/* Events grid */}
        <Grid container sx={{ flexGrow: 1 }}>
          {weekDays.map((date, index) => {
            const dayEvents = getEventsForDay(date);
            const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
            
            return (
              <Grid 
                item 
                key={index} 
                xs={12/7}
                sx={{ 
                  height: '100%',
                  p: 1,
                  borderRight: index < 6 ? 1 : 0,
                  borderColor: 'divider',
                  backgroundColor: date.getDate() === today.getDate() && 
                                  date.getMonth() === today.getMonth() && 
                                  date.getFullYear() === today.getFullYear() ? 'rgba(16, 86, 245, 0.05)' : 'transparent'
                }}
              >
                <Box sx={{ 
                  height: '100%',
                  minHeight: 150,
                  overflowY: 'auto',
                  px: 0.5
                }}>
                  {dayEvents.map((event) => (
                    <EventCard 
                      key={event.id}
                      bgcolor={getEventColor(event)}
                      onClick={() => onEventClick && onEventClick(event)}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.title}
                      </Typography>
                      <Typography variant="caption" sx={{ display: 'block' }}>
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </Typography>
                    </EventCard>
                  ))}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Grid>
    );
  };

  // Render month view
  const renderMonthView = () => {
    const monthDays = generateMonthDays();
    const today = new Date();
    
    return (
      <Grid container sx={{ minHeight: 300 }}>
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
        <Grid container>
          {monthDays.map((date, index) => {
            const dayEvents = getEventsForDay(date);
            const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
            
            return (
              <Grid 
                item 
                key={index} 
                xs={12/7}
                sx={{ 
                  p: 0.5,
                  borderBottom: Math.floor(index / 7) < Math.floor(monthDays.length / 7) - 1 ? 1 : 0,
                  borderRight: index % 7 < 6 ? 1 : 0,
                  borderColor: 'divider',
                  opacity: isCurrentMonth ? 1 : 0.4,
                  backgroundColor: date.getDate() === today.getDate() && 
                                  date.getMonth() === today.getMonth() && 
                                  date.getFullYear() === today.getFullYear() ? 'rgba(16, 86, 245, 0.05)' : 'transparent',
                  minHeight: '100px'
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    p: 0.5,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: date.getDate() === today.getDate() && 
                           date.getMonth() === today.getMonth() && 
                           date.getFullYear() === today.getFullYear() ? 'primary.main' : 'inherit',
                    fontFamily: 'Poppins'
                  }}
                >
                  {date.getDate()}
                </Typography>
                
                <Box sx={{ 
                  maxHeight: '80px',
                  overflowY: 'auto',
                  pb: 0.5,
                  '&::-webkit-scrollbar': {
                    width: '4px'
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    borderRadius: '2px'
                  }
                }}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventCard 
                      key={event.id}
                      bgcolor={getEventColor(event)}
                      onClick={() => onEventClick && onEventClick(event)}
                      sx={{ 
                        p: '2px 4px',
                        mb: 0.25,
                        fontSize: '0.65rem'
                      }}
                    >
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.title}
                      </Typography>
                    </EventCard>
                  ))}
                  
                  {dayEvents.length > 3 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        textAlign: 'center',
                        color: 'text.secondary',
                        fontSize: '0.65rem',
                        mt: 0.5,
                        fontFamily: 'Poppins'
                      }}
                    >
                      +{dayEvents.length - 3} more
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Grid>
    );
  };

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
        backgroundColor: 'rgba(16, 86, 245, 0.02)'
      }}>
        <Typography 
          variant="h6" 
          sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
        >
          Calendar
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isLoading ? (
            <CircularProgress size={24} sx={{ mr: 1 }} />
          ) : (
            <Tooltip title="Refresh">
              <IconButton onClick={refreshCalendarData} size="small">
                <SyncIcon />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title="Add Event">
            <IconButton 
              onClick={onAddEvent} 
              size="small" 
              sx={{ ml: 1 }}
              disabled={!isConnected && onAddEvent !== undefined}
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
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={goToPrevious} size="small">
            <NavigateBeforeIcon />
          </IconButton>
          
          <Typography 
            variant={isMobile ? "body1" : "h6"} 
            sx={{ 
              px: 2, 
              fontWeight: 'medium',
              fontFamily: 'Poppins'
            }}
          >
            {formatDateRange()}
          </Typography>
          
          <IconButton onClick={goToNext} size="small">
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
              display: { xs: 'none', sm: 'flex' }
            }}
          >
            Today
          </Button>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            size="small"
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
          </ToggleButtonGroup>
        </Box>
      </Box>
      
      {/* Mock data banner - show only when not connected */}
      {!isConnected && (
        <Box sx={{ 
          px: 2, 
          py: 1, 
          backgroundColor: 'rgba(16, 86, 245, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'Poppins',
              fontStyle: 'italic',
              color: 'text.secondary'
            }}
          >
            Viewing sample calendar data. Connect your Google Calendar to see your actual events.
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={connectCalendar}
            disabled={isLoading}
            sx={{ ml: 2, minWidth: 'auto' }}
          >
            Connect
          </Button>
        </Box>
      )}
      
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
              onClick={refreshCalendarData}
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
          </>
        )}
      </Box>
    </Paper>
  );
};

export default CalendarView; 