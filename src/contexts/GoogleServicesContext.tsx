import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GOOGLE_API_CONFIG } from '../config/googleApiConfig';

interface GoogleServicesContextProps {
  isSignedIn: boolean;
  isInitialized: boolean;
  handleSignIn: () => Promise<void>;
  handleSignOut: () => Promise<void>;
  fetchTasks: () => Promise<any[]>;
  fetchCalendarEvents: (timeMin: string, timeMax: string) => Promise<any[]>;
  addTask: (taskListId: string, title: string, notes?: string, due?: string) => Promise<any>;
  updateTask: (taskListId: string, taskId: string, updates: any) => Promise<any>;
  deleteTask: (taskListId: string, taskId: string) => Promise<void>;
  createCalendarEvent: (event: any) => Promise<any>;
  updateCalendarEvent: (eventId: string, updates: any) => Promise<any>;
  deleteCalendarEvent: (eventId: string) => Promise<void>;
  taskLists: any[];
  loadingTasks: boolean;
  loadingEvents: boolean;
  error: string | null;
}

const GoogleServicesContext = createContext<GoogleServicesContextProps | undefined>(undefined);

interface GoogleServicesProviderProps {
  children: ReactNode;
}

export const GoogleServicesProvider: React.FC<GoogleServicesProviderProps> = ({ children }) => {
  const [gapi, setGapi] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [taskLists, setTaskLists] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the Google API client
  useEffect(() => {
    const loadGapiAndInitClient = async () => {
      try {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        
        gapiScript.onload = () => {
          const gapiInstance = window.gapi;
          setGapi(gapiInstance);
          
          gapiInstance.load('client:auth2', async () => {
            try {
              await gapiInstance.client.init({
                apiKey: GOOGLE_API_CONFIG.API_KEY,
                clientId: GOOGLE_API_CONFIG.CLIENT_ID,
                discoveryDocs: GOOGLE_API_CONFIG.DISCOVERY_DOCS,
                scope: GOOGLE_API_CONFIG.SCOPES.join(' '),
              });
              
              // Listen for sign-in state changes
              gapiInstance.auth2.getAuthInstance().isSignedIn.listen((signedIn: boolean) => {
                setIsSignedIn(signedIn);
              });
              
              // Set the initial sign-in state
              setIsSignedIn(gapiInstance.auth2.getAuthInstance().isSignedIn.get());
              setIsInitialized(true);
              
              // If signed in, load task lists
              if (gapiInstance.auth2.getAuthInstance().isSignedIn.get()) {
                fetchTaskLists();
              }
            } catch (error) {
              console.error("Error initializing Google API client:", error);
              setError("Failed to initialize Google services");
            }
          });
        };
        
        gapiScript.onerror = () => {
          console.error("Failed to load Google API script");
          setError("Failed to load Google services");
        };
        
        document.body.appendChild(gapiScript);
        
        return () => {
          document.body.removeChild(gapiScript);
        };
      } catch (error) {
        console.error("Error loading GAPI:", error);
        setError("Failed to load Google services");
      }
    };
    
    loadGapiAndInitClient();
  }, []);

  // Sign in the user
  const handleSignIn = async () => {
    try {
      if (!gapi) throw new Error("Google API not loaded");
      await gapi.auth2.getAuthInstance().signIn();
      await fetchTaskLists();
    } catch (error) {
      console.error("Error signing in:", error);
      setError("Failed to sign in to Google");
      throw error;
    }
  };

  // Sign out the user
  const handleSignOut = async () => {
    try {
      if (!gapi) throw new Error("Google API not loaded");
      await gapi.auth2.getAuthInstance().signOut();
      setTaskLists([]);
    } catch (error) {
      console.error("Error signing out:", error);
      setError("Failed to sign out from Google");
      throw error;
    }
  };

  // Fetch user's task lists
  const fetchTaskLists = async () => {
    try {
      if (!gapi) throw new Error("Google API not loaded");
      const response = await gapi.client.tasks.tasklists.list();
      setTaskLists(response.result.items || []);
      return response.result.items || [];
    } catch (error) {
      console.error("Error fetching task lists:", error);
      setError("Failed to fetch task lists");
      return [];
    }
  };

  // Fetch tasks from a specific task list or the first available list
  const fetchTasks = async () => {
    setLoadingTasks(true);
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      // If no task lists loaded yet, fetch them first
      let lists = taskLists;
      if (lists.length === 0) {
        lists = await fetchTaskLists();
      }
      
      if (lists.length === 0) {
        return [];
      }
      
      // Use the first task list by default
      const taskListId = lists[0].id;
      
      const response = await gapi.client.tasks.tasks.list({
        tasklist: taskListId,
        maxResults: 100,
        showCompleted: true,
      });
      
      return response.result.items || [];
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to fetch tasks");
      return [];
    } finally {
      setLoadingTasks(false);
    }
  };

  // Fetch calendar events for a date range
  const fetchCalendarEvents = async (timeMin: string, timeMax: string) => {
    setLoadingEvents(true);
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      const response = await gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin,
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      return response.result.items || [];
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      setError("Failed to fetch calendar events");
      return [];
    } finally {
      setLoadingEvents(false);
    }
  };

  // Add a new task to a task list
  const addTask = async (taskListId: string, title: string, notes?: string, due?: string) => {
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      const taskData: any = {
        title: title,
        status: 'needsAction',
      };
      
      if (notes) taskData.notes = notes;
      if (due) taskData.due = due;
      
      const response = await gapi.client.tasks.tasks.insert({
        tasklist: taskListId,
        resource: taskData,
      });
      
      return response.result;
    } catch (error) {
      console.error("Error adding task:", error);
      setError("Failed to add task");
      throw error;
    }
  };

  // Update an existing task
  const updateTask = async (taskListId: string, taskId: string, updates: any) => {
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      // First get the current task to merge with updates
      const taskResponse = await gapi.client.tasks.tasks.get({
        tasklist: taskListId,
        task: taskId,
      });
      
      const updatedTask = { ...taskResponse.result, ...updates };
      
      const response = await gapi.client.tasks.tasks.update({
        tasklist: taskListId,
        task: taskId,
        resource: updatedTask,
      });
      
      return response.result;
    } catch (error) {
      console.error("Error updating task:", error);
      setError("Failed to update task");
      throw error;
    }
  };

  // Delete a task
  const deleteTask = async (taskListId: string, taskId: string) => {
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      await gapi.client.tasks.tasks.delete({
        tasklist: taskListId,
        task: taskId,
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task");
      throw error;
    }
  };

  // Create a calendar event
  const createCalendarEvent = async (event: any) => {
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      const response = await gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      
      return response.result;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      setError("Failed to create calendar event");
      throw error;
    }
  };

  // Update a calendar event
  const updateCalendarEvent = async (eventId: string, updates: any) => {
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      // First get the current event to merge with updates
      const eventResponse = await gapi.client.calendar.events.get({
        calendarId: 'primary',
        eventId: eventId,
      });
      
      const updatedEvent = { ...eventResponse.result, ...updates };
      
      const response = await gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: updatedEvent,
      });
      
      return response.result;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      setError("Failed to update calendar event");
      throw error;
    }
  };

  // Delete a calendar event
  const deleteCalendarEvent = async (eventId: string) => {
    setError(null);
    
    try {
      if (!gapi) throw new Error("Google API not loaded");
      if (!isSignedIn) throw new Error("User not signed in");
      
      await gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      setError("Failed to delete calendar event");
      throw error;
    }
  };

  const value = {
    isSignedIn,
    isInitialized,
    handleSignIn,
    handleSignOut,
    fetchTasks,
    fetchCalendarEvents,
    addTask,
    updateTask,
    deleteTask,
    createCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent,
    taskLists,
    loadingTasks,
    loadingEvents,
    error,
  };

  return (
    <GoogleServicesContext.Provider value={value}>
      {children}
    </GoogleServicesContext.Provider>
  );
};

// Custom hook to use the Google Services context
export const useGoogleServices = () => {
  const context = useContext(GoogleServicesContext);
  if (context === undefined) {
    throw new Error('useGoogleServices must be used within a GoogleServicesProvider');
  }
  return context;
};

// Add this to global Window type
declare global {
  interface Window {
    gapi: any;
  }
} 