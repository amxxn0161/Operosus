import React from 'react';
import {
  Popover,
  Typography,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Button,
  Divider,
  ListItemSecondaryAction
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { CalendarEvent } from '../services/calendarService';
import { format } from 'date-fns';

interface TaskListPopupProps {
  tasks: CalendarEvent[];
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onTaskClick: (task: CalendarEvent, e: React.MouseEvent) => void;
}

const TaskListPopup: React.FC<TaskListPopupProps> = ({
  tasks,
  anchorEl,
  onClose,
  onTaskClick
}) => {
  if (!tasks || tasks.length === 0) return null;

  // Format date function
  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'MMM d, yyyy');
  };
  
  // Extract due time from task title
  const extractDueTime = (task: CalendarEvent): string => {
    const titleMatch = task.title.match(/\((\d{1,2}:\d{2})\)/);
    
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1];
    }
    
    // Check for 24-hour format like (21:00)
    const militaryTimeMatch = task.title.match(/\((\d{2}:\d{2})\)/);
    if (militaryTimeMatch && militaryTimeMatch[1]) {
      return militaryTimeMatch[1];
    }
    
    // If no time in title format, return empty string
    return '';
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
            Tasks ({tasks.length})
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
      <List sx={{ p: 0, maxHeight: 300, overflow: 'auto' }}>
        {tasks.map((task, index) => {
          const dueTime = extractDueTime(task);
          return (
            <React.Fragment key={task.id || index}>
              <ListItem 
                button 
                onClick={(e) => onTaskClick(task, e)}
                sx={{ 
                  py: 1.5,
                  '&:hover': {
                    bgcolor: 'rgba(242, 151, 2, 0.05)'
                  }
                }}
              >
                <TaskAltIcon 
                  fontSize="small" 
                  sx={{ 
                    mr: 2, 
                    color: '#F29702', 
                    fontSize: '1.1rem'
                  }} 
                />
                <ListItemText 
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontWeight: 'medium',
                        color: '#333',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {task.title}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      {dueTime && (
                        <>
                          <AccessTimeIcon 
                            fontSize="small" 
                            sx={{ 
                              mr: 0.5, 
                              fontSize: '0.75rem',
                              color: 'text.secondary',
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.75rem',
                            }}
                          >
                            Due Time: {dueTime}
                          </Typography>
                        </>
                      )}
                    </Box>
                  }
                  sx={{ pr: 4 }}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={(e) => onTaskClick(task, e)}>
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < tasks.length - 1 && (
                <Divider sx={{ opacity: 0.6 }} />
              )}
            </React.Fragment>
          );
        })}
      </List>
    </Popover>
  );
};

export default TaskListPopup; 