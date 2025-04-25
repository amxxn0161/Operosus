import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  GoogleTaskList
} from '../services/googleTasksService';
import { useAuth } from './AuthContext';

// Define special local interface for tasks with star status
export interface EnhancedGoogleTask extends GoogleTask {
  starred?: boolean;
  actual_minutes?: number;
  estimated_minutes?: number;
}

// Define interface for enhanced task lists
export interface EnhancedGoogleTaskList extends Omit<GoogleTaskList, 'tasks'> {
  tasks: EnhancedGoogleTask[];
  isVisible?: boolean; // To control visibility in the UI
}

// Define the filter options for task lists
export type TaskListFilterOption = 'myOrder' | 'date' | 'starredRecently' | 'title';

interface GoogleTasksContextType {
  taskLists: EnhancedGoogleTaskList[];
  loading: boolean;
  error: string | null;
  starredTasks: EnhancedGoogleTask[];
  refreshTaskLists: () => Promise<void>;
  createTask: (taskListId: string, task: { title: string; notes?: string; due?: string; timezone?: string; parent?: string; estimated_minutes?: number }) => Promise<EnhancedGoogleTask | null>;
  updateTask: (taskListId: string, taskId: string, updates: Partial<EnhancedGoogleTask & { timezone?: string }>) => Promise<EnhancedGoogleTask | null>;
  deleteTask: (taskListId: string, taskId: string) => Promise<boolean>;
  moveTask: (sourceTaskListId: string, targetTaskListId: string, taskId: string) => Promise<EnhancedGoogleTask | null>;
  createTaskList: (title: string) => Promise<EnhancedGoogleTaskList | null>;
  updateTaskList: (taskListId: string, title: string) => Promise<EnhancedGoogleTaskList | null>;
  deleteTaskList: (taskListId: string) => Promise<boolean>;
  clearCompleted: (taskListId: string) => Promise<boolean>;
  toggleTaskStar: (taskListId: string, taskId: string) => Promise<EnhancedGoogleTask | null>;
  toggleTaskComplete: (taskListId: string, taskId: string) => Promise<EnhancedGoogleTask | null>;
  recordDuration: (taskListId: string, taskId: string, actualMinutes: number) => Promise<EnhancedGoogleTask | null>;
  filterTaskList: (taskListId: string, filterOption: TaskListFilterOption) => void;
  toggleTaskListVisibility: (taskListId: string) => void;
}

const GoogleTasksContext = createContext<GoogleTasksContextType | undefined>(undefined);

export const useGoogleTasks = () => {
  const context = useContext(GoogleTasksContext);
  if (context === undefined) {
    throw new Error('useGoogleTasks must be used within a GoogleTasksProvider');
  }
  return context;
};

interface GoogleTasksProviderProps {
  children: ReactNode;
}

