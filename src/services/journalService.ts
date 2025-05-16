import { checkAuthState } from './authService';
import { apiRequest } from './apiUtils';

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
  try {
    console.log('Fetching journal entries using apiRequest utility');
    // Use API path - apiUtils will add the base URL
    const data = await apiRequest<JournalEntry[]>('/api/productivity');
    console.log(`API returned ${data.length} journal entries`);
    return data;
  } catch (error) {
    console.error('Failed to fetch journal entries:', error);
    return [];
  }
};

// Save a journal entry to the API
export const saveJournalEntry = async (entry: Partial<JournalEntry>): Promise<JournalEntry | null> => {
  try {
    // Determine if this is a create or update operation
    const isUpdate = entry.id !== undefined;
    
    // Use API path - apiUtils will add the base URL
    let url = '/api/productivity';
    let method: 'POST' | 'PUT' = 'POST';
    
    if (isUpdate) {
      // For updates, we use PUT and include ID in URL
      url = `/api/productivity/${entry.id}`;
      method = 'PUT';
    }
    
    return await apiRequest<JournalEntry>(url, {
      method,
      body: entry
    });
  } catch (error) {
    console.error('Failed to save journal entry:', error);
    return null;
  }
};

// Delete a journal entry from the API
export const deleteJournalEntry = async (entryId: number): Promise<boolean> => {
  try {
    // Use API path - apiUtils will add the base URL
    await apiRequest(`/api/productivity/${entryId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Failed to delete journal entry:', error);
    return false;
  }
}; 