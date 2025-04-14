import { apiRequest, ApiOptions } from './apiUtils';

export interface ConferenceEntryPoint {
  entryPointType: 'video' | 'phone' | 'more' | string;
  uri: string;
  label?: string;
  pin?: string | null;
  accessCode?: string | null;
  meetingCode?: string | null;
  passcode?: string | null;
  password?: string | null;
}

export interface ConferenceSolution {
  name?: string;
  iconUri?: string;
}

export interface ConferenceData {
  entryPoints?: ConferenceEntryPoint[];
  conferenceSolution?: ConferenceSolution;
  conferenceId?: string;
  notes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  colorId?: string;
  isAllDay?: boolean;
  eventType?: string;
  taskListId?: string;
  hasExplicitTime?: boolean;
  
  // API-specific fields that we pass through
  summary?: string;
  creator?: {
    email?: string;
    displayName?: string | null;
  };
  organizer?: {
    email?: string;
    displayName?: string | null;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string | null;
    responseStatus?: string;
    organizer?: boolean;
    self?: boolean;
    resource?: boolean;
    optional?: boolean;
    comment?: string;
  }>;
  htmlLink?: string;
  status?: string;
  visibility?: string | null;
  recurringEventId?: string;
  recurrence?: string[]; // For recurring event patterns (RRULE, EXRULE, etc.)
  
  // Conference data fields - Google Meet integration
  hangoutLink?: string; // Direct link to Google Meet
  conferenceData?: ConferenceData; // Detailed conference data
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
    
