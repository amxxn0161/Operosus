import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  fetchGoogleTaskLists, 
  createGoogleTask,
  updateGoogleTask,
  deleteGoogleTask,
  moveGoogleTask,
  createGoogleTaskList,
  updateGoogleTaskList,
  deleteGoogleTaskList,
  clearCompletedTasks,
  toggleTaskStar as toggleTaskStarApi,
  recordTaskDuration,
  GoogleTask,
  GoogleTaskList,
  fetchStarredTasks,
  reorderGoogleTask
} from '../../services/googleTasksService';
import { TaskFileAttachment, TaskUrlAttachment } from '../../types/commonTypes';

// Define the enhanced types for the Redux store
export interface EnhancedGoogleTask extends GoogleTask {
  starred?: boolean;
  actual_minutes?: number;
  estimated_minutes?: number;
  has_explicit_time?: boolean;
  gmail_attachment?: any; // Contains link details including URL, message ID, subject, etc.
  has_gmail_attachment?: boolean; // Boolean flag indicating if a Gmail link was detected
  attachments?: TaskFileAttachment[]; // Google Drive file attachments
  urlAttachments?: TaskUrlAttachment[]; // URL attachments
}

export interface EnhancedGoogleTaskList extends Omit<GoogleTaskList, 'tasks'> {
  tasks: EnhancedGoogleTask[];
  isVisible?: boolean;
}

export type TaskListFilterOption = 'myOrder' | 'date' | 'starredRecently' | 'title';

interface TasksState {
  taskLists: EnhancedGoogleTaskList[];
  starredTasks: EnhancedGoogleTask[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  cacheDuration: number; // Duration in milliseconds before cache is considered stale
  cachedStartDate: string | null; // Store the start date of the cached tasks
  cachedEndDate: string | null; // Store the end date of the cached tasks
  viewMode: 'day' | 'week' | 'month' | 'all'; // Track current view mode for cache validation
}

const initialState: TasksState = {
  taskLists: [],
  starredTasks: [],
  loading: false,
  error: null,
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000, // Default cache duration: 5 minutes (can be adjusted)
  cachedStartDate: null,
  cachedEndDate: null,
  viewMode: 'week'
};

// Helper function to extract starred tasks
const extractStarredTasks = (lists: EnhancedGoogleTaskList[]): EnhancedGoogleTask[] => {
  return lists.flatMap(list => list.tasks.filter(task => task.starred));
};

// Helper to calculate date range for a given view mode and date
const getDateRangeForViewMode = (viewMode: 'day' | 'week' | 'month' | 'all', date: Date): [Date, Date] => {
  const startDate = new Date(date);
  const endDate = new Date(date);
  
  if (viewMode === 'day') {
    // For day view, use the whole day
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === 'week') {
    // For week view, go from Sunday to Saturday
    const day = startDate.getDay();
    startDate.setDate(startDate.getDate() - day); // Go to beginning of week (Sunday)
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setDate(startDate.getDate() + 6); // Go to end of week (Saturday)
    endDate.setHours(23, 59, 59, 999);
  } else if (viewMode === 'month') {
    // For month view, use the whole month
    startDate.setDate(1); // First day of month
    startDate.setHours(0, 0, 0, 0);
    
    endDate.setMonth(endDate.getMonth() + 1); // Go to next month
    endDate.setDate(0); // Last day of current month
    endDate.setHours(23, 59, 59, 999);
  } else {
    // For 'all' view, use a large date range
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() + 1);
  }
  
  return [startDate, endDate];
};

// Helper to check if two date ranges overlap
const dateRangesOverlap = (
  range1Start: Date, 
  range1End: Date, 
  range2Start: Date, 
  range2End: Date
): boolean => {
  return (
    (range1Start <= range2End && range1End >= range2Start) || 
    (range2Start <= range1End && range2End >= range1Start)
  );
};

