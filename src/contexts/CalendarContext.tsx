import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { 
  getCalendarEvents, 
  CalendarEvent, 
  connectGoogleCalendar,
  isGoogleCalendarConnected,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  addAttendeesToEvent,
  removeAttendeesFromEvent
} from '../services/calendarService';
import { useAuth } from './AuthContext';
import { fetchGoogleTaskLists, GoogleTask, GoogleTaskList } from '../services/googleTasksService';

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
  addEvent: (event: Omit<CalendarEvent, 'id'>, addGoogleMeet?: boolean) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, event: Partial<Omit<CalendarEvent, 'id'>>) => Promise<CalendarEvent>;
  removeEvent: (eventId: string) => Promise<boolean>;
  refreshCalendarData: () => Promise<void>;
  addAttendeesToEvent: (eventId: string, attendees: Array<{ email: string, optional?: boolean }>) => Promise<CalendarEvent | null>;
  removeAttendeesFromEvent: (eventId: string, emails: string[]) => Promise<CalendarEvent | null>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [taskEvents, setTaskEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'all'>('week');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkConnectionStatus();
    }
  }, [isAuthenticated]);

  // When the view mode or selected date changes, fetch events
  useEffect(() => {
    if (isAuthenticated) {
      console.log(`View mode or date changed. View: ${viewMode}, Date: ${selectedDate.toDateString()}`);
      fetchEventsForViewMode();
    }
  }, [isAuthenticated, selectedDate, viewMode]);

  // Fetch Google Tasks and convert them to events
  const fetchGoogleTaskEvents = async () => {
    try {
      console.log('Fetching Google Tasks for calendar integration...');
      const taskLists = await fetchGoogleTaskLists();
      
      // Convert tasks to calendar events
      const taskEvents = convertTasksToEvents(taskLists);
      console.log(`Converted ${taskEvents.length} tasks to calendar events`);
      
      // Update state with task events
      setTaskEvents(taskEvents);
      
      return taskEvents;
    } catch (error) {
      console.error('Error fetching Google Tasks for calendar:', error);
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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch events based on current view mode and selected date
  const fetchEventsForViewMode = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching events for ${viewMode} view with selected date ${selectedDate.toISOString()}`);
      
      // Fetch regular calendar events
      const fetchedEvents = await getCalendarEvents(viewMode, selectedDate);
      console.log(`Successfully fetched ${fetchedEvents.length} calendar events`);
      
      // Fetch Google Tasks as events
      const taskEvents = await fetchGoogleTaskEvents();
      
      // Combine regular events with task events
      const allEvents = [...fetchedEvents, ...taskEvents];
      
      // Check if we got any events back
      if (allEvents.length === 0) {
        console.log('No events returned from API, but this might be expected based on date range');
      } else {
        console.log(`Total events (including tasks): ${allEvents.length}`);
      }
      
      // Update state with the fetched events
      setEvents(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setError('Failed to fetch calendar events');
      // Don't clear existing events on error to prevent UI disruption
    } finally {
      setIsLoading(false);
    }
  };

  // Public method to fetch events (used in components)
  const fetchEvents = async () => {
    await fetchEventsForViewMode();
  };

  // Add a new event
  const addEvent = async (event: Omit<CalendarEvent, 'id'>, addGoogleMeet: boolean = false): Promise<CalendarEvent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Log the event data being sent, including attendees if present
      console.log('Creating event with event data:', JSON.stringify(event, null, 2));
      console.log('Adding Google Meet:', addGoogleMeet);
      
      if (event.attendees) {
        console.log(`Event has ${event.attendees.length} attendees:`, 
          event.attendees.map(a => a.email).join(', '));
      } else {
        console.log('Event has no attendees array defined');
      }
      
      const newEvent = await createCalendarEvent('primary', event, addGoogleMeet);
      
      // Log the returned event
      console.log('Event created successfully, returned data:', JSON.stringify(newEvent, null, 2));
      
      // Update events state with the new event
      setEvents(prevEvents => [...prevEvents, newEvent]);
      return newEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      setError('Failed to create calendar event');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update an existing event
  const updateEvent = async (
    eventId: string,
    eventUpdate: Partial<Omit<CalendarEvent, 'id'>>
  ): Promise<CalendarEvent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updatedEvent = await updateCalendarEvent(eventId, eventUpdate);
      
      if (!updatedEvent) {
        throw new Error('Failed to update calendar event');
      }
      
      // Update events state with the updated event
      setEvents(prevEvents => 
        prevEvents.map(event => event.id === eventId ? updatedEvent : event)
      );
      return updatedEvent;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      setError('Failed to update calendar event');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Add attendees to an event
  const addAttendees = async (
    eventId: string, 
    attendees: Array<{ email: string, optional?: boolean }>
  ): Promise<CalendarEvent | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Adding ${attendees.length} attendees to event ${eventId}`);
      const updatedEvent = await addAttendeesToEvent(eventId, attendees);
      
      if (updatedEvent) {
        // Update events state with the updated event
        setEvents(prevEvents => 
          prevEvents.map(event => event.id === eventId ? updatedEvent : event)
        );
      }
      
      return updatedEvent;
    } catch (error) {
      console.error('Error adding attendees to event:', error);
      setError('Failed to add attendees to event');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove attendees from an event
  const removeAttendees = async (
    eventId: string, 
    emails: string[]
  ): Promise<CalendarEvent | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Removing ${emails.length} attendees from event ${eventId}`);
      const updatedEvent = await removeAttendeesFromEvent(eventId, emails);
      
      if (updatedEvent) {
        // Update events state with the updated event
        setEvents(prevEvents => 
          prevEvents.map(event => event.id === eventId ? updatedEvent : event)
        );
      }
      
      return updatedEvent;
    } catch (error) {
      console.error('Error removing attendees from event:', error);
      setError('Failed to remove attendees from event');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove an event
  const removeEvent = async (eventId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deleteCalendarEvent(eventId);
      if (success) {
        // Remove the event from state
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      }
      return success;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      setError('Failed to delete calendar event');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Public method to refresh all data
  const refreshCalendarData = async () => {
    console.log('Refreshing all calendar data...');
    
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping refresh');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel
      const [eventsPromise, tasksPromise] = await Promise.all([
        getCalendarEvents(viewMode, selectedDate),
        fetchGoogleTaskEvents()
      ]);
      
      // Handle calendar events
      const fetchedEvents = await eventsPromise;
      console.log(`Successfully refreshed ${fetchedEvents.length} calendar events`);
      
      // Handle task events
      const fetchedTaskEvents = await tasksPromise;
      console.log(`Successfully refreshed ${fetchedTaskEvents.length} task events`);
      
      // Combine all events
      const allEvents = [...fetchedEvents, ...fetchedTaskEvents];
      
      // Update the state
      setEvents(allEvents);
      
      // Also check connection status in case it changed
      await checkConnectionStatus();
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
      setError('Failed to refresh calendar data');
      // Don't clear existing events on error
    } finally {
      setIsLoading(false);
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
    setSelectedDate,
    setViewMode,
    addEvent,
    updateEvent,
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