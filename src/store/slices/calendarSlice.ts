import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  getCalendarEvents, 
  CalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  addAttendeesToEvent,
  removeAttendeesFromEvent
} from '../../services/calendarService';

interface CalendarState {
  events: CalendarEvent[];
  lastFetched: number | null;
  cacheDuration: number;
  loading: boolean;
  error: string | null;
  viewMode: 'day' | 'week' | 'month' | 'all';
  selectedDate: string; // ISO string of the date
  cachedStartDate: string | null; // Store the start date of the cached range
  cachedEndDate: string | null; // Store the end date of the cached range
}

const initialState: CalendarState = {
  events: [],
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000, // 5 minutes default
  loading: false,
  error: null,
  viewMode: 'week',
  selectedDate: new Date().toISOString(),
  cachedStartDate: null,
  cachedEndDate: null
};

// Helper to calculate date range for a given view mode and date
const getDateRangeForViewMode = (viewMode: 'day' | 'week' | 'month' | 'all', date: Date): [Date, Date] => {
  const startDate = new Date(date);
  const endDate = new Date(date);
  
  if (viewMode === 'day') {
    // For day view, use the whole day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === 'week') {
    // For week view, go from Sunday to Saturday
    const day = startDate.getDay();
    startDate.setDate(startDate.getDate() - day); // Go to beginning of week (Sunday)
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setDate(startDate.getDate() + 6); // Go to end of week (Saturday)
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === 'month') {
    // For month view, use the whole month
    startDate.setDate(1); // First day of month
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setMonth(endDate.getMonth() + 1); // Go to next month
    endDate.setDate(0); // Last day of current month
    endDate.setHours(23, 59, 59, 999);
  } else {
    // For 'all' view, use a large date range
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  return [startDate, endDate];
};

// Helper to check if two date ranges overlap
const dateRangesOverlap = (
  range1Start: Date, 
  range1End: Date, 
  range2Start: Date, 
  range2End: Date
): boolean => {
  return (
    (range1Start <= range2End && range1End >= range2Start) || 
    (range2Start <= range1End && range2End >= range1Start)
  );
};

export const fetchCalendarEvents = createAsyncThunk(
  'calendar/fetchEvents',
  async ({ 
    viewMode, 
    selectedDate 
  }: { 
    viewMode: 'day' | 'week' | 'month' | 'all'; 
    selectedDate: Date 
  }, { getState, rejectWithValue }) => {
    try {
      // Check if cache is still valid
      const state = getState() as { calendar: CalendarState };
      const now = Date.now();
      
      // Calculate the new date range based on the selected date and view mode
      const [newStartDate, newEndDate] = getDateRangeForViewMode(viewMode, selectedDate);
      
      // We should refresh the cache if:
      // 1. The view mode changed
      // 2. The new date range doesn't overlap with the cached range
      // 3. The cache duration expired
      const sameViewMode = state.calendar.viewMode === viewMode;
      const cacheTimeValid = state.calendar.lastFetched && 
                             now - state.calendar.lastFetched < state.calendar.cacheDuration;
      
      let dateRangeOverlaps = false;
      if (state.calendar.cachedStartDate && state.calendar.cachedEndDate) {
        // Check if the new date range overlaps with the cached date range
        dateRangeOverlaps = dateRangesOverlap(
          newStartDate, 
          newEndDate,
          new Date(state.calendar.cachedStartDate),
          new Date(state.calendar.cachedEndDate)
        );
      }
      
      // If all conditions are met, use the cached events
      if (
        state.calendar.lastFetched && 
        state.calendar.events.length > 0 && 
        cacheTimeValid &&
        sameViewMode &&
        dateRangeOverlaps
      ) {
        console.log('Using cached calendar events - cache is still valid');
        return {
          events: state.calendar.events,
          viewMode,
          selectedDate: selectedDate.toISOString(),
          cachedStartDate: state.calendar.cachedStartDate,
          cachedEndDate: state.calendar.cachedEndDate
        };
      }
      
      console.log('Fetching Calendar events from API (cache expired or not available)');
      
      // Create an AbortController with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      try {
        // Fetch calendar events
        const events = await getCalendarEvents(viewMode, selectedDate, { signal: controller.signal });
        return {
          events,
          viewMode,
          selectedDate: selectedDate.toISOString(),
          cachedStartDate: newStartDate.toISOString(),
          cachedEndDate: newEndDate.toISOString()
        };
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return rejectWithValue('Failed to fetch calendar events');
    }
  }
);

// Add event to calendar
export const addCalendarEvent = createAsyncThunk(
  'calendar/addEvent',
  async ({ 
    event, 
    addGoogleMeet = false 
  }: { 
    event: Omit<CalendarEvent, 'id'>;
    addGoogleMeet?: boolean;
  }, { rejectWithValue }) => {
    try {
      const newEvent = await createCalendarEvent('primary', event, addGoogleMeet);
      return newEvent;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return rejectWithValue('Failed to create calendar event');
    }
  }
);

// Update an event
export const updateEvent = createAsyncThunk(
  'calendar/updateEvent',
  async ({ 
    eventId, 
    eventUpdate,
    responseScope
  }: { 
    eventId: string;
    eventUpdate: Partial<Omit<CalendarEvent, 'id'>>;
    responseScope?: 'single' | 'all';
  }, { rejectWithValue }) => {
    try {
      const updatedEvent = await updateCalendarEvent(eventId, eventUpdate, undefined, responseScope);
      if (!updatedEvent) {
        return rejectWithValue('Failed to update calendar event');
      }
      return updatedEvent;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return rejectWithValue('Failed to update calendar event');
    }
  }
);

// Delete an event
export const deleteEvent = createAsyncThunk(
  'calendar/deleteEvent',
  async ({ 
    eventId, 
    responseScope 
  }: { 
    eventId: string;
    responseScope?: 'single' | 'all';
  }, { rejectWithValue }) => {
    try {
      const success = await deleteCalendarEvent(eventId, responseScope);
      if (!success) {
        return rejectWithValue('Failed to delete calendar event');
      }
      return eventId;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return rejectWithValue('Failed to delete calendar event');
    }
  }
);

// Add attendees to event
export const addEventAttendees = createAsyncThunk(
  'calendar/addAttendees',
  async ({ 
    eventId, 
    attendees 
  }: { 
    eventId: string;
    attendees: Array<{ email: string, optional?: boolean }>;
  }, { rejectWithValue }) => {
    try {
      const updatedEvent = await addAttendeesToEvent(eventId, attendees);
      if (!updatedEvent) {
        return rejectWithValue('Failed to add attendees to event');
      }
      return updatedEvent;
    } catch (error) {
      console.error('Error adding attendees to event:', error);
      return rejectWithValue('Failed to add attendees to event');
    }
  }
);

// Remove attendees from event
export const removeEventAttendees = createAsyncThunk(
  'calendar/removeAttendees',
  async ({ 
    eventId, 
    emails 
  }: { 
    eventId: string;
    emails: string[];
  }, { rejectWithValue }) => {
    try {
      const updatedEvent = await removeAttendeesFromEvent(eventId, emails);
      if (!updatedEvent) {
        return rejectWithValue('Failed to remove attendees from event');
      }
      return updatedEvent;
    } catch (error) {
      console.error('Error removing attendees from event:', error);
      return rejectWithValue('Failed to remove attendees from event');
    }
  }
);

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    // Regular reducers
    setCacheDuration: (state, action: PayloadAction<number>) => {
      state.cacheDuration = action.payload;
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
      state.cachedStartDate = null;
      state.cachedEndDate = null;
    },
    setSelectedDate: (state, action: PayloadAction<Date>) => {
      state.selectedDate = action.payload.toISOString();
    },
    setViewMode: (state, action: PayloadAction<'day' | 'week' | 'month' | 'all'>) => {
      state.viewMode = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCalendarEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.events = action.payload.events;
        state.viewMode = action.payload.viewMode;
        state.selectedDate = action.payload.selectedDate;
        state.cachedStartDate = action.payload.cachedStartDate;
        state.cachedEndDate = action.payload.cachedEndDate;
        state.lastFetched = Date.now();
        state.loading = false;
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Add event reducers
      .addCase(addCalendarEvent.fulfilled, (state, action) => {
        state.events.push(action.payload);
      })
      
      // Update event reducers
      .addCase(updateEvent.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      
      // Delete event reducers
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.events = state.events.filter(event => event.id !== action.payload);
      })
      
      // Add attendees reducers
      .addCase(addEventAttendees.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      })
      
      // Remove attendees reducers
      .addCase(removeEventAttendees.fulfilled, (state, action) => {
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
          state.events[index] = action.payload;
        }
      });
  }
});

export const { 
  setCacheDuration, 
  invalidateCache,
  setSelectedDate,
  setViewMode
} = calendarSlice.actions;

export default calendarSlice.reducer; 