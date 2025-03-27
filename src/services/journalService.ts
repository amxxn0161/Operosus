import { checkAuthState } from './authService';

export interface JournalEntry {
  id: number;
  user_id: number;
  date: string;
  productivityScore: number;
  meetingScore: number | null;
  hadNoMeetings: number;
  breaksTaken: string;
  focusTime: string;
  supportNeeded: string;
  improvementPlans: string;
  distractions: string[];
  timestamp: string;
  created_at: string;
  updated_at: string;
}

// Fetch user journal entries from the API
export const fetchJournalEntries = async (): Promise<JournalEntry[]> => {
  // Get the auth token from localStorage
  const { token } = checkAuthState();
  
  if (!token) {
    console.error('No auth token available');
    return [];
  }
  
  try {
    const response = await fetch('https://app2.operosus.com/api/productivity', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data as JournalEntry[];
  } catch (error) {
    console.error('Failed to fetch journal entries:', error);
    return [];
  }
};

// Save a journal entry to the API
export const saveJournalEntry = async (entry: Partial<JournalEntry>): Promise<JournalEntry | null> => {
  // Get the auth token from localStorage
  const { token } = checkAuthState();
  
  if (!token) {
    console.error('No auth token available');
    return null;
  }
  
  try {
    // Determine if this is a create or update operation
    const isUpdate = entry.id !== undefined;
    
    let url = 'https://app2.operosus.com/api/productivity';
    let method = 'POST';
    
    if (isUpdate) {
      // For updates, we use PUT and include ID in URL
      url = `https://app2.operosus.com/api/productivity/${entry.id}`;
      method = 'PUT';
    }
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(entry)
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data as JournalEntry;
  } catch (error) {
    console.error('Failed to save journal entry:', error);
    return null;
  }
}; 