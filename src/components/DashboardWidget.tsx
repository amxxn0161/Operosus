import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

interface DashboardWidgetProps {
  title?: string;
  children: React.ReactNode;
  isEditMode?: boolean;
  noContentPadding?: boolean;
  height?: string | number;
}

/**
 * A widget component for dashboard items
 * Use this to wrap content that will be placed in the grid layout
 */
const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
  isEditMode = false,
  noContentPadding = false,
  height = '100%'
}) => {
  return (
    <Paper
      sx={{
        height,
        borderRadius: 2,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {title && (
        <Box
          sx={{
            pt: isEditMode ? 4 : 2,
            px: 2,
            pb: 1,
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Typography
            variant="h6"
            sx={{
              fontWeight: 'bold',
              fontFamily: 'Poppins',
            }}
          >
            {title}
          </Typography>
        </Box>
      )}
      
      <Box
        sx={{
          p: noContentPadding ? 0 : 2,
          pt: title ? (noContentPadding ? 0 : 2) : (isEditMode ? 4 : (noContentPadding ? 0 : 2)),
          flexGrow: 1,
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
    </Paper>
  );
};

export default DashboardWidget; 