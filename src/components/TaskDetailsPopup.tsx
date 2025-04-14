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
import MoreVertIcon from '@mui/icons-material/MoreVert';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
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
  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  
  // Extract task ID from event ID (format: task-{taskId})
  const getTaskId = () => {
    if (!event?.id) return null;
    const match = event.id.match(/^task-(.+)$/);
    return match ? match[1] : null;
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchorEl(e.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditClick = () => {
    handleMenuClose();
    if (event && onEdit) {
      onEdit(event);
    }
  };
  
  const handleDeleteClick = () => {
    handleMenuClose();
    if (event && onDelete) {
      onDelete(event);
    }
    onClose();
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

  // Format the time
  const formatEventTime = () => {
    if (!event) return '';
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    return `${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
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
          <IconButton size="small" onClick={handleMenuOpen} sx={{ color: 'white' }}>
            <MoreVertIcon />
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ ml: 1, color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEditClick}>Edit Task</MenuItem>
          <MenuItem onClick={handleDeleteClick}>Delete Task</MenuItem>
        </Menu>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 1, fontFamily: 'Poppins' }}>{getTaskTitle()}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {formatEventDate()} · {formatEventTime()}
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
              onClick={handleEditClick}
              sx={{ bgcolor: '#F29702', '&:hover': { bgcolor: '#D17F00' } }}
            >
              Edit Task
            </Button>
          </Box>
        </Box>
      </Paper>
    </Popover>
  );
};

export default TaskDetailsPopup; 