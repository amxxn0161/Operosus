import { checkAuthState } from './authService';
import { apiRequest } from './apiUtils';

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
  try {
    console.log('Fetching tasks using apiRequest utility');
    // Use API path - apiUtils will add the base URL
    const data = await apiRequest<Task[]>('/api/tasks');
    console.log(`API returned ${data.length} tasks`);
    return data;
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    return [];
  }
};

// Save a task to the API
export const saveTask = async (task: Partial<Task>): Promise<Task | null> => {
  try {
    // Determine if this is a create or update operation
    const isUpdate = task.id !== undefined;
    
    // Use API path - apiUtils will add the base URL
    let url = '/api/tasks';
    let method: 'POST' | 'PUT' = 'POST';
    
    if (isUpdate) {
      // For updates, we use PUT and include ID in URL
      url = `/api/tasks/${task.id}`;
      method = 'PUT';
    }
    
    return await apiRequest<Task>(url, {
      method,
      body: task
    });
  } catch (error) {
    console.error('Failed to save task:', error);
    return null;
  }
};

// Delete a task from the API
export const deleteTask = async (taskId: number): Promise<boolean> => {
  try {
    // Use API path - apiUtils will add the base URL
    await apiRequest(`/api/tasks/${taskId}`, {
      method: 'DELETE'
    });
    return true;
  } catch (error) {
    console.error('Failed to delete task:', error);
    return false;
  }
}; 