// Async thunk for fetching task lists
export const fetchTaskLists = createAsyncThunk(
  'tasks/fetchTaskLists',
  async (
    params: { 
      viewMode?: 'day' | 'week' | 'month' | 'all'; 
      selectedDate?: Date;
      forceRefresh?: boolean;
    } = {}, 
    { getState, rejectWithValue }
  ) => {
    try {
      // Get current state
      const state = getState() as { tasks: TasksState };
      const now = Date.now();
      
      // Default values if not provided
      const viewMode = params.viewMode || state.tasks.viewMode || 'week';
      const selectedDate = params.selectedDate || new Date();
      const forceRefresh = params.forceRefresh || false;
      
      // Calculate the new date range
      const [newStartDate, newEndDate] = getDateRangeForViewMode(viewMode, selectedDate);
      
      // If forceRefresh is true, skip all cache checks and fetch directly
      if (forceRefresh) {
        console.log('Force refreshing Google Task lists (bypassing cache)');
        const fetchedLists = await fetchGoogleTaskLists({ forceRefresh: true });
        
        // Enhance the task lists with local properties
        const enhancedLists: EnhancedGoogleTaskList[] = fetchedLists.map(list => ({
          ...list,
          isVisible: true,
          tasks: list.tasks.map(task => ({
            ...task,
            starred: task.is_starred || false
          }))
        }));
        
        // Return data with new cache dates
        return {
          taskLists: enhancedLists,
          cachedStartDate: newStartDate.toISOString(),
          cachedEndDate: newEndDate.toISOString(),
          viewMode
        };
      }
      
      // Check if cache is still valid
      const cacheTimeValid = state.tasks.lastFetched && 
                            now - state.tasks.lastFetched < state.tasks.cacheDuration;
      
      // Check if the view mode changed
      const sameViewMode = viewMode === state.tasks.viewMode;
      
      // Check if the date range overlaps with the cached date range
      let dateRangeOverlaps = false;
      if (state.tasks.cachedStartDate && state.tasks.cachedEndDate) {
        dateRangeOverlaps = dateRangesOverlap(
          newStartDate, 
          newEndDate,
          new Date(state.tasks.cachedStartDate),
          new Date(state.tasks.cachedEndDate)
        );
      }
      
      // Use cache if all conditions are met
      if (
        state.tasks.lastFetched && 
        state.tasks.taskLists.length > 0 && 
        cacheTimeValid &&
        sameViewMode &&
        dateRangeOverlaps
      ) {
        console.log('Using cached task lists - cache is still valid');
        return {
          taskLists: state.tasks.taskLists,
          cachedStartDate: state.tasks.cachedStartDate, 
          cachedEndDate: state.tasks.cachedEndDate,
          viewMode
        };
      }
      
      console.log('Fetching Google Task lists from API (cache expired or not available)');
      const fetchedLists = await fetchGoogleTaskLists({ forceRefresh: false });
      
      // Enhance the task lists with local properties
      const enhancedLists: EnhancedGoogleTaskList[] = fetchedLists.map(list => ({
        ...list,
        isVisible: true,
        tasks: list.tasks.map(task => ({
          ...task,
          starred: task.is_starred || false
        }))
      }));
      
      // Return data with new cache dates
      return {
        taskLists: enhancedLists,
        cachedStartDate: newStartDate.toISOString(),
        cachedEndDate: newEndDate.toISOString(),
        viewMode
      };
    } catch (error) {
      console.error('Error fetching Google Task lists:', error);
      return rejectWithValue('Failed to load Google Task lists');
    }
  }
);

// Create task thunk
export const createTask = createAsyncThunk(
  'tasks/createTask',
  async ({ 
    taskListId, 
    taskData 
  }: { 
    taskListId: string; 
    taskData: { 
      title: string; 
      notes?: string; 
      due?: string; 
      timezone?: string; 
      parent?: string; 
      estimated_minutes?: number; 
    } 
  }, { rejectWithValue }) => {
    try {
      // Remove timezone property before sending to API
      const { timezone, ...apiTaskData } = taskData;
      
      const newTask = await createGoogleTask(taskListId, apiTaskData);
      if (!newTask) {
        return rejectWithValue('Failed to create task');
      }
      
      // Return both the task and task list ID for state updates
      return {
        taskListId,
        task: {
          ...newTask,
          starred: false
        } as EnhancedGoogleTask
      };
    } catch (error) {
      console.error('Error creating Google Task:', error);
      return rejectWithValue('Failed to create task');
    }
  }
);

