import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button, 
  IconButton, 
  TextField, 
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Menu,
  MenuItem,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Card,
  CardHeader,
  CardContent,
  Snackbar,
  Alert,
  useTheme,
  useMediaQuery,
  ButtonGroup,
  Popover,
  Stack
} from '@mui/material';
import { DragDropContext, Droppable, Draggable, DropResult, DroppableProvided, DraggableProvided } from 'react-beautiful-dnd';
import { 
  Add as AddIcon, 
  MoreVert as MoreVertIcon, 
  Star as StarIcon, 
  StarBorder as StarBorderIcon, 
  FilterList as FilterListIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Sort as SortIcon,
  Check as CheckIcon,
  Refresh as RefreshIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Close as CloseIcon,
  AccessTime as AccessTimeIcon,
  Loop as LoopIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon
} from '@mui/icons-material';
import { useGoogleTasks, TaskListFilterOption, EnhancedGoogleTask, EnhancedGoogleTaskList } from '../contexts/GoogleTasksContext';
import { format, isValid, parseISO, addDays } from 'date-fns';
import { ENDPOINTS } from '../services/apiConfig';
import { checkAuthState } from '../services/authService';

// At the top of the file with other style definitions
const scrollbarStyles = {
  '&::-webkit-scrollbar': {
    width: '8px',
    height: '8px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
  },
};

const dialogContentStyles = {
  overflowY: 'auto',
  maxHeight: 'calc(100vh - 200px)',
  ...scrollbarStyles
};

