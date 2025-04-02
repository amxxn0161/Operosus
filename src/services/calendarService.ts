import { apiRequest, ApiOptions } from './apiUtils';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  colorId?: string;
  isAllDay?: boolean;
}

export interface CalendarList {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  colorId?: string;
}

// Function to connect to Google Calendar
export const connectGoogleCalendar = async (): Promise<boolean> => {
  try {
    // This will initiate the OAuth flow through our backend
    const response = await apiRequest<{ success: boolean }>('/api/calendar/connect', {
      method: 'GET'
    });
    return response.success;
  } catch (error) {
    console.error('Error connecting to Google Calendar:', error);
    throw error;
  }
};

// Get list of user's calendars
export const getCalendarList = async (): Promise<CalendarList[]> => {
  try {
    const response = await apiRequest<{ calendars: CalendarList[] }>('/api/calendar/list', {
      method: 'GET'
    });
    return response.calendars;
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    throw error;
  }
};

// Get calendar events for a specific date range
export const getCalendarEvents = async (
  calendarId: string = 'primary',
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> => {
  try {
    const response = await apiRequest<{ events: CalendarEvent[] }>(`/api/calendar/events`, {
      method: 'POST',
      body: {
        calendarId,
        startDate,
        endDate
      }
    });
    return response.events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Create a new calendar event
export const createCalendarEvent = async (
  calendarId: string = 'primary',
  event: Omit<CalendarEvent, 'id'>
): Promise<CalendarEvent> => {
  try {
    const response = await apiRequest<{ event: CalendarEvent }>(`/api/calendar/events/create`, {
      method: 'POST',
      body: {
        calendarId,
        event
      }
    });
    return response.event;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update an existing calendar event
export const updateCalendarEvent = async (
  calendarId: string = 'primary',
  eventId: string,
  event: Partial<Omit<CalendarEvent, 'id'>>
): Promise<CalendarEvent> => {
  try {
    const response = await apiRequest<{ event: CalendarEvent }>(`/api/calendar/events/update`, {
      method: 'POST',
      body: {
        calendarId,
        eventId,
        event
      }
    });
    return response.event;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (
  calendarId: string = 'primary',
  eventId: string
): Promise<boolean> => {
  try {
    const response = await apiRequest<{ success: boolean }>(`/api/calendar/events/delete`, {
      method: 'POST',
      body: {
        calendarId,
        eventId
      }
    });
    return response.success;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};

// Check if the user has connected their Google Calendar
export const isGoogleCalendarConnected = async (): Promise<boolean> => {
  try {
    const response = await apiRequest<{ connected: boolean }>('/api/calendar/status', {
      method: 'GET'
    });
    return response.connected;
  } catch (error) {
    console.error('Error checking Google Calendar connection status:', error);
    return false; // Assume not connected if there's an error
  }
}; 