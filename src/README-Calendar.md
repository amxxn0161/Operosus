# Calendar API Integration

## Overview

The Calendar feature in Productivity Pulse now uses a real API endpoint for fetching calendar events. Mock data functionality has been completely removed, and the application now exclusively retrieves data from the following endpoint:

```
API Endpoint: ${process.env.REACT_APP_API_TARGET || 'https://app2.operosus.com'}/api/calendar/events
```

## Key Features

- **Real-time Calendar Events**: All calendar events are fetched directly from the API endpoint.
- **View Filtering**: Events are filtered based on the selected view mode (day, week, month, all).
- **Integration with Tasks**: Calendar view shows both calendar events and tasks with due dates.

## Implementation Details

The calendar integration is implemented through the following components:

1. **CalendarService**: The core service that handles API requests and data formatting.
   - `getCalendarEvents()`: Fetches events from the API and filters them based on the selected view mode.
   - `filterEventsByDateRange()`: Helper function to filter events for the current view.
   - `mapApiEventToCalendarEvent()`: Maps API response objects to our internal format.

2. **CalendarContext**: Provides calendar data and functions to all components.
   - Manages calendar state including events, selected date, and view mode.
   - Handles refreshing of calendar data.
   - Provides methods for interacting with events (add, update, delete).

3. **CalendarView**: The UI component that displays calendar events.
   - Supports multiple view modes: day, week, month, and all events.
   - Integrates with tasks to show them alongside calendar events.
   - Provides navigation and refresh functionality.

## API Response Format

The API returns events in the following format:

```json
{
  "status": "success",
  "data": {
    "events": [
      {
        "id": "unique_id",
        "summary": "Event Title",
        "description": "Event description",
        "start": {
          "dateTime": "2023-06-01T09:00:00Z",
          "timeZone": "UTC"
        },
        "end": {
          "dateTime": "2023-06-01T10:00:00Z",
          "timeZone": "UTC"
        },
        "location": "Meeting Room",
        "eventType": "focusTime"
      }
    ]
  }
}
```

## Event Filtering

Events are filtered based on the selected view mode:

- **Day View**: Shows events for the selected day only.
- **Week View**: Shows events from Sunday to Saturday of the week containing the selected date.
- **Month View**: Shows all events within the month of the selected date.
- **All View**: Shows all available events without date filtering.

## Integration with Tasks

Tasks with due dates are converted to calendar events and displayed alongside regular calendar events. Tasks are visually distinguishable by:

- A task icon
- Color coding based on priority (high, medium, low)
- Status indication (completed/not completed)

## Usage

To use the calendar in your application:

```jsx
import { useCalendar } from '../contexts/CalendarContext';

function MyComponent() {
  const { 
    events, 
    selectedDate,
    viewMode,
    setSelectedDate,
    setViewMode,
    refreshCalendarData 
  } = useCalendar();
  
  // Use the calendar data and functions
  
  return (
    // Your UI components
  );
}
``` 