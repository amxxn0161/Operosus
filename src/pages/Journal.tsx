import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  FormControlLabel, 
  Checkbox,
  Radio,
  RadioGroup,
  TextField,
  MenuItem,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import SuccessDialog from '../components/SuccessDialog';

// Define distraction options
const distractionOptions = [
  "Email",
  "Meetings",
  "Slack/Chat",
  "Social Media",
  "Colleague Interruptions",
  "Personal Matters",
  "Work Environment",
  "Low Energy/Fatigue",
  "Other"
];

const Journal: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { saveEntry, entries } = useJournal();
  const navigate = useNavigate();
  
  // Form state
  const [productivityScore, setProductivityScore] = useState<number>(5);
  const [hadNoMeetings, setHadNoMeetings] = useState<boolean>(false);
  const [meetingScore, setMeetingScore] = useState<number>(5);
  const [tookBreak, setTookBreak] = useState<string>('Yes');
  const [completedFocusTime, setCompletedFocusTime] = useState<string>('Yes');
  const [supportNeeded, setSupportNeeded] = useState<string>('');
  const [improvementPlans, setImprovementPlans] = useState<string>('');
  const [selectedDistractions, setSelectedDistractions] = useState<{[key: string]: boolean}>({});
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
    }
    
    // Initialize distraction options
    const initialDistractions: {[key: string]: boolean} = {};
    distractionOptions.forEach(option => {
      initialDistractions[option] = false;
    });
    setSelectedDistractions(initialDistractions);
  }, [isAuthenticated, navigate]);

  const handleDistractionChange = (distraction: string) => {
    setSelectedDistractions(prev => ({
      ...prev,
      [distraction]: !prev[distraction]
    }));
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Get current date and time
    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    
    // Process selected distractions into an array
    const distractions = Object.keys(selectedDistractions)
      .filter(key => selectedDistractions[key])
      .map(key => key);
    
    // Create the journal entry
    const journalEntry = {
      date: formattedDate,
      productivityScore,
      meetingScore: hadNoMeetings ? null : meetingScore,
      hadNoMeetings: hadNoMeetings ? 1 : 0, // Convert boolean to 0/1 for API
      breaksTaken: tookBreak,
      focusTime: completedFocusTime,
      supportNeeded,
      improvementPlans,
      distractions, // Add distractions to the entry
      timestamp: `${formattedDate} ${now.toTimeString().split(' ')[0]}` // Format as expected by API
    };
    
    try {
      // Save entry to API using the saveEntry function from JournalContext
      const savedEntry = await saveEntry(journalEntry);
      
      if (savedEntry) {
        // Show success dialog
        setDialogOpen(true);
      } else {
        throw new Error('Failed to save journal entry');
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
      alert('There was an error saving your reflection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
          Daily Journal
        </Typography>
        <Button 
          variant="outlined"
          onClick={() => navigate('/dashboard')}
          sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
        >
          Back to Dashboard
        </Button>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Productivity Score */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
              Overall Productivity Score (1-10)
            </Typography>
            <TextField
              select
              fullWidth
              value={productivityScore}
              onChange={(e) => setProductivityScore(Number(e.target.value))}
              sx={{ fontFamily: 'Poppins' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <MenuItem key={score} value={score}>
                  {score}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Meeting Information */}
          <Box sx={{ mb: 4 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={hadNoMeetings}
                  onChange={(e) => setHadNoMeetings(e.target.checked)}
                />
              }
              label="I had no meetings today"
              sx={{ mb: 2, fontFamily: 'Poppins' }}
            />
            
            {!hadNoMeetings && (
              <>
                <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
                  Meeting Effectiveness Score (1-10)
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={meetingScore}
                  onChange={(e) => setMeetingScore(Number(e.target.value))}
                  sx={{ fontFamily: 'Poppins' }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                    <MenuItem key={score} value={score}>
                      {score}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}
          </Box>

          {/* Break Time */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
              Did you take any break time today?
            </Typography>
            <RadioGroup
              value={tookBreak}
              onChange={(e) => setTookBreak(e.target.value)}
              sx={{ flexDirection: 'row' }}
            >
              <FormControlLabel 
                value="Yes" 
                control={<Radio />} 
                label="Yes" 
                sx={{ fontFamily: 'Poppins' }}
              />
              <FormControlLabel 
                value="No" 
                control={<Radio />} 
                label="No" 
                sx={{ fontFamily: 'Poppins' }}
              />
            </RadioGroup>
          </Box>

          {/* Focus Time */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
              Did you successfully complete your planned focus time?
            </Typography>
            <RadioGroup
              value={completedFocusTime}
              onChange={(e) => setCompletedFocusTime(e.target.value)}
              sx={{ flexDirection: 'row' }}
            >
              <FormControlLabel 
                value="Yes" 
                control={<Radio />} 
                label="Yes" 
                sx={{ fontFamily: 'Poppins' }}
              />
              <FormControlLabel 
                value="No" 
                control={<Radio />} 
                label="No" 
                sx={{ fontFamily: 'Poppins' }}
              />
              <FormControlLabel 
                value="Partially" 
                control={<Radio />} 
                label="Partially" 
                sx={{ fontFamily: 'Poppins' }}
              />
            </RadioGroup>
          </Box>

          {/* What got in the way section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
              What got in the way of your success today? (Select all that apply)
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              {distractionOptions.map((option) => (
                <Box key={option} sx={{ width: '50%', mb: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={selectedDistractions[option] || false}
                        onChange={() => handleDistractionChange(option)}
                      />
                    }
                    label={option}
                    sx={{ fontFamily: 'Poppins' }}
                  />
                </Box>
              ))}
            </Box>
          </Box>

          {/* Support Needed */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
              What support or help might you need?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="What would help you be more successful?"
              value={supportNeeded}
              onChange={(e) => setSupportNeeded(e.target.value)}
              sx={{ fontFamily: 'Poppins' }}
            />
          </Box>

          {/* Improvement Plans */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins' }}>
              What could you do differently tomorrow?
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="List specific actions you could take"
              value={improvementPlans}
              onChange={(e) => setImprovementPlans(e.target.value)}
              sx={{ fontFamily: 'Poppins' }}
            />
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#1056F5',
                color: 'white',
                fontFamily: 'Poppins',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: '#0D47D9',
                },
              }}
            >
              Save Reflection
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Add the Success Dialog */}
      <SuccessDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        message="Reflection Saved!"
        score={productivityScore}
        autoClose={true}
        autoCloseTime={4000}
      />
    </Container>
  );
};

export default Journal; 