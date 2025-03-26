import React, { ReactNode } from 'react';
import { Box } from '@mui/material';

interface TabPanelProps {
  children?: ReactNode;
  index: number;
  value: number;
  padding?: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ 
  children, 
  value, 
  index, 
  padding = 3,
  ...other 
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: padding }}>
          {children}
        </Box>
      )}
    </div>
  );
};

export default TabPanel; 