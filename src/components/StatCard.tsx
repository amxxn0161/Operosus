import React from 'react';
import { Paper, Box, Typography } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = '#1056F5',
  subtitle
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
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontFamily: 'Poppins',
            color: 'text.secondary',
            fontWeight: 'medium',
          }}
        >
          {title}
        </Typography>
        {icon && (
          <Box sx={{ color }}>
            {icon}
          </Box>
        )}
      </Box>
      
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontFamily: 'Poppins',
            fontWeight: 'bold',
            color,
          }}
        >
          {value}
        </Typography>
        
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              fontFamily: 'Poppins',
              color: 'text.secondary',
              mt: 1,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default StatCard; 