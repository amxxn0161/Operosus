import React from 'react';
import {
  Checkbox,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';

export interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showPriority?: boolean;
}

export const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'high': return '#f44336';
    case 'medium': return '#ff9800';
    case 'low': return '#4caf50';
    default: return '#1056F5'; // Default blue for tasks without priority
  }
};

const TaskItem: React.FC<TaskItemProps> = ({
  id,
  title,
  completed,
  priority,
  createdAt,
  completedAt,
  onToggle,
  onDelete,
  showPriority = true
}) => {
  return (
    <ListItem
      sx={{
        mb: 1,
        bgcolor: 'white',
        borderRadius: 1,
        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.02)' },
      }}
    >
      <Checkbox
        checked={completed}
        onChange={() => onToggle(id)}
        sx={{ color: showPriority ? getPriorityColor(priority) : '#1056F5' }}
      />
      <ListItemText
        primary={
          <Typography
            sx={{
              textDecoration: completed ? 'line-through' : 'none',
              color: completed ? 'text.secondary' : 'text.primary',
              fontFamily: 'Poppins',
            }}
          >
            {title}
          </Typography>
        }
        secondary={
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
            {completed && completedAt
              ? `Completed ${format(new Date(completedAt), 'MMM d, yyyy')}`
              : `Created ${format(new Date(createdAt), 'MMM d, yyyy')}`}
          </Typography>
        }
      />
      
      {showPriority && priority && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: getPriorityColor(priority),
            mr: 2,
          }}
        />
      )}
      
      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          aria-label="delete"
          onClick={() => onDelete(id)}
        >
          <DeleteIcon />
        </IconButton>
      </ListItemSecondaryAction>
    </ListItem>
  );
};

export default TaskItem; 