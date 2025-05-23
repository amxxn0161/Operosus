import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  Button,
  Avatar,
  Tooltip,
  Popover,
  ToggleButtonGroup,
  ToggleButton,
  Link,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  useTheme,
  useMediaQuery,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import TaskIcon from '@mui/icons-material/Task';
import AddTaskIcon from '@mui/icons-material/AddTask';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { CalendarEvent, respondToEventInvitation, linkTasksToEvent, getTasksForEvent } from '../services/calendarService';
import { format, isValid, parseISO } from 'date-fns';
import EventEditForm from './EventEditForm';
import { useCalendar } from '../contexts/CalendarContext';
import { useGoogleTasks } from '../contexts/GoogleTasksContext';
import { GoogleTask } from '../services/googleTasksService';
import TaskDetailsModal from './TaskDetailsModal';
import TaskDurationDialog, { TaskWithEstimate } from './TaskDurationDialog';

// Extended GoogleTask interface with estimated_minutes property
interface ExtendedGoogleTask extends GoogleTask {
  estimated_minutes?: number;
}

interface Guest {
  name: string;
  response: string;
  avatar: string;
  location: string;
  email?: string;
  isOrganizer?: boolean;
  isSelf?: boolean;
}

interface EventDetailsPopupProps {
  event: CalendarEvent | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

// Helper function to check if a date is overdue (in the past, excluding today)
const isOverdue = (dateString?: string | null): boolean => {
  if (!dateString) return false;
  
  try {
    const dueDate = parseISO(dateString);
    if (!isValid(dueDate)) return false;
    
    // Get today's date at start of day for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get the due date at start of day
    const dueDateStart = new Date(dueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    
    // Check if the due date is before today (truly overdue)
    return dueDateStart < today;
  } catch (e) {
    return false;
  }
};

// Helper function to check if a date is due today
const isDueToday = (dateString?: string | null): boolean => {
  if (!dateString) return false;
  
  try {
    const dueDate = parseISO(dateString);
    if (!isValid(dueDate)) return false;
    
    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get due date at start of day
    const dueDateStart = new Date(dueDate);
    dueDateStart.setHours(0, 0, 0, 0);
    
    // Check if due date is today
    return dueDateStart.getTime() === today.getTime();
  } catch (e) {
    return false;
  }
};

const EventDetailsPopup: React.FC<EventDetailsPopupProps> = ({
  event,
  anchorEl,
  onClose,
  onEdit,
  onDelete
}) => {
  const { fetchEvents } = useCalendar();
  const { 
    taskLists, 
    updateTask, 
    createTask, 
    toggleTaskComplete,
    deleteTask,
    refreshTaskLists,
    recordDuration
  } = useGoogleTasks();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Debug logging for attachments
  useEffect(() => {
    if (event) {
      console.log('Event data in EventDetailsPopup:', event);
      console.log('Event has attachments:', !!event.attachments);
      if (event.attachments) {
        console.log('Attachments data:', event.attachments);
      }
    }
  }, [event]);
  
  const [rsvpStatus, setRsvpStatus] = useState<string>('Yes');
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning'>('success');
  const [noteDialogOpen, setNoteDialogOpen] = useState<boolean>(false);
  const [responseNote, setResponseNote] = useState<string>('');
  const [recurringDialogOpen, setRecurringDialogOpen] = useState<boolean>(false);
  const [responseScope, setResponseScope] = useState<'single' | 'following' | 'all'>('single');
  const [rsvpMenuAnchorEl, setRsvpMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [recurringDialogMode, setRecurringDialogMode] = useState<'rsvp' | 'note'>('rsvp');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteRecurringDialogOpen, setDeleteRecurringDialogOpen] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'single' | 'all'>('single');
  const [linkedTasks, setLinkedTasks] = useState<ExtendedGoogleTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState<boolean>(false);
  const [selectedTasks, setSelectedTasks] = useState<{[key: string]: boolean}>({});
  const [taskDialogTab, setTaskDialogTab] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState<boolean>(false);
  
  // New state for task details modal
  const [taskDetailsModalOpen, setTaskDetailsModalOpen] = useState<boolean>(false);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<{
    task: ExtendedGoogleTask | null;
    taskListId: string;
    taskListTitle: string;
  }>({
    task: null,
    taskListId: '',
    taskListTitle: ''
  });
  
  // Task menu state
  const [taskMenuAnchorEl, setTaskMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [currentTaskForMenu, setCurrentTaskForMenu] = useState<ExtendedGoogleTask | null>(null);
  
  // Duration dialog state
  const [durationDialogOpen, setDurationDialogOpen] = useState<boolean>(false);
  const [taskForDuration, setTaskForDuration] = useState<{
    task: TaskWithEstimate;
    taskListId: string;
  } | null>(null);
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditClick = () => {
    handleMenuClose();
    setIsEditFormOpen(true);
  };
  
  const handleDeleteClick = () => {
    handleMenuClose();
    
    // Check if this is a recurring event
    const isRecurringEvent = Boolean(event?.recurringEventId) || 
                            (Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0);
    
    if (isRecurringEvent) {
      // Open the recurring deletion dialog
      setDeleteRecurringDialogOpen(true);
    } else {
      // Open the regular confirmation dialog
      setDeleteConfirmOpen(true);
    }
  };
  
  const handleEditFormClose = () => {
    setIsEditFormOpen(false);
  };
  
  const handleEditFormSave = () => {
    // This function will be called after successful edit
    // We'll refresh the calendar data
    fetchEvents();
  };

  // Map UI response values to API values
  const mapRsvpToApiResponse = (status: string): 'accepted' | 'declined' | 'tentative' => {
    // Extract the base response (Yes, No, Maybe) from enhanced status options
    const baseStatus = status.split(',')[0].trim();
    
    switch (baseStatus) {
      case 'Yes':
        return 'accepted';
      case 'No':
        return 'declined';
      case 'Maybe':
        return 'tentative';
      default:
        return 'accepted';
    }
  };
  
  // The main RSVP change function used with both toggle buttons and menu items
  const handleRsvpChange = (newStatus: string) => {
    setRsvpStatus(newStatus);
    setRsvpMenuAnchorEl(null);
  };
  
  // Specialized handler for ToggleButtonGroup which has a different signature
  const handleRsvpToggleChange = (
    _event: React.MouseEvent<HTMLElement> | null,
    newStatus: string,
  ) => {
    if (newStatus !== null) {
      setRsvpStatus(newStatus);
    }
  };
  
  // Open RSVP menu
  const handleRsvpMenuOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setRsvpMenuAnchorEl(event.currentTarget);
  };
  
  // Close RSVP menu
  const handleRsvpMenuClose = () => {
    setRsvpMenuAnchorEl(null);
  };
  
  // Open note dialog when clicking Update button
  const handleOpenNoteDialog = () => {
    // Check if this is a focus time event
    if (event?.eventType === 'focusTime') {
      console.error('Cannot RSVP to a focus time event');
      setSnackbarMessage('Focus time events cannot have attendees or responses');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setResponseNote(''); // Reset note field
    setRecurringDialogMode('rsvp'); // Set dialog mode to RSVP
    
    // Only show the recurring dialog if this is truly a recurring event
    // Check for both recurringEventId (event instance) and recurrence (master event)
    const isRecurringEvent = Boolean(event?.recurringEventId) || 
                            (Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0);
    
    console.log('Event recurring status check:', {
      isRecurringEvent,
      hasRecurringEventId: Boolean(event?.recurringEventId),
      hasRecurrence: Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0,
      recurringEventId: event?.recurringEventId,
      recurrence: event?.recurrence
    });
    
    if (isRecurringEvent) {
      setRecurringDialogOpen(true);
    } else {
      setNoteDialogOpen(true);
    }
  };
  
  // Open note dialog directly without checking for recurring events
  const handleDirectNoteDialog = () => {
    // Check if this is a focus time event
    if (event?.eventType === 'focusTime') {
      console.error('Cannot add a note to a focus time event');
      setSnackbarMessage('Focus time events cannot have attendees or responses');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setResponseNote(''); // Reset note field
    setRecurringDialogMode('note'); // Set dialog mode to note
    
    // Check if this is a recurring event, just like in handleOpenNoteDialog
    const isRecurringEvent = Boolean(event?.recurringEventId) || 
                            (Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0);
    
    if (isRecurringEvent) {
      setRecurringDialogOpen(true);
    } else {
      setNoteDialogOpen(true);
    }
  };
  
  // Close note dialog
  const handleCloseNoteDialog = () => {
    setNoteDialogOpen(false);
  };
  
  // Handle response scope selection for recurring events
  const handleRecurringScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResponseScope(e.target.value as 'single' | 'following' | 'all');
  };
  
  // Close recurring dialog
  const handleCloseRecurringDialog = () => {
    setRecurringDialogOpen(false);
  };
  
  // Open note dialog after selecting response scope
  const handleRecurringConfirm = () => {
    setRecurringDialogOpen(false);
    setNoteDialogOpen(true);
  };
  
  // Handle RSVP update submission
  const handleRsvp = async () => {
    if (!event || !event.id) {
      console.error('Cannot RSVP to event: No event ID available');
      setSnackbarMessage('Failed to update RSVP status: Missing event ID');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Check if this is a focus time event
    if (event.eventType === 'focusTime') {
      console.error('Cannot RSVP to a focus time event');
      setSnackbarMessage('Focus time events cannot have attendees or responses');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setNoteDialogOpen(false);
      return;
    }
    
    setNoteDialogOpen(false);
    
    try {
      const apiResponse = mapRsvpToApiResponse(rsvpStatus);
      
      // Pass the note and responseScope to the API
      const noteValue = responseNote.trim() || undefined;
      await respondToEventInvitation(event.id, apiResponse, noteValue, responseScope);
      
      setSnackbarMessage('RSVP status updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchEvents();
    } catch (error) {
      console.error('Error updating RSVP status:', error);
      
      // Parse the error message for better user feedback
      let errorMessage = 'Failed to update RSVP status';
      if (error instanceof Error) {
        // Check if it's a focus time error
        if (error.message.includes('focusTime') || error.message.includes('focus time')) {
          errorMessage = 'Focus time events cannot have attendees or responses';
        } else {
          // Try to extract a more specific error message
          const matchError = error.message.match(/"message":\s*"([^"]+)"/);
          if (matchError && matchError[1]) {
            errorMessage = matchError[1];
          }
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Initialize RSVP status based on current user's response
  useEffect(() => {
    if (event && event.attendees) {
      const selfAttendee = event.attendees.find(attendee => attendee.self);
      if (selfAttendee && selfAttendee.responseStatus) {
        switch (selfAttendee.responseStatus.toLowerCase()) {
          case 'accepted':
            setRsvpStatus('Yes');
            break;
          case 'declined':
            setRsvpStatus('No');
            break;
          case 'tentative':
            setRsvpStatus('Maybe');
            break;
          default:
            setRsvpStatus('Yes');
        }
      }
    }
  }, [event]);

  // Load linked tasks when event changes
  useEffect(() => {
    if (event && event.id) {
      fetchLinkedTasks(event.id);
    }
  }, [event]);
  
  // Fetch tasks linked to this event
  const fetchLinkedTasks = async (eventId: string) => {
    try {
      setLoadingTasks(true);
      const response = await getTasksForEvent(eventId);
      if (response.status === 'success') {
        // Cast linkedTasks to ExtendedGoogleTask[]
        setLinkedTasks(response.linkedTasks as ExtendedGoogleTask[]);
        
        // Initialize selected tasks for the dialog
        const initialSelection: {[key: string]: boolean} = {};
        response.linkedTasks.forEach(task => {
          const taskKey = `${task.task_list_id}:${task.id}`;
          initialSelection[taskKey] = true;
        });
        setSelectedTasks(initialSelection);
      }
    } catch (error) {
      console.error('Error fetching linked tasks:', error);
      setSnackbarMessage('Failed to load tasks linked to this event');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoadingTasks(false);
    }
  };
  
  // Open dialog to manage tasks
  const handleManageTasks = () => {
    setTaskDialogOpen(true);
    
    // Set default task list tab to the first task list if available
    if (taskLists.length > 0 && !taskDialogTab) {
      setTaskDialogTab(taskLists[0].id);
    }
  };
  
  // Handle dialog close
  const handleTaskDialogClose = () => {
    setTaskDialogOpen(false);
  };
  
  // Toggle task selection in the dialog
  const handleTaskToggle = (taskListId: string, taskId: string) => {
    const taskKey = `${taskListId}:${taskId}`;
    setSelectedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };
  
  // Save the selected tasks
  const handleSaveTasks = async () => {
    if (!event || !event.id) return;
    
    try {
      // Convert selected tasks to the format expected by the API
      const taskIds = Object.entries(selectedTasks)
        .filter(([_, isSelected]) => isSelected)
        .map(([key]) => {
          const [taskListId, taskId] = key.split(':');
          return { task_list_id: taskListId, task_id: taskId };
        });
      
      // Call the API to link tasks
      await linkTasksToEvent(event.id, taskIds);
      
      // Refresh the linked tasks
      await fetchLinkedTasks(event.id);
      
      // Refresh task lists to ensure newly created tasks appear
      await refreshTaskLists({ forceRefresh: true });
      
      setTaskDialogOpen(false);
      setSnackbarMessage('Tasks linked to event successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error linking tasks to event:', error);
      setSnackbarMessage('Failed to link tasks to event');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };
  
  // Set the active tab in the task dialog
  const handleTaskTabChange = (taskListId: string) => {
    setTaskDialogTab(taskListId);
  };

  // Toggle task completion status
  const handleToggleTaskComplete = async (task: GoogleTask) => {
    if (!task || !task.id || !task.task_list_id) {
      console.error('Cannot toggle task completion: Missing task data');
      return;
    }
    
    try {
      // If task is already completed, just toggle it back to active without showing the dialog
      if (task.status === 'completed') {
        // Toggle the status back to active
        const updatedTask = await toggleTaskComplete(task.task_list_id, task.id);
        
        // Update the local state to reflect the change
        if (updatedTask) {
          setLinkedTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === task.id ? { ...t, status: 'needsAction' } : t
            )
          );
          
          setSnackbarMessage('Task marked as active');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }
        return;
      }
      
      // Cast to ExtendedGoogleTask to access estimated_minutes
      const extendedTask = task as ExtendedGoogleTask;
      
      // If task has estimated minutes, show the duration dialog
      if (extendedTask.estimated_minutes) {
        // If the task is being marked as completed, show duration dialog
        setTaskForDuration({
          task: {
            id: task.id,
            title: task.title,
            estimated_minutes: extendedTask.estimated_minutes
          },
          taskListId: task.task_list_id
        });
        
        setDurationDialogOpen(true);
      } else {
        // If no estimated minutes, just toggle completion directly
        const updatedTask = await toggleTaskComplete(task.task_list_id, task.id);
        
        // Update the local state to reflect the change
        if (updatedTask) {
          setLinkedTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === task.id ? { ...t, status: 'completed' } : t
            )
          );
          
          setSnackbarMessage('Task marked as completed');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
        }
      }
    } catch (error) {
      console.error('Error toggling task completion:', error);
      setSnackbarMessage('Failed to update task status');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Handle creating a new task
  const handleCreateTask = async () => {
    if (!taskDialogTab || !newTaskTitle.trim()) {
      setSnackbarMessage('Please enter a task title');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    try {
      setCreatingTask(true);
      
      // Create the task in the selected task list
      const newTask = await createTask(taskDialogTab, {
        title: newTaskTitle.trim()
      });
      
      if (newTask) {
        // Automatically select the newly created task
        const taskKey = `${taskDialogTab}:${newTask.id}`;
        setSelectedTasks(prev => ({
          ...prev,
          [taskKey]: true
        }));
        
        // Reset the input field
        setNewTaskTitle('');
        
        // Show success message
        setSnackbarMessage('Task created successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }
    } catch (error) {
      console.error('Error creating task:', error);
      setSnackbarMessage('Failed to create task');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setCreatingTask(false);
    }
  };

  // Handle opening the task menu
  const handleTaskMenuOpen = (event: React.MouseEvent<HTMLElement>, task: ExtendedGoogleTask) => {
    event.stopPropagation();
    setTaskMenuAnchorEl(event.currentTarget);
    setCurrentTaskForMenu(task);
  };
  
  // Handle closing the task menu
  const handleTaskMenuClose = () => {
    setTaskMenuAnchorEl(null);
    setCurrentTaskForMenu(null);
  };
  
  // Handle opening task details from menu
  const handleOpenTaskDetails = () => {
    if (!currentTaskForMenu || !currentTaskForMenu.task_list_id) return;
    
    // Find the task list title
    const taskList = taskLists.find(list => list.id === currentTaskForMenu.task_list_id);
    const taskListTitle = taskList?.title || 'Task List';
    
    setSelectedTaskDetails({
      task: currentTaskForMenu,
      taskListId: currentTaskForMenu.task_list_id,
      taskListTitle: taskListTitle
    });
    
    // Close the menu
    handleTaskMenuClose();
    
    // Open the details modal
    setTaskDetailsModalOpen(true);
  };
  
  // Handle closing task details modal
  const handleTaskDetailsClose = () => {
    setTaskDetailsModalOpen(false);
  };
  
  // Handle editing from task details modal
  const handleEditFromDetails = () => {
    // Close the task details modal
    setTaskDetailsModalOpen(false);
    
    // We could navigate to the task page for editing, but for now
    // we'll just show a notification that this action is not available from here
    setSnackbarMessage('To edit this task, please go to the Tasks page');
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
  };
  
  // Handle deleting from task details modal
  const handleDeleteFromDetails = async () => {
    if (!selectedTaskDetails.task || !selectedTaskDetails.taskListId) return;
    
    try {
      // Delete the task using the deleteTask function instead of updating status
      const success = await deleteTask(
        selectedTaskDetails.taskListId,
        selectedTaskDetails.task.id
      );
      
      if (success) {
        // Close the modal
        setTaskDetailsModalOpen(false);
        
        // Remove the task from the linkedTasks array
        setLinkedTasks(prevTasks => 
          prevTasks.filter(t => t.id !== selectedTaskDetails.task?.id)
        );
        
        // Show success message
        setSnackbarMessage('Task deleted successfully');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        
        // Refresh linked tasks data
        if (event && event.id) {
          fetchLinkedTasks(event.id);
        }
      } else {
        throw new Error('Failed to delete task');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      setSnackbarMessage('Failed to delete task');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  if (!event) return null;
  
  // Log the event data for debugging
  console.log('Rendering event details popup with data:', event);

  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  
  const formatEventDate = () => {
    if (event.isAllDay) {
      return format(eventStart, 'EEEE, d MMMM');
    }
    return format(eventStart, 'EEEE, d MMMM');
  };
  
  const formatEventTime = () => {
    if (event.isAllDay) {
      return 'All day';
    }
    const startFormatted = format(eventStart, 'h:mm a');
    const endFormatted = format(eventEnd, 'h:mm a');
    return `${startFormatted} - ${endFormatted}`;
  };
  
  const formatRecurrence = () => {
    // Check both ways a recurring event could be identified
    const isRecurringEvent = Boolean(event.recurringEventId) || 
                             (Array.isArray(event.recurrence) && event.recurrence && event.recurrence.length > 0);
    
    if (isRecurringEvent) {
      // If it's a specific day of the week recurring event
      return 'Weekly on ' + format(eventStart, 'EEEE');
    }
    return '';
  };

  // Get Google Meet link from event data
  const getMeetLink = (): { url: string, label: string } | null => {
    // Check for hangoutLink first (direct Google Meet link)
    if (event.hangoutLink) {
      return {
        url: event.hangoutLink,
        label: event.hangoutLink.replace('https://', '')
      };
    }
    
    // Check conferenceData for Google Meet links
    if (event.conferenceData?.entryPoints) {
      // Find video entry point (Google Meet)
      const videoEntry = event.conferenceData.entryPoints.find(
        entry => entry.entryPointType === 'video'
      );
      
      if (videoEntry?.uri) {
        return {
          url: videoEntry.uri,
          label: videoEntry.label || videoEntry.uri.replace('https://', '')
        };
      }
    }
    
    // No Google Meet link found
    return null;
  };

  // Get phone details from conferenceData
  const getPhoneDetails = (): { number: string, pin: string | null } | null => {
    if (event.conferenceData?.entryPoints) {
      // Find phone entry point
      const phoneEntry = event.conferenceData.entryPoints.find(
        entry => entry.entryPointType === 'phone'
      );
      
      if (phoneEntry?.uri) {
        return {
          number: phoneEntry.label || phoneEntry.uri.replace('tel:', ''),
          pin: phoneEntry.pin ?? null
        };
      }
    }
    
    return null;
  };

  // Get the organizer name from the API data
  const getOrganizer = (): string => {
    // First try from the organizer field
    if (event.organizer) {
      if (event.organizer.displayName) {
        return event.organizer.displayName;
      }
      if (event.organizer.email) {
        // Extract name from email if no display name
        const emailName = event.organizer.email.split('@')[0];
        return emailName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
      }
    }
    
    // Try from creator field
    if (event.creator) {
      if (event.creator.displayName) {
        return event.creator.displayName;
      }
      if (event.creator.email) {
        // Extract name from email
        const emailName = event.creator.email.split('@')[0];
        return emailName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
      }
    }
    
    // Default fallback
    return 'Organizer';
  };

  // Get guest list from attendees in API response
  const getGuestList = (): Guest[] => {
    const guests: Guest[] = [];
    
    // Check if we have attendees in the API response
    if (event.attendees && event.attendees.length > 0) {
      // Map API attendees to our Guest format
      event.attendees.forEach(attendee => {
        if (attendee.email) {
          let name = attendee.displayName || '';
          
          // If no display name, try to format from email
          if (!name && attendee.email) {
            const emailName = attendee.email.split('@')[0];
            name = emailName.split('.').map(part => 
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ');
          }
          
          // Determine response status
          let response = 'Invited';
          if (attendee.responseStatus) {
            switch (attendee.responseStatus.toLowerCase()) {
              case 'accepted':
                response = 'Going';
                break;
              case 'declined':
                response = 'No';
                break;
              case 'tentative':
                response = 'Maybe';
                break;
              case 'needsaction':
                response = 'Invited';
                break;
            }
          }
          
          // Determine if this is the organizer
          if (attendee.organizer) {
            response = 'Organiser';
          }
          
          // Determine if this is the current user
          const isSelf = attendee.self || 
                         (event.creator && attendee.email === event.creator.email);
          
          // Create the guest entry (no hardcoded locations)
          guests.push({
            name: name,
            response: response,
            avatar: name.charAt(0).toUpperCase(),
            location: '', // No hardcoded locations
            email: attendee.email,
            isOrganizer: attendee.organizer,
            isSelf: isSelf
          });
        }
      });
    }
    
    // If no attendees from the API, don't add any fake ones
    return guests;
  };
  
  const getAgendaItems = (): string[] => {
    // If event has a description with bullet points, use that
    if (event.description) {
      console.log('Parsing event description for agenda items:', event.description);
      // Look for bullet points or numbered items
      const bulletMatch = event.description.match(/(?:^|\n)[\s-]*([•\-*]\s[^\n]+)/g);
      if (bulletMatch && bulletMatch.length > 0) {
        return bulletMatch.map(item => item.trim());
      }
      
      const numberedMatch = event.description.match(/(?:^|\n)[\s-]*(\d+\.\s[^\n]+)/g);
      if (numberedMatch && numberedMatch.length > 0) {
        return numberedMatch.map(item => item.trim());
      }
      
      // If no bullet points but multiline description, format each line
      if (event.description.includes('\n')) {
        return event.description
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(item => {
            if (!item.startsWith('-') && !item.startsWith('•')) {
              return `- ${item}`;
            }
            return item;
          });
      }
      
      // Single line description
      if (event.description.trim().length > 0) {
        return [`- ${event.description.trim()}`];
      }
    }
    
    // If no agenda items can be extracted from the description, return an empty array
    return [];
  };

  const meetLink = getMeetLink();
  const phoneDetails = getPhoneDetails();
  const guestList = getGuestList();
  const agendaItems = getAgendaItems();
  const organizer = getOrganizer();

  // Count of people who have accepted the invitation - actually count from the data
  const acceptedCount = guestList.filter(guest => 
    guest.response === 'Going' || guest.response === 'Accepted' || guest.response === 'Yes'
  ).length;

  // Check if this is a focus time event
  const isFocusTimeEvent = event.eventType === 'focusTime';

  // Check if the current user has declined this event
  const isDeclinedByCurrentUser = event.attendees?.some(attendee => 
    (attendee.self === true && attendee.responseStatus?.toLowerCase() === 'declined')
  );

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbarMessage('Meeting link copied to clipboard');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setSnackbarMessage('Failed to copy meeting link');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };

  // Handle deletion scope selection for recurring events
  const handleDeleteScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDeleteScope(e.target.value as 'single' | 'all');
  };

  // Close the recurring deletion dialog
  const handleCloseDeleteRecurringDialog = () => {
    setDeleteRecurringDialogOpen(false);
  };

  // Confirm recurring event deletion
  const handleConfirmRecurringDelete = () => {
    setDeleteRecurringDialogOpen(false);
    setDeleteConfirmOpen(true);
  };

  // Confirm the actual deletion
  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false);
    if (event && onDelete) {
      // Pass the deletion scope for recurring events
      onDelete(event);
    }
    onClose();
  };

  // Handle completion time recorded
  const handleCompletionTimeRecorded = async (actualMinutes: number) => {
    if (!taskForDuration) return;
    
    try {
      // First change status to completed using toggleTaskComplete to ensure proper state updating
      const updatedTask = await toggleTaskComplete(
        taskForDuration.taskListId, 
        taskForDuration.task.id
      );
      
      // Then record duration if successful
      if (updatedTask && updatedTask.status === 'completed') {
        try {
          // Update the local state to reflect the task completion
          setLinkedTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === taskForDuration.task.id ? { ...t, status: 'completed' } : t
            )
          );
          
          // Record the task duration
          const durationResult = await recordDuration(
            taskForDuration.taskListId,
            taskForDuration.task.id,
            actualMinutes
          );
          
          if (durationResult) {
            setSnackbarMessage('Task completed and duration recorded');
            setSnackbarSeverity('success');
          } else {
            setSnackbarMessage('Task completed but failed to record duration');
            setSnackbarSeverity('warning');
          }
        } catch (error) {
          console.error('Error recording task duration:', error);
          setSnackbarMessage('Task completed but failed to record duration');
          setSnackbarSeverity('warning');
        }
      } else {
        setSnackbarMessage('Failed to complete task');
        setSnackbarSeverity('error');
      }
    } catch (error) {
      console.error('Error completing task:', error);
      setSnackbarMessage('Failed to complete task');
      setSnackbarSeverity('error');
    } finally {
      setDurationDialogOpen(false);
      setTaskForDuration(null);
      setSnackbarOpen(true);
    }
  };
  
  // Handle duration dialog close
  const handleDurationDialogClose = () => {
    setDurationDialogOpen(false);
    setTaskForDuration(null);
  };

  return (
    <>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: { 
            width: isMobile ? '95vw' : 400, 
            maxHeight: isMobile ? '90vh' : '80vh',
            overflowY: 'auto',
            borderRadius: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Paper elevation={0}>
          {/* Header with close button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: isMobile ? 1.5 : 1 }}>
            <IconButton 
              size={isMobile ? "medium" : "small"} 
              onClick={onClose} 
              aria-label="close"
              sx={{ padding: isMobile ? 1 : 0.5 }} // Larger touch target on mobile
            >
              <CloseIcon fontSize={isMobile ? "medium" : "small"} />
            </IconButton>
          </Box>
          
          {/* Event title and color indicator */}
          <Box sx={{ 
            px: isMobile ? 2.5 : 3, 
            pt: 1, 
            pb: 2, 
            display: 'flex', 
            alignItems: 'flex-start' 
          }}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: 1, 
                bgcolor: '#1A73E8', 
                mr: 2,
                mt: 0.5 
              }} 
            />
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              sx={{ 
                fontWeight: 500, 
                flex: 1,
                textDecoration: isDeclinedByCurrentUser ? 'line-through' : 'none',
                opacity: isDeclinedByCurrentUser ? 0.6 : 1
              }}
            >
              {event.summary || event.title}
            </Typography>
            
            {/* More options menu */}
            <IconButton 
              size={isMobile ? "medium" : "small"} 
              sx={{ ml: 1, padding: isMobile ? 1 : 0.5 }} 
              onClick={handleMenuOpen}
            >
              <MoreVertIcon fontSize={isMobile ? "medium" : "small"} />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleEditClick} dense>
                <EditIcon fontSize="small" sx={{ mr: 1 }} />
                Edit event
              </MenuItem>
              <MenuItem onClick={handleDeleteClick} dense>
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Delete event
              </MenuItem>
            </Menu>
          </Box>
          
          {/* Date and time */}
          <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
            {isDeclinedByCurrentUser && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#D32F2F', 
                  mb: 0.5, 
                  fontWeight: 'medium',
                  fontSize: isMobile ? '0.9rem' : '0.85rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ● Declined
              </Typography>
            )}
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
            >
              {formatEventDate()} · {formatEventTime()}
            </Typography>
            {formatRecurrence() && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
              >
                {formatRecurrence()}
              </Typography>
            )}
          </Box>
          
          {/* Google Meet section */}
          {meetLink && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar 
                  src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png" 
                  alt="Google Meet"
                  sx={{ width: isMobile ? 24 : 20, height: isMobile ? 24 : 20, mr: 1 }}
                >
                  <VideocamIcon fontSize="small" />
                </Avatar>
                <Button 
                  variant="contained" 
                  href={meetLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    bgcolor: '#1A73E8', 
                    color: 'white',
                    '&:hover': { bgcolor: '#1557b0' },
                    textTransform: 'none',
                    px: 2,
                    py: isMobile ? 0.75 : 0.5,
                    fontSize: isMobile ? '0.9rem' : '0.85rem',
                    minHeight: isMobile ? '36px' : '32px'
                  }}
                >
                  Join with Google Meet
                </Button>
                <IconButton 
                  size={isMobile ? "medium" : "small"} 
                  sx={{ ml: 1 }}
                  onClick={() => copyToClipboard(meetLink.url)}
                >
                  <ContentCopyIcon fontSize={isMobile ? "medium" : "small"} />
                </IconButton>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  ml: 3, 
                  fontSize: isMobile ? '0.875rem' : '0.8rem',
                  wordBreak: 'break-all'
                }}
              >
                {meetLink.label}
              </Typography>
            </Box>
          )}
          
          {/* Phone details */}
          {phoneDetails && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <PhoneIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: '#1A73E8', 
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18 
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="primary" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: isMobile ? '0.9rem' : '0.85rem'
                  }}
                >
                  Join by phone
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  ml: 3, 
                  fontSize: isMobile ? '0.875rem' : '0.8rem' 
                }}
              >
                {phoneDetails.number}{phoneDetails.pin ? ` PIN: ${phoneDetails.pin}` : ''}
              </Typography>
            </Box>
          )}
          
          {/* Attachments section - only show if there are attachments */}
          {event.attachments && event.attachments.length > 0 && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                <AttachFileIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary', 
                    mt: 0.5,
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="primary" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: isMobile ? '0.9rem' : '0.85rem'
                  }}
                >
                  {event.attachments.length === 1 ? 'Attachment' : 'Attachments'}
                </Typography>
              </Box>
              {event.attachments.map((attachment, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    ml: 3, 
                    mb: 1, 
                    display: 'flex', 
                    alignItems: 'center' 
                  }}
                >
                  <Box 
                    component="img" 
                    src={attachment.iconLink} 
                    alt="" 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      mr: 1 
                    }} 
                  />
                  <Link
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      fontSize: '0.85rem',
                      color: '#1a73e8',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {attachment.title}
                  </Link>
                </Box>
              ))}
            </Box>
          )}
          
          {/* Location if available */}
          {event.location && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                <LocationOnIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary', 
                    mt: 0.5,
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
                >
                  {event.location}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Guest details */}
          {guestList.length > 0 && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary',
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
                >
                  {guestList.length} {guestList.length === 1 ? 'guest' : 'guests'}
                </Typography>
              </Box>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  ml: 3, 
                  mb: 1,
                  fontSize: '0.85rem'
                }}
              >
                {acceptedCount} yes 
                {guestList.some(g => g.location?.toLowerCase().includes('virtual')) && ' (1 virtually)'}
              </Typography>
              
              {guestList.map((guest, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', ml: 3, mb: 1 }}>
                  <Avatar sx={{ 
                    width: 24, 
                    height: 24, 
                    fontSize: '0.75rem', 
                    bgcolor: guest.isOrganizer ? '#4285F4' : 
                             guest.isSelf ? '#34A853' : 
                             '#F4B400'
                  }}>
                    {guest.avatar}
                  </Avatar>
                  <Box sx={{ ml: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {guest.name} 
                      {guest.isOrganizer && (
                        <Typography 
                          component="span" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            color: 'gray', 
                            ml: 0.5, 
                            mt: '-2px' 
                          }}
                        >
                          •
                        </Typography>
                      )}
                    </Typography>
                    {guest.isOrganizer && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Organiser
                      </Typography>
                    )}
                    <Typography 
                      variant="caption" 
                      display="block" 
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {guest.location}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          
          {/* Agenda section - only display if there are actual agenda items */}
          {agendaItems.length > 0 && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  mb: 1,
                  fontSize: '0.85rem' 
                }}
              >
                Agenda
              </Typography>
              
              {agendaItems.map((item, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 0.5,
                    fontSize: '0.85rem',
                    lineHeight: 1.4
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          )}
          
          {/* Tasks Section - now with toggleable checkboxes */}
          <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TaskIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary',
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
                >
                  Tasks for this event
                </Typography>
              </Box>
              <Button
                startIcon={<AddTaskIcon />}
                size="small"
                onClick={handleManageTasks}
                sx={{ 
                  textTransform: 'none', 
                  fontSize: '0.75rem',
                  minHeight: '28px', 
                  p: '4px 8px',
                  borderRadius: '4px',
                  color: '#1A73E8'
                }}
              >
                Manage
              </Button>
            </Box>
            
            {loadingTasks ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                <CircularProgress size={24} />
              </Box>
            ) : linkedTasks.length > 0 ? (
              <List dense sx={{ ml: 3, mt: 0, padding: 0 }}>
                {linkedTasks.map((task) => {
                  const taskKey = `${task.task_list_id}:${task.id}`;
                  return (
                    <ListItem 
                      key={taskKey} 
                      sx={{ px: 0, py: 0.5 }}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="more" 
                          size="small"
                          onClick={(e) => handleTaskMenuOpen(e, task)}
                          sx={{ 
                            mr: -1,
                            '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.04)' }
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Checkbox
                          edge="start"
                          checked={task.status === 'completed'}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleTaskComplete(task as ExtendedGoogleTask);
                          }}
                          tabIndex={-1}
                          sx={{ 
                            p: 0.5,
                            color: '#5f6368',
                            '&.Mui-checked': {
                              color: '#1A73E8'
                            }
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={task.title} 
                        secondary={
                                                        task.due ? 
                                <Box component="span" sx={{ 
                                  color: isOverdue(task.due) 
                                    ? 'error.main' 
                                    : isDueToday(task.due)
                                    ? 'warning.main'
                                    : 'text.secondary',
                                  fontWeight: (isOverdue(task.due) || isDueToday(task.due)) ? 500 : 400,
                                }}>
                                  {new Date(task.due).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                  {task.has_explicit_time && 
                                    ' • ' + new Date(task.due).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    })
                                  }
                                  {isOverdue(task.due) 
                                    ? ' (Overdue)' 
                                    : isDueToday(task.due) 
                                    ? ' (Due)' 
                                    : ''}
                            </Box>
                          : null
                        }
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.85rem',
                            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                            color: task.status === 'completed' ? 'text.secondary' : 'text.primary'
                          },
                          '& .MuiListItemText-secondary': {
                            fontSize: '0.8rem'
                          }
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ ml: 3, fontSize: '0.8rem', fontStyle: 'italic' }}
              >
                No tasks linked to this event
              </Typography>
            )}
          </Box>
          
          {/* Organizer section */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.85rem' }}
            >
              {organizer}
            </Typography>
          </Box>
          
          {/* RSVP section - hide for focus time events */}
          {!isFocusTimeEvent && (
            <>
              <Divider />
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mr: 2, 
                    fontSize: '0.85rem',
                    mb: isMobile ? 1.5 : 0,
                    alignSelf: isMobile ? 'flex-start' : 'center'
                  }}
                >
                  Going?
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <ToggleButtonGroup
                    value={rsvpStatus}
                    exclusive
                    onChange={handleRsvpToggleChange}
                    size={isMobile ? "medium" : "small"}
                    sx={{
                      flexGrow: isMobile ? 1 : 0,
                      '& .MuiToggleButton-root': {
                        px: isMobile ? 2 : 1.5,
                        py: isMobile ? 0.75 : 0.5,
                        flex: isMobile ? '1 1 0' : 'none',
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        '&.Mui-selected': {
                          bgcolor: '#E8F0FE',
                          color: '#1A73E8',
                          '&:hover': { bgcolor: '#D2E3FC' }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="Yes">Yes</ToggleButton>
                    <ToggleButton value="No">No</ToggleButton>
                    <ToggleButton value="Maybe">Maybe</ToggleButton>
                  </ToggleButtonGroup>
                  <Button 
                    variant="contained" 
                    size={isMobile ? "medium" : "small"} 
                    onClick={handleOpenNoteDialog}
                    sx={{ 
                      ml: 1, 
                      bgcolor: '#1A73E8', 
                      '&:hover': { bgcolor: '#1557b0' },
                      fontSize: isMobile ? '0.9rem' : '0.8rem',
                      textTransform: 'none',
                      minHeight: isMobile ? '40px' : '36px',
                      minWidth: isMobile ? '80px' : '64px'
                    }}
                  >
                    Update
                  </Button>
                </Box>
              </Box>
              
              {/* Add a note button */}
              <Box sx={{ px: isMobile ? 2.5 : 2, pb: isMobile ? 2.5 : 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  size={isMobile ? "medium" : "small"} 
                  onClick={handleDirectNoteDialog}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: isMobile ? '0.9rem' : '0.85rem',
                    borderColor: '#dadce0',
                    color: '#3c4043',
                    minHeight: isMobile ? '40px' : '36px',
                    '&:hover': {
                      borderColor: '#d2d5d9',
                      bgcolor: 'rgba(60, 64, 67, 0.04)'
                    }
                  }}
                >
                  Add a note
                </Button>
              </Box>
            </>
          )}
          
          {/* Focus time message - only show for focus time events */}
          {isFocusTimeEvent && (
            <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.85rem' }}
              >
                This is a focus time event. You cannot add attendees or responses.
              </Typography>
            </Box>
          )}
        </Paper>
      </Popover>
      
      {/* Recurring Event Dialog */}
      <Dialog
        open={recurringDialogOpen}
        onClose={handleCloseRecurringDialog}
        aria-labelledby="recurring-response-dialog-title"
        PaperProps={{
          sx: { 
            borderRadius: 2,
            width: isMobile ? '95vw' : 400,
            maxWidth: isMobile ? '95vw' : 400
          }
        }}
      >
        <DialogTitle id="recurring-response-dialog-title" sx={{ pb: 1, pt: isMobile ? 2 : 1.5 }}>
          {recurringDialogMode === 'rsvp' ? 'RSVP to recurring event' : 'Add note to recurring event'}
        </DialogTitle>
        <DialogContent sx={{ pt: isMobile ? 1 : 0.5 }}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="response-scope"
              name="response-scope"
              value={responseScope}
              onChange={handleRecurringScopeChange}
            >
              <FormControlLabel 
                value="single" 
                control={<Radio size={isMobile ? "medium" : "small"} />} 
                label="This event" 
                sx={{ py: isMobile ? 0.75 : 0.5 }}
              />
              <FormControlLabel 
                value="following" 
                control={<Radio size={isMobile ? "medium" : "small"} />} 
                label="This and following events" 
                sx={{ py: isMobile ? 0.75 : 0.5 }}
              />
              <FormControlLabel 
                value="all" 
                control={<Radio size={isMobile ? "medium" : "small"} />} 
                label="All events" 
                sx={{ py: isMobile ? 0.75 : 0.5 }}
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: isMobile ? 3 : 2 }}>
          <Button 
            onClick={handleCloseRecurringDialog}
            sx={{ 
              color: '#1A73E8', 
              textTransform: 'none',
              fontWeight: 500,
              fontSize: isMobile ? '0.9rem' : '0.85rem',
              minHeight: isMobile ? '40px' : '36px',
              px: isMobile ? 2.5 : 2
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleRecurringConfirm}
            sx={{ 
              bgcolor: '#1A73E8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none',
              fontWeight: 500,
              fontSize: isMobile ? '0.9rem' : '0.85rem',
              minHeight: isMobile ? '40px' : '36px',
              px: isMobile ? 2.5 : 2
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Note Dialog - Redesigned to match screenshots */}
      <Dialog
        open={noteDialogOpen}
        onClose={handleCloseNoteDialog}
        aria-labelledby="add-note-dialog-title"
        PaperProps={{
          sx: { 
            borderRadius: 2,
            width: isMobile ? '95vw' : 400,
            maxWidth: isMobile ? '95vw' : 400
          }
        }}
      >
        <DialogTitle 
          id="add-note-dialog-title" 
          sx={{ 
            pt: isMobile ? 3.5 : 3, 
            pb: isMobile ? 2.5 : 2,
            px: isMobile ? 3.5 : 3,
            fontSize: isMobile ? '1.6rem' : '1.5rem',
            fontWeight: 400
          }}
        >
          Add a note
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 3.5 : 3, pt: 1, pb: isMobile ? 3.5 : 3 }}>
          {/* Note input field styled to match Google Calendar */}
          <Box 
            component="div" 
            sx={{
              width: '100%',
              mb: 3,
              mt: 1,
              backgroundColor: '#f1f3f4',
              borderRadius: '8px',
              position: 'relative',
              '&:focus-within': {
                outline: '2px solid #1a73e8'
              }
            }}
          >
            <Box
              component="textarea"
              placeholder="Add a note"
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              sx={{
                width: '100%',
                minHeight: isMobile ? '180px' : '150px',
                p: 2,
                border: 'none',
                borderRadius: '8px',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: isMobile ? '1.1rem' : '1rem',
                backgroundColor: 'transparent',
                '&:focus': {
                  outline: 'none'
                }
              }}
            />
          </Box>
          
          {/* RSVP dropdown styled to match Google Calendar */}
          <Box 
            onClick={handleRsvpMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: isMobile ? 2 : 1.5,
              backgroundColor: '#f1f3f4',
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: isMobile ? '48px' : '40px',
              '&:hover': {
                backgroundColor: '#e8eaed'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a73e8',
                  mr: 1,
                  fontSize: isMobile ? '1.1rem' : '1rem'
                }}
              >
                ✓
              </Box>
              <Typography sx={{ 
                color: '#202124',
                fontSize: isMobile ? '1rem' : '0.9rem'
              }}>
                RSVP: {rsvpStatus}
              </Typography>
            </Box>
            <Box 
              component="span" 
              sx={{ 
                color: '#5f6368',
                fontSize: isMobile ? '1rem' : '0.9rem'
              }}
            >
              ▼
            </Box>
          </Box>
          
          {/* RSVP dropdown menu */}
          <Menu
            anchorEl={rsvpMenuAnchorEl}
            open={Boolean(rsvpMenuAnchorEl)}
            onClose={handleRsvpMenuClose}
            sx={{
              '& .MuiPaper-root': {
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                mt: 1,
                width: isMobile ? '95vw' : 'auto',
                maxWidth: isMobile ? '95vw' : 400
              }
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <MenuItem onClick={() => handleRsvpChange('Yes')} sx={{ py: isMobile ? 2 : 1.5, px: isMobile ? 3 : 2 }}>
              <Box 
                component="span" 
                sx={{ 
                  color: '#1a73e8', 
                  mr: 2,
                  fontSize: isMobile ? '1.1rem' : '1rem'
                }}
              >
                ✓
              </Box>
              <Typography sx={{ fontSize: isMobile ? '1rem' : '0.9rem' }}>
                Yes
              </Typography>
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('Yes, in a meeting room')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>🏢</Box>
              Yes, in a meeting room
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('Yes, joining virtually')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>🎥</Box>
              Yes, joining virtually
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('No')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>✕</Box>
              No
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('Maybe')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>?</Box>
              Maybe
            </MenuItem>
          </Menu>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 3.5 : 3, pb: isMobile ? 3.5 : 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            onClick={handleCloseNoteDialog}
            sx={{ 
              color: '#1A73E8', 
              textTransform: 'none',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.25px',
              px: isMobile ? 2.5 : 2,
              py: isMobile ? 1.25 : 1,
              minHeight: isMobile ? '44px' : '36px'
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleRsvp}
            sx={{ 
              bgcolor: '#1A73E8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: 500,
              borderRadius: '4px',
              px: isMobile ? 3.5 : 3,
              py: isMobile ? 1.25 : 1,
              ml: 1,
              minHeight: isMobile ? '44px' : '36px'
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit form dialog */}
      <EventEditForm 
        event={event}
        open={isEditFormOpen}
        onClose={handleEditFormClose}
        onSave={handleEditFormSave}
      />
      
      {/* Notification snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      
      {/* Add confirmation dialog for deleting events */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this event
            {deleteScope === 'all' ? ' and all its future occurrences' : ''}?
            <br /><br />
            <strong>{event?.title || event?.summary}</strong>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add recurring event dialog for deletion */}
      <Dialog
        open={deleteRecurringDialogOpen}
        onClose={handleCloseDeleteRecurringDialog}
        aria-labelledby="recurring-delete-dialog-title"
      >
        <DialogTitle id="recurring-delete-dialog-title">
          Delete Recurring Event
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This is a recurring event. Would you like to delete just this instance or all instances of this event?
          </DialogContentText>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="delete-recurring-event-scope"
              name="delete-recurring-event-scope"
              value={deleteScope}
              onChange={handleDeleteScopeChange}
            >
              <FormControlLabel value="single" control={<Radio />} label="Delete only this instance" />
              <FormControlLabel value="all" control={<Radio />} label="Delete all instances" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteRecurringDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmRecurringDelete} color="error" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Tasks selection dialog */}
      <Dialog
        open={taskDialogOpen}
        onClose={handleTaskDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { 
            borderRadius: 1.5,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Link tasks to event
        </DialogTitle>
        <DialogContent sx={{ display: 'flex' }}>
          {/* Task Lists Navigation */}
          <Box sx={{ width: '30%', borderRight: '1px solid rgba(0, 0, 0, 0.12)', pr: 1 }}>
            <List dense>
              {taskLists.map((taskList) => (
                <ListItem 
                  key={taskList.id} 
                  button 
                  selected={taskDialogTab === taskList.id}
                  onClick={() => handleTaskTabChange(taskList.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(26, 115, 232, 0.1)',
                      color: '#1A73E8'
                    }
                  }}
                >
                  <ListItemText 
                    primary={taskList.title} 
                    primaryTypographyProps={{ 
                      noWrap: true,
                      fontSize: '0.9rem'
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
          
          {/* Tasks Selection */}
          <Box sx={{ width: '70%', pl: 2, overflow: 'auto' }}>
            {taskDialogTab ? (
              <>
                {/* Create new task form */}
                <Box sx={{ 
                  mb: 2, 
                  display: 'flex', 
                  alignItems: 'center',
                  width: '100%',
                  py: 1
                }}>
                  <Box
                    component="input"
                    placeholder="New task"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    disabled={creatingTask ? true : false}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && newTaskTitle.trim()) {
                        e.preventDefault();
                        handleCreateTask();
                      }
                    }}
                    sx={{
                      flex: 1,
                      mr: 1,
                      height: '48px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      px: 2,
                      fontSize: '16px',
                      fontFamily: 'Poppins, sans-serif',
                      '&:focus': {
                        outline: '1px solid #1a73e8',
                        borderColor: '#1a73e8'
                      },
                      '&::placeholder': {
                        color: '#5f6368',
                        fontFamily: 'Poppins, sans-serif',
                        opacity: 1
                      }
                    }}
                  />
                  <Button
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim() || creatingTask}
                    sx={{
                      height: '48px',
                      minWidth: '100px',
                      borderRadius: '4px',
                      bgcolor: newTaskTitle.trim() ? '#1a73e8' : '#e8e8e8',
                      color: newTaskTitle.trim() ? '#ffffff' : '#5f6368',
                      boxShadow: 'none',
                      fontSize: '16px',
                      fontFamily: 'Poppins, sans-serif',
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: newTaskTitle.trim() ? '#1557b0' : '#dadce0',
                        boxShadow: 'none'
                      },
                      '&.Mui-disabled': {
                        bgcolor: '#f1f3f4',
                        color: '#bdc1c6'
                      }
                    }}
                  >
                    Add
                  </Button>
                </Box>

                {/* Task list */}
              <List dense>
                {taskLists
                  .find(list => list.id === taskDialogTab)
                  ?.tasks
                  .filter(task => task.status !== 'completed')
                  .map((task) => {
                    const taskKey = `${taskDialogTab}:${task.id}`;
                    return (
                      <ListItem key={taskKey} dense>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={!!selectedTasks[taskKey]}
                            onChange={(e) => handleTaskToggle(taskDialogTab, task.id)}
                            sx={{
                              color: '#5f6368',
                              '&.Mui-checked': {
                                color: '#1A73E8'
                              }
                            }}
                          />
                        </ListItemIcon>
                        <ListItemText 
                          primary={task.title} 
                          secondary={
                            task.due ? 
                              <Box component="span" sx={{ 
                                color: isOverdue(task.due) 
                                  ? 'error.main' 
                                  : isDueToday(task.due)
                                  ? 'warning.main'
                                  : 'text.secondary',
                                fontWeight: (isOverdue(task.due) || isDueToday(task.due)) ? 500 : 400,
                              }}>
                                {new Date(task.due).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                                {task.has_explicit_time && 
                                  ' • ' + new Date(task.due).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  })
                                }
                                {isOverdue(task.due) 
                                  ? ' (Overdue)' 
                                  : isDueToday(task.due) 
                                  ? ' (Due)' 
                                  : ''}
                              </Box>
                            : null
                          }
                          sx={{
                            '& .MuiListItemText-primary': {
                              fontSize: '0.9rem'
                            },
                            '& .MuiListItemText-secondary': {
                              fontSize: '0.8rem'
                            }
                          }}
                        />
                      </ListItem>
                    );
                  })}
              </List>
              </>
            ) : (
              <Typography sx={{ p: 2, color: 'text.secondary' }}>
                Select a task list to view tasks
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTaskDialogClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveTasks} 
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Task menu */}
      <Menu
        anchorEl={taskMenuAnchorEl}
        open={Boolean(taskMenuAnchorEl)}
        onClose={handleTaskMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { 
            minWidth: 180,
            boxShadow: '0px 2px 8px rgba(0,0,0,0.15)',
            borderRadius: '8px'
          }
        }}
      >
        <MenuItem onClick={handleOpenTaskDetails} dense>
          <ListItemIcon>
            <InfoOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Task Details" />
        </MenuItem>
      </Menu>
      
      {/* Add TaskDetailsModal component */}
      <TaskDetailsModal
        open={taskDetailsModalOpen}
        onClose={handleTaskDetailsClose}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
        task={selectedTaskDetails.task}
        taskListId={selectedTaskDetails.taskListId}
        taskListTitle={selectedTaskDetails.taskListTitle}
      />
      
      {/* Task Duration Dialog */}
      <TaskDurationDialog
        open={durationDialogOpen}
        onClose={handleDurationDialogClose}
        task={taskForDuration?.task || null}
        taskListId={taskForDuration?.taskListId || null}
        onComplete={handleCompletionTimeRecorded}
      />
    </>
  );
};

export default EventDetailsPopup; 