// Update task thunk
export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ 
    taskListId, 
    taskId, 
    updates 
  }: { 
    taskListId: string; 
    taskId: string; 
    updates: Partial<EnhancedGoogleTask & { timezone?: string }> 
  }, { getState, rejectWithValue }) => {
    try {
      // Remove client-side properties before sending to API
      const { starred, timezone, ...apiUpdates } = updates;
      
      const updatedTask = await updateGoogleTask(taskListId, taskId, apiUpdates);
      if (!updatedTask) {
        return rejectWithValue('Failed to update task');
      }
      
      // Get current task state to merge with updates
      const state = getState() as { tasks: TasksState };
      const currentListIndex = state.tasks.taskLists.findIndex(list => list.id === taskListId);
      
      if (currentListIndex === -1) {
        return rejectWithValue('Task list not found');
      }
      
      const currentTaskIndex = state.tasks.taskLists[currentListIndex].tasks.findIndex(
        task => task.id === taskId
      );
      
      if (currentTaskIndex === -1) {
        return rejectWithValue('Task not found');
      }
      
      const currentTask = state.tasks.taskLists[currentListIndex].tasks[currentTaskIndex];
      
      // Return data needed for state update
      return {
        taskListId,
        taskId,
        task: {
          ...updatedTask,
          starred: starred !== undefined ? starred : currentTask.starred || false
        } as EnhancedGoogleTask
      };
    } catch (error) {
      console.error('Error updating Google Task:', error);
      return rejectWithValue('Failed to update task');
    }
  }
);

// Delete task thunk
export const deleteTaskAction = createAsyncThunk(
  'tasks/deleteTask',
  async ({ 
    taskListId, 
    taskId 
  }: { 
    taskListId: string; 
    taskId: string 
  }, { rejectWithValue }) => {
    try {
      const success = await deleteGoogleTask(taskListId, taskId);
      if (!success) {
        return rejectWithValue('Failed to delete task');
      }
      
      return { taskListId, taskId };
    } catch (error) {
      console.error('Error deleting Google Task:', error);
      return rejectWithValue('Failed to delete task');
    }
  }
);

// Toggle task star
export const toggleTaskStar = createAsyncThunk(
  'tasks/toggleStar',
  async ({ 
    taskListId, 
    taskId 
  }: { 
    taskListId: string; 
    taskId: string 
  }, { getState, rejectWithValue }) => {
    try {
      const result = await toggleTaskStarApi(taskListId, taskId);
      if (!result) {
        return rejectWithValue('Failed to toggle star');
      }
      
      const isStarred = result.is_starred || false;
      
      // Get current task from state
      const state = getState() as { tasks: TasksState };
      const listIndex = state.tasks.taskLists.findIndex(list => list.id === taskListId);
      
      if (listIndex === -1) {
        return rejectWithValue('Task list not found');
      }
      
      const taskIndex = state.tasks.taskLists[listIndex].tasks.findIndex(
        task => task.id === taskId
      );
      
      if (taskIndex === -1) {
        return rejectWithValue('Task not found');
      }
      
      const currentTask = state.tasks.taskLists[listIndex].tasks[taskIndex];
      
      // Return data for state update
      return {
        taskListId,
        taskId,
        task: {
          ...currentTask,
          starred: isStarred
        }
      };
    } catch (error) {
      console.error('Error toggling star for Google Task:', error);
      return rejectWithValue('Failed to toggle star');
    }
  }
);

// Move task between lists
export const moveTaskBetweenLists = createAsyncThunk(
  'tasks/moveTaskBetweenLists',
  async ({ 
    sourceTaskListId, 
    targetTaskListId, 
    taskId 
  }: { 
    sourceTaskListId: string; 
    targetTaskListId: string; 
    taskId: string; 
  }, { rejectWithValue, getState }) => {
    try {
      console.log(`moveTaskBetweenLists: Moving task ${taskId} from ${sourceTaskListId} to ${targetTaskListId}`);
      
      // Get the current state to find the task being moved
      const state = getState() as { tasks: TasksState };
      const sourceList = state.tasks.taskLists.find(list => list.id === sourceTaskListId);
      
      if (!sourceList) {
        console.error('Source task list not found for moving task');
        return rejectWithValue('Source task list not found');
      }
      
      // Find the task in the source list
      const taskToMove = sourceList.tasks.find(task => task.id === taskId);
      if (!taskToMove) {
        console.error('Task not found in source list for moving');
        return rejectWithValue('Task not found in source list');
      }
      
      // Prepare complete task data for the move operation
      const taskData = {
        title: taskToMove.title,
        status: taskToMove.status,
        notes: taskToMove.notes || '',
        due: taskToMove.due,
        estimated_minutes: taskToMove.estimated_minutes,
        starred: Boolean(taskToMove.starred || taskToMove.is_starred)
      };
      
      console.log('Moving task with complete data:', taskData);
      
      // Call the service function with the task data
      const newTask = await moveGoogleTask(sourceTaskListId, targetTaskListId, taskId, taskData);
      
      if (!newTask) {
        console.error('Failed to move task between lists');
        return rejectWithValue('Failed to move task between lists');
      }
      
      // Return both the moved task and relevant IDs for state updates
      return {
        sourceTaskListId,
        targetTaskListId,
        oldTaskId: taskId,
        newTask: {
          ...newTask,
          starred: newTask.is_starred || false
        }
      };
    } catch (error) {
      console.error('Error moving task between lists:', error);
      return rejectWithValue('Error moving task between lists');
    }
  }
);

