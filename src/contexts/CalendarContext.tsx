import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { 
  getCalendarEvents, 
  CalendarEvent, 
  connectGoogleCalendar,
  isGoogleCalendarConnected,
  createCalendarEvent,
  createFocusTimeWithTasks,
  createEventWithTasks,
  updateCalendarEvent,
  deleteCalendarEvent,
  addAttendeesToEvent,
  removeAttendeesFromEvent
} from '../services/calendarService';
import { useAuth } from './AuthContext';
import { fetchGoogleTaskLists, GoogleTask, GoogleTaskList } from '../services/googleTasksService';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTaskLists } from '../store/slices/tasksSlice';
import { store } from '../store';
import { 
  fetchCalendarEvents, 
  addCalendarEvent,
  updateEvent,
  deleteEvent,
  addEventAttendees,
  removeEventAttendees,
  setSelectedDate as setReduxSelectedDate,
  setViewMode as setReduxViewMode,
  invalidateCache
} from '../store/slices/calendarSlice';

// Convert Google Tasks to Calendar Events
const convertTasksToEvents = (taskLists: GoogleTaskList[]): CalendarEvent[] => {
  // Extract all tasks that have due dates and are not completed
  const tasksWithDueDates = taskLists.flatMap(list => 
    list.tasks
      .filter(task => task.due && task.status !== 'completed')
      .map(task => convertTaskToEvent(task, list.title, list.id))
  );
  
  return tasksWithDueDates;
};

// Helper to convert a single task to a calendar event
const convertTaskToEvent = (task: GoogleTask, listTitle: string, listId?: string): CalendarEvent => {
  // Parse the due date
  const dueDate = new Date(task.due || '');
  
  // Create a 1-hour event on the due date (from the due time to 1 hour later)
  const startDate = dueDate;
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 1);
  
  // Extract time from notes if available
  let timeInfo = '';
  let hasExplicitTime = false;
  if (task.notes && task.notes.includes('Due Time:')) {
    const timeMatch = task.notes.match(/Due Time: (\d{1,2}:\d{2})/);
    if (timeMatch && timeMatch[1]) {
      timeInfo = `(${timeMatch[1]})`;
      hasExplicitTime = true;
    }
  }
  
  // Determine the task list ID - use '@default' for My Tasks
  const taskListId = listTitle === 'My Tasks' ? '@default' : listId || '';
  
  return {
    id: `task-${task.id}`,
    title: `${task.title}${hasExplicitTime ? ' ' + timeInfo : ''} [Task]`,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    description: task.notes || '',
    colorId: '6', // Use a distinct color for tasks
    eventType: 'task',
    summary: `Task from ${listTitle}`,
    taskListId: taskListId, // Store the task list ID for direct API access
    hasExplicitTime: hasExplicitTime // Add a flag to indicate if this task has an explicit time set
  };
};

