import React from 'react';
import {
  Popover,
  Typography,
  Box,
  IconButton,
  Divider,
  Paper,
  Button
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import { CalendarEvent } from '../services/calendarService';

interface TaskDetailsPopupProps {
  event: CalendarEvent | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

const TaskDetailsPopup: React.FC<TaskDetailsPopupProps> = ({
  event,
  anchorEl,
  onClose,
  onEdit,
  onDelete
}) => {
  const navigate = useNavigate();
  
  // Extract task ID from event ID (format: task-{taskId})
  const getTaskId = () => {
    if (!event?.id) return null;
    const match = event.id.match(/^task-(.+)$/);
    return match ? match[1] : null;
  };

  // Extract task list ID from summary (format: "Task from {listName}")
  const getTaskListId = (): string | null => {
    if (!event?.summary) return null;
    
    // First try to parse from any stored metadata
    if (event.taskListId) {
      return event.taskListId;
    }
    
    // My Tasks is the default list
    const listName = getTaskListName();
    if (listName === 'My Tasks') {
      return '@default'; // Google's default ID for "My Tasks"
    }
    
    return null;
  };
  
  // Navigate to Google Tasks and open the specific task
  const handleOpenTask = () => {
    const taskListId = getTaskListId();
    const listName = getTaskListName();
    
    // Close the popup
    onClose();
    
    // Navigate to Google Tasks page
    navigate('/google-tasks', { 
      state: { 
        selectedListId: taskListId,
        selectedListName: listName,
        highlightTaskId: getTaskId()
      } 
    });
  };

  // Format the date
  const formatEventDate = () => {
    if (!event) return '';
    const date = new Date(event.start);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get task description and due time from notes
  const getTaskDetails = (): { description: string, dueTime: string | null } => {
    if (!event?.description) return { description: '', dueTime: null };
    
    let description = event.description;
    let dueTime = null;
    
    // Extract due time if present
    if (event.description.includes('Due Time:')) {
      const dueTimeMatch = event.description.match(/Due Time: (\d{1,2}:\d{2})/);
      if (dueTimeMatch && dueTimeMatch[1]) {
        dueTime = dueTimeMatch[1];
      }
      
      // Remove the Due Time line from description
      description = event.description.replace(/Due Time:.*\n?/, '').trim();
    }
    
    return { description, dueTime };
  };

  // Extract task list name from summary (format: "Task from {listName}")
  const getTaskListName = (): string => {
    if (!event?.summary) return 'My Tasks';
    
    const match = event.summary.match(/Task from (.+)$/);
    return match ? match[1] : 'My Tasks';
  };

  // Format task title (remove any [Task] suffix and time info)
  const getTaskTitle = (): string => {
    if (!event?.title) return '';
    return event.title
      .replace(/\s*\[\s*Task\s*\]\s*$/, '')  // Remove [Task] suffix
      .replace(/\s*\(\d{1,2}:\d{2}\)\s*$/, '');  // Remove time info in parentheses
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: { 
          width: 320,
          maxWidth: '95vw',
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <Paper sx={{ width: '100%' }}>
        {/* Header */}
        <Box 
          sx={{ 
            p: 2, 
            display: 'flex', 
            alignItems: 'center',
            bgcolor: '#F29702', // Orange color for tasks
            color: 'white'
          }}
        >
          <TaskAltIcon sx={{ mr: 1 }} />
          <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold', fontFamily: 'Poppins' }}>
            Task from {getTaskListName()}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ ml: 1, color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Poppins' }}>{getTaskTitle()}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {formatEventDate()}
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Task details */}
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Task Details</Typography>
          {getTaskDetails().dueTime && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Due Time: {getTaskDetails().dueTime}
              </Typography>
            </Box>
          )}
          {getTaskDetails().description && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {getTaskDetails().description}
            </Typography>
          )}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="outlined" 
              onClick={onClose}
              sx={{ mr: 1 }}
            >
              Close
            </Button>
            <Button 
              variant="contained"
              onClick={handleOpenTask}
              startIcon={<OpenInNewIcon />}
              sx={{ bgcolor: '#F29702', '&:hover': { bgcolor: '#D17F00' } }}
            >
              Open Task
            </Button>
          </Box>
        </Box>
      </Paper>
    </Popover>
  );
};

export default TaskDetailsPopup;