import { checkAuthState } from './authService';

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string;
  completed: number; // 0 for false, 1 for true
  priority: string;
  createdAt: string;
  completedAt: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch user tasks from the API
export const fetchTasks = async (): Promise<Task[]> => {
  // Get the auth token from localStorage
  const { token } = checkAuthState();
  
  if (!token) {
    console.error('No auth token available');
    return [];
  }
  
  try {
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://app2.operosus.com/api/tasks', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data as Task[];
  } catch (error) {
    // Special handling for abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Tasks API request timed out');
    } else {
      console.error('Failed to fetch tasks:', error);
    }
    return [];
  }
};

// Save a task to the API
export const saveTask = async (task: Partial<Task>): Promise<Task | null> => {
  // Get the auth token from localStorage
  const { token } = checkAuthState();
  
  if (!token) {
    console.error('No auth token available');
    return null;
  }
  
  try {
    // Determine if this is a create or update operation
    const isUpdate = task.id !== undefined;
    
    let url = 'https://app2.operosus.com/api/tasks';
    let method = 'POST';
    
    if (isUpdate) {
      // For updates, we use PUT and include ID in URL
      url = `https://app2.operosus.com/api/tasks/${task.id}`;
      method = 'PUT';
    }
    
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(task),
      signal: controller.signal
    });
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data as Task;
  } catch (error) {
    // Special handling for abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Task API save request timed out');
    } else {
      console.error('Failed to save task:', error);
    }
    return null;
  }
};

// Delete a task from the API
export const deleteTask = async (taskId: number): Promise<boolean> => {
  // Get the auth token from localStorage
  const { token } = checkAuthState();
  
  if (!token) {
    console.error('No auth token available');
    return false;
  }
  
  try {
    // Create an AbortController to handle timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`https://app2.operosus.com/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    // Special handling for abort errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.error('Task API delete request timed out');
    } else {
      console.error('Failed to delete task:', error);
    }
    return false;
  }
}; 