    // Store events in localStorage for fallback retrieval
    try {
      localStorage.setItem('calendarEvents', JSON.stringify(eventsArray));
      console.log(`Stored ${eventsArray.length} events in localStorage for fallback access`);
    } catch (storageError) {
      console.error('Failed to store events in localStorage:', storageError);
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
  // API uses 'summary' field for the event title
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

  // Handle conference data (Google Meet link)
  let conferenceData = undefined;
  let hangoutLink = undefined;

  // Extract conferenceData from different possible locations in the API response
  if (apiEvent.conferenceData) {
    // Direct conference data
    conferenceData = apiEvent.conferenceData;
    console.log('Found conferenceData in event object');
  } else if (apiEvent.data?.event?.conferenceData) {
    // Nested in data.event
    conferenceData = apiEvent.data.event.conferenceData;
    console.log('Found conferenceData in data.event object');
  }

  // Extract hangoutLink from different possible locations in the API response
  if (apiEvent.hangoutLink) {
    // Direct hangoutLink
    hangoutLink = apiEvent.hangoutLink;
    console.log('Found hangoutLink in event object:', hangoutLink);
  } else if (apiEvent.data?.event?.hangoutLink) {
    // Nested in data.event
    hangoutLink = apiEvent.data.event.hangoutLink;
    console.log('Found hangoutLink in data.event object:', hangoutLink);
  }
  
  // Log the mapped event data
  const mappedEvent = {
    id: eventId,
    title: eventTitle,  // Map 'summary' from API to 'title' in our model
    start: startDateTime,
    end: endDateTime,
    location: eventLocation,
    description: eventDescription,
    colorId: getColorIdFromEventType(eventType),
    isAllDay: isAllDay,
    // Pass through additional API fields for the EventDetailsPopup
    ...(apiEvent.summary && { summary: apiEvent.summary }),
    ...(apiEvent.creator && { creator: apiEvent.creator }),
    ...(apiEvent.organizer && { organizer: apiEvent.organizer }),
    ...(apiEvent.attendees && { attendees: apiEvent.attendees }),
    ...(apiEvent.htmlLink && { htmlLink: apiEvent.htmlLink }),
    ...(apiEvent.status && { status: apiEvent.status }),
    ...(apiEvent.visibility !== undefined && { visibility: apiEvent.visibility }),
    ...(apiEvent.recurringEventId && { recurringEventId: apiEvent.recurringEventId }),
    ...(apiEvent.eventType && { eventType: apiEvent.eventType }),
    ...(hangoutLink && { hangoutLink: hangoutLink }),
    ...(conferenceData && { conferenceData: conferenceData })
  };
  
  console.log('Mapped to calendar event:', mappedEvent);
  return mappedEvent;
};

// Helper function to map event types to colorIds
const getColorIdFromEventType = (eventType: string | undefined): string | undefined => {
  if (!eventType) return undefined;
  
  // Map event types to color IDs - using more distinct colors
  switch (eventType) {
    case 'focusTime':
      return '5'; // Yellow
    case 'outOfOffice':
      return '11'; // Red
    case 'workingLocation':
      return '2'; // Bright green
    case 'default':
      return '9'; // Dark blue
    default:
      return undefined;
  }
};

// Create a new calendar event
export const createCalendarEvent = async (
  calendarId: string, 
  event: Omit<CalendarEvent, 'id'>,
  addGoogleMeet: boolean = false
): Promise<CalendarEvent> => {
  try {
    console.log('Creating calendar event with full details:', JSON.stringify(event, null, 2));
    console.log('Adding Google Meet:', addGoogleMeet);
    
    const requestBody: any = {
      summary: event.title,
      description: event.description || '',
      location: event.location || '',
      colorId: event.colorId || '',
    };

    // Always initialize attendees as an empty array if not defined
    requestBody.attendees = [];

    // Format start and end dates
    if (event.isAllDay) {
      // For all-day events, use date format without time
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      
      // Format as YYYY-MM-DD for all-day events
      requestBody.start = {
        date: startDate.toISOString().split('T')[0],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      requestBody.end = {
        date: endDate.toISOString().split('T')[0],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } else {
      // For regular events, use dateTime format with timezone
      requestBody.start = {
        dateTime: event.start,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
      
      requestBody.end = {
        dateTime: event.end,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    // Add attendees if they exist
    if (event.attendees && event.attendees.length > 0) {
      console.log('Processing attendees for API request:', JSON.stringify(event.attendees, null, 2));
      
      requestBody.attendees = event.attendees.map(attendee => ({
        email: attendee.email,
        ...(attendee.optional !== undefined && { optional: attendee.optional }),
        ...(attendee.responseStatus && { responseStatus: attendee.responseStatus })
      }));
      
      console.log('Formatted attendees for API request:', JSON.stringify(requestBody.attendees, null, 2));
    } else {
      console.log('No attendees provided for this event');
    }
    
    // Add Google Meet video conferencing if requested
    if (addGoogleMeet) {
      requestBody.conferenceData = {
        createRequest: true
      };
      console.log('Adding Google Meet video conferencing to event');
    }

    console.log(`Final request body for API (${new Date().toISOString()}):`, JSON.stringify(requestBody, null, 2));

    const response = await apiRequest<any>(`/api/calendar/events`, {
      method: 'POST',
      body: requestBody,
    });

    console.log('API response for event creation:', JSON.stringify(response, null, 2));

    // Map the API response back to our CalendarEvent format
    return mapApiEventToCalendarEvent(response);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update an existing calendar event
export const updateCalendarEvent = async (
  eventId: string,
  updatedFields: Partial<Omit<CalendarEvent, 'id'>>,
  attendeeOperations?: {
    add?: Array<{
      email: string;
      optional?: boolean;
      responseStatus?: string;
    }>;
    remove?: string[]; // Array of email addresses to remove
  }
): Promise<CalendarEvent | null> => {
  try {
    console.log(`Updating calendar event with ID: ${eventId}`, JSON.stringify(updatedFields, null, 2));
    
    // Add detailed logging for date/time values
    if (updatedFields.start) {
      console.log('START TIME INPUT VALUES:');
      console.log('Original ISO string:', updatedFields.start);
      console.log('Parsed Date object:', new Date(updatedFields.start));
      console.log('Local string representation:', new Date(updatedFields.start).toString());
      console.log('Local time format:', new Date(updatedFields.start).toLocaleTimeString());
      console.log('UTC ISO string from Date object:', new Date(updatedFields.start).toISOString());
    }
    
    if (updatedFields.end) {
      console.log('END TIME INPUT VALUES:');
      console.log('Original ISO string:', updatedFields.end);
      console.log('Parsed Date object:', new Date(updatedFields.end));
      console.log('Local string representation:', new Date(updatedFields.end).toString());
      console.log('Local time format:', new Date(updatedFields.end).toLocaleTimeString());
      console.log('UTC ISO string from Date object:', new Date(updatedFields.end).toISOString());
    }
    
    if (attendeeOperations) {
      console.log('With attendee operations:', JSON.stringify(attendeeOperations, null, 2));
    }
    
    // URL for updating a specific event - using eventId in path with the correct API endpoint
    const url = `/api/calendar/events/${encodeURIComponent(eventId)}`;
    console.log(`Using update URL: ${url}`);
    
    // Prepare the request body with only the fields that are being updated
    const requestBody: any = {};
    
    // Map summary from our title field if it exists
    if (updatedFields.title) {
      requestBody.summary = updatedFields.title;
    } else if (updatedFields.summary) {
      requestBody.summary = updatedFields.summary;
    }
    
    // Add other fields if they exist in the updated fields
    if (updatedFields.description !== undefined) {
      requestBody.description = updatedFields.description;
    }
    
    if (updatedFields.location !== undefined) {
      requestBody.location = updatedFields.location;
    }
    
    // Use a structure that matches what the Google Calendar API expects
    if (updatedFields.start) {
      if (updatedFields.isAllDay) {
        // For all-day events
        const startDate = new Date(updatedFields.start);
        const dateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Use nested object structure as expected by Google Calendar API
        requestBody.start = {
          date: dateString,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      } else {
        // For regular events with time
        const inputStart = new Date(updatedFields.start);
        
        // Format date manually to preserve local time
        const year = inputStart.getFullYear();
        const month = String(inputStart.getMonth() + 1).padStart(2, '0');
        const day = String(inputStart.getDate()).padStart(2, '0');
        const hours = String(inputStart.getHours()).padStart(2, '0');
        const minutes = String(inputStart.getMinutes()).padStart(2, '0');
        
        // Use nested object structure with proper property names as expected by Google Calendar API
        requestBody.start = {
          dateTime: `${year}-${month}-${day}T${hours}:${minutes}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        console.log('START TIME CONVERSION:');
        console.log('Input Date Object:', inputStart);
        console.log('Structured for API:', requestBody.start);
      }
    }
    
    if (updatedFields.end) {
      if (updatedFields.isAllDay) {
        // For all-day events
        const endDate = new Date(updatedFields.end);
        const dateString = endDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        // Use nested object structure as expected by Google Calendar API
        requestBody.end = {
          date: dateString,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      } else {
        // For regular events with time
        const inputEnd = new Date(updatedFields.end);
        
        // Format date manually to preserve local time
        const year = inputEnd.getFullYear();
        const month = String(inputEnd.getMonth() + 1).padStart(2, '0');
        const day = String(inputEnd.getDate()).padStart(2, '0');
        const hours = String(inputEnd.getHours()).padStart(2, '0');
        const minutes = String(inputEnd.getMinutes()).padStart(2, '0');
        
        // Use nested object structure with proper property names as expected by Google Calendar API
        requestBody.end = {
          dateTime: `${year}-${month}-${day}T${hours}:${minutes}:00`,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        console.log('END TIME CONVERSION:');
        console.log('Input Date Object:', inputEnd);
        console.log('Structured for API:', requestBody.end);
      }
    }
    
    // Include visibility if it's being updated
    if (updatedFields.visibility !== undefined) {
      requestBody.visibility = updatedFields.visibility;
    }
    
    // Include attendees if they're being updated (complete replacement)
    if (updatedFields.attendees) {
      requestBody.attendees = updatedFields.attendees.map(attendee => ({
        email: attendee.email,
        // Include other attendee fields if available
        ...(attendee.displayName && { displayName: attendee.displayName }),
        ...(attendee.responseStatus && { responseStatus: attendee.responseStatus }),
        ...(attendee.optional !== undefined && { optional: attendee.optional })
      }));
    }
    
    // If attendeeOperations is provided, include it in the request
    if (attendeeOperations) {
      requestBody.attendeeOperations = {};
      
      // Handle adding attendees
      if (attendeeOperations.add && attendeeOperations.add.length > 0) {
        requestBody.attendeeOperations.add = attendeeOperations.add.map(attendee => ({
          email: attendee.email,
          ...(attendee.optional !== undefined && { optional: attendee.optional }),
          ...(attendee.responseStatus && { responseStatus: attendee.responseStatus })
        }));
      }
      
      // Handle removing attendees
      if (attendeeOperations.remove && attendeeOperations.remove.length > 0) {
        requestBody.attendeeOperations.remove = attendeeOperations.remove;
      }
      
      console.log('Including attendee operations in request:', 
        JSON.stringify(requestBody.attendeeOperations, null, 2));
    }
    
    console.log(`Final request body for API (${new Date().toISOString()}):`, JSON.stringify(requestBody, null, 2));
    
    // Make the API request
    const response = await apiRequest<any>(url, {
      method: 'PUT',
      body: requestBody
    });
    
    console.log('Event update response:', response);
    
    // Check if the update was successful
    if (response.status === 'success' && response.data?.event) {
      console.log('Event updated successfully:', response.data.event);
      
      // Fetch the updated event to get all fields
      const updatedEvent = await getCalendarEventById(eventId);
      return updatedEvent;
    } else {
      console.error('Failed to update event:', response);
      return null;
    }
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return null;
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (
  eventId: string
): Promise<boolean> => {
  try {
    console.log(`Deleting calendar event with ID: ${eventId}`);
    
    // URL for deleting a specific event - using eventId in path with the correct API endpoint
    const url = `/api/calendar/events/${encodeURIComponent(eventId)}`;
    console.log(`Using delete URL: ${url}`);
    
    // Make the API request
    const response = await apiRequest<any>(url, {
      method: 'DELETE'
    });
    
    console.log('Event deletion response:', response);
    
    // Check if the deletion was successful
    if (response.status === 'success') {
      console.log('Event deleted successfully');
      return true;
    } else {
      console.error('Failed to delete event:', response);
      return false;
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};

// Check if the user has connected their Google Calendar
export const isGoogleCalendarConnected = async (): Promise<boolean> => {
  // Always return true to bypass connection check
  return true;
};

// Get a specific calendar event by ID
export const getCalendarEventById = async (eventId: string): Promise<CalendarEvent | null> => {
  try {
    console.log(`Fetching specific event with ID: ${eventId}`);
    
    // URL for getting a specific event with query parameter
    const url = `/api/calendar/events?eventId=${encodeURIComponent(eventId)}`;
    console.log(`Using get URL: ${url}`);
    
    // Make the API request
    const response = await apiRequest<any>(url, {
      method: 'GET'
    });
    
    console.log('Event API response structure:', 
      Object.keys(response), 
      response.data ? `data keys: ${Object.keys(response.data)}` : 'no data field',
      Array.isArray(response) ? `array length: ${response.length}` : 'not an array'
    );
    
    // Extract the event data from the response
    let eventData: any = null;
    
    // Based on the backend code, when fetching a single event, the structure should be:
    // { status: 'success', data: { event: {...}, isIndividualEvent: true } }
    
    // First check if we have the expected structure for a single event
    if (response.status === 'success' && response.data?.event && response.data?.isIndividualEvent === true) {
      console.log('Found event in the expected single event structure');
      eventData = response.data.event;
    } 
    // Handle other possible response formats as fallbacks
    else if (response.data?.event) {
      // Direct event object
      eventData = response.data.event;
      console.log('Found event in data.event');
    } else if (response.event) {
      // Direct event object at top level
      eventData = response.event;
      console.log('Found event in response.event');
    } else if (response.data?.events) {
      // Find the specific event in the events array
      try {
        eventData = response.data.events.find((event: any) => event.id === eventId);
        console.log(`Found event in data.events array with ID ${eventId}:`, eventData ? 'Yes' : 'No');
      } catch (findError) {
        console.error('Error searching in data.events array:', findError);
      }
    } else if (response.events) {
      // Find the specific event in the events array
      try {
        eventData = response.events.find((event: any) => event.id === eventId);
        console.log(`Found event in events array with ID ${eventId}:`, eventData ? 'Yes' : 'No');
      } catch (findError) {
        console.error('Error searching in events array:', findError);
      }
    } else if (Array.isArray(response)) {
      // Find the specific event in the direct array
      try {
        eventData = response.find((event: any) => event.id === eventId);
        console.log(`Found event in direct array with ID ${eventId}:`, eventData ? 'Yes' : 'No');
      } catch (findError) {
        console.error('Error searching in direct array:', findError);
      }
    } else if (response.data && Array.isArray(response.data)) {
      // Find the specific event in data array
      try {
        eventData = response.data.find((event: any) => event.id === eventId);
        console.log(`Found event in data array with ID ${eventId}:`, eventData ? 'Yes' : 'No');
      } catch (findError) {
        console.error('Error searching in data array:', findError);
      }
    } else if (!Array.isArray(response) && typeof response === 'object') {
      // If the response is the event object directly and has matching ID
      if (response.id === eventId) {
        eventData = response;
        console.log('Found event in direct response object');
      }
    }
    
    // If we didn't find the event via API or it's not the correct event, try to get it from localStorage
    if (!eventData || eventData.id !== eventId) {
      console.log('Correct event not found via API, checking localStorage');
      try {
        const storedEvents = localStorage.getItem('calendarEvents');
        if (storedEvents) {
          const parsedEvents = JSON.parse(storedEvents);
          if (Array.isArray(parsedEvents)) {
            eventData = parsedEvents.find(event => event.id === eventId);
            if (eventData) {
              console.log('Found correct event in localStorage:', eventData);
            }
          }
        }
      } catch (storageError) {
        console.error('Error accessing localStorage:', storageError);
      }
    }
    
    // Check if we have the correct event data
    if (!eventData) {
      console.error(`Event with ID ${eventId} not found in API response or localStorage`);
      return null;
    }
    
    // Final verification check
    if (eventData.id !== eventId) {
      console.error(`Found event data but ID mismatch: expected ${eventId}, got ${eventData.id}`);
      return null;
    }
    
    console.log(`Successfully extracted correct event with ID ${eventId}:`, eventData);
    
    // Map the API response to our CalendarEvent format
    return mapApiEventToCalendarEvent(eventData);
  } catch (error) {
    console.error(`Error fetching calendar event with ID ${eventId}:`, error);
    return null;
  }
};

// Respond to a calendar event invitation (accept, decline, or tentative)
export const respondToEventInvitation = async (
  eventId: string,
  response: 'accepted' | 'declined' | 'tentative',
  note?: string,
  responseScope?: 'single' | 'following' | 'all'
): Promise<boolean> => {
  try {
    console.log(`Responding to event ${eventId} with response: ${response}, note: ${note || 'none'}, scope: ${responseScope || 'single'}`);
    
    // URL for responding to an event invitation
    const url = `/api/calendar/events/${encodeURIComponent(eventId)}/respond`;
    console.log(`Using response URL: ${url}`);
    
    // Prepare the request body with response status and optional note
    const requestBody: {
      response: string;
      note?: string;
      responseScope?: string;
    } = { 
      response 
    };
    
    // Add note if provided
    if (note) {
      requestBody.note = note;
    }
    
    // Add responseScope if provided, otherwise it defaults to 'single' on the server
    if (responseScope) {
      requestBody.responseScope = responseScope;
    }
    
    // Make the API request - using PUT method as required by the endpoint
    const apiResponse = await apiRequest<any>(url, {
      method: 'PUT',
      body: requestBody
    }).catch(error => {
      console.error('API request failed with error:', error);
      throw error;
    });
    
    console.log('Event response API response:', apiResponse);
    
    // Check if the response was successful
    if (apiResponse.status === 'success') {
      console.log('Event response updated successfully');
      return true;
    } else {
      console.error('Failed to update event response:', apiResponse);
      return false;
    }
  } catch (error) {
    console.error(`Error responding to event invitation ${eventId}:`, error);
    return false;
  }
};

// Helper function to add attendees to an existing event
export const addAttendeesToEvent = async (
  eventId: string,
  attendeesToAdd: Array<{
    email: string;
    optional?: boolean;
    responseStatus?: string;
  }>
): Promise<CalendarEvent | null> => {
  try {
    console.log(`Adding ${attendeesToAdd.length} attendees to event ${eventId}`);
    
    // Use the updateCalendarEvent function with attendeeOperations
    return await updateCalendarEvent(
      eventId,
      {}, // No other fields to update
      {
        add: attendeesToAdd
      }
    );
  } catch (error) {
    console.error('Error adding attendees to event:', error);
    return null;
  }
};

// Helper function to remove attendees from an existing event
export const removeAttendeesFromEvent = async (
  eventId: string,
  emailsToRemove: string[]
): Promise<CalendarEvent | null> => {
  try {
    console.log(`Removing ${emailsToRemove.length} attendees from event ${eventId}`);
    
    // Use the updateCalendarEvent function with attendeeOperations
    return await updateCalendarEvent(
      eventId,
      {}, // No other fields to update
      {
        remove: emailsToRemove
      }
    );
  } catch (error) {
    console.error('Error removing attendees from event:', error);
    return null;
  }
}; 