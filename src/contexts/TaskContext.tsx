import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { fetchTasks, saveTask, deleteTask, Task } from '../services/taskService';
import { useAuth } from './AuthContext';

interface TaskContextType {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refreshTasks: () => Promise<void>;
  saveTaskItem: (task: Partial<Task>) => Promise<Task | null>;
  deleteTaskItem: (taskId: number) => Promise<boolean>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTask = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTask must be used within a TaskProvider');
  }
  return context;
};

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider: React.FC<TaskProviderProps> = ({ children }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const refreshTasks = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      const taskList = await fetchTasks();
      setTasks(taskList);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveTaskItem = async (task: Partial<Task>) => {
    try {
      setError(null);
      const savedTask = await saveTask(task);
      if (savedTask) {
        // If it's an update, replace the old task
        if (task.id) {
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === task.id ? savedTask : t)
          );
        } 
        // If it's a new task, add it to the list
        else {
          setTasks(prevTasks => [...prevTasks, savedTask]);
        }
      }
      return savedTask;
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Failed to save task. Please try again.');
      return null;
    }
  };

  const deleteTaskItem = async (taskId: number) => {
    try {
      setError(null);
      const success = await deleteTask(taskId);
      if (success) {
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
      }
      return success;
    } catch (err) {
      console.error('Error deleting task:', err);
      setError('Failed to delete task. Please try again.');
      return false;
    }
  };

  // Load tasks when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshTasks();
    } else {
      // Clear tasks when logged out
      setTasks([]);
    }
  }, [isAuthenticated]);

  const value = {
    tasks,
    loading,
    error,
    refreshTasks,
    saveTaskItem,
    deleteTaskItem
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export default TaskContext; 