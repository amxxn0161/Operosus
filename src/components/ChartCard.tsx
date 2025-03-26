import React, { ReactNode } from 'react';
import { Paper, Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number | string;
  onRefresh?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
  isEmpty?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  height = 300,
  onRefresh,
  isLoading = false,
  emptyMessage = 'No data available',
  isEmpty = false
}) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: 'Poppins',
              fontWeight: 'medium',
            }}
          >
            {title}
          </Typography>
          
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Poppins',
                color: 'text.secondary',
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        
        {onRefresh && (
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            disabled={isLoading}
            sx={{
              fontFamily: 'Poppins',
              textTransform: 'none',
              color: '#1056F5',
            }}
          >
            Refresh
          </Button>
        )}
      </Box>
      
      <Box sx={{ flexGrow: 1, height, position: 'relative' }}>
        {isEmpty ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'Poppins',
                color: 'text.secondary',
              }}
            >
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </Box>
    </Paper>
  );
};

export default ChartCard; 