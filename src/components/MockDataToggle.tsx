import React, { useState, useEffect } from 'react';
import {
  FormGroup,
  FormControlLabel,
  Switch,
  Paper,
  Typography,
  Box
} from '@mui/material';
import { useMockData as useTaskMockData, setUseMockData as setTaskMockData } from '../services/taskService';

interface MockDataToggleProps {
  title?: string;
}

const MockDataToggle: React.FC<MockDataToggleProps> = ({ title = 'Sample Data Controls' }) => {
  const [taskMock, setTaskMock] = useState(useTaskMockData);

  useEffect(() => {
    setTaskMockData(taskMock);
  }, [taskMock]);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ color: 'text.secondary', mb: 2 }}>
        <Typography variant="body2">
          Toggle these switches to use real or sample data throughout the application.
        </Typography>
      </Box>
      <FormGroup>
        <FormControlLabel
          control={
            <Switch
              checked={taskMock}
              onChange={(e) => setTaskMock(e.target.checked)}
              color="primary"
            />
          }
          label="Use sample task data"
        />
      </FormGroup>
    </Paper>
  );
};

export default MockDataToggle; 