import React from 'react';
import {
  Popover,
  Typography,
  Box,
  IconButton,
  Button,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  TaskAlt as TaskAltIcon,
  Schedule as ScheduleIcon,
  Notes as NotesIcon
} from '@mui/icons-material';
import { CalendarEvent } from '../services/calendarService';

interface TaskDetailsPopupProps {
  event: CalendarEvent | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
}

const TaskDetailsPopup: React.FC<TaskDetailsPopupProps> = ({
  event,
  anchorEl,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!event) return null;

  // Format the date range
  const formatDateRange = (): string => {
    if (!event) return '';
    
    const start = new Date(event.start);
    let dateStr = start.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: start.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    
    if (!event.isAllDay) {
      dateStr += ` · ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`;
      
      // Add end time if different from start
      const end = new Date(event.end);
      if (start.getTime() !== end.getTime()) {
        dateStr += ` - ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`;
      }
    }
    
    return dateStr;
  };

  // Parse and format task details
  const getTaskDetails = () => {
    if (!event.description) return { dueTime: '', notes: '' };
    
    const dueTimeMatch = event.description.match(/Due Time: (\d{1,2}:\d{2}(?:\s*[AP]M)?)/i);
    const dueTime = dueTimeMatch ? dueTimeMatch[1] : '';
    
    // Remove the due time part from description to get the notes
    const notes = event.description
      .replace(/Due Time: \d{1,2}:\d{2}(?:\s*[AP]M)?/i, '')
      .trim();
    
    return { dueTime, notes };
  };
  
  const taskDetails = getTaskDetails();

  // Format task title (remove any [Task] suffix)
  const formatTaskTitle = (title: string): string => {
    return title
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
        elevation: 3,
        sx: { 
          width: 320,
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
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
        <Typography variant="subtitle1" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
          Task Details
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
          {formatTaskTitle(event.title)}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
          <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
          <Typography variant="body2">
            {formatDateRange()}
          </Typography>
        </Box>
        
        {taskDetails.dueTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary' }}>
            <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
            <Typography variant="body2">
              Due at {taskDetails.dueTime}
            </Typography>
          </Box>
        )}
        
        {taskDetails.notes && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', mt: 1 }}>
              <NotesIcon fontSize="small" sx={{ mr: 1, mt: 0.3, color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {taskDetails.notes}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Actions */}
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1.5 }}>
        <Tooltip title="Edit">
          <IconButton onClick={() => {
            onEdit(event);
            onClose();
          }}>
            <EditIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton onClick={() => {
            onDelete(event);
            onClose();
          }} color="error">
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Popover>
  );
};

export default TaskDetailsPopup;