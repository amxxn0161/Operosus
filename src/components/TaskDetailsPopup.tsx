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
  TaskAlt as TaskAltIcon,
  List as ListIcon
} from '@mui/icons-material';
import { CalendarEvent } from '../services/calendarService';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface TaskDetailsPopupProps {
  event: CalendarEvent | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onDelete: (event: CalendarEvent) => void;
}

const TaskDetailsPopup: React.FC<TaskDetailsPopupProps> = ({
  event,
  anchorEl,
  onClose,
  onDelete
}) => {
  const navigate = useNavigate();
  
  if (!event) return null;

  // Format date for display
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy');
  };

  const goToTasksPage = () => {
    onClose();
    navigate('/tasks');
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'center',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'center',
      }}
      slotProps={{
        paper: {
          sx: {
            width: 320,
            p: 0,
            mt: 1,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }
        }
      }}
    >
      {/* Header */}
      <Box sx={{ 
        bgcolor: '#F29702', 
        p: 2,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TaskAltIcon sx={{ color: 'white', mr: 1 }} />
          <Typography variant="h6" sx={{ 
            fontWeight: 'bold', 
            color: 'white', 
            fontSize: '1.1rem'
          }}>
            Task Details
          </Typography>
        </Box>
        <IconButton 
          size="small" 
          onClick={onClose}
          sx={{ color: 'white', p: 0.5, bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 1, color: '#333' }}>
          {event.title}
        </Typography>
        
        {event.description && (
          <Typography variant="body2" sx={{ mb: 2, color: '#666', whiteSpace: 'pre-line' }}>
            {event.description}
          </Typography>
        )}
        
        <Divider sx={{ my: 1.5 }} />
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1, color: '#555' }}>
            Date:
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            {formatDate(event.start)}
          </Typography>
        </Box>
        
        {event.location && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium', mr: 1, color: '#555' }}>
              Location:
            </Typography>
            <Typography variant="body2" sx={{ color: '#666' }}>
              {event.location}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer with action buttons */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        p: 2, 
        bgcolor: '#f5f5f5',
        borderTop: '1px solid #eee'
      }}>
        <Tooltip title="Go to Tasks">
          <Button
            variant="outlined"
            startIcon={<ListIcon />}
            onClick={goToTasksPage}
            sx={{ mr: 1 }}
          >
            Go to Tasks
          </Button>
        </Tooltip>
        
        <Tooltip title="Delete Task">
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => {
              onClose();
              onDelete(event);
            }}
          >
            Delete
          </Button>
        </Tooltip>
      </Box>
    </Popover>
  );
};

export default TaskDetailsPopup;