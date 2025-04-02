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
  dueDate?: string | null;
}

// Flag to control whether mock data should be used
// This should be controlled via environment variable in a real app
export let useMockData = true;

// Function to set whether mock data should be used
export const setUseMockData = (value: boolean) => {
  useMockData = value;
};

// Generate realistic mock task data
export const generateMockTasks = (): Task[] => {
  const mockTasks: Task[] = [];
  const currentDate = new Date();
  
  // Sample task data
  const taskTemplates = [
    {
      title: 'Create weekly project report',
      description: 'Generate performance report for the marketing team',
      priority: 'high',
      completed: 0,
      dueDays: 2 // Due in 2 days
    },
    {
      title: 'Schedule team meeting',
      description: 'Coordinate with team members for next sprint planning',
      priority: 'medium',
      completed: 1,
      completedDaysAgo: 1,
      dueDays: -1 // Due yesterday (past due)
    },
    {
      title: 'Review pull request',
      description: 'Review code changes for the new landing page',
      priority: 'high',
      completed: 0,
      dueDays: 1 // Due tomorrow
    },
    {
      title: 'Update documentation',
      description: 'Add new API endpoints to the developer documentation',
      priority: 'low',
      completed: 0,
      dueDays: 5 // Due in 5 days
    },
    {
      title: 'Send client proposal',
      description: 'Finalize and send the proposal to the new client',
      priority: 'high',
      completed: 1,
      completedDaysAgo: 2,
      dueDays: -2 // Due 2 days ago (past due)
    },
    {
      title: 'Research new technologies',
      description: 'Investigate new frameworks for the upcoming project',
      priority: 'medium',
      completed: 0,
      dueDays: 7 // Due in a week
    },
    {
      title: 'Prepare for presentation',
      description: 'Create slides for the stakeholder meeting',
      priority: 'medium',
      completed: 0,
      dueDays: 3 // Due in 3 days
    },
    {
      title: 'Fix bug in login form',
      description: 'Address reported issue with password reset functionality',
      priority: 'high',
      completed: 1,
      completedDaysAgo: 3,
      dueDays: -3 // Due 3 days ago (past due)
    }
  ];
  
  // Create tasks from templates
  taskTemplates.forEach((template, index) => {
    // Calculate dates
    const createdDate = new Date(currentDate);
    createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 14)); // Random day within last 2 weeks
    
    let completedDate = null;
    if (template.completed === 1 && template.completedDaysAgo !== undefined) {
      completedDate = new Date(currentDate);
      completedDate.setDate(completedDate.getDate() - template.completedDaysAgo);
    }
    
    // Calculate due date if provided
    let dueDate = null;
    if (template.dueDays !== undefined) {
      dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + template.dueDays);
      // Set due time to 5pm
      dueDate.setHours(17, 0, 0, 0);
    }
    
    // Create the task
    mockTasks.push({
      id: index + 1,
      user_id: 1,
      title: template.title,
      description: template.description,
      completed: template.completed,
      priority: template.priority,
      createdAt: createdDate.toISOString(),
      completedAt: completedDate ? completedDate.toISOString() : null,
      created_at: createdDate.toISOString(),
      updated_at: completedDate ? completedDate.toISOString() : createdDate.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null
    });
  });
  
  return mockTasks;
};

// Mock task data storage (in-memory)
let mockTasks: Task[] = [];

// Fetch user tasks from the API
export const fetchTasks = async (): Promise<Task[]> => {
  // Use mock data if flag is enabled
  if (useMockData) {
    // Initialize mock data if not already done
    if (mockTasks.length === 0) {
      mockTasks = generateMockTasks();
    }
    
    console.log('Using mock task data:', mockTasks.length, 'tasks');
    return Promise.resolve([...mockTasks]);
  }
  
  // Use real API
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
  // Use mock data if flag is enabled
  if (useMockData) {
    // Initialize mock data if not already done
    if (mockTasks.length === 0) {
      mockTasks = generateMockTasks();
    }
    
    // Simulate a small delay to mimic API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const now = new Date().toISOString();
    
    // Update existing task
    if (task.id) {
      const taskIndex = mockTasks.findIndex(t => t.id === task.id);
      
      if (taskIndex >= 0) {
        // Create updated task by merging existing with updates
        const updatedTask: Task = {
          ...mockTasks[taskIndex],
          ...task,
          updated_at: now
        };
        
        // Update completedAt if completed status is changing
        if (task.completed !== undefined) {
          updatedTask.completedAt = task.completed === 1 ? now : null;
        }
        
        // Update in mock database
        mockTasks[taskIndex] = updatedTask;
        
        console.log('Updated mock task:', updatedTask);
        return {...updatedTask};
      }
      
      return null;
    }
    
    // Create new task
    const newId = mockTasks.length > 0 ? Math.max(...mockTasks.map(t => t.id)) + 1 : 1;
    
    const newTask: Task = {
      id: newId,
      user_id: 1,
      title: task.title || 'New Task',
      description: task.description || '',
      completed: task.completed !== undefined ? task.completed : 0,
      priority: task.priority || 'medium',
      createdAt: now,
      completedAt: task.completed === 1 ? now : null,
      created_at: now,
      updated_at: now
    };
    
    mockTasks.push(newTask);
    console.log('Created new mock task:', newTask);
    
    return {...newTask};
  }
  
  // Use real API
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
  // Use mock data if flag is enabled
  if (useMockData) {
    // Initialize mock data if not already done
    if (mockTasks.length === 0) {
      mockTasks = generateMockTasks();
    }
    
    // Simulate a small delay to mimic API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const taskIndex = mockTasks.findIndex(t => t.id === taskId);
    
    if (taskIndex >= 0) {
      mockTasks.splice(taskIndex, 1);
      console.log(`Deleted mock task with ID ${taskId}`);
      return true;
    }
    
    return false;
  }
  
  // Use real API
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