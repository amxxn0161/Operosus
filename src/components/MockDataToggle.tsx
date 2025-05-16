import React from 'react';
import {
  Paper,
  Typography,
  Box
} from '@mui/material';

interface MockDataToggleProps {
  title?: string;
}

const MockDataToggle: React.FC<MockDataToggleProps> = ({ title = 'Sample Data Controls' }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ color: 'text.secondary', mb: 2 }}>
        <Typography variant="body2">
          No toggle options available. Task features have been removed.
        </Typography>
      </Box>
    </Paper>
  );
};

export default MockDataToggle; 