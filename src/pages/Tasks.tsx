import React, { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Button,
  TextField,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { Task } from '../services/taskService';
import { useTaskOperations } from '../hooks/useTaskOperations';

const Tasks: React.FC = () => {
  const { 
    tasks, 
    loading, 
    error, 
    isSaving, 
    isDeleting, 
    addTask, 
    toggleTaskCompletion, 
    removeTask,
    clearOperationError
  } = useTaskOperations();
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<string>('medium');
  const [openDialog, setOpenDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddTask = async () => {
    if (newTaskTitle.trim()) {
      const newTask: Partial<Task> = {
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim(),
        completed: 0,
        priority: newTaskPriority,
      };
      
      const result = await addTask(newTask);
      
      if (result) {
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskPriority('medium');
        setOpenDialog(false);
        setSuccessMessage('Task created successfully!');
      }
    }
  };

  const handleToggleTask = async (task: Task) => {
    await toggleTaskCompletion(task);
  };

  const handleDeleteTask = async (taskId: number) => {
    const success = await removeTask(taskId);
    if (success) {
      setSuccessMessage('Task deleted successfully!');
    }
  };

  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#000000';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
          Tasks
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
          disabled={isSaving || isDeleting}
        >
          Add Task
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearOperationError}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default', minHeight: '250px' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '250px' }}>
            <CircularProgress />
          </Box>
        ) : tasks.length > 0 ? (
          <List>
            {tasks.map((task) => (
              <ListItem
                key={task.id}
                sx={{
                  mb: 1,
                  bgcolor: 'white',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
                }}
              >
                <Checkbox
                  checked={task.completed === 1}
                  onChange={() => handleToggleTask(task)}
                  sx={{ color: getPriorityColor(task.priority) }}
                  disabled={isSaving}
                />
                <ListItemText
                  primary={
                    <Typography
                      sx={{
                        textDecoration: task.completed === 1 ? 'line-through' : 'none',
                        color: task.completed === 1 ? 'text.secondary' : 'text.primary',
                      }}
                    >
                      {task.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      {task.description && (
                        <Typography 
                          variant="body2" 
                          color="text.secondary"
                          sx={{
                            textDecoration: task.completed === 1 ? 'line-through' : 'none',
                            mb: 0.5,
                          }}
                        >
                          {task.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {task.completed === 1 && task.completedAt
                          ? `Completed ${format(new Date(task.completedAt), 'MMM d, yyyy')}`
                          : `Created ${format(new Date(task.createdAt || task.created_at), 'MMM d, yyyy')}`}
                      </Typography>
                    </>
                  }
                />
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: getPriorityColor(task.priority),
                    mr: 2,
                  }}
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={isDeleting || isSaving}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            height: '250px',
            textAlign: 'center'
          }}>
            <Box sx={{ 
              color: '#1056F5', 
              opacity: 0.7, 
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AssignmentIcon sx={{ fontSize: 64 }} />
            </Box>
            <Typography 
              variant="h6" 
              color="text.primary" 
              sx={{ 
                fontFamily: 'Poppins',
                fontWeight: 'medium',
                mb: 1
              }}
            >
              No tasks yet
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                fontFamily: 'Poppins',
                mb: 3,
                maxWidth: '400px'
              }}
            >
              Track your daily to-dos by adding tasks with different priority levels
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              disabled={isSaving || isDeleting}
              sx={{ 
                borderRadius: 2,
                bgcolor: '#1056F5',
                fontFamily: 'Poppins',
                textTransform: 'none',
                '&:hover': {
                  bgcolor: '#0D47D9',
                },
              }}
            >
              Add Your First Task
            </Button>
          </Box>
        )}
      </Paper>

      <Dialog 
        open={openDialog} 
        onClose={() => !isSaving && setOpenDialog(false)}
      >
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Task Title"
            type="text"
            fullWidth
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={isSaving}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            disabled={isSaving}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth disabled={isSaving}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTaskPriority}
              label="Priority"
              onChange={(e) => setNewTaskPriority(e.target.value)}
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenDialog(false)} 
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddTask} 
            variant="contained"
            disabled={isSaving || !newTaskTitle.trim()}
            startIcon={isSaving ? <CircularProgress size={20} /> : null}
          >
            {isSaving ? 'Saving...' : 'Add Task'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={successMessage}
      />
    </Container>
  );
};

export default Tasks; 