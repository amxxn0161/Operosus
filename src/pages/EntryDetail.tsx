import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Paper, 
  Button, 
  Chip,
  Divider,
  Grid
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeIcon from '@mui/icons-material/Coffee';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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
  const { entryId } = useParams<{ entryId: string }>();
  const [entry, setEntry] = useState<ReflectionEntry | null>(null);
  
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
  
  // Handle back button click
  const handleBack = () => {
    navigate('/dashboard');
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
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
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#333' }}>
          Daily Reflection
        </Typography>
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
                    bgcolor: '#8B5CF6',
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
    </Container>
  );
};

export default EntryDetail; 