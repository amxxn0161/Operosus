import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  FormHelperText,
  Alert,
  Chip,
  Paper,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import LinkIcon from '@mui/icons-material/Link';
import { format } from 'date-fns';
import { CalendarEvent } from '../services/calendarService';
import { useCalendar } from '../contexts/CalendarContext';
import { useGoogleTasks } from '../contexts/GoogleTasksContext';

// Add interface for attendee type
interface Attendee {
  email: string;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

// Add interface for task type
interface Task {
  id: string;
  title: string;
  completed: boolean;
  notes?: string;
  task_list_id?: string | null;
  due?: string;
  has_explicit_time?: boolean;
  status?: string;
}

interface EventCreationModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime?: { hour: number; minute: number };
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  open,
  onClose,
  selectedDate,
  selectedTime
}) => {
  const { addEvent, createFocusTimeWithTasks, createEventWithTasks } = useCalendar();
  const { deleteTask, taskLists, refreshTaskLists } = useGoogleTasks();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Calculate initial start and end times based on the selected time or default to current hour
  const getInitialStartTime = (): Date => {
    const date = new Date(selectedDate);
    if (selectedTime) {
      date.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
    } else {
      // Default to current hour rounded to nearest half hour
      const now = new Date();
      const minutes = Math.ceil(now.getMinutes() / 30) * 30;
      date.setHours(now.getHours(), minutes === 60 ? 0 : minutes, 0, 0);
      if (minutes === 60) {
        date.setHours(date.getHours() + 1);
      }
    }
    return date;
  };
  
  const getInitialEndTime = (startTime: Date): Date => {
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  };
  
  const initialStart = getInitialStartTime();
  const initialEnd = getInitialEndTime(initialStart);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('default');
  const [startDate, setStartDate] = useState(format(initialStart, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(initialStart, 'HH:mm'));
  const [endDate, setEndDate] = useState(format(initialEnd, 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(format(initialEnd, 'HH:mm'));
  const [isAllDay, setIsAllDay] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(true);
  const [autoDeclineMeetings, setAutoDeclineMeetings] = useState(true);
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);
  
  // New attendees state
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeOptional, setNewAttendeeOptional] = useState(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  
  // Tasks state for focus time events
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [taskError, setTaskError] = useState<string | null>(null);
  
  // New state for task due date and time
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskDueTime, setNewTaskDueTime] = useState<string>('');
  const [showTaskTimePicker, setShowTaskTimePicker] = useState<boolean>(false);
  
  // New state for task selection dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState<boolean>(false);
  const [taskDialogTab, setTaskDialogTab] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<{[key: string]: boolean}>({});
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!isAllDay && !startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (!isAllDay && !endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    // Validate that end date/time is after start date/time
    if (startDate && endDate) {
      const start = new Date(`${startDate}T${isAllDay ? '00:00' : startTime}`);
      const end = new Date(`${endDate}T${isAllDay ? '23:59' : endTime}`);
      
      if (end < start) {
        newErrors.endDate = 'End date/time must be after start date/time';
      }
    }
    
    // Check if at least one task is added for focus time events
    if (eventType === 'focusTime' && tasks.length === 0) {
      newErrors.tasks = 'At least one task is required for focus time events';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to validate and add an attendee
  const addAttendee = () => {
    // Reset error
    setAttendeeError(null);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendeeEmail)) {
      setAttendeeError('Please enter a valid email address');
      return;
    }
    
    // Check if email already exists in attendees
    if (attendees.some(attendee => attendee.email === newAttendeeEmail)) {
      setAttendeeError('This email has already been added');
      return;
    }
    
    // Add new attendee
    const newAttendee: Attendee = {
      email: newAttendeeEmail,
      responseStatus: 'needsAction',
      optional: newAttendeeOptional
    };
    
    setAttendees([...attendees, newAttendee]);
    
    // Reset input fields
    setNewAttendeeEmail('');
    setNewAttendeeOptional(false);
  };
  
  // Function to remove an attendee
  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter(attendee => attendee.email !== email));
  };

  // Function to add a task
  const addTask = () => {
    // Reset error
    setTaskError(null);
    
    if (!newTaskTitle.trim()) {
      setTaskError('Task title cannot be empty');
      return;
    }
    
    // Add new task with optional due date and time
    const newTask: Task = {
      id: Date.now().toString(), // Simple unique ID
      title: newTaskTitle.trim(),
      completed: false
    };
    
    // Add due date and time if provided
    if (newTaskDueDate) {
      if (showTaskTimePicker && newTaskDueTime) {
        // If both date and time are provided
        const dueDateTime = `${newTaskDueDate}T${newTaskDueTime}:00`;
        newTask.due = dueDateTime;
        newTask.has_explicit_time = true;
        
        // Add time to notes for display in task details
        const timeStr = newTaskDueTime;
        newTask.notes = `Due Time: ${timeStr}`;
      } else {
        // If only date is provided (set to midnight)
        newTask.due = `${newTaskDueDate}T00:00:00`;
        newTask.has_explicit_time = false;
      }
    }
    
    setTasks([...tasks, newTask]);
    
    // Reset input fields
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskDueTime('');
    setShowTaskTimePicker(false);
  };
  
  // Function to remove a task
  const removeTask = async (id: string) => {
    // Find the task to be removed
    const taskToRemove = tasks.find(task => task.id === id);
    
    // Remove the task from local state first
    setTasks(tasks.filter(task => task.id !== id));
    
    // If the task has a task_list_id, it exists in Google Tasks API
    // and should be deleted from there too
    if (taskToRemove?.task_list_id) {
      try {
        // Call the Google Tasks API to delete the task
        const success = await deleteTask(taskToRemove.task_list_id, taskToRemove.id);
        
        if (success) {
          console.log(`Task ${id} successfully deleted from Google Tasks API`);
        } else {
          console.error(`Failed to delete task ${id} from Google Tasks API`);
        }
      } catch (error) {
        console.error('Error deleting task from API:', error);
      }
    }
  };

  // Function to open task selection dialog
  const handleOpenTaskDialog = () => {
    setTaskDialogOpen(true);
    
    // Set default task list tab to the first task list if available
    if (taskLists.length > 0 && !taskDialogTab) {
      setTaskDialogTab(taskLists[0].id);
    }
  };
  
  // Handle task dialog close
  const handleTaskDialogClose = () => {
    setTaskDialogOpen(false);
  };
  
  // Set the active tab in the task dialog
  const handleTaskTabChange = (taskListId: string) => {
    setTaskDialogTab(taskListId);
  };
  
  // Toggle task selection in the dialog
  const handleTaskToggle = (taskListId: string, taskId: string, taskTitle: string) => {
    const taskKey = `${taskListId}:${taskId}`;
    setSelectedTasks(prev => ({
      ...prev,
      [taskKey]: !prev[taskKey]
    }));
  };
  
  // Save selected tasks and add them to the event
  const handleSaveSelectedTasks = () => {
    // Get all selected tasks
    const newSelectedTasks: Task[] = Object.entries(selectedTasks)
      .filter(([_, isSelected]) => isSelected)
      .map(([key]) => {
        const [taskListId, taskId] = key.split(':');
        
        // Find the task in the task lists
        const taskList = taskLists.find(list => list.id === taskListId);
        const task = taskList?.tasks.find(t => t.id === taskId);
        
        if (task) {
          // Prepare task object with all needed fields
          const selectedTask: Task = {
            id: taskId,
            title: task.title,
            completed: false,
            task_list_id: taskListId,
            due: task.due,
            has_explicit_time: task.has_explicit_time,
            status: task.status,
            notes: task.notes || ""
          };
          
          // If the task has_explicit_time but doesn't have "Due Time:" in notes,
          // we should add it by extracting time from the due date
          if (task.has_explicit_time && task.due && (!task.notes || !task.notes.includes("Due Time:"))) {
            const dueDate = new Date(task.due);
            const hours = dueDate.getHours().toString().padStart(2, '0');
            const minutes = dueDate.getMinutes().toString().padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            // Append time to existing notes or create new note
            selectedTask.notes = selectedTask.notes 
              ? `${selectedTask.notes}\nDue Time: ${timeStr}`
              : `Due Time: ${timeStr}`;
          }
          
          return selectedTask;
        }
        return null;
      })
      .filter((task): task is Task => task !== null);

    // Add selected tasks to current tasks
    setTasks([...tasks, ...newSelectedTasks]);
    
    // Close the dialog
    setTaskDialogOpen(false);
  };

  const handleSubmit = async () => {
    // Clear any previous API errors
    setApiError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare start and end dates
      const startDateTime = new Date(`${startDate}T${isAllDay ? '00:00:00' : startTime}`);
      const endDateTime = new Date(`${endDate}T${isAllDay ? '23:59:59' : endTime}`);
      
      // Log the attendees before creating the event object
      console.log(`About to create event with ${attendees.length} attendees:`, 
        JSON.stringify(attendees, null, 2));
      
      // Create base event object
      const newEvent: any = {
        title,
        summary: title, // Ensure summary is set for Google Calendar
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
      };
      
      // Only add optional fields if they have values
      if (description) newEvent.description = description;
      if (location) newEvent.location = location;
      
      // For all events, explicitly set isAllDay property
      newEvent.isAllDay = isAllDay;
      
      // Add attendees if there are any - ensure it's always an array
      newEvent.attendees = attendees.length > 0 ? [...attendees] : [];
      
      // Check if there are tasks to add regardless of event type
      const hasTasks = tasks.length > 0;
      
      // Format tasks for API
      const formattedTasks = hasTasks ? tasks.map(task => ({
        title: task.title,
        notes: task.notes || "", // Include notes if available
        task_list_id: task.task_list_id || null, // Use task list ID if available
        due: task.due || null, // Include due date if available
        has_explicit_time: task.has_explicit_time || false, // Include explicit time flag
        time_in_notes: true, // Add this flag to ensure the backend knows to handle time in notes
        status: task.status || "needsAction" // Include status
      })) : [];
      
      // Handle special event types
      if (eventType === 'outOfOffice') {
        // Force Out of Office events to be all-day
        newEvent.isAllDay = true;
        
        // Set the eventType field to outOfOffice
        newEvent.eventType = 'outOfOffice';
        
        // Set out of office properties with correct enum value
        newEvent.outOfOfficeProperties = {
          autoDeclineMode: "DECLINE_ALL",
        };
        
        // Only add declineMessage if description exists
        if (description) {
          newEvent.outOfOfficeProperties.declineMessage = description;
        }
        
        // Out of Office events don't support tasks
        await addEvent(newEvent, false);
      } else if (eventType === 'focusTime') {
        // Set the eventType field to focusTime
        newEvent.eventType = 'focusTime';
        
        // Add focus time properties with values based on user selections
        newEvent.focusTimeProperties = {};
        
        // Only set chatStatus to doNotDisturb if the checkbox is checked
        if (doNotDisturb) {
          newEvent.focusTimeProperties.chatStatus = "doNotDisturb";
        }
        
        // Only set autoDeclineMode if the checkbox is checked
        if (autoDeclineMeetings) {
          newEvent.focusTimeProperties.autoDeclineMode = "declineOnlyNewConflictingInvitations";
        }
        
        // Add declineMessage if description exists, otherwise use default
        if (description) {
          newEvent.focusTimeProperties.declineMessage = description;
        } else {
          newEvent.focusTimeProperties.declineMessage = "Declined because I am in focus time.";
        }
        
        // If this is a focus time event with tasks, use the dedicated endpoint
        if (hasTasks) {
          // Create payload for the focus-time-with-tasks endpoint - matching the Laravel controller requirements
          const focusTimeWithTasksPayload = {
            summary: title,
            description: description || "",
            location: location || "",
            colorId: "", // Default empty string
            attendees: [],
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            focusTimeProperties: newEvent.focusTimeProperties, // Include focus time settings
            tasks: formattedTasks  // This is the required tasks array
          };
          
          console.log('Creating focus time event with tasks:', JSON.stringify(focusTimeWithTasksPayload, null, 2));
          
          // Use the dedicated method for focus time with tasks
          await createFocusTimeWithTasks(focusTimeWithTasksPayload);
        } else {
          // For focus time events without tasks, we'll use the regular event endpoint
          await addEvent(newEvent, false);
        }
      } else if (eventType === 'workingLocation') {
        // Set the eventType field to workingLocation
        newEvent.eventType = 'workingLocation';
        
        // Add working location properties
        newEvent.workingLocationProperties = {
          type: 'custom',
        };
        
        // Only add customLocation if location exists
        if (location) {
          newEvent.workingLocationProperties.customLocation = location;
        }
        
        // Working Location events don't support tasks
        await addEvent(newEvent, false);
      } else {
        // For regular events, just set the colorId
        if (eventType !== 'default') {
        newEvent.colorId = eventType;
      }
      
        // If there are tasks, use the dedicated events-with-tasks endpoint
        if (hasTasks) {
          // Create payload for the events-with-tasks endpoint
          const eventWithTasksPayload = {
            summary: title,
            description: description || "",
            location: location || "",
            colorId: newEvent.colorId || "",
            attendees: newEvent.attendees,
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            tasks: formattedTasks // Include tasks array
          };
          
          console.log('Creating regular event with tasks:', JSON.stringify(eventWithTasksPayload, null, 2));
          
          // Use the dedicated method for events with tasks
          await createEventWithTasks(eventWithTasksPayload);
          } else {
          // For regular events without tasks, use standard endpoint
          // Setup Google Meet if requested
          await addEvent(newEvent, addGoogleMeet);
          }
        }
        
      // Close modal and reset form
      handleClose();
    } catch (error) {
      console.error('Error creating event:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setTitle('');
    setDescription('');
    setLocation('');
    setEventType('default');
    
    // Reset time values to defaults based on selected date
    const initialStart = getInitialStartTime();
    const initialEnd = getInitialEndTime(initialStart);
    setStartDate(format(initialStart, 'yyyy-MM-dd'));
    setStartTime(format(initialStart, 'HH:mm'));
    setEndDate(format(initialEnd, 'yyyy-MM-dd'));
    setEndTime(format(initialEnd, 'HH:mm'));
    
    // Reset other form options
    setIsAllDay(false);
    setDoNotDisturb(true);
    setAutoDeclineMeetings(true);
    setAddGoogleMeet(false);
    
    // Reset attendees
    setAttendees([]);
    setNewAttendeeEmail('');
    setNewAttendeeOptional(false);
    setAttendeeError(null);
    
    // Reset tasks
    setTasks([]);
    setNewTaskTitle('');
    setTaskError(null);
    
    // Reset form validation and API state
    setErrors({});
    setIsSubmitting(false);
    setApiError(null);
    
    // Close the modal
    onClose();
  };

  // Handle automatic all-day selection for Out of Office
  const handleEventTypeChange = (newType: string) => {
    // Set new type
    setEventType(newType);
    
    // Adjust form based on event type
    if (newType === 'outOfOffice') {
      // Out of Office events are always all-day in Google Calendar
      setIsAllDay(true);
      
      // Reset attendees for OOO events
      setAttendees([]);
    } else if (newType === 'workingLocation') {
      // Working Location events are always all-day
      setIsAllDay(true);
      
      // Reset attendees for Working Location events
      setAttendees([]);
    } else if (newType === 'focusTime') {
      // Focus time events usually have Do Not Disturb and Auto-decline enabled
      setDoNotDisturb(true);
      setAutoDeclineMeetings(true);
      
      // Reset attendees for Focus Time events
      setAttendees([]);
      
      // Reset tasks for non-focus time events
      if (tasks.length > 0) {
        setTasks([]);
      }
    } else {
      // Reset Focus Time specific options
      setDoNotDisturb(false);
      setAutoDeclineMeetings(false);
      
      // Reset tasks for non-focus time events
      if (tasks.length > 0) {
        setTasks([]);
      }
    }
  };
  
  // For Out of Office events, show a clearer explanation
  const renderEventTypeDescription = () => {
    if (eventType === 'outOfOffice') {
      return (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          Out of Office events will automatically decline meeting invitations while you're away.
          The message above will be sent to anyone whose invitation is declined.
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Uses DECLINE_ALL mode to reject all meeting invitations.
          </Typography>
        </Alert>
      );
    } else if (eventType === 'focusTime') {
      return (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          Focus Time events help you block time for deep work without interruptions.
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            You can choose whether to enable Do Not Disturb for chat notifications and whether to automatically decline new meeting invitations during this time.
          </Typography>
        </Alert>
      );
    } else if (eventType === 'workingLocation') {
      return (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          Working Location events help you indicate where you're working from.
        </Alert>
      );
    }
    return null;
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { 
            borderRadius: 1.5,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {eventType === 'focusTime' ? 'Add Focus Time' : 'Add Event'}
            </Typography>
            <IconButton onClick={handleClose} edge="end">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ p: isMobile ? 1 : 2 }}>
            {/* Event Type Selector */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="event-type-label">Event Type</InputLabel>
              <Select
                labelId="event-type-label"
                id="event-type"
                value={eventType}
                label="Event Type"
                onChange={(e) => handleEventTypeChange(e.target.value)}
                required
              >
                <MenuItem value="default">Calendar Event</MenuItem>
                <MenuItem value="focusTime">Focus Time</MenuItem>
                <MenuItem value="outOfOffice">Out of Office</MenuItem>
              </Select>
            </FormControl>
            
            {/* Title input */}
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={!!errors.title}
              helperText={errors.title}
              required
              sx={{ mb: 2 }}
            />
            
            {/* Description input */}
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            
            {/* Date and time inputs */}
            <Box sx={{ display: 'flex', mb: 2, flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                  />
                }
                label="All day"
                sx={{ minWidth: '100px' }}
              />
              
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1, mb: 1 }}>
                  <TextField
                    fullWidth
                    label="Start date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    error={!!errors.startDate}
                    helperText={errors.startDate}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                  {!isAllDay && (
                    <TextField
                      fullWidth
                      label="Start time"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      error={!!errors.startTime}
                      helperText={errors.startTime}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1 }}>
                  <TextField
                    fullWidth
                    label="End date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    error={!!errors.endDate}
                    helperText={errors.endDate}
                    required
                    InputLabelProps={{ shrink: true }}
                  />
                  {!isAllDay && (
                    <TextField
                      fullWidth
                      label="End time"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      error={!!errors.endTime}
                      helperText={errors.endTime}
                      required
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            
            {/* Location input */}
            {eventType !== 'focusTime' && (
              <TextField
                fullWidth
                label="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                sx={{ mb: 2 }}
              />
            )}
            
            {/* Focus time specific options */}
            {eventType === 'focusTime' && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Focus Time Options
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={doNotDisturb}
                      onChange={(e) => setDoNotDisturb(e.target.checked)}
                    />
                  }
                  label="Set status to 'Do not disturb'"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={autoDeclineMeetings}
                      onChange={(e) => setAutoDeclineMeetings(e.target.checked)}
                    />
                  }
                  label="Automatically decline meetings"
                />
              </Box>
            )}
            
            {/* Google Meet option */}
            {eventType !== 'focusTime' && eventType !== 'outOfOffice' && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={addGoogleMeet}
                    onChange={(e) => setAddGoogleMeet(e.target.checked)}
                  />
                }
                label="Add Google Meet video conferencing"
                sx={{ mb: 2 }}
              />
            )}
            
            {/* Attendees section for regular events */}
            {eventType !== 'focusTime' && eventType !== 'outOfOffice' && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Attendees
                </Typography>
                
                {errors.attendees && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {errors.attendees}
                  </Alert>
                )}
                
                {/* Attendee list */}
                {attendees.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {attendees.map((attendee) => (
                      <Chip
                        key={attendee.email}
                        label={`${attendee.email}${attendee.optional ? ' (Optional)' : ''}`}
                        onDelete={() => removeAttendee(attendee.email)}
                        sx={{ marginBottom: 1 }}
                      />
                    ))}
                  </Box>
                )}
                
                {/* Add attendee form */}
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Email address"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    error={!!attendeeError}
                    helperText={attendeeError}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAttendee();
                      }
                    }}
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    variant="outlined" 
                    onClick={addAttendee}
                    startIcon={<PersonAddIcon />}
                  >
                    Add
                  </Button>
                </Box>
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newAttendeeOptional}
                      onChange={(e) => setNewAttendeeOptional(e.target.checked)}
                    />
                  }
                  label="Optional attendee"
                />
              </Box>
            )}
          
            {renderEventTypeDescription()}
          
            {/* Add Tasks section for all event types */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Tasks
              </Typography>
              
              {errors.tasks && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errors.tasks}
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {eventType === 'focusTime' 
                  ? 'Add at least one task that you plan to work on during this focus time.'
                  : 'Optionally add tasks to this event.'}
              </Typography>
              
              {/* Task list */}
              {tasks.length > 0 && (
                <Paper variant="outlined" sx={{ mb: 2, maxHeight: '150px', overflow: 'auto' }}>
                  <List dense>
                    {tasks.map((task) => (
                      <ListItem
                        key={task.id}
                        secondaryAction={
                          <IconButton edge="end" aria-label="delete" onClick={() => removeTask(task.id)}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemIcon>
                          <TaskAltIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={task.title}
                          secondary={
                            task.due ? 
                              <Box component="span" sx={{ 
                                color: new Date(task.due) < new Date() && task.status !== 'completed' ? 'error.main' : 'text.secondary',
                                fontWeight: new Date(task.due) < new Date() && task.status !== 'completed' ? 500 : 400,
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
                                {new Date(task.due) < new Date() && task.status !== 'completed' && ' (Overdue)'}
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
                    ))}
                  </List>
                </Paper>
              )}
              
              {/* Task input area */}
              <Box sx={{ mb: 3, p: 2, border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Add a task</Typography>
                
                {/* Task title input */}
                <TextField
                  fullWidth
                  size="small"
                  label="Task title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  error={!!taskError}
                  helperText={taskError}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTask();
                    }
                  }}
                  sx={{ mb: 2 }}
                />
                
                {/* Task due date input */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Due date (optional)"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={newTaskDueDate}
                    onChange={(e) => {
                      setNewTaskDueDate(e.target.value);
                    }}
                  />
                  
                  {/* Option to add time */}
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showTaskTimePicker}
                        onChange={(e) => setShowTaskTimePicker(e.target.checked)}
                        disabled={!newTaskDueDate}
                      />
                    }
                    label="Add specific time"
                  />
                  
                  {/* Show time picker if checkbox is checked */}
                  {showTaskTimePicker && (
                    <TextField
                      fullWidth
                      size="small"
                      label="Due time"
                      type="time"
                      InputLabelProps={{ shrink: true }}
                      value={newTaskDueTime}
                      onChange={(e) => setNewTaskDueTime(e.target.value)}
                    />
                  )}
                </Box>
                
                {/* Add button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="outlined" 
                    onClick={addTask}
                    startIcon={<TaskAltIcon />}
                    disabled={!newTaskTitle.trim()}
                  >
                    Add
                  </Button>
                </Box>
              </Box>
              
              {/* Link existing tasks button */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Button
                  variant="text"
                  startIcon={<LinkIcon />}
                  sx={{ color: '#1056F5' }}
                  onClick={handleOpenTaskDialog}
                >
                  Link existing tasks
                </Button>
              </Box>
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
              <Typography component="span" color="error" sx={{ fontWeight: 'bold' }}>*</Typography> Required fields
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: isMobile ? 1.5 : 2, justifyContent: 'flex-end', gap: 1 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            sx={{ borderRadius: 1, px: 3 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
            sx={{ 
              borderRadius: 1, 
              bgcolor: '#016C9E', 
              '&:hover': { bgcolor: '#015C8E' },
              color: 'white',
              fontWeight: 'bold',
              px: 3
            }}
          >
            {isSubmitting ? 'Saving...' : 'Add Event'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Task Selection Dialog */}
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
              <List dense>
                {taskLists
                  .find(list => list.id === taskDialogTab)
                  ?.tasks
                  .filter(task => task.status !== 'completed')
                  .map((task) => {
                    const taskKey = `${taskDialogTab}:${task.id}`;
                    // Check if this task is already in the tasks array to prevent duplicates
                    const isAlreadyAdded = tasks.some(t => t.id === task.id && t.task_list_id === taskDialogTab);
                    
                    return (
                      <ListItem key={taskKey} dense>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={!!selectedTasks[taskKey] || isAlreadyAdded}
                            disabled={isAlreadyAdded}
                            onChange={() => handleTaskToggle(taskDialogTab, task.id, task.title)}
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
                                color: new Date(task.due) < new Date() && task.status !== 'completed' ? 'error.main' : 'text.secondary',
                                fontWeight: new Date(task.due) < new Date() && task.status !== 'completed' ? 500 : 400,
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
                                {new Date(task.due) < new Date() && task.status !== 'completed' && ' (Overdue)'}
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
            onClick={handleSaveSelectedTasks} 
            variant="contained"
            color="primary"
          >
            Add Tasks
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventCreationModal; 