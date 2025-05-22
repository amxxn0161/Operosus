// API Configuration

// Base URL for all API requests - Use relative paths for proxy support
export const API_BASE_URL = '';

// API Endpoints (always use relative paths for better proxy compatibility)
export const ENDPOINTS = {
  PRODUCTIVITY: `/api/productivity`,
  PROFILE: `/profile`,
  AUTH: `/auth`,
  TASKS: `/api/tasks`,
  WORKSHEET: `/api/worksheet`,
  GOOGLE_TASKS: `/api/google/tasklists`,
  GOOGLE_DRIVE: `/api/google/drive`
};

// API Request Timeouts
export const TIMEOUTS = {
  DEFAULT: 10000,    // 10 seconds
  UPLOAD: 30000,     // 30 seconds
  DOWNLOAD: 30000    // 30 seconds
};

// Number of retry attempts
export const MAX_RETRIES = 2; 