const GoogleTasks: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const {
    taskLists,
    starredTasks,
    loading,
    error,
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
    filterTaskList,
    toggleTaskListVisibility
  } = useGoogleTasks();

  // State for task operations
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskListId, setNewTaskListId] = useState<string>('');
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState<boolean>(false);
  const [selectedTaskList, setSelectedTaskList] = useState<string | null>(null);
  const [taskAnchorEl, setTaskAnchorEl] = useState<null | HTMLElement>(null);
  const [taskListMenuAnchorEl, setTaskListMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTaskListId, setCurrentTaskListId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [filterMenuAnchorEl, setFilterMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [newTaskListTitle, setNewTaskListTitle] = useState<string>('');
  const [newTaskListDialogOpen, setNewTaskListDialogOpen] = useState<boolean>(false);
  const [editingTaskListId, setEditingTaskListId] = useState<string | null>(null);
  const [editTaskListTitle, setEditTaskListTitle] = useState<string>('');
  const [editTaskListDialogOpen, setEditTaskListDialogOpen] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  // Due date related state
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | null>(null);
  const [newTaskDueTime, setNewTaskDueTime] = useState<string | null>(null);
  const [datePickerAnchorEl, setDatePickerAnchorEl] = useState<HTMLElement | null>(null);
  const datePickerOpen = Boolean(datePickerAnchorEl);
  const [timePickerAnchorEl, setTimePickerAnchorEl] = useState<HTMLElement | null>(null);
  const timePickerOpen = Boolean(timePickerAnchorEl);

  // Task menu state
  const [taskMenuAnchorEl, setTaskMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTask, setSelectedTask] = useState<{taskListId: string; task: EnhancedGoogleTask} | null>(null);

  // Task editing state
  const [editTaskDialogOpen, setEditTaskDialogOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<{ taskListId: string; taskId: string; title: string; notes?: string; due?: string | null; status: string } | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState<string>('');
  const [editTaskNotes, setEditTaskNotes] = useState<string>('');
  const [editTaskDueDate, setEditTaskDueDate] = useState<string | null>(null);
  const [editTaskDueTime, setEditTaskDueTime] = useState<string | null>(null);
  const [editDatePickerAnchorEl, setEditDatePickerAnchorEl] = useState<HTMLElement | null>(null);
  const editDatePickerOpen = Boolean(editDatePickerAnchorEl);
  const [editTimePickerAnchorEl, setEditTimePickerAnchorEl] = useState<HTMLElement | null>(null);
  const editTimePickerOpen = Boolean(editTimePickerAnchorEl);

  // Add state for tracking expanded/collapsed completed sections
  const [expandedCompletedSections, setExpandedCompletedSections] = useState<Record<string, boolean>>({
    global: false
  });

  // Initialize default task list ID when data loads
  useEffect(() => {
    if (taskLists.length > 0 && !newTaskListId) {
      // Default to the first task list (usually "My Tasks")
      setNewTaskListId(taskLists[0].id);
    }
  }, [taskLists, newTaskListId]);

  // Handle refreshing task lists
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshTaskLists();
      showSnackbar('Tasks refreshed successfully', 'success');
    } catch (err) {
      showSnackbar('Failed to refresh tasks', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show snackbar notification
  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  // Handle closing snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Open task list options menu
  const handleTaskListMenuOpen = (event: React.MouseEvent<HTMLElement>, taskListId: string) => {
    setTaskListMenuAnchorEl(event.currentTarget);
    setCurrentTaskListId(taskListId);
  };

  // Close task list options menu
  const handleTaskListMenuClose = () => {
    setTaskListMenuAnchorEl(null);
    setCurrentTaskListId(null);
  };

  // Open filter menu
  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>, taskListId: string) => {
    setFilterMenuAnchorEl(event.currentTarget);
    setCurrentTaskListId(taskListId);
  };

  // Close filter menu
  const handleFilterMenuClose = () => {
    setFilterMenuAnchorEl(null);
    setCurrentTaskListId(null);
  };

  // Apply filter to a task list
  const handleFilterOption = (option: TaskListFilterOption) => {
    if (currentTaskListId) {
      filterTaskList(currentTaskListId, option);
      handleFilterMenuClose();
      showSnackbar(`Tasks sorted by ${option.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'success');
    }
  };

  // Open new task dialog
  const handleAddTaskClick = (taskListId: string) => {
    setNewTaskListId(taskListId);
    setNewTaskTitle('');
    setNewTaskNotes('');
    setNewTaskDueDate(null);
    setNewTaskDueTime(null);
    setNewTaskDialogOpen(true);
  };

  // Create a new task
  const handleCreateTask = async () => {
    if (newTaskTitle.trim() && newTaskListId) {
      try {
        let taskTitle = newTaskTitle.trim();
        let taskNotes = newTaskNotes.trim();
        let hasExplicitTimeSet = false;
        
        // If time is set, we'll send it to the backend which will add it to notes
        if (newTaskDueTime) {
          hasExplicitTimeSet = true;
          // No longer adding time to title - it will be in notes section
        }
        
        const taskData: { 
          title: string; 
          notes?: string; 
          due?: string;
          timezone?: string;
          time_in_notes?: boolean;
          has_explicit_time?: boolean;
        } = { 
          title: taskTitle,
          timezone: getUserTimezone(),
          time_in_notes: true // Add this parameter for the backend
        };
        
        // Clean notes of any existing time entries and add if not empty
        if (taskNotes) {
          // Remove any existing time entries from notes to prevent duplication
          const cleanedNotes = cleanNotesOfTimeEntries(taskNotes);
          taskData.notes = cleanedNotes;
        }
        
        // Add the ISO date string if date is set
        if (newTaskDueDate) {
          // Create a new date object from the state
          const dueDate = new Date(newTaskDueDate);
          let dueString = dueDate.toISOString();
          
          // If time is also set, replace the time part of the ISO string
          if (hasExplicitTimeSet && newTaskDueTime) {
            // Parse the time in 24h format
            const [hours, minutes] = newTaskDueTime.split(':');
            
            // Create a new date with the selected time
            const dueWithTime = new Date(dueDate);
            dueWithTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            
            // Replace with the new ISO string
            dueString = dueWithTime.toISOString();
            
            // Set has_explicit_time to true when a specific time is chosen
            taskData.has_explicit_time = true;
          } else {
            // Set has_explicit_time to false when only a date is chosen without specific time
            taskData.has_explicit_time = false;
          }
          
          taskData.due = dueString;
        }
        
        setIsRefreshing(true);
        const createdTask = await createTask(newTaskListId, taskData);
        setIsRefreshing(false);
        
        if (createdTask) {
          // Reset fields
          setNewTaskTitle('');
          setNewTaskNotes('');
          setNewTaskDueDate(null);
          setNewTaskDueTime(null);
          setNewTaskDialogOpen(false);
          
          // Show success message
          showSnackbar('Task created successfully', 'success');
          
          // Refresh the list
          await refreshTaskLists();
        }
      } catch (error) {
        console.error('Error creating task:', error);
        setIsRefreshing(false);
        showSnackbar('Failed to create task', 'error');
      }
    }
  };

  // Toggle task completion status
  const handleToggleTaskComplete = async (taskListId: string, taskId: string) => {
    try {
      const result = await toggleTaskComplete(taskListId, taskId);
      if (result) {
        showSnackbar(result.status === 'completed' ? 'Task completed' : 'Task marked as not completed', 'success');
      } else {
        showSnackbar('Failed to update task', 'error');
      }
    } catch (err) {
      showSnackbar('Error updating task', 'error');
    }
  };

  // Toggle task star status
  const handleToggleTaskStar = async (taskListId: string, taskId: string) => {
    try {
      const result = await toggleTaskStar(taskListId, taskId);
      if (result) {
        showSnackbar(result.starred ? 'Task starred' : 'Task unstarred', 'success');
      } else {
        showSnackbar('Failed to update task', 'error');
      }
    } catch (err) {
      showSnackbar('Error updating task', 'error');
    }
  };

  // Clear completed tasks from a list
  const handleClearCompleted = async () => {
    if (currentTaskListId) {
      try {
        const result = await clearCompleted(currentTaskListId);
        handleTaskListMenuClose();
        if (result) {
          showSnackbar('Completed tasks cleared', 'success');
        } else {
          showSnackbar('Failed to clear tasks', 'error');
        }
      } catch (err) {
        showSnackbar('Error clearing tasks', 'error');
      }
    }
  };

  // Toggle task list visibility
  const handleToggleVisibility = () => {
    if (currentTaskListId) {
      toggleTaskListVisibility(currentTaskListId);
      handleTaskListMenuClose();
      showSnackbar('Task list visibility toggled', 'success');
    }
  };

  // Open edit task list dialog
  const handleEditTaskList = () => {
    if (currentTaskListId) {
      const taskList = taskLists.find(list => list.id === currentTaskListId);
      if (taskList) {
        setEditingTaskListId(currentTaskListId);
        setEditTaskListTitle(taskList.title);
        setEditTaskListDialogOpen(true);
        handleTaskListMenuClose();
      }
    }
  };

  // Update task list title
  const handleUpdateTaskList = async () => {
    if (editingTaskListId && editTaskListTitle.trim()) {
      try {
        const result = await updateTaskList(editingTaskListId, editTaskListTitle.trim());
        if (result) {
          setEditTaskListDialogOpen(false);
          setEditingTaskListId(null);
          showSnackbar('Task list updated', 'success');
        } else {
          showSnackbar('Failed to update task list', 'error');
        }
      } catch (err) {
        showSnackbar('Error updating task list', 'error');
      }
    }
  };

  // Delete a task list
  const handleDeleteTaskList = async () => {
    if (currentTaskListId) {
      try {
        const result = await deleteTaskList(currentTaskListId);
        handleTaskListMenuClose();
        if (result) {
          showSnackbar('Task list deleted', 'success');
        } else {
          showSnackbar('Failed to delete task list', 'error');
        }
      } catch (err) {
        showSnackbar('Error deleting task list', 'error');
      }
    }
  };

  // Open new task list dialog
  const handleAddTaskListClick = () => {
    setNewTaskListTitle('');
    setNewTaskListDialogOpen(true);
  };

  // Create a new task list
  const handleCreateTaskList = async () => {
    if (newTaskListTitle.trim()) {
      try {
        const result = await createTaskList(newTaskListTitle.trim());
        if (result) {
          setNewTaskListDialogOpen(false);
          showSnackbar('Task list created', 'success');
        } else {
          showSnackbar('Failed to create task list', 'error');
        }
      } catch (err) {
        showSnackbar('Error creating task list', 'error');
      }
    }
  };

  // Move a task within a task list (reorder)
  const reorderTask = async (taskListId: string, taskId: string, previousTaskId: string | null) => {
    try {
      // Get auth token
      const { token } = checkAuthState();
      if (!token) {
        console.error('No authentication token available');
        return null;
      }

      // Prepare the request body
      const requestBody: { previous?: string } = {};
      
      // If previousTaskId is provided, set it in the request body
      // This means "position this task after the task with previousTaskId"
      // If previousTaskId is null, the task will be positioned at the top
      if (previousTaskId) {
        requestBody.previous = previousTaskId;
      }
      
      // Construct the full URL using the API base URL and endpoints from config
      const endpoint = `${ENDPOINTS.GOOGLE_TASKS}/${taskListId}/tasks/${taskId}/move`;
      const fullUrl = `https://app2.operosus.com${endpoint}`;
      
      // Make the API call to move the task
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Origin': window.location.origin
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        return data.task;
      } else {
        console.error('Failed to reorder task:', data.message);
        return null;
      }
    } catch (err) {
      console.error('Error reordering task:', err);
      return null;
    }
  };

  // Handle drag and drop of tasks
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    
    // Dropped outside a droppable area
    if (!destination) {
      return;
    }
    
    // Dropped in the same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }
    
    // Find source and destination task lists
    const sourceTaskListId = source.droppableId;
    const destinationTaskListId = destination.droppableId;
    
    // Find the task being moved
    const sourceList = taskLists.find(list => list.id === sourceTaskListId);
    if (!sourceList || sourceList.tasks.length <= source.index) {
      return;
    }
    
    const taskId = sourceList.tasks[source.index].id;
    
    // If moving between different lists
    if (sourceTaskListId !== destinationTaskListId) {
      try {
        const result = await moveTask(sourceTaskListId, destinationTaskListId, taskId);
        if (result) {
          showSnackbar('Task moved successfully', 'success');
        } else {
          showSnackbar('Failed to move task', 'error');
        }
      } catch (err) {
        showSnackbar('Error moving task', 'error');
      }
    } 
    // Reordering within the same list
    else {
      try {
        // Get the destination list (same as source list in this case)
        const destList = taskLists.find(list => list.id === destinationTaskListId);
        if (!destList) return;
        
        // Filter to get only incomplete tasks as those are the ones being reordered in UI
        const incompleteTasks = destList.tasks.filter(task => task.status !== 'completed');
        
        // Determine the previous task ID
        // If dropped at the beginning (index 0), use null as previousTaskId (place at the top)
        // Otherwise, use the ID of the task that should come before it
        let previousTaskId: string | null = null;
        
        if (destination.index > 0) {
          // Get the task ID of the item before the new position
          previousTaskId = incompleteTasks[destination.index - 1].id;
          
          // Critical fix: Make sure a task is never positioned after itself
          // If the previousTaskId is the same as the taskId being moved, we need to adjust
          if (previousTaskId === taskId) {
            // If dragging down in the list, use the task that was before the destination instead
            if (source.index < destination.index && destination.index - 1 > 0) {
              previousTaskId = incompleteTasks[destination.index - 2].id;
            } 
            // If that's not possible or we're dragging up, position at the top
            else {
              previousTaskId = null;
            }
          }
        }
        
        // Make the API call to reorder
        const result = await reorderTask(destinationTaskListId, taskId, previousTaskId);
        
        if (result) {
          showSnackbar('Task reordered successfully', 'success');
          
          // Refresh the task lists to reflect the new order
          await refreshTaskLists();
        } else {
          showSnackbar('Failed to reorder task', 'error');
        }
      } catch (err) {
        console.error('Error reordering task:', err);
        showSnackbar('Error reordering task', 'error');
      }
    }
  };

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      
      // Always show just the date part (time will appear in the title)
      return format(date, 'MMM d, yyyy');
    } catch (e) {
      return '';
    }
  };

  // Check if a date is overdue (in the past)
  const isOverdue = (dateString?: string | null): boolean => {
    if (!dateString) return false;
    
    try {
      const dueDate = parseISO(dateString);
      if (!isValid(dueDate)) return false;
      
      // Set due date to end of day for comparison
      const dueDateEndOfDay = new Date(dueDate);
      dueDateEndOfDay.setHours(23, 59, 59, 999);
      
      // Compare with current date
      return dueDateEndOfDay < new Date();
    } catch (e) {
      return false;
    }
  };

  // Handle date picker open
  const handleDatePickerOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDatePickerAnchorEl(event.currentTarget);
  };
  
  // Handle date picker close
  const handleDatePickerClose = () => {
    setDatePickerAnchorEl(null);
  };
  
  // Handle time picker open
  const handleTimePickerOpen = (event: React.MouseEvent<HTMLElement>) => {
    setTimePickerAnchorEl(event.currentTarget);
  };
  
  // Handle time picker close
  const handleTimePickerClose = () => {
    setTimePickerAnchorEl(null);
  };
  
  // Set task due time
  const handleSetDueTime = (time: string | null) => {
    if (time) {
      // Ensure time is properly formatted with leading zeros
      const [hours, minutes] = time.split(':').map(Number);
      // Format as HH:MM with leading zeros
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      console.log(`Setting due time from ${time} to formatted: ${formattedTime}`);
      setNewTaskDueTime(formattedTime);
    } else {
      setNewTaskDueTime(null);
    }
    handleTimePickerClose();
  };
  
  // Clear due time
  const handleClearDueTime = () => {
    setNewTaskDueTime(null);
  };
  
  // Set task due date
  const handleSetDueDate = (dueDate: Date | null) => {
    if (dueDate) {
      // Set time to midnight instead of noon to avoid showing time when none was set
      const fixedDate = new Date(dueDate);
      fixedDate.setHours(0, 0, 0, 0);
      
      // Format date to RFC3339 as expected by the API
      const isoDate = fixedDate.toISOString();
      setNewTaskDueDate(isoDate);
    } else {
      setNewTaskDueDate(null);
    }
    handleDatePickerClose();
  };
  
  // Set today as due date
  const handleSetToday = () => {
    handleSetDueDate(new Date());
  };
  
  // Set tomorrow as due date
  const handleSetTomorrow = () => {
    const tomorrow = addDays(new Date(), 1);
    handleSetDueDate(tomorrow);
  };
  
  // Clear due date
  const handleClearDueDate = () => {
    setNewTaskDueDate(null);
  };

  // Format date for display in a concise way
  const formatDisplayDate = (dateString?: string | null, timeString?: string | null) => {
    if (!dateString) return '';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const dateToCheck = new Date(date);
      dateToCheck.setHours(0, 0, 0, 0);
      
      let displayDate = '';
      if (dateToCheck.getTime() === today.getTime()) {
        displayDate = 'Today';
      } else if (dateToCheck.getTime() === tomorrow.getTime()) {
        displayDate = 'Tomorrow';
      } else {
        displayDate = format(date, 'MMM d, yyyy');
      }
      
      // Add time if provided
      if (timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const timeDate = new Date();
        timeDate.setHours(hours, minutes, 0, 0);
        const formattedTime = format(timeDate, 'h:mm a'); // 1:30 PM format
        
        return `${displayDate}, ${formattedTime}`;
      }
      
      return displayDate;
    } catch (e) {
      return '';
    }
  };

  // Open task edit dialog
  const handleTaskClick = (taskListId: string, task: EnhancedGoogleTask) => {
    // Time is now stored in notes, not in title
    let timeString = null;
    let notes = task.notes || '';
    
    // Find all time entries in the notes, and use the most recent (last) one
    const timeMatches = [...notes.matchAll(/Due Time: (\d{1,2}:\d{2}(?:\s?[AP]M)?)/g)];
    if (timeMatches.length > 0) {
      // Use the last time entry (most recently added)
      const lastMatch = timeMatches[timeMatches.length - 1];
      timeString = lastMatch[1];
    }
    
    setEditingTask({
      taskListId,
      taskId: task.id,
      title: task.title,
      notes: notes,
      due: task.due || null,
      status: task.status
    });
    
    setEditTaskTitle(task.title);
    setEditTaskNotes(notes);
    setEditTaskDueDate(task.due || null);
    
    // If we found time in the notes, convert it to 24h format for the time picker
    if (timeString) {
      // Parse the time string (e.g., "3:00 AM" or "07:30")
      const timeParts = timeString.match(/(\d{1,2}):(\d{2})(?:\s?([AP]M))?/i);
      
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = timeParts[2];
        const period = timeParts[3];
        
        // Convert to 24-hour format if AM/PM is present
        if (period) {
          if (period.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
          } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }
        
        // Format as HH:MM with leading zeros
        const time24h = `${hours.toString().padStart(2, '0')}:${minutes}`;
        setEditTaskDueTime(time24h);
      } else {
        // If there's an issue parsing, default to null
        setEditTaskDueTime(null);
      }
    } else if (task.due) {
      // If no time in notes but due date exists, check if the API returned non-midnight time
      const dueDate = new Date(task.due);
      const hours = dueDate.getHours();
      const minutes = dueDate.getMinutes();
      
      // Only set time if hours/minutes are not defaults (midnight or noon)
      if ((hours !== 0 && hours !== 12) || minutes !== 0) {
        setEditTaskDueTime(`${hours.toString().padStart(2, '0')}:${minutes === 0 ? '00' : minutes.toString().padStart(2, '0')}`);
      } else {
        setEditTaskDueTime(null);
      }
    } else {
      setEditTaskDueTime(null);
    }
    
    setEditTaskDialogOpen(true);
  };

  // Open task options menu
  const handleTaskMenuOpen = (event: React.MouseEvent<HTMLElement>, taskListId: string, task: EnhancedGoogleTask) => {
    event.stopPropagation();
    setTaskMenuAnchorEl(event.currentTarget);
    setSelectedTask({ taskListId, task });
  };

  // Close task options menu
  const handleTaskMenuClose = () => {
    setTaskMenuAnchorEl(null);
    setSelectedTask(null);
  };

  // Handle edit task from menu
  const handleEditTaskFromMenu = () => {
    if (selectedTask) {
      handleTaskClick(selectedTask.taskListId, selectedTask.task);
      handleTaskMenuClose();
    }
  };

  // Handle delete task from menu
  const handleDeleteTaskFromMenu = async () => {
    if (selectedTask) {
      try {
        const result = await deleteTask(selectedTask.taskListId, selectedTask.task.id);
        if (result) {
          showSnackbar('Task deleted successfully', 'success');
        } else {
          showSnackbar('Failed to delete task', 'error');
        }
        handleTaskMenuClose();
      } catch (err) {
        showSnackbar('Error deleting task', 'error');
      }
    }
  };

  // Helper function to remove existing time entries from notes
  const cleanNotesOfTimeEntries = (notes: string): string => {
    if (!notes) return '';
    
    // Remove all "Due Time: XX:XX" entries (including any following line breaks)
    return notes.replace(/Due Time: \d{1,2}:\d{2}(?:\s?[AP]M)?(\r?\n|\r)?/g, '').trim();
  };

  // Update an existing task
  const handleUpdateTask = async () => {
    if (editingTask && editTaskTitle.trim()) {
      try {
        let taskTitle = editTaskTitle.trim();
        let hasExplicitTimeSet = false;
        
        // If time is set, we'll send it to the backend to add to notes
        if (editTaskDueTime) {
          hasExplicitTimeSet = true;
          // No longer adding time to title - it will be in notes section
        }
        
        const taskData: { 
          title: string; 
          notes?: string; 
          due?: string;
          status?: string;
          timezone?: string;
          time_in_notes?: boolean;
          has_explicit_time?: boolean;
        } = { 
          title: taskTitle,
          timezone: getUserTimezone(),
          time_in_notes: true // Add this parameter for backend
        };
        
        // Clean notes of any existing time entries and add if not empty
        if (editTaskNotes.trim()) {
          // Remove any existing time entries from notes to prevent duplication
          const cleanedNotes = cleanNotesOfTimeEntries(editTaskNotes);
          taskData.notes = cleanedNotes;
        }
        
        // Add due date if it exists
        if (editTaskDueDate) {
          // Create a new date object from the state
          const dueDate = new Date(editTaskDueDate);
          let dueString = dueDate.toISOString();
          
          // If time is also set, replace the time part of the ISO string
          if (hasExplicitTimeSet && editTaskDueTime) {
            // Parse the time in 24h format
            const [hours, minutes] = editTaskDueTime.split(':');
            
            // Create a new date with the selected time
            const dueWithTime = new Date(dueDate);
            dueWithTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
            
            // Replace with the new ISO string
            dueString = dueWithTime.toISOString();
            
            // Set has_explicit_time to true when a specific time is chosen
            taskData.has_explicit_time = true;
          } else {
            // Set has_explicit_time to false when only a date is chosen without specific time
            taskData.has_explicit_time = false;
          }
          
          taskData.due = dueString;
        }
        
        const result = await updateTask(editingTask.taskListId, editingTask.taskId, taskData);
        if (result) {
          setEditTaskDialogOpen(false);
          showSnackbar('Task updated successfully', 'success');
        } else {
          showSnackbar('Failed to update task', 'error');
        }
      } catch (err) {
        showSnackbar('Error updating task', 'error');
      }
    }
  };

  // Handle edit date picker open
  const handleEditDatePickerOpen = (event: React.MouseEvent<HTMLElement>) => {
    setEditDatePickerAnchorEl(event.currentTarget);
  };
  
  // Handle edit date picker close
  const handleEditDatePickerClose = () => {
    setEditDatePickerAnchorEl(null);
  };
  
  // Handle edit time picker open
  const handleEditTimePickerOpen = (event: React.MouseEvent<HTMLElement>) => {
    setEditTimePickerAnchorEl(event.currentTarget);
  };
  
  // Handle edit time picker close
  const handleEditTimePickerClose = () => {
    setEditTimePickerAnchorEl(null);
  };
  
  // Set task due date in edit mode
  const handleSetEditDueDate = (dueDate: Date | null) => {
    if (dueDate) {
      // Set time to midnight instead of noon to avoid showing time when none was set
      const fixedDate = new Date(dueDate);
      fixedDate.setHours(0, 0, 0, 0);
      
      // Format date to RFC3339 as expected by the API
      const isoDate = fixedDate.toISOString();
      setEditTaskDueDate(isoDate);
    } else {
      setEditTaskDueDate(null);
    }
    handleEditDatePickerClose();
  };
  
  // Set today as due date in edit mode
  const handleSetEditToday = () => {
    handleSetEditDueDate(new Date());
  };
  
  // Set tomorrow as due date in edit mode
  const handleSetEditTomorrow = () => {
    const tomorrow = addDays(new Date(), 1);
    handleSetEditDueDate(tomorrow);
  };
  
  // Clear due date in edit mode
  const handleClearEditDueDate = () => {
    setEditTaskDueDate(null);
  };
  
  // Set task due time in edit mode
  const handleSetEditDueTime = (time: string | null) => {
    if (time) {
      // Ensure time is properly formatted with leading zeros
      const [hours, minutes] = time.split(':').map(Number);
      // Format as HH:MM with leading zeros
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      console.log(`Setting edit due time from ${time} to formatted: ${formattedTime}`);
      setEditTaskDueTime(formattedTime);
    } else {
      setEditTaskDueTime(null);
    }
    handleEditTimePickerClose();
  };
  
  // Clear due time in edit mode
  const handleClearEditDueTime = () => {
    setEditTaskDueTime(null);
  };

  // Format 24-hour time to 12-hour format with AM/PM
  const formatTimeFor12Hour = (time24h: string): string => {
    const [hours, minutes] = time24h.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Get the user's current timezone in IANA format (e.g., "America/New_York")
  const getUserTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      console.error('Error getting timezone:', e);
      return 'UTC'; // Default to UTC if unable to get timezone
    }
  };

  // Format the due information, showing both date and notes with time
  const formatDueInfoWithNotes = (task: EnhancedGoogleTask) => {
    let dueInfo = [];
    
    // Add the due date if present
    if (task.due) {
      dueInfo.push(`Due: ${formatDate(task.due)}`);
    }
    
    // Check if notes contain time information
    if (task.notes) {
      // Find all time entries in the notes
      const timeMatches = [...task.notes.matchAll(/Due Time: (\d{1,2}:\d{2}(?:\s?[AP]M)?)/g)];
      
      // If we found any time entries, use the last one (most recently added)
      if (timeMatches.length > 0) {
        const lastMatch = timeMatches[timeMatches.length - 1];
        dueInfo.push(lastMatch[0]);
      }
    }
    
    return dueInfo.join(' | ');
  };

  // Add function to toggle completed section for a specific task list
  const toggleCompletedSection = (taskListId: string) => {
    setExpandedCompletedSections(prev => ({
      ...prev,
      [taskListId]: !prev[taskListId]
    }));
  };

  // Set global scrollbar styles for all scrollable containers
  const scrollbarStyles = {
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-track': {
      backgroundColor: 'rgba(0,0,0,0.05)',
    },
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(0,0,0,0.2) rgba(0,0,0,0.05)',
  };

  // Fix DialogContent components to properly scroll
  const dialogContentStyles = {
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 200px)',
    ...scrollbarStyles,
  };

  // Add a useEffect for the pending tasks modal specifically
  useEffect(() => {
    // We need to find the pending tasks container and ensure it has proper overflow
    const pendingTasksContainer = document.querySelector('.pending-tasks-container');
    if (pendingTasksContainer) {
      // Add scrolling styles to the inner container that holds the tasks
      const tasksSection = pendingTasksContainer.querySelector('.tasks-section');
      if (tasksSection) {
        (tasksSection as HTMLElement).style.overflowY = 'auto';
        (tasksSection as HTMLElement).style.maxHeight = 'calc(100vh - 200px)';
      }
    }
  }, []);

  // Since we can't locate the exact Pending Tasks component, add an additional useEffect
  // that will apply styling to any matching elements that appear in the DOM
  useEffect(() => {
    // Create a mutation observer to detect when the pending tasks view is added to the DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          // Look for the pending-tasks-popup class or elements with text content "Pending tasks"
          const pendingTasksPopup = document.querySelector('.pending-tasks-popup');
          
          if (pendingTasksPopup) {
            // Find the content area that needs to scroll by data attribute
            const contentArea = pendingTasksPopup.querySelector('[data-scrollable="pending-tasks"]');
            
            if (contentArea) {
              // Apply scrolling styles
              (contentArea as HTMLElement).style.overflowY = 'auto';
              (contentArea as HTMLElement).style.maxHeight = 'calc(100vh - 200px)';
              (contentArea as HTMLElement).style.flexGrow = '1';
              
              // We're not applying scrollbar styles here as they're already in the component's sx prop
              console.log('Applied scrolling styles to Pending tasks popup');
            }
          } else {
            // Fallback to previous approach if the class is not found
            const pendingTasksHeaders = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div');
            
            pendingTasksHeaders.forEach((element) => {
              if (element.textContent?.includes('Pending tasks')) {
                // Find the container
                const container = element.closest('.MuiDialog-paper') || element.closest('.MuiPopover-paper');
                if (container) {
                  // Try to find the content area using the data attribute first
                  let contentArea = container.querySelector('[data-scrollable="pending-tasks"]');
                  
                  // If not found, fall back to standard Material-UI classes
                  if (!contentArea) {
                    contentArea = container.querySelector('.MuiDialogContent-root') || 
                                container.querySelector('.MuiCardContent-root') ||
                                container.querySelector('.tasks-section');
                  }
                  
                  if (contentArea) {
                    // Apply scrolling styles
                    (contentArea as HTMLElement).style.overflowY = 'auto';
                    (contentArea as HTMLElement).style.maxHeight = 'calc(100vh - 200px)';
                    (contentArea as HTMLElement).style.flexGrow = '1';
                    
                    console.log('Applied scrolling styles to content area in Pending tasks popup');
                  }
                }
              }
            });
          }
        }
      });
    });
    
    // Start observing the document with the configured parameters
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Clean up
    return () => {
      observer.disconnect();
    };
  }, []);

  // Add expandable content styles definition
  const expandableContentStyles = {
    maxHeight: '300px', // Fixed height to force scrolling when content exceeds this height
    overflowY: 'auto',
    overflowX: 'hidden',
    ...scrollbarStyles
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
        >
          Google Tasks
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddTaskListClick}
            sx={{
              borderColor: '#1056F5',
              color: '#1056F5',
              fontFamily: 'Poppins',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#0D47D9',
                backgroundColor: '#f5f9ff',
              },
            }}
          >
            New List
          </Button>
          <Button 
            variant="contained" 
            startIcon={isRefreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            onClick={handleRefresh}
            disabled={isRefreshing} 
            sx={{
              backgroundColor: '#1056F5',
              color: 'white',
              fontFamily: 'Poppins',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Loading state */}
      {loading && !isRefreshing && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Starred Tasks Section */}
      {!loading && starredTasks.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'visible'
          }}>
            <CardHeader
              title={
                <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                  Starred Tasks
                </Typography>
              }
              sx={{ 
                bgcolor: 'rgba(16, 86, 245, 0.08)', 
                pb: 1.5,
                '& .MuiCardHeader-content': { overflow: 'hidden' }
              }}
            />
            <CardContent sx={{ px: 2, py: 1 }}>
              <List sx={{ py: 0 }}>
                {starredTasks.map((task) => {
                  const taskList = taskLists.find(list => 
                    list.tasks.some(t => t.id === task.id)
                  );
                  
                  return (
                    <ListItem
                      key={task.id}
                      sx={{
                        py: 1,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: '40px' }}>
                        <Checkbox
                          checked={task.status === 'completed'}
                          onChange={(e) => {
                            e.stopPropagation();
                            taskList && handleToggleTaskComplete(taskList.id, task.id);
                          }}
                          edge="start"
                          sx={{ 
                            color: task.status === 'completed' ? 'rgba(0, 0, 0, 0.38)' : '#1056F5'
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                              fontFamily: 'Poppins',
                            }}
                          >
                            {task.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            {/* Show due date and time information from notes */}
                            {(task.due || (task.notes && task.notes.includes("Due Time"))) && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontFamily: 'Poppins',
                                  color: isOverdue(task.due) ? 'error.main' : 'text.secondary',
                                  display: 'block'
                                }}
                              >
                                {formatDueInfoWithNotes(task)}
                              </Typography>
                            )}
                            
                            {/* Show other notes content if any (excluding the time information) */}
                            {task.notes && !task.notes.includes("Due Time") && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontFamily: 'Poppins',
                                  color: 'text.secondary',
                                  display: 'block',
                                  mt: 0.5,
                                  // Limit to 2 lines with ellipsis
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {task.notes}
                              </Typography>
                            )}
                          </>
                        }
                      />
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          taskList && handleToggleTaskStar(taskList.id, task.id);
                        }}
                        sx={{ color: '#FFD700', mr: 1 }}
                      >
                        <StarIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleTaskMenuOpen(e, taskList?.id || '', task)}
                        size="small"
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  );
                })}
              </List>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Task Lists Section */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Grid container spacing={3}>
          {!loading && taskLists.length > 0 ? (
            taskLists.filter(list => list.isVisible !== false).map((taskList) => (
              <Grid item xs={12} sm={6} md={4} key={taskList.id}>
                <Card sx={{ 
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'visible'
                }}>
                  <CardHeader
                    title={
                      <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                        {taskList.title}
                      </Typography>
                    }
                    action={
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton 
                          onClick={(e) => handleFilterMenuOpen(e, taskList.id)} 
                          size="small"
                        >
                          <FilterListIcon fontSize="small" />
                        </IconButton>
                        <IconButton 
                          onClick={(e) => handleTaskListMenuOpen(e, taskList.id)} 
                          size="small"
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    }
                    sx={{ 
                      bgcolor: 'rgba(16, 86, 245, 0.08)', 
                      pb: 1.5,
                      '& .MuiCardHeader-content': { overflow: 'hidden' }
                    }}
                  />
                  <CardContent 
                    sx={{ 
                      px: 2, 
                      py: 1, 
                      flexGrow: 1, 
                      overflowY: 'auto', 
                      overflowX: 'hidden', // Prevent horizontal scrolling
                      maxHeight: '50vh',
                      ...scrollbarStyles
                    }}
                  >
                    <Droppable droppableId={taskList.id}>
                      {(provided: DroppableProvided) => (
                        <List 
                          ref={(el) => provided.innerRef(el)}
                          {...provided.droppableProps}
                          sx={{ py: 0 }}
                        >
                          {taskList.tasks.filter(task => task.status !== 'completed').length > 0 ? (
                            taskList.tasks.filter(task => task.status !== 'completed').map((task, index) => (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                              >
                                {(provided: DraggableProvided) => (
                                  <ListItem
                                    ref={(el) => provided.innerRef(el)}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    sx={{
                                      py: 1,
                                      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                                      '&:last-child': { borderBottom: 'none' }
                                    }}
                                  >
                                    <ListItemIcon sx={{ minWidth: '40px' }}>
                                      <Checkbox
                                        checked={task.status === 'completed'}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleToggleTaskComplete(taskList.id, task.id);
                                        }}
                                        edge="start"
                                        sx={{ 
                                          color: task.status === 'completed' ? 'rgba(0, 0, 0, 0.38)' : '#1056F5'
                                        }}
                                      />
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={
                                        <Typography
                                          sx={{
                                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                            color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                                            fontFamily: 'Poppins',
                                          }}
                                        >
                                          {task.title}
                                        </Typography>
                                      }
                                      secondary={
                                        <>
                                          {/* Show due date and time information from notes */}
                                          {(task.due || (task.notes && task.notes.includes("Due Time"))) && (
                                            <Typography 
                                              variant="caption" 
                                              sx={{ 
                                                fontFamily: 'Poppins',
                                                color: isOverdue(task.due) ? 'error.main' : 'text.secondary',
                                                display: 'block'
                                              }}
                                            >
                                              {formatDueInfoWithNotes(task)}
                                            </Typography>
                                          )}
                                          
                                          {/* Show other notes content if any (excluding the time information) */}
                                          {task.notes && !task.notes.includes("Due Time") && (
                                            <Typography 
                                              variant="caption" 
                                              sx={{ 
                                                fontFamily: 'Poppins',
                                                color: 'text.secondary',
                                                display: 'block',
                                                mt: 0.5,
                                                // Limit to 2 lines with ellipsis
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical'
                                              }}
                                            >
                                              {task.notes}
                                            </Typography>
                                          )}
                                        </>
                                      }
                                    />
                                    <IconButton
                                      edge="end"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleTaskStar(taskList.id, task.id);
                                      }}
                                      sx={{ color: task.starred ? '#FFD700' : 'action.disabled', mr: 1 }}
                                    >
                                      {task.starred ? <StarIcon /> : <StarBorderIcon />}
                                    </IconButton>
                                    <IconButton
                                      edge="end"
                                      onClick={(e) => handleTaskMenuOpen(e, taskList.id, task)}
                                      size="small"
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </ListItem>
                                )}
                              </Draggable>
                            ))
                          ) : (
                            <Box 
                              sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                py: 4,
                                textAlign: 'center',
                                color: 'text.secondary',
                              }}
                            >
                              <AssignmentOutlinedIcon
                                sx={{
                                  fontSize: 80,
                                  mb: 2,
                                  color: 'rgba(16, 86, 245, 0.6)',
                                }}
                              />
                              <Typography 
                                variant="h6" 
                                sx={{ 
                                  fontWeight: 'medium', 
                                  color: 'text.primary',
                                  mb: 1
                                }}
                              >
                                No tasks yet
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: 'text.secondary',
                                  maxWidth: '80%'
                                }}
                              >
                                Add your to-dos and keep track of them across Google Workspace
                              </Typography>
                            </Box>
                          )}
                          {provided.placeholder}
                          {/* Completed tasks section with collapsible header */}
                          {taskList.tasks.some(task => task.status === 'completed') && (
                            <>
                              <Divider sx={{ my: 2 }} />
                              <ListItem 
                                button 
                                onClick={() => toggleCompletedSection(taskList.id)}
                                sx={{ 
                                  py: 0.5, 
                                  px: 1,
                                  borderRadius: 1,
                                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
                                }}
                              >
                                <ListItemIcon sx={{ minWidth: '24px' }}>
                                  <IconButton 
                                    size="small" 
                                    sx={{ p: 0 }}
                                  >
                                    {expandedCompletedSections[taskList.id] ? (
                                      <LoopIcon fontSize="small" sx={{ transform: 'rotate(90deg)' }} />
                                    ) : (
                                      <LoopIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                </ListItemIcon>
                                <ListItemText 
                                  primary={
                                    <Typography 
                                      variant="subtitle2" 
                                      sx={{ 
                                        fontFamily: 'Poppins', 
                                        color: 'text.secondary',
                                        fontWeight: 'medium',
                                      }}
                                    >
                                      Completed ({taskList.tasks.filter(task => task.status === 'completed').length})
                                    </Typography>
                                  }
                                />
                              </ListItem>
                              
                              {expandedCompletedSections[taskList.id] && (
                                <Box sx={{ 
                                  maxHeight: '50vh', 
                                  overflowY: 'auto',
                                  overflowX: 'hidden', // Prevent horizontal scrolling
                                  ...scrollbarStyles
                                }}>
                                  {taskList.tasks.filter(task => task.status === 'completed').map((task) => (
                                    <ListItem
                                      key={task.id}
                                      sx={{
                                        py: 1,
                                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                                        '&:last-child': { borderBottom: 'none' }
                                      }}
                                    >
                                      <ListItemIcon sx={{ minWidth: '40px' }}>
                                        <Checkbox
                                          checked={true}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleToggleTaskComplete(taskList.id, task.id);
                                          }}
                                          edge="start"
                                          icon={<CheckBoxOutlineBlankIcon />}
                                          checkedIcon={<CheckBoxIcon />}
                                          sx={{ color: 'rgba(0, 0, 0, 0.38)' }}
                                        />
                                      </ListItemIcon>
                                      <ListItemText
                                        primary={
                                          <Typography
                                            sx={{
                                              textDecoration: 'line-through',
                                              color: 'text.secondary',
                                              fontFamily: 'Poppins',
                                            }}
                                          >
                                            {task.title}
                                          </Typography>
                                        }
                                        secondary={
                                          task.completed && (
                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                                              Completed: {formatDate(task.completed)}
                                            </Typography>
                                          )
                                        }
                                      />
                                      <IconButton
                                        edge="end"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleTaskStar(taskList.id, task.id);
                                        }}
                                        sx={{ color: task.starred ? '#FFD700' : 'action.disabled', mr: 1 }}
                                      >
                                        {task.starred ? <StarIcon /> : <StarBorderIcon />}
                                      </IconButton>
                                      <IconButton
                                        edge="end"
                                        onClick={(e) => handleTaskMenuOpen(e, taskList.id, task)}
                                        size="small"
                                      >
                                        <MoreVertIcon fontSize="small" />
                                      </IconButton>
                                    </ListItem>
                                  ))}
                                </Box>
                              )}
                            </>
                          )}
                        </List>
                      )}
                    </Droppable>
                  </CardContent>
                  <Box 
                    sx={{ 
                      p: 2, 
                      borderTop: '1px solid rgba(0, 0, 0, 0.08)', 
                      backgroundColor: 'rgba(0, 0, 0, 0.02)' 
                    }}
                  >
                    <Button
                      fullWidth
                      startIcon={<AddIcon />}
                      onClick={() => handleAddTaskClick(taskList.id)}
                      sx={{
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        color: 'text.primary',
                        fontFamily: 'Poppins',
                      }}
                    >
                      Add a task
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))
          ) : !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontFamily: 'Poppins', 
                    color: 'text.secondary', 
                    mb: 2 
                  }}
                >
                  No task lists found
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddTaskListClick}
                  sx={{
                    backgroundColor: '#1056F5',
                    color: 'white',
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                  }}
                >
                  Create a task list
                </Button>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DragDropContext>

      {/* Global Completed Tasks Section */}
      {!loading && taskLists.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'visible'
          }}>
            <Box 
              onClick={() => setExpandedCompletedSections(prev => ({
                ...prev, 
                global: !prev.global
              }))}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2,
                cursor: 'pointer',
                bgcolor: 'rgba(16, 86, 245, 0.08)'
              }}
            >
              <IconButton size="small" sx={{ mr: 1, p: 0 }}>
                {expandedCompletedSections.global ? (
                  <LoopIcon fontSize="small" sx={{ transform: 'rotate(90deg)' }} />
                ) : (
                  <LoopIcon fontSize="small" />
                )}
              </IconButton>
              <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                Completed ({taskLists.flatMap(list => list.tasks.filter(task => task.status === 'completed')).length})
              </Typography>
            </Box>
            
            {expandedCompletedSections.global && (
              <Box sx={{ 
                maxHeight: '60vh', 
                overflowY: 'auto',
                overflowX: 'hidden', // Prevent horizontal scrolling
                ...scrollbarStyles
              }}>
                <List sx={{ py: 0 }}>
                  {taskLists.flatMap(list => 
                    list.tasks
                      .filter(task => task.status === 'completed')
                      .map(task => ({ task, listId: list.id, listTitle: list.title }))
                  ).sort((a, b) => {
                    // Sort by completion date, newest first
                    const dateA = a.task.completed ? new Date(a.task.completed).getTime() : 0;
                    const dateB = b.task.completed ? new Date(b.task.completed).getTime() : 0;
                    return dateB - dateA;
                  }).map(({ task, listId, listTitle }) => (
                    <ListItem
                      key={task.id}
                      sx={{
                        py: 1,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: '40px' }}>
                        <Checkbox
                          checked={true}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleTaskComplete(listId, task.id);
                          }}
                          edge="start"
                          icon={<CheckBoxOutlineBlankIcon />}
                          checkedIcon={<CheckBoxIcon />}
                          sx={{ color: 'rgba(0, 0, 0, 0.38)' }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography
                            sx={{
                              textDecoration: 'line-through',
                              color: 'text.secondary',
                              fontFamily: 'Poppins',
                            }}
                          >
                            {task.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            {task.completed && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Poppins', display: 'block' }}>
                                Completed: {formatDate(task.completed)}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Poppins', display: 'block' }}>
                              List: {listTitle}
                            </Typography>
                          </Box>
                        }
                      />
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleTaskStar(listId, task.id);
                        }}
                        sx={{ color: task.starred ? '#FFD700' : 'action.disabled', mr: 1 }}
                      >
                        {task.starred ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleTaskMenuOpen(e, listId, task)}
                        size="small"
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Card>
        </Box>
      )}

      {/* Task List Options Menu */}
      <Menu
        anchorEl={taskListMenuAnchorEl}
        open={Boolean(taskListMenuAnchorEl)}
        onClose={handleTaskListMenuClose}
        PaperProps={{
          sx: { width: 220, maxWidth: '100%' }
        }}
      >
        <MenuItem onClick={handleEditTaskList}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename list</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleToggleVisibility}>
          <ListItemIcon>
            {taskLists.find(list => list.id === currentTaskListId)?.isVisible === false ? (
              <VisibilityIcon fontSize="small" />
            ) : (
              <VisibilityOffIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>
            {taskLists.find(list => list.id === currentTaskListId)?.isVisible === false ? 
              'Show list' : 'Hide list'
            }
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleClearCompleted}>
          <ListItemIcon>
            <CheckIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete all completed</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteTaskList} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete list</ListItemText>
        </MenuItem>
      </Menu>

      {/* Task Options Menu */}
      <Menu
        anchorEl={taskMenuAnchorEl}
        open={Boolean(taskMenuAnchorEl)}
        onClose={handleTaskMenuClose}
        PaperProps={{
          sx: { 
            width: 'auto',
            minWidth: '180px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
            borderRadius: '8px',
            mt: 0.5
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem 
          onClick={handleEditTaskFromMenu}
          sx={{ 
            py: 1.5,
            px: 2
          }}
        >
          <ListItemIcon>
            <EditIcon 
              fontSize="small" 
              sx={{ color: 'text.primary' }} 
            />
          </ListItemIcon>
          <ListItemText 
            primary="Edit task" 
            primaryTypographyProps={{ 
              fontFamily: 'Poppins', 
              fontWeight: 'regular',
              fontSize: '0.9rem'
            }} 
          />
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={handleDeleteTaskFromMenu}
          sx={{ 
            py: 1.5,
            px: 2,
            color: '#e53935'
          }}
        >
          <ListItemIcon>
            <DeleteIcon 
              fontSize="small" 
              sx={{ color: '#e53935' }} 
            />
          </ListItemIcon>
          <ListItemText 
            primary="Delete task" 
            primaryTypographyProps={{ 
              fontFamily: 'Poppins', 
              fontWeight: 'regular',
              fontSize: '0.9rem'
            }} 
          />
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchorEl}
        open={Boolean(filterMenuAnchorEl)}
        onClose={handleFilterMenuClose}
        PaperProps={{
          sx: { width: 220, maxWidth: '100%' }
        }}
      >
        <MenuItem onClick={() => handleFilterOption('myOrder')}>
          <ListItemIcon>
            <SortIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>My order</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFilterOption('date')}>
          <ListItemIcon>
            <SortIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Date</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFilterOption('starredRecently')}>
          <ListItemIcon>
            <StarIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Starred recently</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFilterOption('title')}>
          <ListItemIcon>
            <SortIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Title</ListItemText>
        </MenuItem>
      </Menu>

      {/* New Task Dialog */}
      <Dialog 
        open={newTaskDialogOpen} 
        onClose={() => setNewTaskDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Add a task
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          <TextField
            autoFocus
            margin="dense"
            label="Task"
            fullWidth
            variant="outlined"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newTaskNotes}
            onChange={(e) => setNewTaskNotes(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Add details"
          />
          
          {/* Date selection options */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
            {newTaskDueDate ? (
              <ButtonGroup variant="outlined" size="small" sx={{ mr: 1 }}>
                <Button startIcon={<DateRangeIcon />}>
                  {formatDisplayDate(newTaskDueDate, newTaskDueTime)}
                </Button>
                <Button onClick={handleClearDueDate} sx={{ p: 0, minWidth: '30px' }}>
                  <CloseIcon fontSize="small" />
                </Button>
              </ButtonGroup>
            ) : (
              <ButtonGroup variant="outlined" size="small">
                <Button onClick={handleSetToday}>Today</Button>
                <Button onClick={handleSetTomorrow}>Tomorrow</Button>
                <Button onClick={handleDatePickerOpen}><DateRangeIcon fontSize="small" /></Button>
              </ButtonGroup>
            )}
          </Box>
          
          {/* Date picker popover */}
          <Popover
            open={datePickerOpen}
            anchorEl={datePickerAnchorEl}
            onClose={handleDatePickerClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <Stack spacing={2} sx={{ p: 2, width: 300 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
                April 2025
              </Typography>
              
              <Grid container spacing={1}>
                {/* Calendar days header */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Grid item key={index} xs={12/7} sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">{day}</Typography>
                  </Grid>
                ))}
                
                {/* Example calendar days - in a real implementation, these would be generated */}
                {[...Array(35)].map((_, index) => {
                  const day = index - 2; // Adjust for month start day offset
                  return (
                    <Grid item xs={12/7} key={index} sx={{ textAlign: 'center' }}>
                      {day > 0 && day <= 30 && (
                        <IconButton 
                          size="small" 
                          sx={{ 
                            borderRadius: '50%',
                            width: 32, 
                            height: 32,
                            ...(day === 11 && { 
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' }
                            })
                          }}
                          onClick={() => {
                            const date = new Date(2025, 3, day); // April 2025
                            handleSetDueDate(date);
                          }}
                        >
                          <Typography variant="body2">{day}</Typography>
                        </IconButton>
                      )}
                    </Grid>
                  );
                })}
              </Grid>
              
              <Divider />
              
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeIcon fontSize="small" color="action" />
                <Button 
                  variant="text" 
                  fullWidth 
                  sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
                  onClick={handleTimePickerOpen}
                >
                  {newTaskDueTime ? format(new Date().setHours(
                    Number(newTaskDueTime.split(':')[0]), 
                    Number(newTaskDueTime.split(':')[1])
                  ), 'h:mm a') : 'Set time'}
                </Button>
              </Stack>
              
              <Stack direction="row" spacing={1} alignItems="center">
                <LoopIcon fontSize="small" color="action" />
                <Button 
                  variant="text" 
                  fullWidth 
                  sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
                >
                  Repeat
                </Button>
              </Stack>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button onClick={handleDatePickerClose}>Cancel</Button>
                <Button 
                  variant="contained" 
                  onClick={handleDatePickerClose}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  Done
                </Button>
              </Box>
            </Stack>
          </Popover>
          
          {/* Time picker popover */}
          <Popover
            open={timePickerOpen}
            anchorEl={timePickerAnchorEl}
            onClose={handleTimePickerClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <Stack spacing={1} sx={{ 
              p: 2, 
              width: 200, 
              maxHeight: 400, 
              overflow: 'auto',
              ...scrollbarStyles
            }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
                Set time
              </Typography>
              
              {/* Time options in 30-minute increments */}
              {[...Array(24)].map((_, hour) => (
                <React.Fragment key={hour}>
                  <MenuItem
                    onClick={() => handleSetDueTime(`${hour}:00`)}
                    dense
                    sx={{ 
                      minHeight: '36px',
                      py: 0.5,
                      px: 2,
                      borderRadius: 1,
                      ...(newTaskDueTime === `${hour}:00` && { 
                        bgcolor: 'primary.light',
                        '&:hover': { bgcolor: 'primary.light' }
                      })
                    }}
                  >
                    <Typography variant="body2">
                      {format(new Date().setHours(hour, 0), 'h:mm a')}
                    </Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleSetDueTime(`${hour}:30`)}
                    dense
                    sx={{ 
                      minHeight: '36px',
                      py: 0.5,
                      px: 2,
                      borderRadius: 1,
                      ...(newTaskDueTime === `${hour}:30` && { 
                        bgcolor: 'primary.light',
                        '&:hover': { bgcolor: 'primary.light' }
                      })
                    }}
                  >
                    <Typography variant="body2">
                      {format(new Date().setHours(hour, 30), 'h:mm a')}
                    </Typography>
                  </MenuItem>
                </React.Fragment>
              ))}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button onClick={handleClearDueTime}>Clear</Button>
                <Button 
                  variant="contained" 
                  onClick={handleTimePickerClose}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  Done
                </Button>
              </Box>
            </Stack>
          </Popover>
          
          {taskLists.length > 1 && (
            <TextField
              select
              margin="dense"
              label="Task List"
              fullWidth
              variant="outlined"
              value={newTaskListId}
              onChange={(e) => setNewTaskListId(e.target.value)}
            >
              {taskLists.map((list) => (
                <MenuItem key={list.id} value={list.id}>
                  {list.title}
                </MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNewTaskDialogOpen(false)}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTask} 
            variant="contained"
            disabled={!newTaskTitle.trim()}
            sx={{ 
              fontFamily: 'Poppins',
              backgroundColor: '#1056F5',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Task List Dialog */}
      <Dialog 
        open={newTaskListDialogOpen} 
        onClose={() => setNewTaskListDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Create new list
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            variant="outlined"
            value={newTaskListTitle}
            onChange={(e) => setNewTaskListTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setNewTaskListDialogOpen(false)}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateTaskList} 
            variant="contained"
            disabled={!newTaskListTitle.trim()}
            sx={{ 
              fontFamily: 'Poppins',
              backgroundColor: '#1056F5',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task List Dialog */}
      <Dialog 
        open={editTaskListDialogOpen} 
        onClose={() => setEditTaskListDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Rename list
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            variant="outlined"
            value={editTaskListTitle}
            onChange={(e) => setEditTaskListTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditTaskListDialogOpen(false)}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateTaskList} 
            variant="contained"
            disabled={!editTaskListTitle.trim()}
            sx={{ 
              fontFamily: 'Poppins',
              backgroundColor: '#1056F5',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog 
        open={editTaskDialogOpen} 
        onClose={() => setEditTaskDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Edit Task
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          <TextField
            autoFocus
            margin="dense"
            label="Task"
            fullWidth
            variant="outlined"
            value={editTaskTitle}
            onChange={(e) => setEditTaskTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={editTaskNotes}
            onChange={(e) => setEditTaskNotes(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Add details"
          />
          
          {/* Date selection options for edit dialog */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
            {editTaskDueDate ? (
              <ButtonGroup variant="outlined" size="small" sx={{ mr: 1 }}>
                <Button startIcon={<DateRangeIcon />}>
                  {formatDisplayDate(editTaskDueDate, editTaskDueTime)}
                </Button>
                <Button onClick={handleClearEditDueDate} sx={{ p: 0, minWidth: '30px' }}>
                  <CloseIcon fontSize="small" />
                </Button>
              </ButtonGroup>
            ) : (
              <ButtonGroup variant="outlined" size="small">
                <Button onClick={handleSetEditToday}>Today</Button>
                <Button onClick={handleSetEditTomorrow}>Tomorrow</Button>
                <Button onClick={handleEditDatePickerOpen}><DateRangeIcon fontSize="small" /></Button>
              </ButtonGroup>
            )}
          </Box>
          
          {/* Date picker popover for edit dialog */}
          <Popover
            open={editDatePickerOpen}
            anchorEl={editDatePickerAnchorEl}
            onClose={handleEditDatePickerClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <Stack spacing={2} sx={{ p: 2, width: 300 }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
                April 2025
              </Typography>
              
              <Grid container spacing={1}>
                {/* Calendar days header */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Grid item key={index} xs={12/7} sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">{day}</Typography>
                  </Grid>
                ))}
                
                {/* Example calendar days - in a real implementation, these would be generated */}
                {[...Array(35)].map((_, index) => {
                  const day = index - 2; // Adjust for month start day offset
                  return (
                    <Grid item xs={12/7} key={index} sx={{ textAlign: 'center' }}>
                      {day > 0 && day <= 30 && (
                        <IconButton 
                          size="small" 
                          sx={{ 
                            borderRadius: '50%',
                            width: 32, 
                            height: 32,
                            ...(day === 11 && { 
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' }
                            })
                          }}
                          onClick={() => {
                            const date = new Date(2025, 3, day); // April 2025
                            handleSetEditDueDate(date);
                          }}
                        >
                          <Typography variant="body2">{day}</Typography>
                        </IconButton>
                      )}
                    </Grid>
                  );
                })}
              </Grid>
              
              <Divider />
              
              <Stack direction="row" spacing={1} alignItems="center">
                <AccessTimeIcon fontSize="small" color="action" />
                <Button 
                  variant="text" 
                  fullWidth 
                  sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
                  onClick={handleEditTimePickerOpen}
                >
                  {editTaskDueTime ? format(new Date().setHours(
                    Number(editTaskDueTime.split(':')[0]), 
                    Number(editTaskDueTime.split(':')[1])
                  ), 'h:mm a') : 'Set time'}
                </Button>
              </Stack>
              
              <Stack direction="row" spacing={1} alignItems="center">
                <LoopIcon fontSize="small" color="action" />
                <Button 
                  variant="text" 
                  fullWidth 
                  sx={{ justifyContent: 'flex-start', color: 'text.secondary' }}
                >
                  Repeat
                </Button>
              </Stack>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button onClick={handleEditDatePickerClose}>Cancel</Button>
                <Button 
                  variant="contained" 
                  onClick={handleEditDatePickerClose}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  Done
                </Button>
              </Box>
            </Stack>
          </Popover>
          
          {/* Time picker popover for edit dialog */}
          <Popover
            open={editTimePickerOpen}
            anchorEl={editTimePickerAnchorEl}
            onClose={handleEditTimePickerClose}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <Stack spacing={1} sx={{ 
              p: 2, 
              width: 200, 
              maxHeight: 400, 
              overflow: 'auto',
              ...scrollbarStyles
            }}>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
                Set time
              </Typography>
              
              {/* Time options in 30-minute increments */}
              {[...Array(24)].map((_, hour) => (
                <React.Fragment key={hour}>
                  <MenuItem
                    onClick={() => handleSetEditDueTime(`${hour}:00`)}
                    dense
                    sx={{ 
                      minHeight: '36px',
                      py: 0.5,
                      px: 2,
                      borderRadius: 1,
                      ...(editTaskDueTime === `${hour}:00` && { 
                        bgcolor: 'primary.light',
                        '&:hover': { bgcolor: 'primary.light' }
                      })
                    }}
                  >
                    <Typography variant="body2">
                      {format(new Date().setHours(hour, 0), 'h:mm a')}
                    </Typography>
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleSetEditDueTime(`${hour}:30`)}
                    dense
                    sx={{ 
                      minHeight: '36px',
                      py: 0.5,
                      px: 2,
                      borderRadius: 1,
                      ...(editTaskDueTime === `${hour}:30` && { 
                        bgcolor: 'primary.light',
                        '&:hover': { bgcolor: 'primary.light' }
                      })
                    }}
                  >
                    <Typography variant="body2">
                      {format(new Date().setHours(hour, 30), 'h:mm a')}
                    </Typography>
                  </MenuItem>
                </React.Fragment>
              ))}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button onClick={handleClearEditDueTime}>Clear</Button>
                <Button 
                  variant="contained" 
                  onClick={handleEditTimePickerClose}
                  sx={{ bgcolor: 'primary.main' }}
                >
                  Done
                </Button>
              </Box>
            </Stack>
          </Popover>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setEditTaskDialogOpen(false)}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateTask} 
            variant="contained"
            disabled={!editTaskTitle.trim()}
            sx={{ 
              fontFamily: 'Poppins',
              backgroundColor: '#1056F5',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GoogleTasks; 