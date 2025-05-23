import { apiRequest } from './apiUtils';

// Define interfaces for API response
export interface Achievement {
  id: number;
  description: string;
  howAchieved: string;
}

export interface PersonalValue {
  id: number;
  description: string;
}

export interface Goal {
  id: number;
  deadline: string;
  keyResults: string[];
  description: string;
}

export interface Action {
  id: number;
  status: string;
  deadline: string;
  description: string;
}

export interface UserSession {
  id: number;
  user_id: number;
  name: string;
  achievements: Achievement[];
  personalValues: PersonalValue[];
  coreValues: string;
  goals: Goal[];
  actions: Action[];
  alignment: string;
  reflections: string;
  created_at: string;
  updated_at: string;
}

// Fetch user sessions from the API
export const fetchUserSessions = async (): Promise<UserSession[]> => {
  try {
    console.log('Fetching user sessions using apiRequest utility');
    // Use API path - apiUtils will add the base URL
    const data = await apiRequest<UserSession[]>('/api/user-sessions');
    console.log(`API returned ${data.length} sessions`);
    return data;
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    return [];
  }
};

// Save user session to the API - supports both creating new sessions and updating existing ones
export const saveUserSession = async (session: Partial<UserSession>): Promise<UserSession | null> => {
  try {
    // Determine if this is a create or update operation
    const isUpdate = session.id !== undefined && !String(session.id).startsWith('session-');
    
    // Use API path - apiUtils will add the base URL
    let url = '/api/user-sessions';
    let method: 'POST' | 'PUT' = 'POST';
    let sessionData: any;
    
    if (isUpdate) {
      // For updates, we use PUT and include ID in URL
      url = `/api/user-sessions/${session.id}`;
      method = 'PUT';
      sessionData = session; // Keep the ID for PUT requests
    } else {
      // For creates, we use POST and remove ID from payload
      const { id, ...sessionWithoutId } = session;
      sessionData = sessionWithoutId;
    }
    
    console.log(`⭐️ API REQUEST: Saving session using ${method} to ${url}`, sessionData);
    
    const data = await apiRequest<UserSession>(url, {
      method,
      body: sessionData
    });
    
    console.log('✅ API RESPONSE SUCCESS:', data);
    return data;
  } catch (error) {
    console.error('❌ Failed to save user session:', error);
    return null;
  }
};

// Delete a user session from the API
export const deleteUserSession = async (sessionId: number): Promise<boolean> => {
  try {
    // Use API path - apiUtils will add the base URL
    await apiRequest(`/api/user-sessions/${sessionId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Failed to delete user session:', error);
    return false;
  }
}; 