import React, { useState, useRef, useEffect, useMemo, ReactNode, useCallback } from 'react';
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
  Stack,
  InputAdornment,
  Select
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
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Clear as ClearIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Splitscreen as SplitscreenIcon,
  SmartToy as SmartToyIcon,
  Folder as FolderIcon,
  SortByAlpha as SortByAlphaIcon,
  ImportExport as ImportExportIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AddCircleOutline as AddCircleOutlineIcon,
  MenuOpen as MenuOpenIcon
} from '@mui/icons-material';
import { useGoogleTasks, TaskListFilterOption, EnhancedGoogleTask, EnhancedGoogleTaskList } from '../contexts/GoogleTasksContext';
import { format, isValid, parseISO, addDays } from 'date-fns';
import { ENDPOINTS } from '../services/apiConfig';
import { checkAuthState } from '../services/authService';
import TaskDetailsModal from '../components/TaskDetailsModal';
// Add these imports if they don't already exist at the top
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
// Add these imports at the top of the file
// import AIAssistant from '../components/AIAssistant';
// import { useAIAssistant } from '../contexts/AIAssistantContext';

// Import the proper AIAssistant component and context
import { useAIAssistant } from '../contexts/AIAssistantContext';

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

// Update the FC definition to fix type issues
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
    toggleTaskListVisibility,
    recordDuration
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
  
  // Add state for estimated time
  const [newTaskEstimatedMinutes, setNewTaskEstimatedMinutes] = useState<number | null>(null);
  const [timeInputValue, setTimeInputValue] = useState<string>('');
  
  // Add state for edit task estimated time
  const [editTaskEstimatedMinutes, setEditTaskEstimatedMinutes] = useState<number | null>(null);
  const [editTimeInputValue, setEditTimeInputValue] = useState<string>('');
  
  // Due date related state
  const [newTaskDueDate, setNewTaskDueDate] = useState<string | null>(null);
  const [newTaskDueTime, setNewTaskDueTime] = useState<string | null>(null);
  const [datePickerAnchorEl, setDatePickerAnchorEl] = useState<HTMLElement | null>(null);
  const datePickerOpen = Boolean(datePickerAnchorEl);
  const [timePickerAnchorEl, setTimePickerAnchorEl] = useState<HTMLElement | null>(null);
  const timePickerOpen = Boolean(timePickerAnchorEl);
  const [editDatePickerAnchorEl, setEditDatePickerAnchorEl] = useState<HTMLElement | null>(null);
  const editDatePickerOpen = Boolean(editDatePickerAnchorEl);
  const [editTimePickerAnchorEl, setEditTimePickerAnchorEl] = useState<HTMLElement | null>(null);
  const editTimePickerOpen = Boolean(editTimePickerAnchorEl);

  // Add state for subtask date and time pickers
  const [subtaskDatePickerAnchorEl, setSubtaskDatePickerAnchorEl] = useState<HTMLElement | null>(null);
  const subtaskDatePickerOpen = Boolean(subtaskDatePickerAnchorEl);
  const [subtaskTimePickerAnchorEl, setSubtaskTimePickerAnchorEl] = useState<HTMLElement | null>(null);
  const subtaskTimePickerOpen = Boolean(subtaskTimePickerAnchorEl);
  const [editingSubtaskIndex, setEditingSubtaskIndex] = useState<number>(-1);

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

  // Add state for tracking expanded/collapsed completed sections
  const [expandedCompletedSections, setExpandedCompletedSections] = useState<Record<string, boolean>>({
    global: false
  });

  // Task details modal state
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState<boolean>(false);
  const [detailsTask, setDetailsTask] = useState<{taskListId: string; task: EnhancedGoogleTask; taskListTitle?: string} | null>(null);
  
  // Click timer for handling single click vs double click
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add these state variables with the other state variables
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Add a new state variable for the task breakdown modal
  const [breakdownTaskDialogOpen, setBreakdownTaskDialogOpen] = useState<boolean>(false);
  const [taskToBreakdown, setTaskToBreakdown] = useState<{taskListId: string; task: EnhancedGoogleTask} | null>(null);
  // Update the breakdownSubtasks state to include due dates and times
  const [breakdownSubtasks, setBreakdownSubtasks] = useState<Array<{
    title: string;
    due: string | null;
    time: string | null;
  }>>([]);
  const [isBreakingDown, setIsBreakingDown] = useState<boolean>(false);
  const [aiAssistantVisible, setAiAssistantVisible] = useState<boolean>(false);
  
  // Add AI assistant reference
  const aiAssistantRef = useRef<HTMLDivElement>(null);

  // Add state for duration dialog
  const [durationDialogOpen, setDurationDialogOpen] = useState<boolean>(false);
  const [taskForDuration, setTaskForDuration] = useState<{taskListId: string; taskId: string; task: EnhancedGoogleTask} | null>(null);
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);
  const [actualHours, setActualHours] = useState<number>(0);
  const [actualMinutesOnly, setActualMinutesOnly] = useState<number>(0);

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
          estimated_minutes?: number;
        } = { 
          title: taskTitle,
          timezone: getUserTimezone(),
          time_in_notes: true // Add this parameter for the backend
        };
        
        // Add estimated minutes if set
        if (newTaskEstimatedMinutes !== null && newTaskEstimatedMinutes > 0) {
          taskData.estimated_minutes = newTaskEstimatedMinutes;
        }
        
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
          setNewTaskEstimatedMinutes(null);
          setTimeInputValue('');
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

  // Toggle task completion status with duration dialog
  const handleToggleTaskComplete = async (taskListId: string, taskId: string) => {
    try {
      // Find the task first to check its current status
      let task: EnhancedGoogleTask | undefined;
      taskLists.forEach(list => {
        if (list.id === taskListId) {
          const foundTask = list.tasks.find(t => t.id === taskId);
          if (foundTask) task = foundTask;
        }
      });
      
      if (!task) {
        showSnackbar('Task not found', 'error');
        return;
      }
      
      // If task is already completed, just toggle it back to active without showing the dialog
      if (task.status === 'completed') {
        const result = await toggleTaskComplete(taskListId, taskId);
        if (result) {
          showSnackbar('Task marked as not completed', 'success');
        } else {
          showSnackbar('Failed to update task', 'error');
        }
        return;
      }
      
      // If the task is being marked as completed, show duration dialog
      setTaskForDuration({taskListId, taskId, task});
      
      // Pre-populate with estimated time if available
      if (task.estimated_minutes) {
        setActualMinutes(task.estimated_minutes);
        setActualHours(Math.floor(task.estimated_minutes / 60));
        setActualMinutesOnly(task.estimated_minutes % 60);
      } else {
        setActualMinutes(null);
        setActualHours(0);
        setActualMinutesOnly(0);
      }
      
      setDurationDialogOpen(true);
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
        
        // Get the task being moved
        const taskId = sourceList.tasks[source.index].id;
        
        // Determine the previous task ID based on the destination index
        let previousTaskId: string | null = null;
        
        // If destination is not the top position (index 0)
        if (destination.index > 0) {
          // When moving a task down, we need to determine which task will be before it
          // Get all the task IDs in order (excluding the one being moved)
          const taskIdsInOrder = incompleteTasks.filter(t => t.id !== taskId).map(t => t.id);
          
          // The previous task is the one that will be at destination.index - 1
          // But we have to be careful with the indices since we removed the task being moved
          const previousIndex = destination.index - 1;
          if (previousIndex >= 0 && previousIndex < taskIdsInOrder.length) {
            previousTaskId = taskIdsInOrder[previousIndex];
          }
          
          // Debug log to help diagnose
          console.log(`Moving task ${taskId} to position ${destination.index}, previous task: ${previousTaskId}`);
        } else {
          // If moving to the top, previousTaskId remains null
          console.log(`Moving task ${taskId} to the top position`);
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
    
    // Load estimated time if available
    if (task.estimated_minutes) {
      setEditTaskEstimatedMinutes(task.estimated_minutes);
      
      // Format the display value appropriately
      if (task.estimated_minutes >= 60) {
        // For whole hours (60, 120, etc.)
        if (task.estimated_minutes % 60 === 0) {
          setEditTimeInputValue(`${task.estimated_minutes / 60}h`);
        } else {
          // For hour + minutes combinations (e.g., 90 = 1h30m)
          const hours = Math.floor(task.estimated_minutes / 60);
          const remainingMinutes = task.estimated_minutes % 60;
          setEditTimeInputValue(`${hours}h ${remainingMinutes}m`);
        }
      } else {
        setEditTimeInputValue(`${task.estimated_minutes}m`);
      }
    } else {
      setEditTaskEstimatedMinutes(null);
      setEditTimeInputValue('');
    }
    
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
    let cleanedNotes = notes.replace(/Due Time: \d{1,2}:\d{2}(?:\s?[AP]M)?(\r?\n|\r)?/g, '');
    
    // Also remove all "Estimated Time: X minutes" entries (including any following line breaks)
    cleanedNotes = cleanedNotes.replace(/Estimated Time: \d+ minutes?(\r?\n|\r)?/g, '');
    
    return cleanedNotes.trim();
  };

  // Update an existing task
  const handleUpdateTask = async () => {
    if (editingTask && editTaskTitle.trim()) {
      try {
        let taskTitle = editTaskTitle.trim();
        let taskNotes = editTaskNotes.trim();
        let hasExplicitTimeSet = false;
        
        // If time is set, we'll send it to the backend which will add it to notes
        if (editTaskDueTime) {
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
          estimated_minutes?: number;
        } = { 
          title: taskTitle,
          timezone: getUserTimezone(),
          time_in_notes: true // Add this parameter for the backend
        };
        
        // Add estimated minutes if set
        if (editTaskEstimatedMinutes !== null && editTaskEstimatedMinutes > 0) {
          taskData.estimated_minutes = editTaskEstimatedMinutes;
        }
        
        // Clean notes of any existing time entries and add if not empty
        if (taskNotes) {
          // Remove any existing time entries from notes to prevent duplication
          const cleanedNotes = cleanNotesOfTimeEntries(taskNotes);
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

  // Handle task click - will open details view
  const handleTaskDetailsOpen = (taskListId: string, task: EnhancedGoogleTask, taskListTitle?: string) => {
    setDetailsTask({ taskListId, task, taskListTitle });
    setTaskDetailsModalOpen(true);
  };

  // Handle closing task details modal
  const handleTaskDetailsClose = () => {
    setTaskDetailsModalOpen(false);
  };

  // Handle editing from task details modal
  const handleEditFromDetails = () => {
    if (detailsTask) {
      setTaskDetailsModalOpen(false);
      handleTaskClick(detailsTask.taskListId, detailsTask.task);
    }
  };

  // Handle deleting from task details modal
  const handleDeleteFromDetails = async () => {
    if (detailsTask) {
      try {
        const result = await deleteTask(detailsTask.taskListId, detailsTask.task.id);
        if (result) {
          setTaskDetailsModalOpen(false);
          showSnackbar('Task deleted successfully', 'success');
        } else {
          showSnackbar('Failed to delete task', 'error');
        }
      } catch (err) {
        showSnackbar('Error deleting task', 'error');
      }
    }
  };

  // Handle task item click with single/double click detection
  const handleTaskItemClick = (taskListId: string, task: EnhancedGoogleTask, taskListTitle?: string, event?: React.MouseEvent) => {
    // If the click originated from a checkbox or its child elements, do nothing
    // The checkbox's onClick handler will handle it with e.stopPropagation()
    if (event && (
      event.target instanceof HTMLElement && 
      (event.target.closest('.MuiCheckbox-root') || 
       event.target.closest('.MuiIconButton-root'))
    )) {
      return;
    }
    
    // Handle double click detection
    if (clickTimerRef.current) {
      // Double click detected
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      // Open edit dialog directly
      handleTaskClick(taskListId, task);
    } else {
      // Set a timer to detect if this is a single click
      clickTimerRef.current = setTimeout(() => {
        // This is a single click - open details view
        handleTaskDetailsOpen(taskListId, task, taskListTitle);
        clickTimerRef.current = null;
      }, 250); // 250ms delay to detect double click
    }
  };

  // Add these functions with the other functions
  const handlePreviousMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() - 1);
      return newMonth;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => {
      const newMonth = new Date(prevMonth);
      newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Add a helper function to get all subtasks for a given parent task ID
  const getSubtasksForParent = (tasks: EnhancedGoogleTask[], parentId: string): EnhancedGoogleTask[] => {
    return tasks.filter(task => task.parent === parentId);
  };

  // Add a helper function to sort tasks so that subtasks appear directly after their parent tasks
  const sortTasksWithSubtasks = (tasks: EnhancedGoogleTask[]): EnhancedGoogleTask[] => {
    // Create a copy of the tasks to avoid mutating the original
    const result: EnhancedGoogleTask[] = [];
    
    // First, identify parent tasks and standalone tasks (not subtasks)
    const parentAndStandaloneTasks = tasks.filter(task => !isSubtask(task));
    
    // For each parent/standalone task, add it to the result array
    // then immediately add all of its subtasks
    parentAndStandaloneTasks.forEach(task => {
      // Add the parent/standalone task
      result.push(task);
      
      // Find and add any subtasks that belong to this parent
      const subtasks = tasks.filter(t => 
        (t.parent === task.id) || // API-based relation
        (t.notes && t.notes.includes(`[Subtask of] ${task.title}`)) // Legacy relation
      );
      
      if (subtasks.length > 0) {
        result.push(...subtasks);
      }
    });
    
    return result;
  };

  // Update the handleBreakDownTaskFromMenu function to load existing subtasks
  const handleBreakDownTaskFromMenu = () => {
    if (selectedTask) {
      setTaskToBreakdown(selectedTask);
      
      // Find existing subtasks for this parent task
      const taskList = taskLists.find(list => list.id === selectedTask.taskListId);
      if (taskList) {
        const existingSubtasks = taskList.tasks.filter(task => 
          (task.parent === selectedTask.task.id) || // API-based relation
          (task.notes && task.notes.includes(`[Subtask of] ${selectedTask.task.title}`)) // Legacy relation
        );
        
        // Pre-populate the subtasks list with existing subtask titles
        if (existingSubtasks.length > 0) {
          setBreakdownSubtasks(existingSubtasks.map(task => ({
            title: task.title,
            due: task.due || null,
            time: task.notes?.match(/Due Time: (\d{1,2}:\d{2}(?:\s?[AP]M)?)/) ? 
                  task.notes.match(/Due Time: (\d{1,2}:\d{2}(?:\s?[AP]M)?)/)?.[1] || null : 
                  null
          })));
        } else {
          setBreakdownSubtasks([{ title: '', due: null, time: null }]); // Start with one empty subtask if none exist
        }
      } else {
        setBreakdownSubtasks([{ title: '', due: null, time: null }]); // Default to one empty subtask
      }
      
      setBreakdownTaskDialogOpen(true);
      handleTaskMenuClose();
    }
  };
  
  // Add a function to handle AI assistant opening
  const handleOpenAIAssistant = () => {
    setAiAssistantVisible(true);
  };
  
  // Add a function to create subtasks
  const handleCreateSubtasks = async () => {
    if (!taskToBreakdown || breakdownSubtasks.length === 0) return;
    
    setIsBreakingDown(true);
    try {
      // Create a parent-child relationship by adding a prefix to subtask titles
      const parentTask = taskToBreakdown.task;
      const parentTaskId = parentTask.id;
      const taskListId = taskToBreakdown.taskListId;
      
      // Only add a tag to the parent task if it doesn't already have one
      let updatedParentNotes = parentTask.notes || '';
      if (!updatedParentNotes.includes('[Has Subtasks]')) {
        updatedParentNotes = `${updatedParentNotes}${updatedParentNotes ? '\n' : ''}[Has Subtasks] - See nested tasks below.`.trim();
        
        // Only update the task notes if they've changed
        await updateTask(taskListId, parentTaskId, {
          ...parentTask,
          notes: updatedParentNotes
        });
      }
      
      // Create all subtasks using the parent parameter
      for (const subtask of breakdownSubtasks) {
        if (subtask.title.trim()) {
          // Construct notes with subtask information
          let subtaskNotes = `[Subtask of] ${parentTask.title}`;
          
          // Add time information to notes if provided
          if (subtask.time) {
            subtaskNotes += `\nDue Time: ${subtask.time}`;
          }
          
          // Use individual subtask due date if available, otherwise inherit from parent
          const due = subtask.due || parentTask.due;
          
          await createTask(taskListId, {
            title: subtask.title.trim(), // No need for emoji prefix with proper API usage
            notes: subtaskNotes, // Keep for UI purposes and include time info
            due: due, // Use individual subtask due date or inherit from parent
            parent: parentTaskId // Use the parent parameter for proper API integration
          });
        }
      }
      
      showSnackbar('Task broken down successfully', 'success');
      setBreakdownTaskDialogOpen(false);
    } catch (error) {
      console.error('Error creating subtasks:', error);
      showSnackbar('Failed to break down task', 'error');
    } finally {
      setIsBreakingDown(false);
    }
  };
  
  // Add a function to add a new subtask to the list
  const handleAddSubtask = () => {
    setBreakdownSubtasks([...breakdownSubtasks, { title: '', due: null, time: null }]);
  };
  
  // Handle updating a subtask
  const handleUpdateSubtask = (index: number, value: { title: string; due: string | null; time: string | null }) => {
    const updatedSubtasks = [...breakdownSubtasks];
    updatedSubtasks[index] = value;
    setBreakdownSubtasks(updatedSubtasks);
  };
  
  // Handle removing a subtask
  const handleRemoveSubtask = (index: number) => {
    const updatedSubtasks = [...breakdownSubtasks];
    updatedSubtasks.splice(index, 1);
    setBreakdownSubtasks(updatedSubtasks);
  };

  // Create a ref to track if we're extracting subtasks
  const extractingSubtasksRef = useRef<boolean>(false);

  // Get AI assistant context properly
  const { 
    sendMessage, 
    isLoading, 
    clearMessages, 
    openAssistant, 
    messages 
  } = useAIAssistant();

  // Fix the helper functions to return proper boolean values
  const isSubtask = (task: EnhancedGoogleTask): boolean => {
    return !!(
      task.parent || // Check for parent property from API
      task.title.startsWith('📎') || // Keep checking for emoji for backward compatibility
      (task.notes && task.notes.includes('[Subtask of]')) // Keep checking notes for backward compatibility
    );
  };

  // Add a helper function to determine if a task has subtasks
  const hasSubtasks = (task: EnhancedGoogleTask): boolean => {
    return !!(task.notes && task.notes.includes('[Has Subtasks]'));
  };

  // Add a helper function to get the parent task title from a subtask
  const getParentTaskTitle = (task: EnhancedGoogleTask): string | null => {
    if (!isSubtask(task) || !task.notes) return null;
    
    const match = task.notes.match(/\[Subtask of\] (.*)/);
    return match ? match[1] : null;
  };

  // Add a helper function to group subtasks by parent
  const groupSubtasksByParent = (tasks: EnhancedGoogleTask[]): Record<string, EnhancedGoogleTask[]> => {
    const grouped: Record<string, EnhancedGoogleTask[]> = {};
    
    tasks.forEach(task => {
      if (isSubtask(task)) {
        const parentTitle = getParentTaskTitle(task);
        if (parentTitle) {
          if (!grouped[parentTitle]) {
            grouped[parentTitle] = [];
          }
          grouped[parentTitle].push(task);
        }
      }
    });
    
    return grouped;
  };

  // Update the handleAIResponse function to interact with the actual AI assistant
  const handleAIResponse = async () => {
    if (!taskToBreakdown) return;
    
    setIsBreakingDown(true);
    
    try {
      // Clear previous messages
      await clearMessages();
      
      // Open the assistant
      openAssistant();
      
      // Set extracting mode
      extractingSubtasksRef.current = true;
      
      // Send a message to the assistant
      const prompt = `I need to break down this task into smaller subtasks: "${taskToBreakdown.task.title}". ${
        taskToBreakdown.task.notes ? `Additional context: ${taskToBreakdown.task.notes}` : ''
      } Please analyze this task and break it down into a list of specific, actionable subtasks in the most productive and efficient way possible. You should determine the appropriate number of subtasks based on the complexity of the task - use as many or as few as needed to be most effective. Format each subtask as a bullet point.`;
      
      // Send the message to the AI assistant
      await sendMessage(prompt);
    } catch (error) {
      console.error('Error interacting with AI assistant:', error);
      showSnackbar('Failed to communicate with AI assistant', 'error');
      extractingSubtasksRef.current = false;
    } finally {
      setIsBreakingDown(false);
    }
  };

  // Update the effect that monitors AI messages to stop automatically setting the subtasks
  // Replace the existing useEffect related to AI messages (around line 1510-1548)
  useEffect(() => {
    // Only proceed if we're in "extracting subtasks" mode
    if (!extractingSubtasksRef.current || !taskToBreakdown) return;
    
    // Look for assistant messages
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length > 0) {
      // Get the most recent assistant message
      const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];
      
      // Check if the message contains relevant subtask information
      if (latestAssistantMessage.content && !isLoading) {
        const content = latestAssistantMessage.content;
        
        // We no longer automatically set the breakdown subtasks here
        // We will let the user click "Import Subtasks from Assistant" to do that
        
        // Just show a notification that subtasks are ready to be imported
        if (content.match(/[•\-\*]\s+([^\n]+)/g) || content.match(/\d+\.\s+([^\n]+)/g)) {
          showSnackbar('AI has provided subtask suggestions. Click "Import Subtasks from Assistant" to use them.', 'success');
        }
        
        // Exit extraction mode
        extractingSubtasksRef.current = false;
      }
    }
  }, [messages, isLoading, taskToBreakdown, showSnackbar]);

  // Update the handleImportFromAssistant function to merge subtasks rather than replace them
  // Replace the function around line 1549-1599
  const handleImportFromAssistant = () => {
    // This will extract the suggested subtasks from the last assistant message
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length === 0) {
      showSnackbar('No AI assistant messages found', 'error');
      return;
    }
    
    const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];
    if (!latestAssistantMessage.content) {
      showSnackbar('No content in latest AI assistant message', 'error');
      return;
    }
    
    const content = latestAssistantMessage.content;
    
    // Extract subtasks from the message
    const extractedSubtasks: Array<{ title: string; due: string | null; time: string | null }> = [];
    
    // Look for bullet points patterns
    if (content.match(/[•\-\*]\s+([^\n]+)/g)) {
      const bulletMatches = content.match(/[•\-\*]\s+([^\n]+)/g) || [];
      bulletMatches.forEach((match: string) => {
        const subtask = match.replace(/^[•\-\*]\s+/, '').trim();
        if (subtask) extractedSubtasks.push({ title: subtask, due: null, time: null });
      });
    }
    
    // Look for numbered list patterns as well
    if (content.match(/\d+\.\s+([^\n]+)/g)) {
      const numberedMatches = content.match(/\d+\.\s+([^\n]+)/g) || [];
      numberedMatches.forEach((match: string) => {
        const subtask = match.replace(/^\d+\.\s+/, '').trim();
        if (subtask) extractedSubtasks.push({ title: subtask, due: null, time: null });
      });
    }
    
    // Update the subtasks list if we found any
    if (extractedSubtasks.length > 0) {
      // IMPORTANT: Merge with existing subtasks instead of replacing them
      setBreakdownSubtasks((prevSubtasks: Array<{ title: string; due: string | null; time: string | null }>) => {
        // Filter out empty subtasks from the existing list
        const nonEmptyPrevSubtasks = prevSubtasks.filter(task => task.title.trim() !== '');
        
        // If there were no existing non-empty subtasks, just use the extracted ones
        if (nonEmptyPrevSubtasks.length === 0) {
          return extractedSubtasks;
        }
        
        // Otherwise, merge the lists
        // Find subtasks with the same title and keep their due dates if they exist
        const mergedSubtasks = [...nonEmptyPrevSubtasks];
        
        extractedSubtasks.forEach(newSubtask => {
          // Check if this task already exists
          const existingIndex = mergedSubtasks.findIndex(
            task => task.title.toLowerCase() === newSubtask.title.toLowerCase()
          );
          
          if (existingIndex === -1) {
            // Add as a new subtask if not found
            mergedSubtasks.push(newSubtask);
          }
          // We don't update existing subtasks to preserve their due dates
        });
        
        return mergedSubtasks;
      });
      
      showSnackbar('Imported subtasks from assistant', 'success');
    } else {
      showSnackbar('No subtasks found in assistant message', 'error');
    }
  };

  // Add handlers for subtask date and time pickers
  const handleSubtaskDatePickerOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setSubtaskDatePickerAnchorEl(event.currentTarget);
    setEditingSubtaskIndex(index);
  };

  const handleSubtaskDatePickerClose = () => {
    setSubtaskDatePickerAnchorEl(null);
    setEditingSubtaskIndex(-1);
  };

  const handleSubtaskTimePickerOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setSubtaskTimePickerAnchorEl(event.currentTarget);
    setEditingSubtaskIndex(index);
  };

  const handleSubtaskTimePickerClose = () => {
    setSubtaskTimePickerAnchorEl(null);
    setEditingSubtaskIndex(-1);
  };

  const handleSetSubtaskDueDate = (dueDate: Date | null) => {
    if (editingSubtaskIndex >= 0 && editingSubtaskIndex < breakdownSubtasks.length) {
      const updatedSubtasks = [...breakdownSubtasks];
      const updatedSubtask = { ...updatedSubtasks[editingSubtaskIndex] };
      
      if (dueDate) {
        // Format date to RFC 3339 format required by Google Tasks API
        const year = dueDate.getFullYear();
        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
        const day = String(dueDate.getDate()).padStart(2, '0');
        updatedSubtask.due = `${year}-${month}-${day}`;
      } else {
        updatedSubtask.due = null;
        updatedSubtask.time = null; // Clear time when date is cleared
      }
      
      updatedSubtasks[editingSubtaskIndex] = updatedSubtask;
      setBreakdownSubtasks(updatedSubtasks);
    }
  };

  const handleSetSubtaskDueTime = (time: string | null) => {
    if (editingSubtaskIndex >= 0 && editingSubtaskIndex < breakdownSubtasks.length) {
      const updatedSubtasks = [...breakdownSubtasks];
      const updatedSubtask = { ...updatedSubtasks[editingSubtaskIndex] };
      
      if (time) {
        // Store time in HH:MM format
        updatedSubtask.time = time;
      } else {
        updatedSubtask.time = null;
      }
      
      updatedSubtasks[editingSubtaskIndex] = updatedSubtask;
      setBreakdownSubtasks(updatedSubtasks);
    }
  };

  const handleSetSubtaskToday = () => {
    const today = new Date();
    handleSetSubtaskDueDate(today);
  };

  const handleSetSubtaskTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    handleSetSubtaskDueDate(tomorrow);
  };

  const handleClearSubtaskDueDate = () => {
    handleSetSubtaskDueDate(null);
  };

  const handleClearSubtaskDueTime = () => {
    handleSetSubtaskDueTime(null);
  };

  // Time estimate formatter - detects hours/minutes and converts to minutes
  const handleTimeInputChange = (value: string) => {
    setTimeInputValue(value);
    
    // If empty, reset the estimate
    if (!value.trim()) {
      setNewTaskEstimatedMinutes(null);
      return;
    }
    
    // Check for combined format like "1h30m" or "1h 30m"
    const combinedPattern = /(\d+)\s*h\s*(\d+)\s*m/i;
    const combinedMatch = value.match(combinedPattern);
    if (combinedMatch && combinedMatch[1] && combinedMatch[2]) {
      const hours = parseInt(combinedMatch[1], 10);
      const minutes = parseInt(combinedMatch[2], 10);
      setNewTaskEstimatedMinutes(hours * 60 + minutes);
      return;
    }
    
    // Check for decimal hours like "1.5h"
    const decimalHourPattern = /(\d+\.\d+)\s*h/i;
    const decimalMatch = value.match(decimalHourPattern);
    if (decimalMatch && decimalMatch[1]) {
      const hours = parseFloat(decimalMatch[1]);
      setNewTaskEstimatedMinutes(Math.round(hours * 60));
      return;
    }
    
    // Check if the input contains 'h' for hours
    if (value.toLowerCase().includes('h')) {
      const hourPattern = /(\d+)\s*h/i;
      const match = value.match(hourPattern);
      if (match && match[1]) {
        const hours = parseInt(match[1], 10);
        setNewTaskEstimatedMinutes(hours * 60);
      }
      return;
    }
    
    // Check if input contains 'm' for minutes
    if (value.toLowerCase().includes('m')) {
      const minutePattern = /(\d+)\s*m/i;
      const match = value.match(minutePattern);
      if (match && match[1]) {
        setNewTaskEstimatedMinutes(parseInt(match[1], 10));
      }
      return;
    }
    
    // If just a number, assume minutes
    const minutesValue = parseInt(value, 10);
    if (!isNaN(minutesValue)) {
      setNewTaskEstimatedMinutes(minutesValue);
    }
  };
  
  // Time estimate formatter for edit task - detects hours/minutes and converts to minutes
  const handleEditTimeInputChange = (value: string) => {
    setEditTimeInputValue(value);
    
    // If empty, reset the estimate
    if (!value.trim()) {
      setEditTaskEstimatedMinutes(null);
      return;
    }
    
    // Check for combined format like "1h30m" or "1h 30m"
    const combinedPattern = /(\d+)\s*h\s*(\d+)\s*m/i;
    const combinedMatch = value.match(combinedPattern);
    if (combinedMatch && combinedMatch[1] && combinedMatch[2]) {
      const hours = parseInt(combinedMatch[1], 10);
      const minutes = parseInt(combinedMatch[2], 10);
      setEditTaskEstimatedMinutes(hours * 60 + minutes);
      return;
    }
    
    // Check for decimal hours like "1.5h"
    const decimalHourPattern = /(\d+\.\d+)\s*h/i;
    const decimalMatch = value.match(decimalHourPattern);
    if (decimalMatch && decimalMatch[1]) {
      const hours = parseFloat(decimalMatch[1]);
      setEditTaskEstimatedMinutes(Math.round(hours * 60));
      return;
    }
    
    // Check if the input contains 'h' for hours
    if (value.toLowerCase().includes('h')) {
      const hourPattern = /(\d+)\s*h/i;
      const match = value.match(hourPattern);
      if (match && match[1]) {
        const hours = parseInt(match[1], 10);
        setEditTaskEstimatedMinutes(hours * 60);
      }
      return;
    }
    
    // Check if input contains 'm' for minutes
    if (value.toLowerCase().includes('m')) {
      const minutePattern = /(\d+)\s*m/i;
      const match = value.match(minutePattern);
      if (match && match[1]) {
        setEditTaskEstimatedMinutes(parseInt(match[1], 10));
      }
      return;
    }
    
    // If just a number, assume minutes
    const minutesValue = parseInt(value, 10);
    if (!isNaN(minutesValue)) {
      setEditTaskEstimatedMinutes(minutesValue);
    }
  };

  // Handle submitting the duration dialog
  const handleDurationSubmit = async () => {
    if (!taskForDuration || actualMinutes === null) return;
    
    try {
      // First mark the task as complete
      const result = await toggleTaskComplete(taskForDuration.taskListId, taskForDuration.taskId);
      
      if (result) {
        try {
          // Then record the duration
          const durationResult = await recordDuration(
            taskForDuration.taskListId, 
            taskForDuration.taskId, 
            actualMinutes
          );
          
          // The API returns success in response even if durationResult is null
          // based on the API response format seen in the network tab
          showSnackbar('Task completed and duration recorded', 'success');
        } catch (durationErr) {
          // This will catch actual API failures during duration recording
          console.error('Error recording duration:', durationErr);
          showSnackbar('Task completed but failed to record duration', 'error');
        }
      } else {
        showSnackbar('Failed to complete task', 'error');
      }
    } catch (err) {
      console.error('Error toggling task completion:', err);
      showSnackbar('Error updating task', 'error');
    } finally {
      // Close dialog and reset state
      setDurationDialogOpen(false);
      setTaskForDuration(null);
      setActualMinutes(null);
      setActualHours(0);
      setActualMinutesOnly(0);
    }
  };
  
  // Handle duration input changes
  const handleHoursChange = (value: number) => {
    // Convert to a regular number to remove any leading zeros
    const hours = parseInt(value.toString(), 10);
    setActualHours(hours);
    setActualMinutes(hours * 60 + actualMinutesOnly);
  };
  
  const handleMinutesChange = (value: number) => {
    // Convert to a regular number to remove any leading zeros
    const minutes = parseInt(value.toString(), 10);
    setActualMinutesOnly(minutes);
    setActualMinutes(actualHours * 60 + minutes);
  };
  
  // Skip recording duration
  const handleSkipDuration = async () => {
    if (!taskForDuration) return;
    
    try {
      // Just mark the task as complete without recording duration
      const result = await toggleTaskComplete(taskForDuration.taskListId, taskForDuration.taskId);
      
      if (result) {
        showSnackbar('Task completed', 'success');
      } else {
        showSnackbar('Failed to complete task', 'error');
      }
    } catch (err) {
      showSnackbar('Error updating task', 'error');
    } finally {
      // Close dialog and reset state
      setDurationDialogOpen(false);
      setTaskForDuration(null);
      setActualMinutes(null);
      setActualHours(0);
      setActualMinutesOnly(0);
    }
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
                      onClick={(e) => {
                        const taskList = taskLists.find(list => 
                          list.tasks.some(t => t.id === task.id)
                        );
                        if (taskList) {
                          handleTaskItemClick(taskList.id, task, taskList.title, e);
                        }
                      }}
                      sx={{
                        py: 1,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        '&:last-child': { borderBottom: 'none' },
                        cursor: 'pointer'
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
                          {sortTasksWithSubtasks(taskList.tasks).filter(task => task.status !== 'completed').length > 0 ? (
                            sortTasksWithSubtasks(taskList.tasks).filter(task => task.status !== 'completed').map((task, index) => (
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
                                    onClick={(e) => handleTaskItemClick(taskList.id, task, taskList.title, e)}
                                    sx={{
                                      py: 1,
                                      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                                      '&:last-child': { borderBottom: 'none' },
                                      cursor: 'pointer'
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
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          {hasSubtasks(task) && (
                                            <Tooltip title="Has subtasks">
                                              <Box 
                                                component="span" 
                                                sx={{ 
                                                  mr: 0.5, 
                                                  display: 'inline-flex', 
                                                  color: 'primary.main' 
                                                }}
                                              >
                                                <FolderIcon fontSize="small" />
                                              </Box>
                                            </Tooltip>
                                          )}
                                          <Typography
                                            sx={{
                                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                              color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                                              fontFamily: 'Poppins',
                                              ...(isSubtask(task) ? { 
                                                paddingLeft: '24px', // Increased padding
                                                marginLeft: '16px', // Added margin
                                                borderLeft: '3px solid rgba(16, 86, 245, 0.6)', // More prominent border
                                                backgroundColor: 'rgba(16, 86, 245, 0.03)', // Subtle background color
                                                borderRadius: '0 4px 4px 0', // Rounded corners on the right side
                                                fontStyle: 'italic',
                                                py: 0.5 // Add some vertical padding
                                              } : {})
                                            }}
                                          >
                                            {/* Remove the paperclip emoji from display if it exists */}
                                            {task.title.startsWith('📎 ') ? task.title.substring(2) : task.title}
                                          </Typography>
                                        </Box>
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
                                  {sortTasksWithSubtasks(taskList.tasks).filter(task => task.status === 'completed').map((task) => (
                                    <ListItem
                                      key={task.id}
                                      onClick={(e) => handleTaskItemClick(taskList.id, task, taskList.title, e)}
                                      sx={{
                                        py: 1,
                                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                                        '&:last-child': { borderBottom: 'none' },
                                        cursor: 'pointer'
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
                                              ...(isSubtask(task) ? { 
                                                paddingLeft: '24px', // Increased padding
                                                marginLeft: '16px', // Added margin
                                                borderLeft: '3px solid rgba(16, 86, 245, 0.6)', // More prominent border
                                                backgroundColor: 'rgba(16, 86, 245, 0.03)', // Subtle background color
                                                borderRadius: '0 4px 4px 0', // Rounded corners on the right side
                                                fontStyle: 'italic',
                                                py: 0.5 // Add some vertical padding
                                              } : {})
                                            }}
                                          >
                                            {task.title.startsWith('📎 ') ? task.title.substring(2) : task.title}
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
                    sortTasksWithSubtasks(list.tasks)
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
                      onClick={(e) => handleTaskItemClick(listId, task, listTitle, e)}
                      sx={{
                        py: 1,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        '&:last-child': { borderBottom: 'none' },
                        cursor: 'pointer'
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
                              ...(isSubtask(task) ? { 
                                paddingLeft: '24px', // Increased padding
                                marginLeft: '16px', // Added margin
                                borderLeft: '3px solid rgba(16, 86, 245, 0.6)', // More prominent border
                                backgroundColor: 'rgba(16, 86, 245, 0.03)', // Subtle background color
                                borderRadius: '0 4px 4px 0', // Rounded corners on the right side
                                fontStyle: 'italic',
                                py: 0.5 // Add some vertical padding
                              } : {})
                            }}
                          >
                            {task.title.startsWith('📎 ') ? task.title.substring(2) : task.title}
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

      {/* Task Menu */}
      <Menu
        id="task-menu"
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
              sx={{ color: '#1056F5' }}
            />
          </ListItemIcon>
          <ListItemText 
            primary="Edit task" 
            primaryTypographyProps={{ 
              fontFamily: 'Poppins', 
              fontWeight: 'medium' 
            }} 
          />
        </MenuItem>
        
        {/* Add Break Down Task option */}
        <MenuItem 
          onClick={handleBreakDownTaskFromMenu}
          sx={{ 
            py: 1.5,
            px: 2
          }}
        >
          <ListItemIcon>
            <SplitscreenIcon 
              fontSize="small" 
              sx={{ color: '#1056F5' }}
            />
          </ListItemIcon>
          <ListItemText 
            primary="Break down task" 
            primaryTypographyProps={{ 
              fontFamily: 'Poppins', 
              fontWeight: 'medium' 
            }} 
          />
        </MenuItem>
        
        <MenuItem 
          onClick={handleDeleteTaskFromMenu}
          sx={{ 
            py: 1.5,
            px: 2,
            color: '#e53935'
          }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" sx={{ color: '#e53935' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Delete task" 
            primaryTypographyProps={{ 
              fontFamily: 'Poppins', 
              fontWeight: 'medium' 
            }} 
          />
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      <Menu
        id="filter-menu"
        anchorEl={filterMenuAnchorEl}
        open={Boolean(filterMenuAnchorEl)}
        onClose={handleFilterMenuClose}
        PaperProps={{
          sx: { 
            width: 'auto',
            minWidth: '180px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.12)',
            borderRadius: '8px',
            mt: 0.5
          }
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
            <DateRangeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Due date</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFilterOption('starredRecently')}>
          <ListItemIcon>
            <AccessTimeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Creation time</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleFilterOption('title')}>
          <ListItemIcon>
            <SortByAlphaIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Alphabetical</ListItemText>
        </MenuItem>
        {/* Note: We can't add 'SubtasksFirst' without modifying the context type,
            but we can still show subtask visual indicators */}
      </Menu>

      {/* New Task Dialog */}
      <Dialog 
        open={newTaskDialogOpen} 
        onClose={() => {
          setNewTaskDialogOpen(false);
          setNewTaskTitle('');
          setNewTaskNotes('');
          setNewTaskDueDate(null);
          setNewTaskDueTime(null);
          setNewTaskEstimatedMinutes(null);
          setTimeInputValue('');
        }}
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
          
          {/* Time Estimation Field */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Time Estimate
            </Typography>
            
            {/* Input field and preset buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Minutes input field */}
              <TextField
                label="Time"
                variant="outlined"
                size="small"
                value={timeInputValue}
                onChange={(e) => handleTimeInputChange(e.target.value)}
                placeholder="30m, 1h30m, 2h..."
                sx={{ width: '180px', mb: 1 }}
              />
              
              {/* Time preset buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {[5, 15, 30, 45, 60, 120].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={newTaskEstimatedMinutes === minutes ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      setNewTaskEstimatedMinutes(minutes);
                      // Update display value appropriately
                      if (minutes >= 60) {
                        // For whole hours (60, 120, etc.)
                        if (minutes % 60 === 0) {
                          setTimeInputValue(`${minutes / 60}h`);
                        } else {
                          // For hour + minutes combinations (e.g., 90 = 1h30m)
                          const hours = Math.floor(minutes / 60);
                          const remainingMinutes = minutes % 60;
                          setTimeInputValue(`${hours}h ${remainingMinutes}m`);
                        }
                      } else {
                        setTimeInputValue(`${minutes}m`);
                      }
                    }}
                    sx={{ minWidth: '60px' }}
                  >
                    {minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}m`}
                  </Button>
                ))}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setNewTaskEstimatedMinutes(null);
                    setTimeInputValue('');
                  }}
                  sx={{ minWidth: '60px' }}
                >
                  Clear
                </Button>
              </Box>
            </Box>
          </Box>
          
          {/* Date selection options */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Due Date & Time
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconButton onClick={handlePreviousMonth} size="small">
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <IconButton onClick={handleNextMonth} size="small">
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Grid container spacing={1}>
                {/* Calendar days header */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Grid item key={index} xs={12/7} sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">{day}</Typography>
                  </Grid>
                ))}
                
                {/* Calendar days - dynamically generated */}
                {(() => {
                  const daysInMonth = getDaysInMonth(currentMonth);
                  const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
                  
                  const days: React.ReactNode[] = [];
                  // Empty cells for days before first day of month
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push(
                      <Grid item xs={12/7} key={`empty-${i}`} sx={{ textAlign: 'center' }}>
                        <Box sx={{ width: 32, height: 32 }} />
                      </Grid>
                    );
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    
                    // Determine if this date is selected
                    let dateIsSelected = false;
                    if (newTaskDueDate) {
                      let compareDate: Date;
                      if (typeof newTaskDueDate === 'string') {
                        compareDate = new Date(newTaskDueDate);
                      } else {
                        compareDate = newTaskDueDate as Date;
                      }
                      
                      dateIsSelected = 
                        date.getDate() === compareDate.getDate() && 
                        date.getMonth() === compareDate.getMonth() && 
                        date.getFullYear() === compareDate.getFullYear();
                    }
                    
                    const isToday = 
                      date.getDate() === new Date().getDate() && 
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear();
                      
                    days.push(
                      <Grid item xs={12/7} key={day} sx={{ textAlign: 'center' }}>
                        <IconButton 
                          size="small" 
                          sx={{ 
                            borderRadius: '50%',
                            width: 32, 
                            height: 32,
                            ...(dateIsSelected && { 
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' }
                            }),
                            ...(isToday && !dateIsSelected && {
                              border: '1px solid',
                              borderColor: 'primary.main',
                            })
                          }}
                          onClick={() => {
                            handleSetDueDate(date);
                          }}
                        >
                          <Typography variant="body2">{day}</Typography>
                        </IconButton>
                      </Grid>
                    );
                  }
                  
                  return days;
                })()}
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
                <Button onClick={handleClearDueDate}>Clear</Button>
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
        onClose={() => {
          setEditTaskDialogOpen(false);
          setEditingTask(null);
          setEditTaskTitle('');
          setEditTaskNotes('');
          setEditTaskDueDate(null);
          setEditTaskDueTime(null);
          setEditTaskEstimatedMinutes(null);
          setEditTimeInputValue('');
        }}
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
          
          {/* Time Estimation Field for Edit Task */}
          <Box sx={{ mb: 3, mt: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Time Estimate
            </Typography>
            
            {/* Input field and preset buttons */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Minutes input field */}
              <TextField
                label="Time"
                variant="outlined"
                size="small"
                value={editTimeInputValue}
                onChange={(e) => handleEditTimeInputChange(e.target.value)}
                placeholder="30m, 1h30m, 2h..."
                sx={{ width: '180px', mb: 1 }}
              />
              
              {/* Time preset buttons */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {[5, 15, 30, 45, 60, 120].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={editTaskEstimatedMinutes === minutes ? "contained" : "outlined"}
                    size="small"
                    onClick={() => {
                      setEditTaskEstimatedMinutes(minutes);
                      // Update display value appropriately
                      if (minutes >= 60) {
                        // For whole hours (60, 120, etc.)
                        if (minutes % 60 === 0) {
                          setEditTimeInputValue(`${minutes / 60}h`);
                        } else {
                          // For hour + minutes combinations (e.g., 90 = 1h30m)
                          const hours = Math.floor(minutes / 60);
                          const remainingMinutes = minutes % 60;
                          setEditTimeInputValue(`${hours}h ${remainingMinutes}m`);
                        }
                      } else {
                        setEditTimeInputValue(`${minutes}m`);
                      }
                    }}
                    sx={{ minWidth: '60px' }}
                  >
                    {minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}m`}
                  </Button>
                ))}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setEditTaskEstimatedMinutes(null);
                    setEditTimeInputValue('');
                  }}
                  sx={{ minWidth: '60px' }}
                >
                  Clear
                </Button>
              </Box>
            </Box>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <IconButton onClick={handlePreviousMonth} size="small">
                  <ArrowBackIosNewIcon fontSize="small" />
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <IconButton onClick={handleNextMonth} size="small">
                  <ArrowForwardIosIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Grid container spacing={1}>
                {/* Calendar days header */}
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Grid item key={index} xs={12/7} sx={{ textAlign: 'center' }}>
                    <Typography variant="body2">{day}</Typography>
                  </Grid>
                ))}
                
                {/* Calendar days - dynamically generated */}
                {(() => {
                  const daysInMonth = getDaysInMonth(currentMonth);
                  const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
                  
                  const days: React.ReactNode[] = [];
                  // Empty cells for days before first day of month
                  for (let i = 0; i < firstDayOfMonth; i++) {
                    days.push(
                      <Grid item xs={12/7} key={`empty-${i}`} sx={{ textAlign: 'center' }}>
                        <Box sx={{ width: 32, height: 32 }} />
                      </Grid>
                    );
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    
                    // Determine if this date is selected
                    let dateIsSelected = false;
                    if (editTaskDueDate) {
                      let compareDate: Date;
                      if (typeof editTaskDueDate === 'string') {
                        compareDate = new Date(editTaskDueDate);
                      } else {
                        compareDate = editTaskDueDate as Date;
                      }
                      
                      dateIsSelected = 
                        date.getDate() === compareDate.getDate() && 
                        date.getMonth() === compareDate.getMonth() && 
                        date.getFullYear() === compareDate.getFullYear();
                    }
                    
                    const isToday = 
                      date.getDate() === new Date().getDate() && 
                      date.getMonth() === new Date().getMonth() && 
                      date.getFullYear() === new Date().getFullYear();
                      
                    days.push(
                      <Grid item xs={12/7} key={day} sx={{ textAlign: 'center' }}>
                        <IconButton 
                          size="small" 
                          sx={{ 
                            borderRadius: '50%',
                            width: 32, 
                            height: 32,
                            ...(dateIsSelected && { 
                              bgcolor: 'primary.main',
                              color: 'white',
                              '&:hover': { bgcolor: 'primary.dark' }
                            }),
                            ...(isToday && !dateIsSelected && {
                              border: '1px solid',
                              borderColor: 'primary.main',
                            })
                          }}
                          onClick={() => {
                            handleSetEditDueDate(date);
                          }}
                        >
                          <Typography variant="body2">{day}</Typography>
                        </IconButton>
                      </Grid>
                    );
                  }
                  
                  return days;
                })()}
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

      {/* Task Details Modal */}
      <TaskDetailsModal
        open={taskDetailsModalOpen}
        onClose={handleTaskDetailsClose}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
        task={detailsTask?.task || null}
        taskListId={detailsTask?.taskListId || ''}
        taskListTitle={detailsTask?.taskListTitle}
      />

      {/* Task Breakdown Dialog */}
      <Dialog
        open={breakdownTaskDialogOpen}
        onClose={() => setBreakdownTaskDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Break Down Task
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          {taskToBreakdown && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                Parent Task: {taskToBreakdown.task.title}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={2}>
                Break this task into smaller, manageable subtasks. Each subtask will be created as a separate task with a link back to this parent task.
              </Typography>
              
              <Box mb={3}>
                <Button
                  variant="outlined"
                  startIcon={<SmartToyIcon />}
                  onClick={handleOpenAIAssistant}
                  sx={{ mb: 2 }}
                >
                  Ask AI to help break down this task
                </Button>
                
                {aiAssistantVisible && (
                  <Box 
                    ref={aiAssistantRef}
                    sx={{ 
                      border: '1px solid rgba(0, 0, 0, 0.12)', 
                      borderRadius: 1, 
                      p: 2, 
                      mb: 2,
                      bgcolor: 'rgba(240, 240, 240, 0.5)'
                    }}
                  >
                    <Typography variant="subtitle2" mb={1}>
                      AI Assistant
                    </Typography>
                    <Typography variant="body2" mb={2}>
                      Our AI system can help break down "{taskToBreakdown?.task.title}" into manageable subtasks.
                    </Typography>
                    <Box sx={{ height: 'auto' }}>
                      <Button 
                        variant="contained"
                        fullWidth
                        onClick={handleAIResponse}
                        disabled={isBreakingDown || isLoading}
                        startIcon={<SmartToyIcon />}
                        sx={{ 
                          backgroundColor: '#1056F5',
                          '&:hover': {
                            backgroundColor: '#0D47D9',
                          },
                          mb: 2
                        }}
                      >
                        Ask AI to help break down this task
                      </Button>
                      
                      <Button 
                        variant="outlined"
                        fullWidth
                        onClick={handleImportFromAssistant}
                        disabled={messages.filter(msg => msg.role === 'assistant').length === 0}
                        startIcon={<ImportExportIcon />}
                        sx={{ mb: 2 }}
                      >
                        Import Subtasks from Assistant
                      </Button>
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        1. Click "Ask AI" to open the Pulse Assistant
                        2. Wait for the AI to respond with suggested subtasks
                        3. Click "Import Subtasks" to use the AI's suggestions
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              
              <Typography variant="subtitle1" mb={1}>
                Subtasks
              </Typography>
              
              {breakdownSubtasks.map((subtask, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    mb: 2,
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                    borderRadius: 1,
                    p: 2
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    value={subtask.title}
                    onChange={(e) => handleUpdateSubtask(index, { ...subtask, title: e.target.value })}
                    placeholder={`Subtask ${index + 1}`}
                    sx={{ mb: 2 }}
                  />
                  
                  <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <TodayIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Button 
                        variant="outlined" 
                        size="small"
                        fullWidth
                        onClick={(e) => handleSubtaskDatePickerOpen(e, index)}
                        sx={{ justifyContent: 'flex-start' }}
                      >
                        {subtask.due ? formatDate(subtask.due) : 'Add due date'}
                      </Button>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <AccessTimeIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                      <Button 
                        variant="outlined"
                        size="small"
                        fullWidth
                        onClick={(e) => handleSubtaskTimePickerOpen(e, index)}
                        sx={{ justifyContent: 'flex-start' }}
                        disabled={!subtask.due}
                      >
                        {subtask.time ? subtask.time : 'Add time'}
                      </Button>
                    </Box>
                    
                    <IconButton onClick={() => handleRemoveSubtask(index)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              ))}
              
              <Button 
                startIcon={<AddIcon />} 
                onClick={handleAddSubtask}
                variant="outlined"
                sx={{ mt: 1 }}
              >
                Add Subtask
              </Button>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBreakdownTaskDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateSubtasks} 
            variant="contained"
            disabled={breakdownSubtasks.length === 0 || isBreakingDown}
            startIcon={isBreakingDown ? <CircularProgress size={20} /> : null}
            sx={{ 
              fontFamily: 'Poppins',
              backgroundColor: '#1056F5',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            {isBreakingDown ? 'Creating Subtasks...' : 'Create Subtasks'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Subtask Date picker popover */}
      <Popover
        open={subtaskDatePickerOpen}
        anchorEl={subtaskDatePickerAnchorEl}
        onClose={handleSubtaskDatePickerClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Stack spacing={2} sx={{ 
          p: 2,
          width: 320,
          maxHeight: 400,
          overflow: 'auto',
          ...scrollbarStyles 
        }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'medium' }}>
            Set due date
          </Typography>
          
          <Stack direction="row" spacing={1}>
            <Button 
              variant="outlined" 
              fullWidth 
              sx={{ justifyContent: 'center' }}
              onClick={handleSetSubtaskToday}
            >
              Today
            </Button>
            <Button 
              variant="outlined" 
              fullWidth 
              sx={{ justifyContent: 'center' }}
              onClick={handleSetSubtaskTomorrow}
            >
              Tomorrow
            </Button>
          </Stack>
          
          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
            <IconButton onClick={handlePreviousMonth}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="subtitle1">
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            <IconButton onClick={handleNextMonth}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>
          
          <Grid container spacing={0} sx={{ textAlign: 'center' }}>
            {/* Weekday headers */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Grid item xs={12/7} key={`header-${index}`}>
                <Typography variant="body2" color="text.secondary">
                  {day}
                </Typography>
              </Grid>
            ))}
            
            {/* Calendar days - dynamically generated */}
            {(() => {
              const daysInMonth = getDaysInMonth(currentMonth);
              const firstDayOfMonth = getFirstDayOfMonth(currentMonth);
              
              const days: React.ReactNode[] = [];
              // Empty cells for days before first day of month
              for (let i = 0; i < firstDayOfMonth; i++) {
                days.push(
                  <Grid item xs={12/7} key={`empty-${i}`} sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 32, height: 32 }} />
                  </Grid>
                );
              }
              
              // Days of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                
                // Determine if this date is selected
                let dateIsSelected = false;
                if (editingSubtaskIndex >= 0 && breakdownSubtasks[editingSubtaskIndex].due) {
                  const subtaskDue = breakdownSubtasks[editingSubtaskIndex].due;
                  if (subtaskDue) {
                    const compareDate = new Date(subtaskDue);
                    
                    dateIsSelected = 
                      date.getDate() === compareDate.getDate() && 
                      date.getMonth() === compareDate.getMonth() && 
                      date.getFullYear() === compareDate.getFullYear();
                  }
                }
                
                const isToday = 
                  date.getDate() === new Date().getDate() && 
                  date.getMonth() === new Date().getMonth() && 
                  date.getFullYear() === new Date().getFullYear();
                  
                days.push(
                  <Grid item xs={12/7} key={day} sx={{ textAlign: 'center' }}>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        borderRadius: '50%',
                        width: 32, 
                        height: 32,
                        ...(dateIsSelected && { 
                          bgcolor: 'primary.main',
                          color: 'white',
                          '&:hover': { bgcolor: 'primary.dark' }
                        }),
                        ...(isToday && !dateIsSelected && {
                          border: '1px solid',
                          borderColor: 'primary.main',
                        })
                      }}
                      onClick={() => {
                        handleSetSubtaskDueDate(date);
                      }}
                    >
                      <Typography variant="body2">{day}</Typography>
                    </IconButton>
                  </Grid>
                );
              }
              
              return days;
            })()}
          </Grid>
          
          <Divider />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Button onClick={handleClearSubtaskDueDate}>Clear</Button>
            <Button 
              variant="contained" 
              onClick={handleSubtaskDatePickerClose}
              sx={{ bgcolor: 'primary.main' }}
            >
              Done
            </Button>
          </Box>
        </Stack>
      </Popover>
      
      {/* Subtask Time picker popover */}
      <Popover
        open={subtaskTimePickerOpen}
        anchorEl={subtaskTimePickerAnchorEl}
        onClose={handleSubtaskTimePickerClose}
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
                onClick={() => handleSetSubtaskDueTime(`${hour}:00`)}
                dense
                sx={{ 
                  minHeight: '36px',
                  py: 0.5,
                  px: 2,
                  borderRadius: 1,
                  ...(editingSubtaskIndex >= 0 && 
                    breakdownSubtasks[editingSubtaskIndex].time === `${hour}:00` && { 
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
                onClick={() => handleSetSubtaskDueTime(`${hour}:30`)}
                dense
                sx={{ 
                  minHeight: '36px',
                  py: 0.5,
                  px: 2,
                  borderRadius: 1,
                  ...(editingSubtaskIndex >= 0 && 
                    breakdownSubtasks[editingSubtaskIndex].time === `${hour}:30` && { 
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
            <Button onClick={handleClearSubtaskDueTime}>Clear</Button>
            <Button 
              variant="contained" 
              onClick={handleSubtaskTimePickerClose}
              sx={{ bgcolor: 'primary.main' }}
            >
              Done
            </Button>
          </Box>
        </Stack>
      </Popover>

      {/* Duration Dialog */}
      <Dialog
        open={durationDialogOpen}
        onClose={() => setDurationDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Record Time Spent
        </DialogTitle>
        <DialogContent sx={dialogContentStyles}>
          {taskForDuration && (
            <>
              <Typography variant="subtitle1" fontWeight="bold" mb={1}>
                {taskForDuration.task.title}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" mb={3}>
                How long did this task actually take to complete?
                {taskForDuration.task.estimated_minutes && (
                  <Box component="span" ml={1} fontWeight="medium" color="primary.main">
                    (Estimated: {taskForDuration.task.estimated_minutes >= 60 
                      ? `${Math.floor(taskForDuration.task.estimated_minutes / 60)}h ${taskForDuration.task.estimated_minutes % 60}m`
                      : `${taskForDuration.task.estimated_minutes}m`})
                  </Box>
                )}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                  Actual Time
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <TextField
                    label="Hours"
                    type="number"
                    variant="outlined"
                    size="small"
                    value={actualHours === 0 ? '' : Number(actualHours)}
                    onChange={(e) => handleHoursChange(Number(e.target.value))}
                    sx={{ mr: 2, width: '120px' }}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                  <TextField
                    label="Minutes"
                    type="number"
                    variant="outlined"
                    size="small"
                    value={actualMinutesOnly === 0 ? '' : Number(actualMinutesOnly)}
                    onChange={(e) => handleMinutesChange(Number(e.target.value))}
                    sx={{ width: '120px' }}
                    InputProps={{
                      inputProps: { min: 0, max: 59 }
                    }}
                  />
                </Box>
                
                {/* Preset time buttons */}
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Quick select:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {[5, 15, 30, 45, 60, 120].map((minutes) => (
                    <Button
                      key={minutes}
                      variant={actualMinutes === minutes ? "contained" : "outlined"}
                      size="small"
                      onClick={() => {
                        setActualMinutes(minutes);
                        setActualHours(Math.floor(minutes / 60));
                        setActualMinutesOnly(minutes % 60);
                      }}
                      sx={{ minWidth: '60px' }}
                    >
                      {minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes}m`}
                    </Button>
                  ))}
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setActualMinutes(null);
                      setActualHours(0);
                      setActualMinutesOnly(0);
                    }}
                    sx={{ minWidth: '60px' }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleSkipDuration}
            sx={{ fontFamily: 'Poppins' }}
          >
            Skip
          </Button>
          <Box sx={{ flex: '1 0 0' }} />
          <Button 
            onClick={() => setDurationDialogOpen(false)}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDurationSubmit} 
            variant="contained"
            disabled={!taskForDuration || actualMinutes === null || (actualHours === 0 && actualMinutesOnly === 0)}
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
    </Container>
  );
};

export default GoogleTasks; 