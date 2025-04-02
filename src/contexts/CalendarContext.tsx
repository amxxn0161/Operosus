import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { 
  getCalendarEvents, 
  getCalendarList, 
  CalendarEvent, 
  CalendarList,
  connectGoogleCalendar,
  isGoogleCalendarConnected,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '../services/calendarService';
import { useAuth } from './AuthContext';

interface CalendarContextType {
  events: CalendarEvent[];
  calendars: CalendarList[];
  selectedDate: Date;
  viewMode: 'day' | 'week' | 'month';
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectCalendar: () => Promise<boolean>;
  fetchEvents: (startDate: Date, endDate: Date) => Promise<void>;
  setSelectedDate: (date: Date) => void;
  setViewMode: (mode: 'day' | 'week' | 'month') => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, event: Partial<Omit<CalendarEvent, 'id'>>) => Promise<CalendarEvent>;
  removeEvent: (eventId: string) => Promise<boolean>;
  refreshCalendarData: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarList[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Function to get start and end dates based on selected date and view mode
  const getDateRange = useCallback((date: Date, mode: 'day' | 'week' | 'month'): [Date, Date] => {
    const start = new Date(date);
    const end = new Date(date);
    
    if (mode === 'day') {
      // For day view, use the current day
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (mode === 'week') {
      // For week view, start from Sunday and end on Saturday
      const day = start.getDay();
      start.setDate(start.getDate() - day); // Go to the beginning of the week (Sunday)
      start.setHours(0, 0, 0, 0);
      
      end.setDate(end.getDate() + (6 - day)); // Go to the end of the week (Saturday)
      end.setHours(23, 59, 59, 999);
    } else if (mode === 'month') {
      // For month view, start from the first day of the month and end on the last day
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      
      end.setMonth(end.getMonth() + 1);
      end.setDate(0); // Last day of the current month
      end.setHours(23, 59, 59, 999);
    }
    
    return [start, end];
  }, []);

  // Check connection status on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkConnectionStatus();
    }
  }, [isAuthenticated]);

  // When the view mode or selected date changes, fetch events
  useEffect(() => {
    if (isAuthenticated && isConnected) {
      const [startDate, endDate] = getDateRange(selectedDate, viewMode);
      fetchEventsForRange(startDate, endDate);
    }
  }, [isAuthenticated, isConnected, selectedDate, viewMode, getDateRange]);

  // Check if Google Calendar is connected
  const checkConnectionStatus = async () => {
    try {
      const connected = await isGoogleCalendarConnected();
      setIsConnected(connected);
      
      if (connected) {
        // If connected, fetch calendar list
        const calendarList = await getCalendarList();
        setCalendars(calendarList);
      }
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
        // Fetch calendars after successful connection
        const calendarList = await getCalendarList();
        setCalendars(calendarList);
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

  // Fetch events for a specific date range
  const fetchEventsForRange = async (startDate: Date, endDate: Date) => {
    if (!isConnected) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Format dates for API
      const formattedStartDate = startDate.toISOString();
      const formattedEndDate = endDate.toISOString();
      
      // Fetch events from the primary calendar
      const fetchedEvents = await getCalendarEvents(
        'primary',
        formattedStartDate,
        formattedEndDate
      );
      
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setError('Failed to fetch calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  // Public method to fetch events (used in components)
  const fetchEvents = async (startDate: Date, endDate: Date) => {
    await fetchEventsForRange(startDate, endDate);
  };

  // Add a new event
  const addEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const newEvent = await createCalendarEvent('primary', event);
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
      const updatedEvent = await updateCalendarEvent('primary', eventId, eventUpdate);
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

  // Remove an event
  const removeEvent = async (eventId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await deleteCalendarEvent('primary', eventId);
      if (success) {
        // Remove the event from state
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
      }
      return success;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      setError('Failed to delete calendar event');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all calendar data
  const refreshCalendarData = async () => {
    await checkConnectionStatus();
    const [startDate, endDate] = getDateRange(selectedDate, viewMode);
    await fetchEventsForRange(startDate, endDate);
  };

  const value: CalendarContextType = {
    events,
    calendars,
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
    refreshCalendarData
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