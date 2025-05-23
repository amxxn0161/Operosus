import { apiRequest } from './apiUtils';
import { TaskFileAttachment } from '../types/commonTypes';

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
  is_starred?: boolean;
  starred?: boolean; // Alternative property used in some contexts
  task_list_id?: string;
  task_list_title?: string;
  has_explicit_time?: boolean;
  estimated_minutes?: number; // Add this property for time estimation
  gmail_attachment?: any; // Contains link details including URL, message ID, subject, etc.
  has_gmail_attachment?: boolean; // Boolean flag indicating if a Gmail link was detected
  attachments?: TaskFileAttachment[]; // Google Drive file attachments
}

// Define the TaskList interface
export interface GoogleTaskList {
  id: string;
  title: string;
  tasks: GoogleTask[];
}

// Fetch all task lists and their tasks
export const fetchGoogleTaskLists = async (options?: { 
  signal?: AbortSignal;
  forceRefresh?: boolean;
}): Promise<GoogleTaskList[]> => {
  try {
    console.log('Fetching Google Task lists from API...');
    // Add bypass_cache parameter when forceRefresh is true
    const endpoint = options?.forceRefresh 
      ? '/api/google/tasks?showCompleted=true&showHidden=true&bypass_cache=true' 
      : '/api/google/tasks?showCompleted=true&showHidden=true';
    
    const response = await apiRequest<{ status: string; data: { taskLists: GoogleTaskList[] } }>(
      endpoint, 
      { 
        method: 'GET',
        signal: options?.signal 
      }
    );
    
    if (response.status === 'success' && response.data && response.data.taskLists) {
      console.log(`Fetched ${response.data.taskLists.length} task lists${options?.forceRefresh ? ' (with cache bypass)' : ''}`);
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
  task: { title: string; notes?: string; due?: string; parent?: string; estimated_minutes?: number; }
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
    // Sanitize the task ID
    const sanitizedTaskId = sanitizeTaskId(taskId);
    if (!sanitizedTaskId) {
      console.error('Invalid task ID after sanitization');
      return null;
    }
    
    console.log(`Updating task:`, {
      originalTaskId: taskId,
      sanitizedTaskId,
      taskListId
    });
    
    const response = await apiRequest<{ status: string; task?: GoogleTask; data?: { task: GoogleTask } }>(`/api/google/tasklists/${taskListId}/tasks/${sanitizedTaskId}`, {
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
    // Sanitize the task ID
    const sanitizedTaskId = sanitizeTaskId(taskId);
    if (!sanitizedTaskId) {
      console.error('Invalid task ID after sanitization');
      return false;
    }
    
    console.log(`Deleting task:`, {
      originalTaskId: taskId,
      sanitizedTaskId,
      taskListId
    });
    
    const response = await apiRequest<{ status: string }>(`/api/google/tasklists/${taskListId}/tasks/${sanitizedTaskId}`, {
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
    estimated_minutes?: number;
    starred?: boolean;
  }
): Promise<GoogleTask | null> => {
  try {
    // Sanitize the task ID
    const sanitizedTaskId = sanitizeTaskId(taskId);
    if (!sanitizedTaskId) {
      console.error('Invalid task ID after sanitization');
      return null;
    }
    
    console.log(`API moveGoogleTask: Moving task between lists:`, {
      originalTaskId: taskId,
      sanitizedTaskId,
      sourceTaskListId,
      targetTaskListId
    });
    
    // If we don't have explicit task data, get it from the API
    let dataToUse = taskData;
    if (!dataToUse) {
      try {
        // Get task details from API if not provided
        const taskResponse = await apiRequest<{ status: string; task: GoogleTask }>(`/api/google/tasklists/${sourceTaskListId}/tasks/${sanitizedTaskId}`, {
          method: 'GET'
        });
        
        if (taskResponse.status === 'success' && taskResponse.task) {
          console.log('Retrieved task data for move:', taskResponse.task.title);
          dataToUse = {
            title: taskResponse.task.title,
            status: taskResponse.task.status,
            notes: taskResponse.task.notes,
            due: taskResponse.task.due,
            estimated_minutes: taskResponse.task.estimated_minutes,
            starred: taskResponse.task.is_starred
          };
        } else {
          console.error('Failed to retrieve task data for move');
          return null;
        }
      } catch (fetchError) {
        console.error('Error fetching task data for move:', fetchError);
        return null;
      }
    }
    
    if (!dataToUse || !dataToUse.title) {
      console.error('Cannot move task: missing required task data');
      return null;
    }
    
    // Step 1: Create a new task with the same data in the target list
    // Use all available task data to ensure a complete copy
    const createBody = {
      title: dataToUse.title,
      status: dataToUse.status,
      notes: dataToUse.notes || '',
      due: dataToUse.due,
      estimated_minutes: dataToUse.estimated_minutes
    };
    
    console.log('Creating task in target list with data:', createBody);
    
    let newTask: GoogleTask | null = null;
    let deleteSucceeded = false;
    
    try {
      // Create new task in destination list
      const newTaskResponse = await apiRequest<{ status: string; task?: GoogleTask; data?: { task: GoogleTask } }>(
        `/api/google/tasklists/${targetTaskListId}/tasks`, 
        {
          method: 'POST',
          body: createBody
        }
      );
      
      console.log('Response from create task API:', newTaskResponse);
      
      // Check for both response formats for the new task
      if (newTaskResponse.status === 'success') {
        if (newTaskResponse.task) {
          newTask = newTaskResponse.task;
          console.log('Task created successfully (direct format):', newTask);
        } else if (newTaskResponse.data && newTaskResponse.data.task) {
          newTask = newTaskResponse.data.task;
          console.log('Task created successfully (nested format):', newTask);
        } else {
          console.warn('Task creation successful but unexpected response format:', newTaskResponse);
          return null;
        }
      } else {
        console.error('Failed to create task in target list:', newTaskResponse);
        return null;
      }
      
      // Step 2: Apply star status if needed - BEFORE deleting original task
      if (dataToUse.starred && newTask) {
        try {
          console.log('Setting star status on new task');
          await apiRequest<any>(`/api/google/tasklists/${targetTaskListId}/tasks/${newTask.id}/star`, {
            method: 'POST'
          });
          // Add the starred status to our new task object for return value
          newTask.is_starred = true;
        } catch (starError) {
          console.warn('Created task but failed to star it:', starError);
          // Continue even if starring fails - the task was still created
        }
      }
      
      // Step 3: Only delete the original task if we CONFIRMED the new task was created
      if (newTask && newTask.id) {
        try {
          console.log(`Deleting original task ${sanitizedTaskId} from list ${sourceTaskListId}`);
          const deleteResponse = await apiRequest<{ status: string }>(
            `/api/google/tasklists/${sourceTaskListId}/tasks/${sanitizedTaskId}`, 
            { method: 'DELETE' }
          );
          
          if (deleteResponse.status === 'success') {
            console.log('Original task deleted successfully');
            deleteSucceeded = true;
          } else {
            console.warn('Created new task, but failed to delete original task:', deleteResponse);
            // Continue with the move even if deletion fails - we can clean up duplicates later
          }
        } catch (deleteError) {
          console.error('Error deleting original task:', deleteError);
          // Continue with the move even if deletion fails - the new task is still valid
        }
        
        // Return the new task, whether or not we succeeded in deleting the original
        return newTask;
      } else {
        console.error('New task object is invalid after creation');
        return null;
      }
    } catch (error) {
      console.error('Error in moveGoogleTask process:', error);
      return null;
    }
  } catch (error) {
    console.error('Failed to move Google Task:', error);
    throw error;
  }
};

// Create a new task list
export const createGoogleTaskList = async (title: string): Promise<GoogleTaskList | null> => {
  try {
    console.log(`API: Creating Google Task list with title: "${title}"`);
    
    const response = await apiRequest<{ 
      status: string; 
      data: { taskList: any }; 
      message?: string; 
    }>(`/api/google/tasklists`, {
      method: 'POST',
      body: { title }
    });
    
    console.log('Create task list API response:', response);
    
    if (response.status === 'success' && response.data && response.data.taskList) {
      // If the API response doesn't include a tasks array, add an empty one
      const taskList = response.data.taskList;
      if (!taskList.tasks) {
        console.log('Adding empty tasks array to task list response');
        taskList.tasks = [];
      }
      
      console.log('Task list created successfully with ID:', taskList.id);
      return taskList as GoogleTaskList;
    }
    
    // Even if we get a 'success' status but no taskList object, log this but don't fail
    if (response.status === 'success') {
      console.warn('API returned success but no taskList object in response:', response);
      // Return a minimal task list object with the title
      return {
        id: 'pending-id',  // This will be replaced on refresh
        title,
        tasks: []
      };
    }
    
    console.error('Failed to create task list, API returned non-success status:', response);
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

// Toggle star status of a task
export const toggleTaskStar = async (
  taskListId: string,
  taskId: string
): Promise<{ is_starred: boolean } | null> => {
  try {
    console.log(`Toggling star status for task ${taskId} in list ${taskListId}`);
    const response = await apiRequest<{ 
      status: string; 
      message: string;
      is_starred: boolean;
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/star`, {
      method: 'POST'
    });
    
    if (response.status === 'success') {
      console.log(`Task star status: ${response.is_starred ? 'Starred' : 'Unstarred'}`);
      return { is_starred: response.is_starred };
    }
    
    console.warn('Star toggle request failed:', response);
    return null;
  } catch (error) {
    console.error('Failed to toggle task star status:', error);
    throw error;
  }
};

// Fetch all starred tasks for the current user
export const fetchStarredTasks = async (): Promise<GoogleTask[]> => {
  try {
    console.log('Fetching starred tasks from API...');
    const response = await apiRequest<{ 
      status: string; 
      data: { 
        starredTasks: GoogleTask[]
      } 
    }>('/api/google/starred-tasks');
    
    if (response.status === 'success' && response.data && response.data.starredTasks) {
      console.log(`Fetched ${response.data.starredTasks.length} starred tasks`);
      return response.data.starredTasks;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch starred tasks:', error);
    throw error;
  }
};

// Record actual duration for a task
export const recordTaskDuration = async (
  taskListId: string,
  taskId: string,
  actualMinutes: number,
  updateNotes: boolean = true
): Promise<GoogleTask | null> => {
  try {
    console.log(`Recording duration of ${actualMinutes} minutes for task ${taskId}`);
    const response = await apiRequest<{ 
      status: string; 
      task?: GoogleTask;
      data?: { task: GoogleTask };
      message?: string;
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/duration`, {
      method: 'POST',
      body: {
        actual_minutes: actualMinutes,
        update_notes: updateNotes
      }
    });
    
    // Even if we don't have a task in the response, the operation might have succeeded
    // The backend API might update the task without returning the full task object
    if (response.status === 'success') {
      // Handle both response formats
      if (response.task) {
        console.log('Task duration recorded successfully with task data returned');
        return response.task;
      }
      if (response.data && response.data.task) {
        console.log('Task duration recorded successfully with task data in data field');
        return response.data.task;
      }
      
      // The operation succeeded but no task data was returned
      // This is not necessarily an error - log it but don't treat as failure
      console.log('Duration recorded successfully but no task data was returned');
      return null;
    } else {
      // This is a true error case where the API explicitly returned a failure status
      console.error('API returned error status when recording duration:', response.message || 'Unknown error');
      throw new Error(response.message || 'Failed to record task duration');
    }
  } catch (error) {
    console.error('Failed to record task duration:', error);
    throw error;
  }
};

/**
 * Helper function to sanitize task IDs for the Google Tasks API
 * Google Tasks API is sensitive to task ID formatting
 */
export const sanitizeTaskId = (taskId: string | null): string | null => {
  if (!taskId) return null;
  
  // Trim the ID and remove any spaces or special characters that might cause issues
  const sanitized = taskId.trim()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/[^a-zA-Z0-9-_]/g, ''); // Remove non-alphanumeric characters except dash and underscore
  
  return sanitized || null; // Return null if sanitizing resulted in an empty string
};

// Reorder a task within a task list
export const reorderGoogleTask = async (
  taskListId: string, 
  taskId: string, 
  previousTaskId: string | null,
  applyReordering: boolean = false,
  moveToTop: boolean = false
): Promise<GoogleTask | null> => {
  try {
    // Sanitize the task IDs for the API request
    const sanitizedTaskId = sanitizeTaskId(taskId);
    const sanitizedPreviousTaskId = sanitizeTaskId(previousTaskId);
    
    if (!sanitizedTaskId) {
      console.error('Invalid task ID after sanitization');
      return null;
    }
    
    // Prepare the request body
    const requestBody: { previous?: string; moveToTop?: boolean } = {};
    
    // If moving to top (first position), use the special moveToTop parameter
    if (moveToTop) {
      requestBody.moveToTop = true;
      console.log('Using special moveToTop parameter for top position');
    } 
    // Otherwise, if previousTaskId is provided, set it in the request body
    else if (sanitizedPreviousTaskId) {
      requestBody.previous = sanitizedPreviousTaskId;
    }
    
    // Add the URL parameter for applying reordering
    let endpoint = `/api/google/tasklists/${taskListId}/tasks/${sanitizedTaskId}/move`;
    if (applyReordering) {
      endpoint += '?apply_reordering=true';
    }
    
    console.log(`Reordering task in list ${taskListId}:`, {
      originalTaskId: taskId,
      sanitizedTaskId,
      originalPreviousTaskId: previousTaskId,
      sanitizedPreviousTaskId,
      moveToTop,
      applyReordering,
      requestBody
    });
    
    const response = await apiRequest<{ status: string; task?: GoogleTask; data?: { task: GoogleTask } }>(endpoint, {
      method: 'POST',
      body: requestBody
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
      console.warn('Task reordered successfully but unexpected response format:', response);
    }
    
    return null;
  } catch (error) {
    console.error('Failed to reorder Google Task:', {
      error,
      taskDetails: {
        taskListId,
        taskId,
        previousTaskId,
        moveToTop,
        applyReordering
      }
    });
    throw error;
  }
}; 