interface CalendarContextType {
  events: CalendarEvent[];
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month' | 'all';
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectCalendar: () => Promise<boolean>;
  fetchEvents: () => Promise<void>;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: 'day' | 'week' | 'month' | 'all') => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>, addGoogleMeet?: boolean, customEndpoint?: string) => Promise<CalendarEvent>;
  createFocusTimeWithTasks: (focusTimeData: any) => Promise<CalendarEvent>;
  createEventWithTasks: (eventData: any) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, event: Partial<Omit<CalendarEvent, 'id'>>) => Promise<CalendarEvent>;
  removeEvent: (eventId: string, responseScope?: 'single' | 'all') => Promise<boolean>;
  refreshCalendarData: () => Promise<void>;
  addAttendeesToEvent: (eventId: string, attendees: Array<{ email: string, optional?: boolean }>) => Promise<CalendarEvent | null>;
  removeAttendeesFromEvent: (eventId: string, emails: string[]) => Promise<CalendarEvent | null>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const dispatch = useAppDispatch();
  
  // Get state from Redux store
  const calendarEvents = useAppSelector((state) => state.calendar.events);
  const calendarLoading = useAppSelector((state) => state.calendar.loading);
  const calendarError = useAppSelector((state) => state.calendar.error);
  const reduxViewMode = useAppSelector((state) => state.calendar.viewMode);
  const reduxSelectedDate = useAppSelector((state) => state.calendar.selectedDate);

  // Local state
  const [taskEvents, setTaskEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(reduxSelectedDate));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'all'>(reduxViewMode);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Combine Redux events with task events
  const events = [...calendarEvents, ...taskEvents];
  const isLoading = calendarLoading;

  // Sync local state with Redux when Redux state changes
  useEffect(() => {
    setSelectedDate(new Date(reduxSelectedDate));
  }, [reduxSelectedDate]);

  useEffect(() => {
    setViewMode(reduxViewMode);
  }, [reduxViewMode]);

  // Check connection status on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkConnectionStatus();
    }
  }, [isAuthenticated]);

  // Create a ref to track when we're updating to prevent circular updates
  const isUpdatingRef = useRef(false);
  
  // When the view mode or selected date changes, fetch events
  useEffect(() => {
    if (isAuthenticated) {
      console.log(`View mode or date changed. View: ${viewMode}, Date: ${selectedDate.toDateString()}`);
      
      // Prevent circular updates
      if (isUpdatingRef.current) {
        console.log('Preventing circular update in CalendarContext useEffect');
        return;
      }
      
      // Set updating flag
      isUpdatingRef.current = true;
      
      // Use a timeout to ensure UI remains responsive
      const timeoutId = setTimeout(async () => {
        await fetchEventsForViewMode();
        
        // Update Redux state
        dispatch(setReduxSelectedDate(selectedDate));
        dispatch(setReduxViewMode(viewMode));
        
        // Clear updating flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }, 50);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isAuthenticated, selectedDate, viewMode, dispatch]);

  // Helper function to get tasks from Redux
  const getTasksFromRedux = async () => {
    // Check if we've called this function recently
    if (getTasksFromRedux.lastCallTime && (Date.now() - getTasksFromRedux.lastCallTime < 300)) {
      console.log('Debouncing task fetch - too many requests');
      // Get the current state instead of making another call
      const state = store.getState();
      return state.tasks.taskLists;
    }
    
    // Update last call time
    getTasksFromRedux.lastCallTime = Date.now();
    
    console.log('Dispatching fetchTaskLists with current view mode and date');
    // Dispatch the action to fetch tasks with the current view mode and selected date
    await dispatch(fetchTaskLists({ 
      viewMode, 
      selectedDate 
    }));
    
    // Get the Redux store state
    const state = store.getState();
    
    // Return the task lists from the store
    return state.tasks.taskLists;
  };
  
  // Add property to track last call time
  getTasksFromRedux.lastCallTime = 0;

  // Fetch Google Tasks and convert them to events
  const fetchGoogleTaskEvents = async (retryCount = 0, maxRetries = 3): Promise<CalendarEvent[]> => {
    try {
      console.log('Fetching Google Tasks for calendar integration...');
      
      // Use Redux store to get Google Tasks
      const taskLists = await getTasksFromRedux();
      
      if (!taskLists || taskLists.length === 0) {
        console.log('No task lists returned or empty response');
        return [];
      }
      
      // Convert tasks to calendar events
      const taskEvents = convertTasksToEvents(taskLists);
      console.log(`Converted ${taskEvents.length} tasks to calendar events`);
      
      // Cache the tasks to localStorage for offline/fallback access
      try {
        localStorage.setItem('cachedTaskEvents', JSON.stringify(taskEvents));
        localStorage.setItem('cachedTaskEventsTimestamp', Date.now().toString());
      } catch (cacheError) {
        console.warn('Could not cache task events to localStorage:', cacheError);
      }
      
      // Update state with task events
      setTaskEvents(taskEvents);
      
      return taskEvents;
    } catch (error) {
      console.error('Error fetching Google Tasks for calendar:', error);
      
      // If the error is a timeout, network error, or cancelation, retry the request
      const isRetriableError = error instanceof Error && 
           (error.message.includes('timed out') || 
            error.message.includes('network') ||
            error.message.includes('cancel') ||
         error.name === 'AbortError' ||
         error.message.includes('Failed to fetch'));
      
      if (retryCount < maxRetries && isRetriableError) {
        console.log(`Retrying task fetch (attempt ${retryCount + 1} of ${maxRetries})...`);
        // Increase delay with each retry attempt (exponential backoff)
        const delay = 1000 * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchGoogleTaskEvents(retryCount + 1, maxRetries);
      }
      
      // Log detailed information about the error
      console.error('Task fetch failed after retries:', {
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Try to load cached tasks if available
      try {
        const cachedTasksJson = localStorage.getItem('cachedTaskEvents');
        const cachedTimestamp = localStorage.getItem('cachedTaskEventsTimestamp');
        
        if (cachedTasksJson && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const currentTime = Date.now();
          const hoursSinceCached = (currentTime - timestamp) / (1000 * 60 * 60);
          
          // Only use cache if it's less than 24 hours old
          if (hoursSinceCached < 24) {
            const cachedTasks = JSON.parse(cachedTasksJson) as CalendarEvent[];
            console.log(`Using ${cachedTasks.length} cached task events from localStorage`);
            return cachedTasks;
          }
        }
      } catch (cacheError) {
        console.error('Error loading cached tasks:', cacheError);
      }
      
      return [];
    }
  };

  // Check if Google Calendar is connected
  const checkConnectionStatus = async () => {
    try {
      const connected = await isGoogleCalendarConnected();
      setIsConnected(connected);
    } catch (error) {
      console.error('Error checking calendar connection status:', error);
      setError('Failed to check calendar connection status');
    }
  };

  // Connect to Google Calendar
  const connectCalendar = async (): Promise<boolean> => {
    setError(null);
    
    try {
      const success = await connectGoogleCalendar();
      if (success) {
        setIsConnected(true);
      }
      return success;
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setError('Failed to connect to Google Calendar');
      return false;
    }
  };

  // Fetch events based on current view mode and selected date
  const fetchEventsForViewMode = async () => {
    let tasksFetchFailed = false;
    
    try {
      console.log(`Fetching events for ${viewMode} view with selected date ${selectedDate.toISOString()}`);
      
      // Check if we're currently fetching
      if (fetchEventsForViewMode.isFetching) {
        console.log('Already fetching events, skipping this request');
        return true;
      }
      
      // Set fetching flag
      fetchEventsForViewMode.isFetching = true;
      
      try {
        // Use Promise.allSettled to fetch both event types in parallel and handle failures independently
        const [calendarResult, tasksResult] = await Promise.allSettled([
          // Calendar events - now using Redux
          (async () => {
            try {
              await dispatch(fetchCalendarEvents({ viewMode, selectedDate }));
              return true;
            } catch (error) {
              console.error('Error dispatching fetchCalendarEvents:', error);
              return false;
            }
          })(),
          
          // Task events
          (async () => {
            try {
              const tasks = await fetchGoogleTaskEvents();
              console.log(`Successfully fetched ${tasks.length} task events`);
              return tasks;
            } catch (error) {
              console.error('Error fetching task events:', error);
              tasksFetchFailed = true;
              throw error;
            }
          })()
        ]);
        
        // Process task events result
        if (tasksResult.status === 'fulfilled') {
          setTaskEvents(tasksResult.value);
        } else {
          tasksFetchFailed = true;
        }
        
        // Set error based on failures
        if (calendarError || tasksFetchFailed) {
          setError(calendarError || 'Failed to fetch some events');
        } else {
          setError(null);
        }
        
        return true;
      } finally {
        // Clear fetching flag
        fetchEventsForViewMode.isFetching = false;
      }
    } catch (error) {
      console.error('Error in fetchEventsForViewMode:', error);
      setError('Failed to fetch events');
      // Clear fetching flag
      fetchEventsForViewMode.isFetching = false;
      return false;
    }
  };
  
  // Add flag to track if we're currently fetching
  fetchEventsForViewMode.isFetching = false;

  // Public method to fetch events (used in components)
  const fetchEvents = async () => {
    await fetchEventsForViewMode();
  };

  // Add a new event - now using Redux
  const addEvent = async (event: Omit<CalendarEvent, 'id'>, addGoogleMeet: boolean = false, customEndpoint?: string): Promise<CalendarEvent> => {
    setError(null);
    
    try {
      const resultAction = await dispatch(addCalendarEvent({ event, addGoogleMeet, customEndpoint }));
      
      if (addCalendarEvent.fulfilled.match(resultAction)) {
        return resultAction.payload;
      } else {
        throw new Error('Failed to create calendar event');
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      setError('Failed to create calendar event');
      throw error;
    }
  };

  // Update an existing event - now using Redux
  const updateEventHandler = async (
    eventId: string,
    eventUpdate: Partial<Omit<CalendarEvent, 'id'>> & { responseScope?: 'single' | 'all' }
  ): Promise<CalendarEvent> => {
    setError(null);
    
    try {
      // Extract the recurring event update scope if it exists
      const { responseScope, ...updateData } = eventUpdate;
      
      const resultAction = await dispatch(updateEvent({ 
        eventId, 
        eventUpdate: updateData, 
        responseScope 
      }));
      
      if (updateEvent.fulfilled.match(resultAction)) {
        return resultAction.payload;
      } else {
        throw new Error('Failed to update calendar event');
      }
    } catch (error) {
      console.error('Error updating calendar event:', error);
      setError('Failed to update calendar event');
      throw error;
    }
  };

  // Add attendees to an event - now using Redux
  const addAttendees = async (
    eventId: string, 
    attendees: Array<{ email: string, optional?: boolean }>
  ): Promise<CalendarEvent | null> => {
    setError(null);
    
    try {
      const resultAction = await dispatch(addEventAttendees({ eventId, attendees }));
      
      if (addEventAttendees.fulfilled.match(resultAction)) {
        return resultAction.payload;
      } else {
        throw new Error('Failed to add attendees to event');
      }
    } catch (error) {
      console.error('Error adding attendees to event:', error);
      setError('Failed to add attendees to event');
      return null;
    }
  };

  // Remove attendees from an event - now using Redux
  const removeAttendees = async (
    eventId: string, 
    emails: string[]
  ): Promise<CalendarEvent | null> => {
    setError(null);
    
    try {
      const resultAction = await dispatch(removeEventAttendees({ eventId, emails }));
      
      if (removeEventAttendees.fulfilled.match(resultAction)) {
        return resultAction.payload;
      } else {
        throw new Error('Failed to remove attendees from event');
      }
    } catch (error) {
      console.error('Error removing attendees from event:', error);
      setError('Failed to remove attendees from event');
      return null;
    }
  };

  // Remove an event - now using Redux
  const removeEvent = async (eventId: string, responseScope?: 'single' | 'all'): Promise<boolean> => {
    setError(null);
    
    try {
      const resultAction = await dispatch(deleteEvent({ eventId, responseScope }));
      return deleteEvent.fulfilled.match(resultAction);
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      setError('Failed to delete calendar event');
      return false;
    }
  };

  // Update selected date and viewMode - now also updating Redux
  const setSelectedDateHandler = (date: Date) => {
    console.log(`CalendarContext: Setting selected date to ${date.toDateString()}`);
    // Update local state first
    setSelectedDate(date);
    // Then update Redux state
    dispatch(setReduxSelectedDate(date));
  };

  const setViewModeHandler = (mode: 'day' | 'week' | 'month' | 'all') => {
    console.log(`CalendarContext: Setting view mode to ${mode}`);
    // Update local state first
    setViewMode(mode);
    // Then update Redux state
    dispatch(setReduxViewMode(mode));
  };

  // Add a method to refresh calendar data
  const refreshCalendarData = async () => {
    console.log('Refreshing calendar data...');
    
    // Don't set loading state for refresh to avoid UI flicker
    // but do clear any previous errors
    setError(null);
    
    // Add debounce mechanism to prevent multiple rapid calls
    if (refreshCalendarData.lastCallTime && Date.now() - refreshCalendarData.lastCallTime < 300) {
      console.log('Debouncing refresh call - too many requests');
      return;
    }
    
    // Set last call time for debouncing
    refreshCalendarData.lastCallTime = Date.now();
    
    try {
      // Invalidate the Redux cache first to ensure a fresh fetch
      dispatch(invalidateCache());
      
      // Re-fetch events based on current view mode
      await fetchEventsForViewMode();
      console.log('Calendar data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
      // Don't set error state here, as fetchEventsForViewMode will have already handled it
    }
  };
  
  // Add lastCallTime property to the function
  refreshCalendarData.lastCallTime = 0;

  // Add a method to create focus time events with tasks
  const createFocusTimeWithTasksHandler = async (focusTimeData: any): Promise<CalendarEvent> => {
    setError(null);
    
    try {
      // Call the service directly rather than using Redux
      const newEvent = await createFocusTimeWithTasks(focusTimeData);
      
      // Add the created event to our local state
      if (newEvent) {
        // Add to Redux store manually since we're bypassing the Redux action
        dispatch({
          type: 'calendar/addEvent/fulfilled',
          payload: newEvent
        });
      }
      
      return newEvent;
    } catch (error) {
      console.error('Error creating focus time event with tasks:', error);
      setError('Failed to create focus time event with tasks');
      throw error;
    }
  };

  // Add a method to create regular events with tasks
  const createEventWithTasksHandler = async (eventData: any): Promise<CalendarEvent> => {
    setError(null);
    
    try {
      // Call the service directly
      const newEvent = await createEventWithTasks(eventData);
      
      // Add the created event to Redux store
      if (newEvent) {
        dispatch({
          type: 'calendar/addEvent/fulfilled',
          payload: newEvent
        });
      }
      
      return newEvent;
    } catch (error) {
      console.error('Error creating event with tasks:', error);
      setError('Failed to create event with tasks');
      throw error;
    }
  };

  const value: CalendarContextType = {
    events,
    selectedDate,
    viewMode,
    isConnected,
    isLoading,
    error,
    connectCalendar,
    fetchEvents,
    setSelectedDate: setSelectedDateHandler,
    setViewMode: setViewModeHandler,
    addEvent,
    createFocusTimeWithTasks: createFocusTimeWithTasksHandler,
    createEventWithTasks: createEventWithTasksHandler,
    updateEvent: updateEventHandler,
    removeEvent,
    refreshCalendarData,
    addAttendeesToEvent: addAttendees,
    removeAttendeesFromEvent: removeAttendees
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
}; 