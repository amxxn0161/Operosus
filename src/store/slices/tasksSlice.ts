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
  fetchStarredTasks
} from '../../services/googleTasksService';

// Define the enhanced types for the Redux store
export interface EnhancedGoogleTask extends GoogleTask {
  starred?: boolean;
  actual_minutes?: number;
  estimated_minutes?: number;
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
}

const initialState: TasksState = {
  taskLists: [],
  starredTasks: [],
  loading: false,
  error: null,
  lastFetched: null,
  cacheDuration: 5 * 60 * 1000, // Default cache duration: 5 minutes (can be adjusted)
};

// Helper function to extract starred tasks
const extractStarredTasks = (lists: EnhancedGoogleTaskList[]): EnhancedGoogleTask[] => {
  return lists.flatMap(list => list.tasks.filter(task => task.starred));
};

// Async thunk for fetching task lists
export const fetchTaskLists = createAsyncThunk(
  'tasks/fetchTaskLists',
  async (_, { getState, rejectWithValue }) => {
    try {
      // Check if cache is still valid
      const state = getState() as { tasks: TasksState };
      const now = Date.now();
      
      if (
        state.tasks.lastFetched && 
        state.tasks.taskLists.length > 0 && 
        now - state.tasks.lastFetched < state.tasks.cacheDuration
      ) {
        console.log('Using cached task lists - cache is still valid');
        return state.tasks.taskLists;
      }
      
      console.log('Fetching Google Task lists from API (cache expired or not available)');
      const fetchedLists = await fetchGoogleTaskLists();
      
      // Enhance the task lists with local properties
      const enhancedLists: EnhancedGoogleTaskList[] = fetchedLists.map(list => ({
        ...list,
        isVisible: true,
        tasks: list.tasks.map(task => ({
          ...task,
          starred: task.is_starred || false
        }))
      }));
      
      return enhancedLists;
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
  'tasks/moveTask',
  async ({ 
    sourceTaskListId, 
    targetTaskListId, 
    taskId 
  }: { 
    sourceTaskListId: string; 
    targetTaskListId: string; 
    taskId: string 
  }, { getState, rejectWithValue }) => {
    try {
      // Get current task data from state
      const state = getState() as { tasks: TasksState };
      const sourceListIndex = state.tasks.taskLists.findIndex(
        list => list.id === sourceTaskListId
      );
      
      if (sourceListIndex === -1) {
        return rejectWithValue('Source task list not found');
      }
      
      const taskIndex = state.tasks.taskLists[sourceListIndex].tasks.findIndex(
        task => task.id === taskId
      );
      
      if (taskIndex === -1) {
        return rejectWithValue('Task not found');
      }
      
      const currentTask = state.tasks.taskLists[sourceListIndex].tasks[taskIndex];
      
      // Extract needed task data
      const taskData = {
        title: currentTask.title,
        status: currentTask.status,
        notes: currentTask.notes,
        due: currentTask.due
      };
      
      // Perform the move
      const movedTask = await moveGoogleTask(
        sourceTaskListId,
        targetTaskListId,
        taskId,
        taskData
      );
      
      if (!movedTask) {
        return rejectWithValue('Failed to move task');
      }
      
      // Return data for state update
      return {
        sourceTaskListId,
        targetTaskListId,
        oldTaskId: taskId,
        newTask: {
          ...movedTask,
          starred: currentTask.starred || false
        } as EnhancedGoogleTask
      };
    } catch (error) {
      console.error('Error moving Google Task:', error);
      return rejectWithValue('Failed to move task');
    }
  }
);

// Create task list
export const createTaskList = createAsyncThunk(
  'tasks/createTaskList',
  async (title: string, { rejectWithValue }) => {
    try {
      const newList = await createGoogleTaskList(title);
      if (!newList) {
        return rejectWithValue('Failed to create task list');
      }
      
      // Convert to enhanced list
      const enhancedList: EnhancedGoogleTaskList = {
        ...newList,
        isVisible: true,
        tasks: newList.tasks.map(task => ({
          ...task,
          starred: task.is_starred || false
        }))
      };
      
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
      if (!updatedTask) {
        return rejectWithValue('Failed to record task duration');
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
    toggleTaskListVisibility: (state, action: PayloadAction<string>) => {
      const listIndex = state.taskLists.findIndex(list => list.id === action.payload);
      if (listIndex !== -1) {
        state.taskLists[listIndex].isVisible = !state.taskLists[listIndex].isVisible;
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
    // Force refetch by invalidating cache
    invalidateCache: (state) => {
      state.lastFetched = null;
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
        state.loading = false;
        state.taskLists = action.payload;
        state.starredTasks = extractStarredTasks(action.payload);
        state.lastFetched = Date.now();
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
        const { sourceTaskListId, targetTaskListId, oldTaskId, newTask } = action.payload;
        
        // Remove from source list
        const sourceListIndex = state.taskLists.findIndex(list => list.id === sourceTaskListId);
        if (sourceListIndex !== -1) {
          state.taskLists[sourceListIndex].tasks = state.taskLists[sourceListIndex].tasks.filter(
            task => task.id !== oldTaskId
          );
        }
        
        // Add to target list
        const targetListIndex = state.taskLists.findIndex(list => list.id === targetTaskListId);
        if (targetListIndex !== -1) {
          state.taskLists[targetListIndex].tasks.push(newTask);
        }
        
        // Update starred tasks if necessary
        if (newTask.starred) {
          // Find and remove old task from starred tasks if it exists
          state.starredTasks = state.starredTasks.filter(task => task.id !== oldTaskId);
          // Add new task to starred tasks
          state.starredTasks.push(newTask);
        } else {
          // Ensure old task is removed from starred tasks
          state.starredTasks = state.starredTasks.filter(task => task.id !== oldTaskId);
        }
      })
      .addCase(moveTaskBetweenLists.rejected, (state, action) => {
        state.error = action.payload as string;
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
      })
      .addCase(recordTaskDurationAction.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { 
  resetError, 
  setCacheDuration, 
  toggleTaskListVisibility, 
  filterTaskList,
  invalidateCache
} = tasksSlice.actions;

export default tasksSlice.reducer; 