import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography
} from '@mui/material';

// Interface for the task prop
export interface TaskWithEstimate {
  id: string;
  title: string;
  estimated_minutes?: number;
}

// TaskDurationDialog props
interface TaskDurationDialogProps {
  open: boolean;
  onClose: () => void;
  task: TaskWithEstimate | null;
  taskListId: string | null;
  onComplete: (actualMinutes: number) => Promise<void>;
}

const TaskDurationDialog: React.FC<TaskDurationDialogProps> = ({
  open,
  onClose,
  task,
  taskListId,
  onComplete
}) => {
  const [hours, setHours] = useState<string>('');
  const [minutes, setMinutes] = useState<string>('');
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);
  
  // Reset form when task changes
  useEffect(() => {
    if (task?.estimated_minutes) {
      // Don't pre-populate with estimated time, start with empty fields
      setHours('');
      setMinutes('');
      setActualMinutes(null);
    } else {
      setHours('');
      setMinutes('');
      setActualMinutes(null);
    }
  }, [task]);
  
  // Update actual minutes when hours or minutes change
  useEffect(() => {
    const hoursNum = hours === '' ? 0 : parseInt(hours, 10);
    const minutesNum = minutes === '' ? 0 : parseInt(minutes, 10);
    
    if ((hours !== '' || minutes !== '') && !isNaN(hoursNum) && !isNaN(minutesNum)) {
      setActualMinutes((hoursNum * 60) + minutesNum);
    } else {
      setActualMinutes(null);
    }
  }, [hours, minutes]);
  
  // Handle quick select buttons
  const handleQuickSelect = (mins: number) => {
    const hoursValue = Math.floor(mins / 60);
    const minutesValue = mins % 60;
    
    setHours(hoursValue > 0 ? hoursValue.toString() : '');
    setMinutes(minutesValue > 0 ? minutesValue.toString() : '');
    setActualMinutes(mins);
  };
  
  // Handle clear
  const handleClear = () => {
    setHours('');
    setMinutes('');
    setActualMinutes(null);
  };
  
  // Handle save
  const handleSave = async () => {
    if (actualMinutes !== null && actualMinutes >= 0) {
      await onComplete(actualMinutes);
      onClose();
    }
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
        Record Time Spent
      </DialogTitle>
      
      <DialogContent>
        {task && (
          <>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>
              {task.title}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" mb={3}>
              How long did this task actually take to complete?
              {task.estimated_minutes && (
                <Box component="span" ml={1} fontWeight="medium" color="primary.main">
                  (Estimated: {task.estimated_minutes >= 60 
                    ? `${Math.floor(task.estimated_minutes / 60)}h${task.estimated_minutes % 60 ? ` ${task.estimated_minutes % 60}m` : ''}`
                    : `${task.estimated_minutes}m`})
                </Box>
              )}
            </Typography>
            
            <Typography variant="subtitle2" mb={1}>
              Actual Time
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
              <TextField
                label="Hours"
                type="number"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                InputProps={{ 
                  inputProps: { min: 0 } 
                }}
                sx={{ width: '120px' }}
              />
              
              <TextField
                label="Minutes"
                type="number"
                value={minutes}
                onChange={(e) => {
                  // Allow empty string or restrict to 0-59 range
                  const value = e.target.value;
                  if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 59)) {
                    setMinutes(value);
                  }
                }}
                InputProps={{ 
                  inputProps: { min: 0, max: 59 } 
                }}
                sx={{ width: '120px' }}
              />
            </Box>
            
            <Typography variant="subtitle2" mb={1}>
              Quick select:
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              <Button 
                variant="outlined" 
                onClick={() => handleQuickSelect(5)}
                size="small"
              >
                5m
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleQuickSelect(15)}
                size="small"
              >
                15m
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleQuickSelect(30)}
                size="small"
              >
                30m
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleQuickSelect(45)}
                size="small"
              >
                45m
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleQuickSelect(60)}
                size="small"
              >
                1h
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => handleQuickSelect(120)}
                size="small"
              >
                2h
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleClear}
                size="small"
              >
                Clear
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Skip
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={actualMinutes === null}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskDurationDialog; 