import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button, 
  Chip,
  Divider,
  Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeIcon from '@mui/icons-material/Coffee';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';

// Define the ReflectionEntry type
interface ReflectionEntry {
  date: string;
  productivityScore: number;
  meetingScore: number | null;
  hadNoMeetings: boolean;
  focusTime: string;
  breaksTaken: string;
  supportNeeded?: string;
  improvementPlans?: string;
  timestamp?: string;
  distractions?: string[];
}

const EntryDetail: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { entryId } = useParams<{ entryId: string }>();
  const [entry, setEntry] = useState<ReflectionEntry | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Load entry data from localStorage
    const loadEntry = () => {
      const savedEntries = localStorage.getItem('reflectionEntries');
      if (savedEntries && entryId) {
        const parsedEntries: ReflectionEntry[] = JSON.parse(savedEntries);
        const foundEntry = parsedEntries[parseInt(entryId)];
        
        if (foundEntry) {
          setEntry(foundEntry);
        } else {
          // Entry not found, redirect to dashboard
          navigate('/dashboard');
        }
      } else {
        // No entries or no entryId, redirect to dashboard
        navigate('/dashboard');
      }
    };
    
    loadEntry();
  }, [isAuthenticated, navigate, entryId]);
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate productivity score as percentage
  const calculateScore = (score: number): string => {
    return `${score * 10}%`;
  };
  
  // Handle back button click - check if we came from entries page
  const handleBack = () => {
    // If navigated from entries page, go back to entries page, otherwise go to dashboard
    const fromEntriesPage = location.key !== 'default' && document.referrer.includes('/entries');
    navigate(fromEntriesPage ? '/entries' : '/dashboard');
  };
  
  // Handle delete entry
  const handleDeleteClick = () => {
    setConfirmDeleteOpen(true);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!entryId) return;
    
    try {
      // Get entries from localStorage
      const savedEntries = localStorage.getItem('reflectionEntries');
      if (savedEntries) {
        const parsedEntries: ReflectionEntry[] = JSON.parse(savedEntries);
        
        // Remove the entry at the specified index
        parsedEntries.splice(parseInt(entryId), 1);
        
        // Save the updated entries back to localStorage
        localStorage.setItem('reflectionEntries', JSON.stringify(parsedEntries));
        
        // Close the dialog and navigate back
        setConfirmDeleteOpen(false);
        
        // Navigate back to the appropriate page
        const fromEntriesPage = location.key !== 'default' && document.referrer.includes('/entries');
        navigate(fromEntriesPage ? '/entries' : '/dashboard');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };
  
  // If entry is still loading or not found
  if (!entry) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography>Loading entry details...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4, bgcolor: '#f5f5f5' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ 
              mr: 2,
              fontFamily: 'Poppins', 
              textTransform: 'none',
              color: '#1056F5'
            }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#333' }}>
            Daily Reflection
          </Typography>
        </Box>
        
        <Button 
          startIcon={<DeleteIcon />}
          onClick={handleDeleteClick}
          variant="outlined"
          color="error"
          sx={{ 
            fontFamily: 'Poppins', 
            textTransform: 'none',
          }}
        >
          Delete Entry
        </Button>
      </Box>
      
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        {/* Header with date and scores */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h5" 
            sx={{ mb: 3, fontWeight: 'medium', fontFamily: 'Poppins', color: '#333' }}
          >
            {entry.timestamp ? formatDate(entry.timestamp) : formatDate(entry.date)}
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 2,
                height: '100%'
              }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                  Productivity Score
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#1056F5' }}>
                  {calculateScore(entry.productivityScore)}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 2,
                height: '100%'
              }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                  Meeting Score
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#1056F5' }}>
                  {entry.hadNoMeetings ? 'N/A' : (entry.meetingScore ? `${entry.meetingScore * 10}%` : 'N/A')}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                  Focus & Breaks
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                  <Chip 
                    label={`Focus: ${entry.focusTime}`} 
                    sx={{ 
                      fontFamily: 'Poppins',
                      bgcolor: '#1056F5',
                      color: 'white',
                      fontWeight: 'medium',
                      py: 0.5
                    }}
                  />
                  <Chip 
                    label={`Breaks: ${entry.breaksTaken}`} 
                    sx={{ 
                      fontFamily: 'Poppins',
                      bgcolor: '#1056F5',
                      color: 'white'
                    }}
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Distractions Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontFamily: 'Poppins' }}>
            What got in the way?
          </Typography>
          
          {entry.distractions && entry.distractions.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {entry.distractions.map((distraction, index) => (
                <Chip 
                  key={index}
                  label={distraction}
                  sx={{ 
                    fontFamily: 'Poppins',
                    bgcolor: '#1056F5',
                    color: 'white'
                  }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
              No distractions recorded for this day.
            </Typography>
          )}
        </Box>
        
        {/* Support Needed Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontFamily: 'Poppins' }}>
            Support Needed
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body1" sx={{ fontFamily: 'Poppins' }}>
              {entry.supportNeeded || "No support needs were recorded for this entry."}
            </Typography>
          </Paper>
        </Box>
        
        {/* Improvement Plans Section */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', fontFamily: 'Poppins' }}>
            Improvement Plans
          </Typography>
          
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body1" sx={{ fontFamily: 'Poppins' }}>
              {entry.improvementPlans || "No improvement plans were recorded for this entry."}
            </Typography>
          </Paper>
        </Box>
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
          Delete Reflection Entry
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: 'Poppins' }}>
            Are you sure you want to delete this reflection entry? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete} 
            sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error"
            variant="contained"
            sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EntryDetail; 