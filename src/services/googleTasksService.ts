import { apiRequest } from './apiUtils';

// Define the Task interface based on the API response
export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: string;
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
  updated?: string;
  selfLink?: string;
}

// Define the TaskList interface
export interface GoogleTaskList {
  id: string;
  title: string;
  tasks: GoogleTask[];
}

// Fetch all task lists and their tasks
export const fetchGoogleTaskLists = async (): Promise<GoogleTaskList[]> => {
  try {
    console.log('Fetching Google Task lists from API...');
    const response = await apiRequest<{ status: string; data: { taskLists: GoogleTaskList[] } }>('/api/google/tasks?showCompleted=true&showHidden=true');
    
    if (response.status === 'success' && response.data && response.data.taskLists) {
      console.log(`Fetched ${response.data.taskLists.length} task lists`);
      return response.data.taskLists;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch Google Task lists:', error);
    throw error;
  }
};

// Create a new task
export const createGoogleTask = async (
  taskListId: string, 
  task: { title: string; notes?: string; due?: string; }
): Promise<GoogleTask | null> => {
  try {
    const response = await apiRequest<{ status: string; task?: GoogleTask; data?: { task: GoogleTask } }>(`/api/google/tasklists/${taskListId}/tasks`, {
      method: 'POST',
      body: task
    });
    
    // Check for both response formats
    if (response.status === 'success') {
      // If task is directly in the response
      if (response.task) {
        return response.task;
      }
      // If task is nested in data.task (original format)
      if (response.data && response.data.task) {
        return response.data.task;
      }
      console.warn('Task created successfully but unexpected response format:', response);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to create Google Task:', error);
    throw error;
  }
};

// Update a task
export const updateGoogleTask = async (
  taskListId: string, 
  taskId: string, 
  updates: Partial<GoogleTask>
): Promise<GoogleTask | null> => {
  try {
    const response = await apiRequest<{ status: string; task?: GoogleTask; data?: { task: GoogleTask } }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}`, {
      method: 'PUT',
      body: updates
    });
    
    // Check for both response formats
    if (response.status === 'success') {
      // If task is directly in the response
      if (response.task) {
        return response.task;
      }
      // If task is nested in data.task (original format)
      if (response.data && response.data.task) {
        return response.data.task;
      }
      console.warn('Task updated successfully but unexpected response format:', response);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to update Google Task:', error);
    throw error;
  }
};

// Delete a task
export const deleteGoogleTask = async (taskListId: string, taskId: string): Promise<boolean> => {
  try {
    const response = await apiRequest<{ status: string }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
    
    // Check if the request was successful
    if (response.status === 'success') {
      return true;
    }
    
    console.warn('Delete task request failed:', response);
    return false;
  } catch (error) {
    console.error('Failed to delete Google Task:', error);
    throw error;
  }
};

// Move a task to another list
export const moveGoogleTask = async (
  sourceTaskListId: string, 
  targetTaskListId: string, 
  taskId: string,
  taskData?: {
    title: string;
    status: string;
    notes?: string;
    due?: string;
  }
): Promise<GoogleTask | null> => {
  try {
    // Check if we have the task data needed to create a copy
    if (!taskData || !taskData.title) {
      console.error('Cannot move task: missing task data');
      return null;
    }
    
    // Step 1: Create a new task with the same data in the target list
    const newTaskResponse = await apiRequest<{ status: string; task?: GoogleTask; data?: { task: GoogleTask } }>(`/api/google/tasklists/${targetTaskListId}/tasks`, {
      method: 'POST',
      body: {
        title: taskData.title,
        status: taskData.status,
        notes: taskData.notes,
        due: taskData.due
      }
    });
    
    let newTask: GoogleTask | null = null;
    
    // Check for both response formats for the new task
    if (newTaskResponse.status === 'success') {
      if (newTaskResponse.task) {
        newTask = newTaskResponse.task;
      } else if (newTaskResponse.data && newTaskResponse.data.task) {
        newTask = newTaskResponse.data.task;
      } else {
        console.warn('Task creation successful but unexpected response format:', newTaskResponse);
        return null;
      }
    } else {
      console.error('Failed to create task in target list:', newTaskResponse);
      return null;
    }
    
    // Step 2: Delete the original task
    const deleteResponse = await apiRequest<{ status: string }>(`/api/google/tasklists/${sourceTaskListId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.status !== 'success') {
      console.warn('Created new task, but failed to delete original task:', deleteResponse);
      // We still return the new task since the move was partially successful
    }
    
    return newTask;
  } catch (error) {
    console.error('Failed to move Google Task:', error);
    throw error;
  }
};

// Create a new task list
export const createGoogleTaskList = async (title: string): Promise<GoogleTaskList | null> => {
  try {
    const response = await apiRequest<{ status: string; data: { taskList: GoogleTaskList } }>(`/api/google/tasklists`, {
      method: 'POST',
      body: { title }
    });
    
    if (response.status === 'success' && response.data && response.data.taskList) {
      return response.data.taskList;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to create Google Task list:', error);
    throw error;
  }
};

// Update a task list's title
export const updateGoogleTaskList = async (
  taskListId: string, 
  title: string
): Promise<GoogleTaskList | null> => {
  try {
    const response = await apiRequest<{ status: string; data: { taskList: GoogleTaskList } }>(`/api/google/tasklists/${taskListId}`, {
      method: 'POST',
      body: { title }
    });
    
    if (response.status === 'success' && response.data && response.data.taskList) {
      return response.data.taskList;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to update Google Task list:', error);
    throw error;
  }
};

// Delete a task list
export const deleteGoogleTaskList = async (taskListId: string): Promise<boolean> => {
  try {
    await apiRequest<{ status: string }>(`/api/google/tasklists/${taskListId}`, {
      method: 'DELETE'
    });
    
    return true;
  } catch (error) {
    console.error('Failed to delete Google Task list:', error);
    throw error;
  }
};

// Clear completed tasks from a task list
export const clearCompletedTasks = async (taskListId: string): Promise<boolean> => {
  try {
    await apiRequest<{ status: string }>(`/api/google/tasks/${taskListId}/clear`, {
      method: 'POST'
    });
    
    return true;
  } catch (error) {
    console.error('Failed to clear completed tasks:', error);
    throw error;
  }
}; 