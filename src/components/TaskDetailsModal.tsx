import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Button,
  Divider,
  IconButton,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotesIcon from '@mui/icons-material/Notes';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { format, isValid, parseISO } from 'date-fns';
import { EnhancedGoogleTask } from '../contexts/GoogleTasksContext';

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  task: EnhancedGoogleTask | null;
  taskListId: string;
  taskListTitle?: string;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  open,
  onClose,
  onEdit,
  onDelete,
  task,
  taskListId,
  taskListTitle
}) => {
  if (!task) return null;
  
  // Format date display
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      
      return format(date, 'MMMM d, yyyy');
    } catch (e) {
      return null;
    }
  };
  
  // Extract time from notes
  const getTimeFromNotes = (notes?: string): string | null => {
    if (!notes) return null;
    
    const timeMatches = [...notes.matchAll(/Due Time: (\d{1,2}:\d{2}(?:\s?[AP]M)?)/g)];
    if (timeMatches.length > 0) {
      const lastMatch = timeMatches[timeMatches.length - 1];
      return lastMatch[1];
    }
    
    return null;
  };
  
  // Get clean notes (without time entries)
  const getCleanNotes = (notes?: string): string => {
    if (!notes) return '';
    
    // Remove all "Due Time: XX:XX" entries
    return notes.replace(/Due Time: \d{1,2}:\d{2}(?:\s?[AP]M)?(\r?\n|\r)?/g, '').trim();
  };
  
  const formattedDate = formatDate(task.due);
  const dueTime = getTimeFromNotes(task.notes);
  const cleanNotes = getCleanNotes(task.notes);
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="task-details-dialog-title"
    >
      <DialogTitle id="task-details-dialog-title" sx={{ pr: 6, fontFamily: 'Poppins' }}>
        Task Details
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom fontWeight="medium">
            {task.title}
          </Typography>
          
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {taskListTitle || 'Task List'}: {taskListId === '@default' ? 'My Tasks' : taskListTitle}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, color: 'text.secondary' }}>
            <CalendarTodayIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">
              {task.status === 'completed' ? 'Completed' : formattedDate ? `Due: ${formattedDate}` : 'No due date'}
            </Typography>
          </Box>
          
          {dueTime && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, color: 'text.secondary' }}>
              <AccessTimeIcon sx={{ mr: 1, fontSize: 20 }} />
              <Typography variant="body2">
                Due Time: {dueTime}
              </Typography>
            </Box>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {cleanNotes && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
              <NotesIcon sx={{ mr: 1, mt: 0.5, fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight="medium">
                Notes
              </Typography>
            </Box>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'rgba(0, 0, 0, 0.02)' }}>
              <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>
                {cleanNotes}
              </Typography>
            </Paper>
          </Box>
        )}
        
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center' }}>
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ flex: 1 }}
          >
            {task.status === 'completed' && task.completed ? 
              `Completed: ${format(new Date(task.completed), 'MMM d, yyyy')}` : 
              'Active task'
            }
          </Typography>
          
          {task.starred && (
            <Typography 
              variant="caption" 
              color="warning.main"
              sx={{ fontWeight: 'medium' }}
            >
              ★ Starred
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={onDelete}
          startIcon={<DeleteIcon />}
          color="error"
          variant="outlined"
        >
          Delete
        </Button>
        <Button 
          onClick={onEdit}
          startIcon={<EditIcon />}
          variant="contained"
          sx={{ 
            bgcolor: '#1056F5',
            '&:hover': { bgcolor: '#0D47D9' }
          }}
        >
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailsModal; 