import React from 'react';
import { Alert, Box, IconButton, Collapse } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface TaskDurationWarningProps {
  open: boolean;
  onClose: () => void;
}

/**
 * A component that displays a non-obtrusive warning when there's an issue with recording task duration
 * but the task was still completed successfully.
 */
const TaskDurationWarning: React.FC<TaskDurationWarningProps> = ({ open, onClose }) => {
  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: 'auto', maxWidth: '600px', mb: 2 }}>
      <Collapse in={open}>
        <Alert
          severity="warning"
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={onClose}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
          sx={{ 
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            borderRadius: 2,
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center'
            }
          }}
        >
          Task completed successfully, but there was an issue recording the task duration. Duration data may not be accurate.
        </Alert>
      </Collapse>
    </Box>
  );
};

export default TaskDurationWarning; 