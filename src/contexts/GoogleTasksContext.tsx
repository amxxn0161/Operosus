import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchTaskLists,
  createTask as createTaskAction,
  updateTask as updateTaskAction,
  deleteTaskAction,
  moveTaskBetweenLists,
  createTaskList as createTaskListAction,
  updateTaskList as updateTaskListAction,
  deleteTaskList as deleteTaskListAction,
  clearCompletedTasksAction,
  toggleTaskStar as toggleTaskStarAction,
  recordTaskDurationAction,
  filterTaskList as filterTaskListAction,
  setTaskListVisibility as setTaskListVisibilityAction,
  TaskListFilterOption,
  EnhancedGoogleTask,
  EnhancedGoogleTaskList,
  reorderTaskAction
} from '../store/slices/tasksSlice';

// Re-export the types so they can be imported from this file
export type { TaskListFilterOption, EnhancedGoogleTask, EnhancedGoogleTaskList };

// Define the context interface
interface GoogleTasksContextType {
  taskLists: EnhancedGoogleTaskList[];
  loading: boolean;
  error: string | null;
  starredTasks: EnhancedGoogleTask[];
  refreshTaskLists: (options?: { forceRefresh?: boolean }) => Promise<void>;
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
  reorderTask: (taskListId: string, taskId: string, previousTaskId: string | null, newIndex: number, applyReordering?: boolean) => Promise<EnhancedGoogleTask | null>;
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
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  
  // Get state from Redux store
  const taskLists = useAppSelector((state) => state.tasks.taskLists);
  const starredTasks = useAppSelector((state) => state.tasks.starredTasks);
  const loading = useAppSelector((state) => state.tasks.loading);
  const error = useAppSelector((state) => state.tasks.error);

  // Refresh task lists
  const refreshTaskLists = useCallback(async (options?: { forceRefresh?: boolean }) => {
    if (!isAuthenticated) return;
    await dispatch(fetchTaskLists({ forceRefresh: options?.forceRefresh }));
  }, [dispatch, isAuthenticated]);

