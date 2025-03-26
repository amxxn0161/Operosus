import React, { ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actionText,
  actionIcon,
  onAction
}) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      mb: 4 
    }}>
      <Box>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold', 
            fontFamily: 'Poppins', 
            mb: subtitle ? 1 : 0 
          }}
        >
          {title}
        </Typography>
        
        {subtitle && (
          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: 'Poppins', 
              color: 'text.secondary' 
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      
      {actionText && onAction && (
        <Button
          variant="contained"
          startIcon={actionIcon}
          onClick={onAction}
          sx={{ 
            fontFamily: 'Poppins', 
            textTransform: 'none',
            backgroundColor: '#1056F5',
            '&:hover': {
              backgroundColor: '#0D47D9',
            },
            borderRadius: 2
          }}
        >
          {actionText}
        </Button>
      )}
    </Box>
  );
};

export default PageHeader; 