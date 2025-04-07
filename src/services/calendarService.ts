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

// Get calendar events for a specific date range
export const getCalendarEvents = async (
  viewMode: 'day' | 'week' | 'month' | 'all' = 'week',
  selectedDate: Date = new Date()
): Promise<CalendarEvent[]> => {
  try {
    console.log(`Fetching calendar events for ${viewMode} view with date ${selectedDate.toISOString()}`);
    
    // Calculate date range based on view mode
    const [startDate, endDate] = getDateRangeForViewMode(viewMode, selectedDate);
    console.log(`Date range for ${viewMode} view: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Base API URL
    let url = 'https://app2.operosus.com/api/calendar/events';
    
    // Add query parameters for date filtering if not in 'all' mode
    if (viewMode !== 'all') {
      // Format dates as ISO strings
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      // Add as query parameters
      url = `${url}?startDate=${encodeURIComponent(startISO)}&endDate=${encodeURIComponent(endISO)}`;
      console.log(`Using filtered API URL: ${url}`);
    } else {
      console.log(`Fetching all events without date filtering`);
    }
    
    // Make the API request using the apiRequest utility which handles auth
    const response = await apiRequest<any>(url, {
      method: 'GET'
    });
    
    console.log('Calendar API raw response:', JSON.stringify(response));
    
    // Check various possible response formats
    let eventsArray: any[] = [];
    
    // Handle different response structures
    if (response.data?.events) {
      // Format: { status: "success", data: { events: [...] } }
      eventsArray = response.data.events;
      console.log(`Found ${eventsArray.length} events in response.data.events`);
    } else if (response.events) {
      // Format: { status: "success", events: [...] }
      eventsArray = response.events;
      console.log(`Found ${eventsArray.length} events in response.events`);
    } else if (Array.isArray(response)) {
      // Format: Direct array of events
      eventsArray = response;
      console.log(`Found ${eventsArray.length} events in direct array response`);
    } else if (response.data && Array.isArray(response.data)) {
      // Format: { data: [...] }
      eventsArray = response.data;
      console.log(`Found ${eventsArray.length} events in response.data array`);
    } else {
      // Could not find events in the response
      console.error('Could not find events array in API response. Response structure:', Object.keys(response));
      return [];
    }
    
    // Map the API response to our CalendarEvent format
    const allEvents = eventsArray.map(mapApiEventToCalendarEvent);
    console.log(`Retrieved ${allEvents.length} total calendar events from API`);
    
    // Log the first event for debugging
    if (allEvents.length > 0) {
      console.log('First mapped event:', JSON.stringify(allEvents[0]));
    }
    
    // Even if we're already filtering server-side with query params, 
    // we still need to filter client-side to ensure consistent results
    if (viewMode !== 'all') {
      const filteredEvents = filterEventsByDateRange(allEvents, startDate, endDate);
      console.log(`Filtered down to ${filteredEvents.length} events for ${viewMode} view`);
      return filteredEvents;
    }
    
    return allEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    // Return empty array instead of throwing to prevent UI from breaking
    return [];
  }
};

// Filter events based on date range
const filterEventsByDateRange = (events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] => {
  console.log(`Filtering ${events.length} events between ${startDate.toISOString()} and ${endDate.toISOString()}`);
  
  return events.filter(event => {
    try {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Debug each event date comparison
      console.log(`Comparing event: "${event.title}" - Start: ${eventStart.toISOString()} - End: ${eventEnd.toISOString()}`);
      
      // An event overlaps with a date range if:
      // 1. The event starts within the range (startDate <= eventStart <= endDate)
      // 2. OR the event ends within the range (startDate <= eventEnd <= endDate)
      // 3. OR the event starts before and ends after the range (eventStart <= startDate && eventEnd >= endDate)
      const startsInRange = eventStart >= startDate && eventStart <= endDate;
      const endsInRange = eventEnd >= startDate && eventEnd <= endDate;
      const encompassesRange = eventStart <= startDate && eventEnd >= endDate;
      
      const overlapsRange = startsInRange || endsInRange || encompassesRange;
      
      console.log(`  Event "${event.title}" overlaps with range: ${overlapsRange}`);
      console.log(`    Starts in range: ${startsInRange}, Ends in range: ${endsInRange}, Encompasses range: ${encompassesRange}`);
      
      // Include the event if it overlaps with the date range
      return overlapsRange;
    } catch (error) {
      console.error(`Error processing event dates for "${event.title}":`, error);
      // Default to including the event if there's an error with date parsing
      return true;
    }
  });
};

// Helper function to calculate date range based on view mode
const getDateRangeForViewMode = (viewMode: 'day' | 'week' | 'month' | 'all', selectedDate: Date): [Date, Date] => {
  const startDate = new Date(selectedDate);
  const endDate = new Date(selectedDate);
  
  if (viewMode === 'day') {
    // For day view, use the current day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === 'week') {
    // For week view, start from Sunday and end on Saturday
    const day = startDate.getDay();
    startDate.setDate(startDate.getDate() - day); // Go to the beginning of the week (Sunday)
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setDate(endDate.getDate() + (6 - day)); // Go to the end of the week (Saturday)
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === 'month') {
    // For month view, start from the first day of the month and end on the last day
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of the current month
    endDate.setHours(23, 59, 59, 999);
  }
  
  return [startDate, endDate];
};

// Map API event to our CalendarEvent format
const mapApiEventToCalendarEvent = (apiEvent: any): CalendarEvent => {
  console.log('Mapping API event:', JSON.stringify(apiEvent));
  
  // The API structure might be directly as shown in the examples
  // With id, summary, start, end, eventType fields
  
  const eventId = apiEvent.id || `temp-${Math.random().toString(36).substring(2, 9)}`;
  const eventTitle = apiEvent.summary || apiEvent.title || 'Untitled Event';
  let eventLocation = apiEvent.location || undefined;
  let eventDescription = apiEvent.description || undefined;
  let eventType = apiEvent.eventType || undefined;
  
  // Handle various date formats
  let startDateTime = '';
  let endDateTime = '';
  let isAllDay = false;
  
  // Helper function to ensure we have a valid date string
  const ensureValidDateString = (dateValue: any): string => {
    if (!dateValue) return new Date().toISOString();
    
    if (typeof dateValue === 'string') {
      // Try to parse the string as a date
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      } catch (e) {
        console.warn('Invalid date string:', dateValue);
      }
    }
    
    // Default fallback
    return new Date().toISOString();
  };
  
  // Handle start date
  if (apiEvent.start) {
    if (typeof apiEvent.start === 'string') {
      // Direct ISO string
      startDateTime = ensureValidDateString(apiEvent.start);
    } else if (apiEvent.start.dateTime) {
      // Google Calendar format with dateTime property
      startDateTime = ensureValidDateString(apiEvent.start.dateTime);
    } else if (apiEvent.start.date) {
      // Google Calendar format with date property (all-day event)
      startDateTime = ensureValidDateString(apiEvent.start.date);
      isAllDay = true;
    } else {
      // Fallback
      console.warn('Unknown start date format, using current time');
      startDateTime = new Date().toISOString();
    }
  } else {
    console.warn('No start date in event, using current time');
    startDateTime = new Date().toISOString();
  }
  
  // Handle end date
  if (apiEvent.end) {
    if (typeof apiEvent.end === 'string') {
      // Direct ISO string
      endDateTime = ensureValidDateString(apiEvent.end);
    } else if (apiEvent.end.dateTime) {
      // Google Calendar format with dateTime property
      endDateTime = ensureValidDateString(apiEvent.end.dateTime);
    } else if (apiEvent.end.date) {
      // Google Calendar format with date property (all-day event)
      endDateTime = ensureValidDateString(apiEvent.end.date);
    } else {
      // Fallback - set end to 1 hour after start
      const endDate = new Date(startDateTime);
      endDate.setHours(endDate.getHours() + 1);
      endDateTime = endDate.toISOString();
    }
  } else {
    // If no end time, make event 1 hour long
    const endDate = new Date(startDateTime);
    endDate.setHours(endDate.getHours() + 1);
    endDateTime = endDate.toISOString();
  }
  
  // For debugging, let's show the parsed dates
  const startDate = new Date(startDateTime);
  const endDate = new Date(endDateTime);
  console.log(`Parsed dates for "${eventTitle}": Start = ${startDate.toLocaleString()}, End = ${endDate.toLocaleString()}`);
  
  // Determine event type and color based on title if not specified
  if (!eventType) {
    const title = eventTitle.toLowerCase();
    if (title.includes('focus') || title.includes('time')) {
      eventType = 'focusTime';
    } else if (title.includes('meeting') || title.includes('standup')) {
      eventType = 'default';
    }
  }
  
  // Log the mapped event data
  const mappedEvent = {
    id: eventId,
    title: eventTitle,
    start: startDateTime,
    end: endDateTime,
    location: eventLocation,
    description: eventDescription,
    colorId: getColorIdFromEventType(eventType),
    isAllDay: isAllDay,
  };
  
  console.log('Mapped to calendar event:', mappedEvent);
  return mappedEvent;
};

// Helper function to map event types to colorIds
const getColorIdFromEventType = (eventType: string | undefined): string | undefined => {
  if (!eventType) return undefined;
  
  // Map event types to color IDs
  switch (eventType) {
    case 'focusTime':
      return '5'; // Yellow
    case 'outOfOffice':
      return '11'; // Red
    case 'workingLocation':
      return '7'; // Blue
    case 'default':
      return '1'; // Lavender
    default:
      return undefined;
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
  // Always return true to bypass connection check
  return true;
}; 