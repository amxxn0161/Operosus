// Script to debug API calls directly
const fetchCalendarEvents = async () => {
  try {
    console.log('Testing direct fetch to calendar API...');
    
    const response = await fetch('https://app2.operosus.com/api/calendar/events', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    
    if (!response.ok) {
      console.error('API Error:', response.statusText);
      return;
    }
    
    const data = await response.json();
    console.log('API Response Data:', JSON.stringify(data, null, 2));
    
    // Try to find events in various possible response formats
    if (data.data?.events) {
      console.log(`Found ${data.data.events.length} events in data.data.events`);
      console.log('First event:', data.data.events[0]);
    } else if (data.events) {
      console.log(`Found ${data.events.length} events in data.events`);
      console.log('First event:', data.events[0]);
    } else if (Array.isArray(data)) {
      console.log(`Found ${data.length} events in array response`);
      console.log('First event:', data[0]);
    } else if (data.data && Array.isArray(data.data)) {
      console.log(`Found ${data.data.length} events in data array`);
      console.log('First event:', data.data[0]);
    } else {
      console.log('Could not find events in response. Response keys:', Object.keys(data));
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
};

// Execute the test function
fetchCalendarEvents();

// Instructions to run this script:
// In the terminal, navigate to the project directory and run:
// node -r esm src/debug-api.js
// 
// If you don't have esm installed, you can install it with:
// npm install esm
//
// This will help debug the API response format directly without going through the React app 