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
  Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { CalendarEvent } from '../services/calendarService';

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
  const navigate = useNavigate();

  // Format a task's title (remove any [Task] suffix and time info)
  const formatTaskTitle = (title: string): string => {
    return title
      .replace(/\s*\[\s*Task\s*\]\s*$/, '')  // Remove [Task] suffix
      .replace(/\s*\(\d{1,2}:\d{2}\)\s*$/, '');  // Remove time info in parentheses
  };

  // Format the date
  const formatDate = () => {
    if (tasks.length === 0) return '';
    const date = new Date(tasks[0].start);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Navigate to Google Tasks page
  const handleOpenTasks = () => {
    onClose(); // Close the popup first
    navigate('/google-tasks'); // Navigate to the Google Tasks page
  };

  // Group tasks by task list
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, CalendarEvent[]> = {};
    
    tasks.forEach(task => {
      const listName = task.summary?.replace('Task from ', '') || 'My Tasks';
      if (!groups[listName]) {
        groups[listName] = [];
      }
      groups[listName].push(task);
    });
    
    return groups;
  }, [tasks]);

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
          width: 360,
          maxWidth: '95vw',
          borderRadius: 2,
          maxHeight: '80vh',
          overflow: 'hidden'
        }
      }}
    >
      <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            Pending tasks
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Subheader */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">
            {tasks.length} tasks due on {formatDate()}
          </Typography>
        </Box>

        {/* Task List */}
        <Box sx={{ overflow: 'auto', flexGrow: 1 }}>
          {Object.entries(groupedTasks).map(([listName, listTasks]) => (
            <Box key={listName} sx={{ mb: 2 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  px: 2, 
                  py: 1, 
                  bgcolor: 'rgba(242, 151, 2, 0.1)',
                  fontWeight: 'bold'
                }}
              >
                {listName}
              </Typography>
              <List dense disablePadding>
                {listTasks.map(task => {
                  // Extract due time if available
                  let dueTime = '';
                  if (task.description?.includes('Due Time:')) {
                    const match = task.description.match(/Due Time: (\d{1,2}:\d{2})/);
                    if (match && match[1]) {
                      dueTime = match[1];
                    }
                  }

                  return (
                    <ListItem 
                      key={task.id} 
                      button 
                      onClick={(e) => onTaskClick(task, e)}
                      sx={{ 
                        pl: 2,
                        '&:hover': { bgcolor: 'rgba(242, 151, 2, 0.05)' }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <TaskAltIcon sx={{ color: '#F29702' }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={formatTaskTitle(task.title)}
                        secondary={dueTime ? `Due at ${dueTime}` : 'Anytime during the day'}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 'medium'
                        }}
                        secondaryTypographyProps={{
                          variant: 'caption'
                        }}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined"
            onClick={onClose}
            sx={{ mr: 1 }}
          >
            Close
          </Button>
          <Button 
            variant="contained"
            onClick={handleOpenTasks}
            sx={{ bgcolor: '#F29702', '&:hover': { bgcolor: '#D17F00' } }}
          >
            Open Tasks
          </Button>
        </Box>
      </Paper>
    </Popover>
  );
};

export default TaskListPopup; 