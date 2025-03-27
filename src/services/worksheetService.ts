import { checkAuthState } from './authService';

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
  // Get the auth token from localStorage
  const { token } = checkAuthState();
  
  if (!token) {
    console.error('No auth token available');
    return [];
  }
  
  try {
    const response = await fetch('https://app2.operosus.com/api/user-sessions', {
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
    return data as UserSession[];
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    return [];
  }
}; 