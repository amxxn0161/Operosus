import React, { useState } from 'react';
import { useGoogleTasks } from '../contexts/GoogleTasksContext';
import { ListItem, ListItemText, ListItemIcon, IconButton, Tooltip, Checkbox } from '@mui/material';
import { TaskWithEstimate } from './TaskDurationDialog';
import TaskDurationDialog from './TaskDurationDialog';

interface CalendarTaskItemProps {
  task: TaskWithEstimate & { 
    task_list_id?: string | null;
    status?: string;
  };
  showCompleteDialog?: boolean;
}

const CalendarTaskItem: React.FC<CalendarTaskItemProps> = ({ 
  task, 
  showCompleteDialog = true 
}) => {
  const { toggleTaskComplete, recordDuration } = useGoogleTasks();
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  const handleToggleComplete = async () => {
    if (!task.task_list_id) return;
    
    // If task is not completed and we need to show the dialog
    if (task.status !== 'completed' && showCompleteDialog && task.estimated_minutes) {
      setDurationDialogOpen(true);
      setIsCompleting(true);
    } else {
      // Just toggle the status directly
      await toggleTaskComplete(task.task_list_id, task.id);
    }
  };
  
  const handleCompletionTimeRecorded = async (actualMinutes: number) => {
    if (!task.task_list_id || !isCompleting) return;
    
    // First change status to completed
    const updatedTask = await toggleTaskComplete(task.task_list_id, task.id);
    
    // Then record duration if successful
    if (updatedTask && updatedTask.status === 'completed') {
      await recordDuration(task.task_list_id, task.id, actualMinutes);
    }
    
    setIsCompleting(false);
    setDurationDialogOpen(false);
  };
  
  const handleDurationDialogClose = () => {
    setIsCompleting(false);
    setDurationDialogOpen(false);
  };
  
  return (
    <>
      <ListItem
        secondaryAction={
          <Tooltip title={task.status === 'completed' ? 'Mark as incomplete' : 'Mark as complete'}>
            <Checkbox
              edge="end"
              checked={task.status === 'completed'}
              onChange={handleToggleComplete}
            />
          </Tooltip>
        }
      >
        <ListItemText
          primary={task.title}
          secondary={task.estimated_minutes ? `Estimated: ${
            task.estimated_minutes >= 60
              ? `${Math.floor(task.estimated_minutes / 60)}h${task.estimated_minutes % 60 ? ` ${task.estimated_minutes % 60}m` : ''}`
              : `${task.estimated_minutes}m`
          }` : undefined}
          sx={{
            pr: 4,
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
            '& .MuiListItemText-primary': {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }}
        />
      </ListItem>
      
      {/* Task duration dialog */}
      <TaskDurationDialog
        open={durationDialogOpen}
        onClose={handleDurationDialogClose}
        task={task}
        taskListId={task.task_list_id || null}
        onComplete={handleCompletionTimeRecorded}
      />
    </>
  );
};

export default CalendarTaskItem; 