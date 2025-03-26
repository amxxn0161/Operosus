// Google API Configuration
export const GOOGLE_API_CONFIG = {
  // Replace these placeholders with your actual client ID from Google Cloud Console
  CLIENT_ID: 'YOUR_GOOGLE_CLIENT_ID',
  API_KEY: 'YOUR_GOOGLE_API_KEY',
  SCOPES: [
    'https://www.googleapis.com/auth/tasks',
    'https://www.googleapis.com/auth/tasks.readonly',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  DISCOVERY_DOCS: [
    'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
  ],
};

export default GOOGLE_API_CONFIG; 