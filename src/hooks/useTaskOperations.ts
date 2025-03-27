import { useState } from 'react';
import { useTask } from '../contexts/TaskContext';
import { Task } from '../services/taskService';

export const useTaskOperations = () => {
  const { tasks, loading, error, refreshTasks, saveTaskItem, deleteTaskItem } = useTask();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Add a new task with enhanced error handling
  const addTask = async (taskData: Partial<Task>): Promise<Task | null> => {
    setIsSaving(true);
    setOperationError(null);
    
    try {
      console.log('Creating new task with data:', taskData);
      const newTask = await saveTaskItem(taskData);
      
      if (newTask) {
        console.log('Task created successfully:', newTask);
        return newTask;
      } else {
        const errorMsg = 'Failed to create task - no response from server';
        console.error(errorMsg);
        setOperationError(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred while creating task';
      console.error('Error creating task:', err);
      setOperationError(errorMsg);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle task completion status with enhanced error handling
  const toggleTaskCompletion = async (task: Task): Promise<Task | null> => {
    setIsSaving(true);
    setOperationError(null);
    
    try {
      console.log(`Toggling task completion for task ID ${task.id}. Current status: ${task.completed}`);
      
      const updatedTask: Partial<Task> = {
        id: task.id,
        completed: task.completed === 0 ? 1 : 0,
        completedAt: task.completed === 0 ? new Date().toISOString() : null,
      };
      
      const result = await saveTaskItem(updatedTask);
      
      if (result) {
        console.log('Task status updated successfully:', result);
        return result;
      } else {
        const errorMsg = 'Failed to update task status - no response from server';
        console.error(errorMsg);
        setOperationError(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred while updating task';
      console.error('Error updating task:', err);
      setOperationError(errorMsg);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a task with enhanced error handling
  const removeTask = async (taskId: number): Promise<boolean> => {
    setIsDeleting(true);
    setOperationError(null);
    
    try {
      console.log(`Deleting task with ID ${taskId}`);
      const success = await deleteTaskItem(taskId);
      
      if (success) {
        console.log('Task deleted successfully');
        return true;
      } else {
        const errorMsg = 'Failed to delete task - no response from server';
        console.error(errorMsg);
        setOperationError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred while deleting task';
      console.error('Error deleting task:', err);
      setOperationError(errorMsg);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    tasks,
    loading,
    error: error || operationError,
    isSaving,
    isDeleting,
    refreshTasks,
    addTask,
    toggleTaskCompletion,
    removeTask,
    clearOperationError: () => setOperationError(null)
  };
}; 