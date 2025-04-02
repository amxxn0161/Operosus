import React from 'react';
import { 
  Box, 
  FormControlLabel, 
  Switch, 
  Typography, 
  Paper,
  Divider
} from '@mui/material';
import { useMockData as useTaskMockData, setUseMockData as setTaskMockData } from '../services/taskService';
// Import calendar mock data toggles
import { useMockData as useCalendarMockData, setUseMockData as setCalendarMockData } from '../services/calendarService';

/**
 * Component to toggle between mock and real data sources
 * Useful for development and testing
 */
const MockDataToggle: React.FC = () => {
  // Task data toggle handler
  const handleTaskToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTaskMockData(event.target.checked);
    // Refresh the page to apply changes
    window.location.reload();
  };

  // Calendar data toggle handler
  const handleCalendarToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCalendarMockData(event.target.checked);
    // Refresh the page to apply changes
    window.location.reload();
  };
  
  return (
    <Paper sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Data Source Settings
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Toggle between mock data and real API data for development and testing.
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={useTaskMockData}
              onChange={handleTaskToggle}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body1">Tasks Data</Typography>
              <Typography variant="caption" color="text.secondary">
                {useTaskMockData ? 'Using sample data' : 'Using real API data'}
              </Typography>
            </Box>
          }
          sx={{ mx: 0, width: '100%', justifyContent: 'space-between' }}
        />
      </Box>
      
      {/* Calendar toggle */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={useCalendarMockData}
              onChange={handleCalendarToggle}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="body1">Calendar Data</Typography>
              <Typography variant="caption" color="text.secondary">
                {useCalendarMockData ? 'Using sample data' : 'Using real API data'}
              </Typography>
            </Box>
          }
          sx={{ mx: 0, width: '100%', justifyContent: 'space-between' }}
        />
      </Box>
      
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
        Changes will take effect after page reload. This toggle is for development purposes only.
      </Typography>
    </Paper>
  );
};

export default MockDataToggle; 