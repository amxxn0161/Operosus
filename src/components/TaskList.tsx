import React from 'react';
import { List, Box, Typography, Button } from '@mui/material';
import TaskItem, { TaskItemProps } from './TaskItem';
import AddIcon from '@mui/icons-material/Add';

export interface TaskListProps {
  tasks: (Omit<TaskItemProps, 'onToggle' | 'onDelete'>)[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onAddTask?: () => void;
  emptyMessage?: string;
  showAddButton?: boolean;
  maxItems?: number;
  showPriority?: boolean;
  title?: string;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  emptyMessage = 'No tasks available',
  showAddButton = false,
  maxItems,
  showPriority = true,
  title
}) => {
  const displayTasks = maxItems ? tasks.slice(0, maxItems) : tasks;
  
  return (
    <>
      {title && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
            {title}
          </Typography>
          {showAddButton && onAddTask && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={onAddTask}
              sx={{ 
                fontFamily: 'Poppins', 
                textTransform: 'none',
                color: '#1056F5',
                borderColor: '#1056F5'
              }}
            >
              Add Task
            </Button>
          )}
        </Box>
      )}
      
      {displayTasks.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          py: 4,
          height: maxItems ? '80px' : 'auto'
        }}>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontFamily: 'Poppins' }}
          >
            {emptyMessage}
          </Typography>
        </Box>
      ) : (
        <List>
          {displayTasks.map((task) => (
            <TaskItem
              key={task.id}
              {...task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
              showPriority={showPriority}
            />
          ))}
        </List>
      )}
    </>
  );
};

export default TaskList; 