import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { 
  getCalendarEvents, 
  CalendarEvent, 
  connectGoogleCalendar,
  isGoogleCalendarConnected,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} from '../services/calendarService';
import { useAuth } from './AuthContext';

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
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
  updateEvent: (eventId: string, event: Partial<Omit<CalendarEvent, 'id'>>) => Promise<CalendarEvent>;
  removeEvent: (eventId: string) => Promise<boolean>;
  refreshCalendarData: () => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
      
      // Fetch events using the updated getCalendarEvents function
      const fetchedEvents = await getCalendarEvents(viewMode, selectedDate);
      
      console.log(`Successfully fetched ${fetchedEvents.length} calendar events`);
      
      // Check if we got any events back
      if (fetchedEvents.length === 0) {
        console.log('No events returned from API, but this might be expected based on date range');
      } else {
        console.log(`First event title: ${fetchedEvents[0].title}, start: ${fetchedEvents[0].start}`);
      }
      
      // Update state with the fetched events
      setEvents(fetchedEvents);
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
  const addEvent = async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Log the event data being sent, including attendees if present
      console.log('Creating event with event data:', JSON.stringify(event, null, 2));
      
      if (event.attendees) {
        console.log(`Event has ${event.attendees.length} attendees:`, 
          event.attendees.map(a => a.email).join(', '));
      } else {
        console.log('Event has no attendees array defined');
      }
      
      const newEvent = await createCalendarEvent('primary', event);
      
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

  // Refresh all calendar data
  const refreshCalendarData = async () => {
    await checkConnectionStatus();
    await fetchEventsForViewMode();
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