export const GoogleTasksProvider: React.FC<GoogleTasksProviderProps> = ({ children }) => {
  const [taskLists, setTaskLists] = useState<EnhancedGoogleTaskList[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [starredTasks, setStarredTasks] = useState<EnhancedGoogleTask[]>([]);
  const { isAuthenticated } = useAuth();

  // Helper to update starred tasks
  const updateStarredTasks = useCallback((lists: EnhancedGoogleTaskList[]) => {
    const allStarredTasks = lists.flatMap(list => 
      list.tasks.filter(task => task.starred)
    );
    setStarredTasks(allStarredTasks);
  }, []);

  // Fetch all task lists
  const refreshTaskLists = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching Google Task lists...');
      const fetchedLists = await fetchGoogleTaskLists();
      
      // Enhance the task lists with local properties
      const enhancedLists: EnhancedGoogleTaskList[] = fetchedLists.map(list => ({
        ...list,
        isVisible: true,
        tasks: list.tasks.map(task => ({
          ...task,
          starred: task.is_starred || false // Use the server's is_starred value if available
        }))
      }));
      
      setTaskLists(enhancedLists);
      updateStarredTasks(enhancedLists);
    } catch (err) {
      console.error('Error fetching Google Task lists:', err);
      setError('Failed to load Google Task lists. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, updateStarredTasks]);

  // Create a new task
  const createTask = async (
    taskListId: string, 
    task: { title: string; notes?: string; due?: string; timezone?: string; parent?: string; estimated_minutes?: number }
  ): Promise<EnhancedGoogleTask | null> => {
    try {
      setError(null);
      const newTask = await createGoogleTask(taskListId, task);
      
      if (newTask) {
        // Add to local state
        const enhancedTask: EnhancedGoogleTask = {
          ...newTask,
          starred: false
        };
        
        setTaskLists(prevLists => 
          prevLists.map(list => 
            list.id === taskListId 
              ? { ...list, tasks: [...list.tasks, enhancedTask] } 
              : list
          )
        );
        
        return enhancedTask;
      }
      
      return null;
    } catch (err) {
      console.error('Error creating Google Task:', err);
      setError('Failed to create task. Please try again.');
      return null;
    }
  };

  // Update a task
  const updateTask = async (
    taskListId: string, 
    taskId: string, 
    updates: Partial<EnhancedGoogleTask & { timezone?: string }>
  ): Promise<EnhancedGoogleTask | null> => {
    try {
      setError(null);
      
      // Remove client-side properties before sending to API
      const { starred, ...apiUpdates } = updates;
      
      const updatedTask = await updateGoogleTask(taskListId, taskId, apiUpdates);
      
      if (updatedTask) {
        // Find the current task to preserve local properties
        let currentTask: EnhancedGoogleTask | undefined;
        taskLists.forEach(list => {
          if (list.id === taskListId) {
            const task = list.tasks.find(t => t.id === taskId);
            if (task) currentTask = task;
          }
        });
        
        // Create enhanced task with preserved local properties
        const enhancedTask: EnhancedGoogleTask = {
          ...updatedTask,
          starred: updates.starred !== undefined ? updates.starred : currentTask?.starred || false
        };
        
        // Update in state
        setTaskLists(prevLists => 
          prevLists.map(list => 
            list.id === taskListId 
              ? { 
                  ...list, 
                  tasks: list.tasks.map(task => 
                    task.id === taskId ? enhancedTask : task
                  ) 
                } 
              : list
          )
        );
        
        // Update starred tasks if needed
        if (updates.starred !== undefined) {
          updateStarredTasks(
            taskLists.map(list => 
              list.id === taskListId 
                ? { 
                    ...list, 
                    tasks: list.tasks.map(task => 
                      task.id === taskId ? enhancedTask : task
                    ) 
                  } 
                : list
            )
          );
        }
        
        return enhancedTask;
      }
      
      return null;
    } catch (err) {
      console.error('Error updating Google Task:', err);
      setError('Failed to update task. Please try again.');
      return null;
    }
  };

  // Delete a task
  const deleteTask = async (taskListId: string, taskId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await deleteGoogleTask(taskListId, taskId);
      
      if (success) {
        // Remove from local state
        setTaskLists(prevLists => 
          prevLists.map(list => 
            list.id === taskListId 
              ? { ...list, tasks: list.tasks.filter(task => task.id !== taskId) } 
              : list
          )
        );
        
        // Remove from starred tasks if present
        setStarredTasks(prevStarred => prevStarred.filter(task => !(task.id === taskId)));
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error deleting Google Task:', err);
      setError('Failed to delete task. Please try again.');
      return false;
    }
  };

  // Move a task between lists
  const moveTask = async (
    sourceTaskListId: string, 
    targetTaskListId: string, 
    taskId: string
  ): Promise<EnhancedGoogleTask | null> => {
    try {
      setError(null);
      
      // Find the original task to get its properties
      let originalTask: EnhancedGoogleTask | undefined;
      taskLists.forEach(list => {
        if (list.id === sourceTaskListId) {
          const task = list.tasks.find(t => t.id === taskId);
          if (task) originalTask = task;
        }
      });

      // If we can't find the task, return null
      if (!originalTask) {
        console.error("Could not find original task to move");
        return null;
      }
      
      // Create task data to send to the API
      const taskData = {
        title: originalTask.title,
        status: originalTask.status,
        notes: originalTask.notes,
        due: originalTask.due
      };
      
      const movedTask = await moveGoogleTask(
        sourceTaskListId, 
        targetTaskListId, 
        taskId,
        taskData
      );
      
      if (movedTask) {
        // Create enhanced task with preserved local properties
        const enhancedTask: EnhancedGoogleTask = {
          ...movedTask,
          starred: originalTask.starred || false
        };
        
        // Update state by removing from source and adding to target
        setTaskLists(prevLists => 
          prevLists.map(list => {
            if (list.id === sourceTaskListId) {
              return { ...list, tasks: list.tasks.filter(task => task.id !== taskId) };
            }
            if (list.id === targetTaskListId) {
              return { ...list, tasks: [...list.tasks, enhancedTask] };
            }
            return list;
          })
        );
        
        // Update starred tasks if the task is starred
        if (originalTask.starred) {
          updateStarredTasks(
            taskLists.map(list => {
              if (list.id === sourceTaskListId) {
                return { ...list, tasks: list.tasks.filter(task => task.id !== taskId) };
              }
              if (list.id === targetTaskListId) {
                return { ...list, tasks: [...list.tasks, enhancedTask] };
              }
              return list;
            })
          );
        }
        
        return enhancedTask;
      }
      
      return null;
    } catch (err) {
      console.error('Error moving Google Task:', err);
      setError('Failed to move task. Please try again.');
      return null;
    }
  };

  // Create a new task list
  const createTaskList = async (title: string): Promise<EnhancedGoogleTaskList | null> => {
    try {
      setError(null);
      const newList = await createGoogleTaskList(title);
      
      if (newList) {
        // Add to local state with enhanced properties
        const enhancedList: EnhancedGoogleTaskList = {
          ...newList,
          isVisible: true,
          tasks: [] // New list should have no tasks
        };
        
        setTaskLists(prevLists => [...prevLists, enhancedList]);
        
        return enhancedList;
      }
      
      return null;
    } catch (err) {
      console.error('Error creating Google Task list:', err);
      setError('Failed to create task list. Please try again.');
      return null;
    }
  };

  // Update a task list's title
  const updateTaskList = async (
    taskListId: string, 
    title: string
  ): Promise<EnhancedGoogleTaskList | null> => {
    try {
      setError(null);
      const updatedList = await updateGoogleTaskList(taskListId, title);
      
      if (updatedList) {
        // Update in local state while preserving enhanced properties
        setTaskLists(prevLists => 
          prevLists.map(list => 
            list.id === taskListId 
              ? { 
                  ...list, 
                  title: updatedList.title
                } 
              : list
          )
        );
        
        // Find the updated enhanced list
        const enhancedList = taskLists.find(list => list.id === taskListId);
        if (enhancedList) {
          return {
            ...updatedList,
            isVisible: enhancedList.isVisible,
            tasks: enhancedList.tasks
          };
        }
        
        return {
          ...updatedList,
          isVisible: true,
          tasks: []
        };
      }
      
      return null;
    } catch (err) {
      console.error('Error updating Google Task list:', err);
      setError('Failed to update task list. Please try again.');
      return null;
    }
  };

  // Delete a task list
  const deleteTaskList = async (taskListId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await deleteGoogleTaskList(taskListId);
      
      if (success) {
        // Find the list to remove starred tasks from it
        const listToRemove = taskLists.find(list => list.id === taskListId);
        
        // Remove the list from local state
        setTaskLists(prevLists => prevLists.filter(list => list.id !== taskListId));
        
        // Update starred tasks if any starred tasks were in this list
        if (listToRemove && listToRemove.tasks.some(task => task.starred)) {
          setStarredTasks(prevStarred => 
            prevStarred.filter(task => {
              // Keep tasks that aren't in the deleted list
              const taskInDeletedList = listToRemove.tasks.some(t => t.id === task.id);
              return !taskInDeletedList;
            })
          );
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error deleting Google Task list:', err);
      setError('Failed to delete task list. Please try again.');
      return false;
    }
  };

  // Clear completed tasks
  const clearCompleted = async (taskListId: string): Promise<boolean> => {
    try {
      setError(null);
      const success = await clearCompletedTasks(taskListId);
      
      if (success) {
        // Remove completed tasks from local state
        setTaskLists(prevLists => 
          prevLists.map(list => 
            list.id === taskListId 
              ? { 
                  ...list, 
                  tasks: list.tasks.filter(task => task.status !== 'completed')
                } 
              : list
          )
        );
        
        // Update starred tasks
        setStarredTasks(prevStarred => 
          prevStarred.filter(task => {
            // Keep tasks that aren't completed in this list
            const isCompleted = task.status === 'completed';
            const taskInThisList = taskLists.find(list => list.id === taskListId)?.tasks.some(t => t.id === task.id);
            return !(isCompleted && taskInThisList);
          })
        );
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error clearing completed Google Tasks:', err);
      setError('Failed to clear completed tasks. Please try again.');
      return false;
    }
  };

  // Toggle star status for a task
  const toggleTaskStar = async (taskListId: string, taskId: string): Promise<EnhancedGoogleTask | null> => {
    try {
      // Find the task
      let targetTask: EnhancedGoogleTask | undefined;
      let targetList: EnhancedGoogleTaskList | undefined;
      
      taskLists.forEach(list => {
        if (list.id === taskListId) {
          targetList = list;
          const task = list.tasks.find(t => t.id === taskId);
          if (task) targetTask = task;
        }
      });
      
      if (targetTask && targetList) {
        // Make API call to toggle star status
        const apiResponse = await toggleTaskStarApi(taskListId, taskId);
        
        if (!apiResponse) {
          console.error('API call to toggle star status failed');
          return null;
        }
        
        // Get the new star status from API response
        const isStarred = apiResponse.is_starred;
        
        // Update the task in the list
        const updatedLists = taskLists.map(list => 
          list.id === taskListId 
            ? { 
                ...list, 
                tasks: list.tasks.map(task => 
                  task.id === taskId 
                    ? { ...task, starred: isStarred } 
                    : task
                ) 
              } 
            : list
        );
        
        setTaskLists(updatedLists);
        
        // Update the starred tasks collection
        if (isStarred) {
          // Add to starred
          setStarredTasks(prev => [...prev, { ...targetTask!, starred: true }]);
        } else {
          // Remove from starred
          setStarredTasks(prev => prev.filter(task => task.id !== taskId));
        }
        
        return { ...targetTask, starred: isStarred };
      }
      
      return null;
    } catch (err) {
      console.error('Error toggling star status for Google Task:', err);
      setError('Failed to update task. Please try again.');
      return null;
    }
  };

  // Toggle completed status for a task
  const toggleTaskComplete = async (taskListId: string, taskId: string): Promise<EnhancedGoogleTask | null> => {
    try {
      // Find the task
      let targetTask: EnhancedGoogleTask | undefined;
      
      taskLists.forEach(list => {
        if (list.id === taskListId) {
          const task = list.tasks.find(t => t.id === taskId);
          if (task) targetTask = task;
        }
      });
      
      if (targetTask) {
        // Toggle the completed status
        const newStatus = targetTask.status === 'completed' ? 'needsAction' : 'completed';
        const completedDate = newStatus === 'completed' ? new Date().toISOString() : undefined;
        
        // Update via API
        const updatedTask = await updateTask(taskListId, taskId, {
          status: newStatus,
          completed: completedDate
        });
        
        return updatedTask;
      }
      
      return null;
    } catch (err) {
      console.error('Error toggling completion status for Google Task:', err);
      setError('Failed to update task. Please try again.');
      return null;
    }
  };

  // Record actual duration for a task
  const recordDuration = async (taskListId: string, taskId: string, actualMinutes: number): Promise<EnhancedGoogleTask | null> => {
    try {
      setError(null);
      const updatedTask = await recordTaskDuration(taskListId, taskId, actualMinutes);
      
      if (updatedTask) {
        // Update task in the list with updated duration
        const enhancedTask: EnhancedGoogleTask = {
          ...updatedTask,
          starred: false // Default to false, will be updated later if needed
        };
        
        // Find task in the list to check if it's starred
        taskLists.forEach(list => {
          if (list.id === taskListId) {
            const task = list.tasks.find(t => t.id === taskId);
            if (task && task.starred) {
              enhancedTask.starred = true;
            }
          }
        });
        
        // Update in taskLists
        setTaskLists(prevLists => 
          prevLists.map(list => 
            list.id === taskListId 
              ? { 
                  ...list, 
                  tasks: list.tasks.map(task => 
                    task.id === taskId 
                      ? enhancedTask 
                      : task
                  ) 
                } 
              : list
          )
        );
        
        return enhancedTask;
      }
      
      return null;
    } catch (err) {
      console.error('Error recording duration for Google Task:', err);
      setError('Failed to record task duration. Please try again.');
      return null;
    }
  };

  // Filter a task list
  const filterTaskList = (taskListId: string, filterOption: TaskListFilterOption): void => {
    // Find the list
    const targetList = taskLists.find(list => list.id === taskListId);
    
    if (targetList) {
      // Create a new sorted list of tasks
      let sortedTasks = [...targetList.tasks];
      
      switch (filterOption) {
        case 'myOrder':
          // Sort by original order (position property)
          sortedTasks.sort((a, b) => {
            if (!a.position || !b.position) return 0;
            return a.position.localeCompare(b.position);
          });
          break;
          
        case 'date':
          // Sort by due date, then by creation/update date
          sortedTasks.sort((a, b) => {
            // Tasks with due dates first
            if (a.due && !b.due) return -1;
            if (!a.due && b.due) return 1;
            
            // Both have due dates
            if (a.due && b.due) {
              return new Date(a.due).getTime() - new Date(b.due).getTime();
            }
            
            // Sort by updated date if available
            if (a.updated && b.updated) {
              return new Date(b.updated).getTime() - new Date(a.updated).getTime();
            }
            
            return 0;
          });
          break;
          
        case 'starredRecently':
          // Starred tasks first, then by updated date
          sortedTasks.sort((a, b) => {
            // Starred tasks first
            if (a.starred && !b.starred) return -1;
            if (!a.starred && b.starred) return 1;
            
            // Both starred or both not starred, sort by updated date
            if (a.updated && b.updated) {
              return new Date(b.updated).getTime() - new Date(a.updated).getTime();
            }
            
            return 0;
          });
          break;
          
        case 'title':
          // Sort alphabetically by title
          sortedTasks.sort((a, b) => {
            if (!a.title || !b.title) return 0;
            return a.title.localeCompare(b.title);
          });
          break;
      }
      
      // Update the task list with sorted tasks
      setTaskLists(prevLists => 
        prevLists.map(list => 
          list.id === taskListId 
            ? { ...list, tasks: sortedTasks } 
            : list
        )
      );
    }
  };

  // Toggle visibility of a task list
  const toggleTaskListVisibility = (taskListId: string): void => {
    setTaskLists(prevLists => 
      prevLists.map(list => 
        list.id === taskListId 
          ? { ...list, isVisible: !list.isVisible } 
          : list
      )
    );
  };

  // Load task lists when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, fetching Google Task lists...');
      refreshTaskLists();
    }
  }, [isAuthenticated, refreshTaskLists]);

  const value = {
    taskLists,
    loading,
    error,
    starredTasks,
    refreshTaskLists,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    createTaskList,
    updateTaskList,
    deleteTaskList,
    clearCompleted,
    toggleTaskStar,
    toggleTaskComplete,
    recordDuration,
    filterTaskList,
    toggleTaskListVisibility
  };

  return (
    <GoogleTasksContext.Provider value={value}>
      {children}
    </GoogleTasksContext.Provider>
  );
};

export default GoogleTasksContext; 