// Create task list
export const createTaskList = createAsyncThunk(
  'tasks/createTaskList',
  async (title: string, { rejectWithValue }) => {
    try {
      console.log(`TasksSlice: Creating task list with title "${title}"`);
      const newList = await createGoogleTaskList(title);
      
      // If newList is null but the API might have succeeded anyway
      if (!newList) {
        console.warn('createGoogleTaskList returned null, but API might have succeeded');
        // Don't reject here - the calling code will check the list after refresh
        // Return partial data so the thunk is considered fulfilled
        return {
          id: 'pending',
          title,
          tasks: [],
          isVisible: true
        } as EnhancedGoogleTaskList;
      }
      
      // Handle case where the API returns a task list without a tasks array
      if (!newList.tasks) {
        console.log('Task list created but missing tasks array, adding empty array');
        newList.tasks = [];
      }
      
      // Convert to enhanced list
      const enhancedList: EnhancedGoogleTaskList = {
        ...newList,
        isVisible: true,
        tasks: Array.isArray(newList.tasks) 
          ? newList.tasks.map(task => ({
              ...task,
              starred: task.is_starred || false
            }))
          : [] // Fallback to empty array if tasks is not an array
      };
      
      console.log('Task list created successfully:', enhancedList);
      return enhancedList;
    } catch (error) {
      console.error('Error creating Google Task list:', error);
      return rejectWithValue('Failed to create task list');
    }
  }
);

// Update task list
export const updateTaskList = createAsyncThunk(
  'tasks/updateTaskList',
  async ({ 
    taskListId, 
    title 
  }: { 
    taskListId: string; 
    title: string 
  }, { rejectWithValue }) => {
    try {
      const updatedList = await updateGoogleTaskList(taskListId, title);
      if (!updatedList) {
        return rejectWithValue('Failed to update task list');
      }
      
      return { taskListId, title };
    } catch (error) {
      console.error('Error updating Google Task list:', error);
      return rejectWithValue('Failed to update task list');
    }
  }
);

// Delete task list
export const deleteTaskList = createAsyncThunk(
  'tasks/deleteTaskList',
  async (taskListId: string, { rejectWithValue }) => {
    try {
      const success = await deleteGoogleTaskList(taskListId);
      if (!success) {
        return rejectWithValue('Failed to delete task list');
      }
      
      return taskListId;
    } catch (error) {
      console.error('Error deleting Google Task list:', error);
      return rejectWithValue('Failed to delete task list');
    }
  }
);

// Clear completed tasks
export const clearCompletedTasksAction = createAsyncThunk(
  'tasks/clearCompleted',
  async (taskListId: string, { rejectWithValue }) => {
    try {
      const success = await clearCompletedTasks(taskListId);
      if (!success) {
        return rejectWithValue('Failed to clear completed tasks');
      }
      
      return taskListId;
    } catch (error) {
      console.error('Error clearing completed Google Tasks:', error);
      return rejectWithValue('Failed to clear completed tasks');
    }
  }
);

