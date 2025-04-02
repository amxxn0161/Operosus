import React from 'react';
import { Paper, Box, Typography, useTheme, useMediaQuery } from '@mui/material';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Paper
      elevation={1}
      sx={{
        p: isMobile ? 2 : 3,
        borderRadius: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderLeft: `4px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 3
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: isMobile ? 1 : 2 }}>
        <Typography
          variant={isMobile ? "body2" : "subtitle1"}
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
          variant={isMobile ? "h5" : "h4"}
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
              fontSize: isMobile ? '0.75rem' : '0.875rem',
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