  // Fetch tasks when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, fetching Google Task lists...');
      refreshTaskLists({ forceRefresh: false });
    }
  }, [isAuthenticated, refreshTaskLists]);

  // Create a new task
  const createTask = async (
    taskListId: string, 
    task: { title: string; notes?: string; due?: string; timezone?: string; parent?: string; estimated_minutes?: number }
  ): Promise<EnhancedGoogleTask | null> => {
    try {
      const resultAction = await dispatch(createTaskAction({ taskListId, taskData: task }));
      
      if (createTaskAction.fulfilled.match(resultAction)) {
        return resultAction.payload.task;
      }
      return null;
    } catch (err) {
      console.error('Error creating Google Task:', err);
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
      const resultAction = await dispatch(updateTaskAction({ taskListId, taskId, updates }));
      
      if (updateTaskAction.fulfilled.match(resultAction)) {
        return resultAction.payload.task;
      }
      return null;
    } catch (err) {
      console.error('Error updating Google Task:', err);
      return null;
    }
  };

  // Delete a task
  const deleteTask = async (taskListId: string, taskId: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(deleteTaskAction({ taskListId, taskId }));
      return deleteTaskAction.fulfilled.match(resultAction);
    } catch (err) {
      console.error('Error deleting Google Task:', err);
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
      const resultAction = await dispatch(
        moveTaskBetweenLists({ sourceTaskListId, targetTaskListId, taskId })
      );
      
      if (moveTaskBetweenLists.fulfilled.match(resultAction)) {
        return resultAction.payload.newTask;
      }
      return null;
    } catch (err) {
      console.error('Error moving Google Task:', err);
      return null;
    }
  };

  // Create a new task list
  const createTaskList = async (title: string): Promise<EnhancedGoogleTaskList | null> => {
    try {
      const resultAction = await dispatch(createTaskListAction(title));
      
      if (createTaskListAction.fulfilled.match(resultAction)) {
        return resultAction.payload;
      }
      return null;
    } catch (err) {
      console.error('Error creating Google Task list:', err);
      return null;
    }
  };

  // Update a task list
  const updateTaskList = async (
    taskListId: string, 
    title: string
  ): Promise<EnhancedGoogleTaskList | null> => {
    try {
      const resultAction = await dispatch(updateTaskListAction({ taskListId, title }));
      
      if (updateTaskListAction.fulfilled.match(resultAction)) {
        // Find the list in the state
        const list = taskLists.find(list => list.id === taskListId);
        if (list) {
          return { ...list, title };
        }
      }
      return null;
    } catch (err) {
      console.error('Error updating Google Task list:', err);
      return null;
    }
  };

  // Delete a task list
  const deleteTaskList = async (taskListId: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(deleteTaskListAction(taskListId));
      return deleteTaskListAction.fulfilled.match(resultAction);
    } catch (err) {
      console.error('Error deleting Google Task list:', err);
      return false;
    }
  };

  // Clear completed tasks
  const clearCompleted = async (taskListId: string): Promise<boolean> => {
    try {
      const resultAction = await dispatch(clearCompletedTasksAction(taskListId));
      return clearCompletedTasksAction.fulfilled.match(resultAction);
    } catch (err) {
      console.error('Error clearing completed Google Tasks:', err);
      return false;
    }
  };

  // Toggle a task's star status
  const toggleTaskStar = async (taskListId: string, taskId: string): Promise<EnhancedGoogleTask | null> => {
    try {
      const resultAction = await dispatch(toggleTaskStarAction({ taskListId, taskId }));
      
      if (toggleTaskStarAction.fulfilled.match(resultAction)) {
        return resultAction.payload.task;
      }
      return null;
    } catch (err) {
      console.error('Error toggling star for Google Task:', err);
      return null;
    }
  };

  // Toggle task completion status
  const toggleTaskComplete = async (taskListId: string, taskId: string): Promise<EnhancedGoogleTask | null> => {
    try {
      // Find the task
      const taskList = taskLists.find(list => list.id === taskListId);
      if (!taskList) return null;
      
      const task = taskList.tasks.find(task => task.id === taskId);
      if (!task) return null;
      
      // Determine new status
      const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
      
      // Update the task
      return await updateTask(taskListId, taskId, { 
        status: newStatus,
        completed: newStatus === 'completed' ? new Date().toISOString() : undefined
      });
    } catch (err) {
      console.error('Error toggling task completion status:', err);
      return null;
    }
  };

  // Record task duration
  const recordDuration = async (taskListId: string, taskId: string, actualMinutes: number): Promise<EnhancedGoogleTask | null> => {
    try {
      const resultAction = await dispatch(
        recordTaskDurationAction({ taskListId, taskId, actualMinutes })
      );
      
      if (recordTaskDurationAction.fulfilled.match(resultAction)) {
        return resultAction.payload.task;
      }
      return null;
    } catch (err) {
      console.error('Error recording duration for Google Task:', err);
      return null;
    }
  };

  // Filter a task list by option
  const filterTaskList = (taskListId: string, filterOption: TaskListFilterOption): void => {
    dispatch(filterTaskListAction({ taskListId, filterOption }));
  };

  // Toggle a task list's visibility
  const toggleTaskListVisibility = (taskListId: string): void => {
    const list = taskLists.find(list => list.id === taskListId);
    if (list) {
      // Toggle current visibility state
      dispatch(setTaskListVisibilityAction({ 
        taskListId, 
        isVisible: !(list.isVisible ?? true) 
      }));
    }
  };

  // Reorder a task
  const reorderTask = async (
    taskListId: string, 
    taskId: string, 
    previousTaskId: string | null,
    newIndex: number,
    applyReordering: boolean = false
  ): Promise<EnhancedGoogleTask | null> => {
    try {
      // Check if this is a move to the top position
      const moveToTop = newIndex === 0;
      
      const resultAction = await dispatch(
        reorderTaskAction({ 
          taskListId, 
          taskId, 
          previousTaskId, 
          newIndex,
          applyReordering 
        })
      );
      
      if (reorderTaskAction.fulfilled.match(resultAction)) {
        return resultAction.payload.task;
      }
      return null;
    } catch (err) {
      console.error('Error reordering Google Task:', err);
      return null;
    }
  };

  // Provide the context value
  const contextValue: GoogleTasksContextType = {
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
    toggleTaskListVisibility,
    reorderTask
  };

  return (
    <GoogleTasksContext.Provider value={contextValue}>
      {children}
    </GoogleTasksContext.Provider>
  );
}; 