// Record task duration
export const recordTaskDurationAction = createAsyncThunk(
  'tasks/recordDuration',
  async ({ 
    taskListId, 
    taskId, 
    actualMinutes 
  }: { 
    taskListId: string; 
    taskId: string; 
    actualMinutes: number 
  }, { getState, rejectWithValue }) => {
    try {
      const updatedTask = await recordTaskDuration(taskListId, taskId, actualMinutes);
      
      // We don't need to fail when updatedTask is null
      // The API might return a null task even on success
      // Just log a warning but don't reject with value in this case
      if (!updatedTask) {
        console.warn('No task returned from recordTaskDuration API, but operation may still have succeeded');
        
        // Get current task from state to maintain client-side properties
        const state = getState() as { tasks: TasksState };
        const listIndex = state.tasks.taskLists.findIndex(list => list.id === taskListId);
        
        if (listIndex === -1) {
          return rejectWithValue('Task list not found');
        }
        
        const taskIndex = state.tasks.taskLists[listIndex].tasks.findIndex(
          task => task.id === taskId
        );
        
        if (taskIndex === -1) {
          return rejectWithValue('Task not found');
        }
        
        const currentTask = state.tasks.taskLists[listIndex].tasks[taskIndex];
        
        // Create a minimal task from the current state to avoid rejection
        return {
          taskListId,
          taskId,
          task: {
            ...currentTask,
            actual_minutes: actualMinutes
          } as EnhancedGoogleTask
        };
      }
      
      // Get current task from state to maintain client-side properties
      const state = getState() as { tasks: TasksState };
      const listIndex = state.tasks.taskLists.findIndex(list => list.id === taskListId);
      
      if (listIndex === -1) {
        return rejectWithValue('Task list not found');
      }
      
      const taskIndex = state.tasks.taskLists[listIndex].tasks.findIndex(
        task => task.id === taskId
      );
      
      if (taskIndex === -1) {
        return rejectWithValue('Task not found');
      }
      
      const currentTask = state.tasks.taskLists[listIndex].tasks[taskIndex];
      
      // Return data for state update
      return {
        taskListId,
        taskId,
        task: {
          ...updatedTask,
          starred: currentTask.starred || false,
          actual_minutes: actualMinutes
        } as EnhancedGoogleTask
      };
    } catch (error) {
      console.error('Error recording duration for Google Task:', error);
      return rejectWithValue('Failed to record task duration');
    }
  }
);

// Reorder task thunk
export const reorderTaskAction = createAsyncThunk(
  'tasks/reorderTask',
  async ({ 
    taskListId, 
    taskId, 
    previousTaskId,
    applyReordering,
    newIndex
  }: { 
    taskListId: string; 
    taskId: string; 
    previousTaskId: string | null;
    applyReordering?: boolean;
    newIndex: number; // The new position of the task in the list
  }, { getState, rejectWithValue }) => {
    try {
      // Get the current task lists from state
      const state = getState() as { tasks: TasksState };
      const taskList = state.tasks.taskLists.find(list => list.id === taskListId);
      
      if (!taskList) {
        console.error(`Task list not found: ${taskListId}`);
        return rejectWithValue('Task list not found');
      }
      
      // Find the task being moved
      const taskIndex = taskList.tasks.findIndex(task => task.id === taskId);
      if (taskIndex === -1) {
        console.error(`Task not found: ${taskId} in list ${taskListId}`);
        return rejectWithValue('Task not found');
      }
      
      const task = taskList.tasks[taskIndex];
      
      // Validate previous task ID if provided
      if (previousTaskId) {
        const previousTaskExists = taskList.tasks.some(t => t.id === previousTaskId);
        if (!previousTaskExists) {
          console.error(`Previous task not found: ${previousTaskId} in list ${taskListId}`);
          return rejectWithValue('Previous task reference not found');
        }
      }
      
      // Check if moving to the top (first position)
      const isMovingToTop = newIndex === 0;
      
      // Log the reordering operation
      console.log(`Reordering task in Redux`, {
        taskList: taskListId,
        taskId,
        taskTitle: task.title,
        previousTaskId,
        newIndex,
        isMovingToTop,
        applyReordering
      });
      
      // Make the API call to reorder
      try {
        const reorderedTask = await reorderGoogleTask(
          taskListId, 
          taskId, 
          previousTaskId,
          applyReordering || false,
          isMovingToTop // Pass the moveToTop flag
        );
        
        if (!reorderedTask) {
          console.error('API returned null for reordered task');
          return rejectWithValue('Failed to reorder task - API returned null');
        }
        
        // Return data needed for state update
        return {
          taskListId,
          taskId,
          task: {
            ...reorderedTask,
            starred: task.starred || false
          } as EnhancedGoogleTask,
          previousIndex: taskIndex,
          newIndex
        };
      } catch (apiError: any) {
        // More detailed error handling
        console.error('API error during task reordering:', apiError);
        
        // Try to extract a more specific error message
        const errorMessage = apiError.data?.message || apiError.message || 'Failed to reorder task';
        
        // Handle specific API error cases
        if (apiError.status === 400 && errorMessage.includes('Invalid task id')) {
          console.error('Invalid task ID error. Task IDs:', {
            taskId,
            previousTaskId,
            taskListId
          });
          
          // If the error is due to an invalid previous task ID, try again with moveToTop 
          // This will place the task at the beginning of the list rather than failing
          if (previousTaskId || !isMovingToTop) {
            console.log('Attempting fallback: Retrying reordering with moveToTop=true');
            try {
              const retryTask = await reorderGoogleTask(
                taskListId,
                taskId,
                null, // No previous task ID needed when using moveToTop
                applyReordering || false,
                true  // Use moveToTop parameter as fallback
              );
              
              if (retryTask) {
                console.log('Fallback reordering with moveToTop successful');
                return {
                  taskListId,
                  taskId,
                  task: {
                    ...retryTask,
                    starred: task.starred || false
                  } as EnhancedGoogleTask,
                  previousIndex: taskIndex,
                  newIndex: 0 // This will now be at the top
                };
              }
            } catch (retryError) {
              console.error('Fallback reordering failed:', retryError);
            }
          }
          
          return rejectWithValue('Invalid task ID. The task may have been deleted or modified.');
        }
        
        return rejectWithValue(errorMessage);
      }
    } catch (error: any) {
      console.error('Error reordering Google Task:', error);
      return rejectWithValue(error.message || 'Failed to reorder task');
    }
  }
);

