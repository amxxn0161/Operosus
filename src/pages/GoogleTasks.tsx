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
  Loop as LoopIcon
} from '@mui/icons-material';
import { useGoogleTasks, TaskListFilterOption, EnhancedGoogleTask, EnhancedGoogleTaskList } from '../contexts/GoogleTasksContext';
import { format, isValid, parseISO, addDays } from 'date-fns';

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
  const [datePickerAnchorEl, setDatePickerAnchorEl] = useState<HTMLElement | null>(null);
  const datePickerOpen = Boolean(datePickerAnchorEl);

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
    setNewTaskDueDate(null);
    setNewTaskDialogOpen(true);
  };

  // Create a new task
  const handleCreateTask = async () => {
    if (newTaskTitle.trim() && newTaskListId) {
      try {
        const taskData: { title: string; notes?: string; due?: string } = { 
          title: newTaskTitle.trim() 
        };
        
        // Add due date if it exists
        if (newTaskDueDate) {
          taskData.due = newTaskDueDate;
        }
        
        const result = await createTask(newTaskListId, taskData);
        if (result) {
          setNewTaskDialogOpen(false);
          showSnackbar('Task created successfully', 'success');
        } else {
          showSnackbar('Failed to create task', 'error');
        }
      } catch (err) {
        showSnackbar('Error creating task', 'error');
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
    // If reordering within the same list, we'd need to update positions
    // This would require additional API support
  };

  // Format date for display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      
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
  
  // Set task due date
  const handleSetDueDate = (dueDate: Date | null) => {
    if (dueDate) {
      // Format date to RFC3339 as expected by the API
      const isoDate = dueDate.toISOString();
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
  const formatDisplayDate = (dateString?: string | null) => {
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
      
      if (dateToCheck.getTime() === today.getTime()) {
        return 'Today';
      } else if (dateToCheck.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
      } else {
        return format(date, 'MMM d, yyyy');
      }
    } catch (e) {
      return '';
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
                      sx={{
                        py: 1,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        '&:last-child': { borderBottom: 'none' }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: '40px' }}>
                        <Checkbox
                          checked={task.status === 'completed'}
                          onChange={() => taskList && handleToggleTaskComplete(taskList.id, task.id)}
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
                          task.due && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontFamily: 'Poppins',
                                color: isOverdue(task.due) ? 'error.main' : 'text.secondary'
                              }}
                            >
                              Due: {formatDate(task.due)}
                            </Typography>
                          )
                        }
                      />
                      <IconButton
                        edge="end"
                        onClick={() => taskList && handleToggleTaskStar(taskList.id, task.id)}
                        sx={{ color: '#FFD700' }}
                      >
                        <StarIcon />
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
                      maxHeight: '50vh' 
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
                                        onChange={() => handleToggleTaskComplete(taskList.id, task.id)}
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
                                        task.due && (
                                          <Typography 
                                            variant="caption" 
                                            sx={{ 
                                              fontFamily: 'Poppins',
                                              color: isOverdue(task.due) ? 'error.main' : 'text.secondary'
                                            }}
                                          >
                                            Due: {formatDate(task.due)}
                                          </Typography>
                                        )
                                      }
                                    />
                                    <IconButton
                                      edge="end"
                                      onClick={() => handleToggleTaskStar(taskList.id, task.id)}
                                      sx={{ color: task.starred ? '#FFD700' : 'action.disabled' }}
                                    >
                                      {task.starred ? <StarIcon /> : <StarBorderIcon />}
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
                              <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                  fontFamily: 'Poppins', 
                                  color: 'text.secondary',
                                  fontWeight: 'medium',
                                  mb: 1
                                }}
                              >
                                Completed
                              </Typography>
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
                                      onChange={() => handleToggleTaskComplete(taskList.id, task.id)}
                                      edge="start"
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
                                    onClick={() => handleToggleTaskStar(taskList.id, task.id)}
                                    sx={{ color: task.starred ? '#FFD700' : 'action.disabled' }}
                                  >
                                    {task.starred ? <StarIcon /> : <StarBorderIcon />}
                                  </IconButton>
                                </ListItem>
                              ))}
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
        <DialogContent>
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
          
          {/* Date selection options */}
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1 }}>
            {newTaskDueDate ? (
              <ButtonGroup variant="outlined" size="small" sx={{ mr: 1 }}>
                <Button startIcon={<DateRangeIcon />}>
                  {formatDisplayDate(newTaskDueDate)}
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
                >
                  Set time
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
        <DialogContent>
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
        <DialogContent>
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