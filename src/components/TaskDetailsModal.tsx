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
import EmailIcon from '@mui/icons-material/Email';
import { format, isValid, parseISO } from 'date-fns';
import { EnhancedGoogleTask } from '../contexts/GoogleTasksContext';

// Make sure the task type includes the has_explicit_time property
interface TaskWithTime extends EnhancedGoogleTask {
  has_explicit_time?: boolean;
  gmail_attachment?: any;
  has_gmail_attachment?: boolean;
}

interface TaskDetailsModalProps {
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  task: TaskWithTime | null;
  taskListId: string;
  taskListTitle?: string;
  children?: React.ReactNode;
}

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  open,
  onClose,
  onEdit,
  onDelete,
  task,
  taskListId,
  taskListTitle,
  children
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
  
  // Format time display from a date
  const formatTime = (dateString?: string | null): string | null => {
    if (!dateString) return null;
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return null;
      
      // Check if time is midnight (00:00) - if so, assume no specific time was set
      if (date.getHours() === 0 && date.getMinutes() === 0 && !task.has_explicit_time) {
        return null;
      }
      
      // Format time as HH:MM (24-hour format)
      return format(date, 'HH:mm');
    } catch (e) {
      return null;
    }
  };
  
  // Extract time from notes (legacy support)
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
  // First try to get time directly from the due date when has_explicit_time is true
  const timeFromDue = task.has_explicit_time ? formatTime(task.due) : null;
  // Fallback to legacy method of extracting from notes
  const timeFromNotes = getTimeFromNotes(task.notes);
  // Use time from due date if available, otherwise fallback to time from notes
  const dueTime = timeFromDue || timeFromNotes;
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
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1, 
              py: 0.5,
              px: 1,
              borderRadius: 1,
              bgcolor: 'rgba(16, 86, 245, 0.08)', 
              width: 'fit-content'
            }}>
              <AccessTimeIcon sx={{ 
                mr: 1, 
                fontSize: 20, 
                color: 'primary.main' 
              }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  color: 'primary.main',
                }}
              >
                Due Time: {dueTime}
              </Typography>
            </Box>
          )}
          
          {/* Display Gmail attachment if available */}
          {task.has_gmail_attachment && task.gmail_attachment && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                mt: 1, 
                py: 0.5,
                px: 1,
                borderRadius: 1,
                bgcolor: 'rgba(16, 86, 245, 0.08)', 
                width: 'fit-content',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'rgba(16, 86, 245, 0.15)',
                }
              }}
              onClick={() => {
                if (task.gmail_attachment.messageLink) {
                  window.open(task.gmail_attachment.messageLink, '_blank');
                }
              }}
            >
              <EmailIcon sx={{ 
                mr: 1, 
                fontSize: 20, 
                color: 'primary.main'
              }} />
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  color: 'primary.main'
                }}
              >
                {task.gmail_attachment.subject || 'Gmail Message'}
              </Typography>
            </Box>
          )}
          
          {cleanNotes && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <NotesIcon sx={{ mr: 1, fontSize: 20, color: 'text.secondary' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
              </Box>
              <Paper 
                elevation={0} 
                sx={{ 
                  p: 2, 
                  bgcolor: 'background.paper',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: 1
                }}
              >
                <Typography 
                  variant="body2" 
                  style={{ 
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {cleanNotes}
                </Typography>
              </Paper>
            </Box>
          )}
          
          {/* Render children if provided - this is where attachments will go */}
          {children}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button 
          startIcon={<DeleteIcon />}
          onClick={onDelete}
          color="error"
          sx={{ fontFamily: 'Poppins' }}
        >
          Delete
        </Button>
        <Button 
          startIcon={<EditIcon />}
          onClick={onEdit}
          color="primary"
          variant="contained"
          sx={{ 
            fontFamily: 'Poppins',
            backgroundColor: '#1056F5',
            '&:hover': {
              backgroundColor: '#0D47D9',
            },
          }}
        >
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDetailsModal; 