// Create the slice
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    setCacheDuration: (state, action: PayloadAction<number>) => {
      state.cacheDuration = action.payload;
    },
    setViewMode: (state, action: PayloadAction<{ viewMode: 'day' | 'week' | 'month' | 'all' }>) => {
      state.viewMode = action.payload.viewMode;
    },
    setTaskListVisibility: (state, action: PayloadAction<{ taskListId: string; isVisible?: boolean }>) => {
      const { taskListId, isVisible } = action.payload;
      const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
      if (listIndex !== -1) {
        state.taskLists[listIndex].isVisible = isVisible !== undefined ? isVisible : !state.taskLists[listIndex].isVisible;
      }
    },
    filterTaskList: (state, action: PayloadAction<{ taskListId: string, filterOption: TaskListFilterOption }>) => {
      const { taskListId, filterOption } = action.payload;
      const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
      
      if (listIndex !== -1) {
        const list = state.taskLists[listIndex];
        
        switch (filterOption) {
          case 'date':
            // Sort by due date (tasks without due dates at the end)
            list.tasks.sort((a, b) => {
              if (!a.due && !b.due) return 0;
              if (!a.due) return 1; 
              if (!b.due) return -1;
              return new Date(a.due).getTime() - new Date(b.due).getTime();
            });
            break;
            
          case 'title':
            // Sort alphabetically by title
            list.tasks.sort((a, b) => a.title.localeCompare(b.title));
            break;
            
          case 'starredRecently':
            // Starred tasks first, then by recency (most recently updated)
            list.tasks.sort((a, b) => {
              const aStarred = a.starred || false;
              const bStarred = b.starred || false;
              if (aStarred && !bStarred) return -1;
              if (!aStarred && bStarred) return 1;
              
              // If star status is the same, sort by updated timestamp
              const aDate = a.updated ? new Date(a.updated).getTime() : 0;
              const bDate = b.updated ? new Date(b.updated).getTime() : 0;
              return bDate - aDate; // Most recent first
            });
            break;
            
          // Default is 'myOrder', which is the server's order - no need to sort
        }
      }
    },
    invalidateCache: (state) => {
      state.lastFetched = null;
      state.cachedStartDate = null;
      state.cachedEndDate = null;
      console.log('Task cache invalidated, next fetch will bypass cache');
    },
    optimisticUpdateLists: (state, action: PayloadAction<(lists: EnhancedGoogleTaskList[]) => EnhancedGoogleTaskList[]>) => {
      // Apply the transform function to our task lists
      state.taskLists = action.payload(state.taskLists);
      
      // Update starred tasks
      state.starredTasks = extractStarredTasks(state.taskLists);
    }
  },
  extraReducers: (builder) => {
    builder
      // Handle fetchTaskLists thunk
      .addCase(fetchTaskLists.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaskLists.fulfilled, (state, action) => {
        state.taskLists = action.payload.taskLists;
        state.starredTasks = extractStarredTasks(action.payload.taskLists);
        state.lastFetched = Date.now();
        state.cachedStartDate = action.payload.cachedStartDate;
        state.cachedEndDate = action.payload.cachedEndDate;
        state.viewMode = action.payload.viewMode;
        state.loading = false;
      })
      .addCase(fetchTaskLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle createTask thunk
      .addCase(createTask.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        const { taskListId, task } = action.payload;
        
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          state.taskLists[listIndex].tasks.push(task);
          
          // Update starred tasks if needed
          if (task.starred) {
            state.starredTasks.push(task);
          }
        }
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle updateTask thunk
      .addCase(updateTask.pending, (state) => {
        state.error = null;
        // Don't set loading to true for updates to avoid UI flickers
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const { taskListId, taskId, task } = action.payload;
        
        // Update in task lists
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          const taskIndex = state.taskLists[listIndex].tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            state.taskLists[listIndex].tasks[taskIndex] = task;
          }
        }
        
        // Update in starred tasks if necessary
        const starredIndex = state.starredTasks.findIndex(t => t.id === taskId);
        if (task.starred && starredIndex === -1) {
          state.starredTasks.push(task);
        } else if (!task.starred && starredIndex !== -1) {
          state.starredTasks.splice(starredIndex, 1);
        } else if (task.starred && starredIndex !== -1) {
          state.starredTasks[starredIndex] = task;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle deleteTask thunk
      .addCase(deleteTaskAction.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteTaskAction.fulfilled, (state, action) => {
        const { taskListId, taskId } = action.payload;
        
        // Remove from task lists
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          state.taskLists[listIndex].tasks = state.taskLists[listIndex].tasks.filter(
            task => task.id !== taskId
          );
        }
        
        // Remove from starred tasks if present
        state.starredTasks = state.starredTasks.filter(task => task.id !== taskId);
      })
      .addCase(deleteTaskAction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle toggleTaskStar thunk
      .addCase(toggleTaskStar.fulfilled, (state, action) => {
        const { taskListId, taskId, task } = action.payload;
        
        // Update in task lists
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          const taskIndex = state.taskLists[listIndex].tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            state.taskLists[listIndex].tasks[taskIndex] = task;
          }
        }
        
        // Update in starred tasks
        if (task.starred) {
          // Add to starred tasks if not already there
          const starredIndex = state.starredTasks.findIndex(t => t.id === taskId);
          if (starredIndex === -1) {
            state.starredTasks.push(task);
          } else {
            state.starredTasks[starredIndex] = task;
          }
        } else {
          // Remove from starred tasks
          state.starredTasks = state.starredTasks.filter(t => t.id !== taskId);
        }
      })
      .addCase(toggleTaskStar.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle moveTask thunk
      .addCase(moveTaskBetweenLists.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        
        const { sourceTaskListId, targetTaskListId, oldTaskId, newTask } = action.payload;
        
        // 1. Find the source list and remove the old task from it
        const sourceListIndex = state.taskLists.findIndex(list => list.id === sourceTaskListId);
        if (sourceListIndex !== -1) {
          // Remove the old task from the source list
          state.taskLists[sourceListIndex].tasks = state.taskLists[sourceListIndex].tasks.filter(
            task => task.id !== oldTaskId
          );
          console.log(`Removed task ${oldTaskId} from source list ${sourceTaskListId}`);
        } else {
          console.error(`Source task list ${sourceTaskListId} not found for removing old task`);
        }
        
        // 2. Find the target list and add the new task to it
        const targetListIndex = state.taskLists.findIndex(list => list.id === targetTaskListId);
        if (targetListIndex !== -1) {
          // Make sure we're not adding a duplicate by checking task ID
          if (!state.taskLists[targetListIndex].tasks.some(task => task.id === newTask.id)) {
            // Add the new task to the target list
            state.taskLists[targetListIndex].tasks.push(newTask);
            console.log(`Added new task ${newTask.id} to target list ${targetTaskListId}`);
          } else {
            console.warn(`Task ${newTask.id} already exists in target list ${targetTaskListId}, skipping add`);
          }
        } else {
          console.error(`Target task list ${targetTaskListId} not found for adding new task`);
        }
        
        // 3. Update starred tasks list if the task was starred
        if (newTask.starred || newTask.is_starred) {
          // First remove any old version of this task from starred tasks
          state.starredTasks = state.starredTasks.filter(task => 
            !(task.id === oldTaskId && task.task_list_id === sourceTaskListId)
          );
          
          // Then add the new version
          state.starredTasks.push({
            ...newTask,
            task_list_id: targetTaskListId,
            starred: true
          });
        } else {
          // Remove from starred tasks if it was previously starred but isn't anymore
          state.starredTasks = state.starredTasks.filter(task => 
            !(task.id === oldTaskId && task.task_list_id === sourceTaskListId)
          );
        }
      })
      .addCase(moveTaskBetweenLists.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to move task between lists';
        console.error('Task move failed:', state.error);
      })
      
      // Handle createTaskList thunk
      .addCase(createTaskList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTaskList.fulfilled, (state, action) => {
        state.loading = false;
        state.taskLists.push(action.payload);
      })
      .addCase(createTaskList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Handle updateTaskList thunk
      .addCase(updateTaskList.fulfilled, (state, action) => {
        const { taskListId, title } = action.payload;
        
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          state.taskLists[listIndex].title = title;
        }
      })
      .addCase(updateTaskList.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle deleteTaskList thunk
      .addCase(deleteTaskList.fulfilled, (state, action) => {
        const taskListId = action.payload;
        
        // Get tasks from this list
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          const taskIds = state.taskLists[listIndex].tasks.map(task => task.id);
          
          // Remove list from taskLists
          state.taskLists = state.taskLists.filter(list => list.id !== taskListId);
          
          // Remove any tasks from this list from starredTasks
          state.starredTasks = state.starredTasks.filter(
            task => !taskIds.includes(task.id)
          );
        }
      })
      .addCase(deleteTaskList.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle clearCompletedTasks thunk
      .addCase(clearCompletedTasksAction.fulfilled, (state, action) => {
        const taskListId = action.payload;
        
        // Remove completed tasks from the list
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          // Get IDs of completed tasks in this list
          const completedTaskIds = state.taskLists[listIndex].tasks
            .filter(task => task.status === 'completed')
            .map(task => task.id);
          
          // Remove them from the list
          state.taskLists[listIndex].tasks = state.taskLists[listIndex].tasks.filter(
            task => task.status !== 'completed'
          );
          
          // Remove them from starred tasks if present
          if (completedTaskIds.length > 0) {
            state.starredTasks = state.starredTasks.filter(
              task => !completedTaskIds.includes(task.id)
            );
          }
        }
      })
      .addCase(clearCompletedTasksAction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle recordTaskDuration thunk
      .addCase(recordTaskDurationAction.fulfilled, (state, action) => {
        const { taskListId, taskId, task } = action.payload;
        
        // Update in task lists
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex !== -1) {
          const taskIndex = state.taskLists[listIndex].tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            state.taskLists[listIndex].tasks[taskIndex] = task;
          }
        }
        
        // Update in starred tasks if present
        const starredIndex = state.starredTasks.findIndex(t => t.id === taskId);
        if (starredIndex !== -1) {
          state.starredTasks[starredIndex] = task;
        }
        
        // Clear any duration-related errors
        if (state.error && state.error.includes('Failed to record task duration')) {
          state.error = '';
        }
      })
      .addCase(recordTaskDurationAction.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      
      // Handle reorderTask thunk
      .addCase(reorderTaskAction.pending, (state) => {
        // Optimistic update handled manually
      })
      .addCase(reorderTaskAction.fulfilled, (state, action) => {
        const { taskListId, taskId, task, previousIndex, newIndex } = action.payload;
        
        // Find the task list
        const listIndex = state.taskLists.findIndex(list => list.id === taskListId);
        if (listIndex === -1) return;
        
        // Get the incomplete tasks (ones shown in the UI typically)
        const incompleteTasks = state.taskLists[listIndex].tasks.filter(t => t.status !== 'completed');
        
        // If the task is no longer in the list (edge case), just update all tasks
        if (!incompleteTasks.find(t => t.id === taskId)) {
          // Find the task and update it
          const taskIndex = state.taskLists[listIndex].tasks.findIndex(t => t.id === taskId);
          if (taskIndex !== -1) {
            state.taskLists[listIndex].tasks[taskIndex] = task;
          }
          return;
        }
        
        // Create a new array with the task moved to the new position
        // Remove the task from its current position
        const reorderedTasks = incompleteTasks.filter(t => t.id !== taskId);
        
        // Insert it at the new position
        reorderedTasks.splice(newIndex, 0, task);
        
        // Update the completed tasks (which stay at the end)
        const completedTasks = state.taskLists[listIndex].tasks.filter(t => t.status === 'completed');
        
        // Update the task list with the new order
        state.taskLists[listIndex].tasks = [...reorderedTasks, ...completedTasks];
        
        // Update in starred tasks if present
        const starredIndex = state.starredTasks.findIndex(t => t.id === taskId);
        if (starredIndex !== -1) {
          state.starredTasks[starredIndex] = task;
        }
      })
      .addCase(reorderTaskAction.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  resetError, 
  setCacheDuration, 
  setViewMode, 
  setTaskListVisibility,
  filterTaskList,
  invalidateCache,
  optimisticUpdateLists
} = tasksSlice.actions;

export default tasksSlice.reducer; 