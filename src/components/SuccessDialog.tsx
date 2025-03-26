import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  CircularProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

interface SuccessDialogProps {
  open: boolean;
  onClose: () => void;
  message: string;
  score?: number;
  autoClose?: boolean;
  autoCloseTime?: number;
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({
  open,
  onClose,
  message,
  score,
  autoClose = true,
  autoCloseTime = 9000
}) => {
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (open && autoClose) {
      timer = setTimeout(() => {
        onClose();
      }, autoCloseTime);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [open, autoClose, autoCloseTime, onClose]);

  // Convert score to percentage
  const percentage = score !== undefined ? score * 10 : 0;
  
  // Determine color based on percentage
  const getScoreColor = () => {
    if (percentage >= 70) return '#4CAF50'; // Green for high scores
    if (percentage >= 40) return '#FF9800'; // Orange for medium scores
    return '#F44336'; // Red for low scores
  };
  
  // Get motivational message based on score
  const getMotivationalMessage = () => {
    if (percentage >= 70) return "Great job today!";
    if (percentage >= 40) return "Good effort today!";
    return "Tomorrow is a new opportunity!";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 3,
          width: '330px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
        }
      }}
    >
      {/* Header with blue background */}
      <Box sx={{ 
        backgroundColor: '#1056F5', 
        py: 2.5, 
        px: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <CheckCircleIcon sx={{ 
          fontSize: 48, 
          mb: 1, 
          color: 'white' 
        }} />
        
        <Typography 
          variant="h5" 
          sx={{ 
            fontFamily: 'Poppins', 
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            fontSize: '1.3rem'
          }}
        >
          {message}
        </Typography>
      </Box>
      
      <DialogContent sx={{ px: 3, py: 3 }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center'
        }}>
          {score !== undefined && (
            <Box 
              sx={{ 
                mb: 2.5,
                mt: 0.5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {/* Replace with circular progress indicator */}
              <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                {/* Background circle */}
                <CircularProgress
                  variant="determinate"
                  value={100}
                  size={100}
                  thickness={4}
                  sx={{ 
                    color: 'rgba(0, 0, 0, 0.1)',
                    position: 'absolute',
                    circle: {
                      strokeLinecap: 'round',
                    }
                  }}
                />
                {/* Foreground progress circle */}
                <CircularProgress
                  variant="determinate"
                  value={percentage}
                  size={100}
                  thickness={4}
                  sx={{ 
                    color: getScoreColor(),
                    circle: {
                      strokeLinecap: 'round',
                    }
                  }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ 
                      fontWeight: 'bold',
                      fontFamily: 'Poppins',
                      color: getScoreColor(),
                      lineHeight: 1,
                      textAlign: 'center',
                      fontSize: '2rem',
                    }}
                  >
                    {percentage}%
                  </Typography>
                </Box>
              </Box>
              <Typography
                variant="body2"
                sx={{ 
                  color: '#000000',
                  fontFamily: 'Poppins',
                  fontSize: '0.875rem',
                  fontWeight: 'bold'
                }}
              >
                Productivity
              </Typography>
            </Box>
          )}
          
          <Typography 
            variant="body1" 
            sx={{ 
              fontFamily: 'Poppins', 
              fontWeight: 'medium',
              color: getScoreColor(),
              fontSize: '1rem',
              mb: 1.5
            }}
          >
            {getMotivationalMessage()}
          </Typography>

          <Typography 
            variant="body2" 
            sx={{ 
              color: '#000000', 
              fontFamily: 'Poppins',
              fontSize: '0.85rem'
            }}
          >
            Your entry has been successfully saved.
          </Typography>
        </Box>
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ justifyContent: 'center', p: 2 }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{ 
            minWidth: '100px',
            fontFamily: 'Poppins', 
            textTransform: 'none',
            borderRadius: '8px',
            py: 0.75,
            backgroundColor: '#1056F5',
            fontWeight: 'bold',
            '&:hover': {
              backgroundColor: '#0D47D9',
            },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuccessDialog; 