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
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import { useAIAssistant } from '../contexts/AIAssistantContext';
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
  const { updateScreenContext } = useAIAssistant();
  const navigate = useNavigate();
  
  // Form state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
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
    
    // Update context for AI Assistant
    updateScreenContext({
      currentComponent: 'Journal',
      currentData: {
        formType: 'journalEntry',
        formStatus: 'creating',
        formFields: [
          'date', 'productivityScore', 'meetingScore', 'hadNoMeetings',
          'breaksTaken', 'focusTime', 'distractions', 'supportNeeded', 'improvementPlans'
        ]
      }
    });
  }, [isAuthenticated, navigate, updateScreenContext]);

  // Separate useEffect that only runs once for initialization
  useEffect(() => {
    // Initialize distraction options only once when component mounts
    console.log('Initializing distraction options');
    const initialDistractions: {[key: string]: boolean} = {};
    distractionOptions.forEach(option => {
      initialDistractions[option] = false;
    });
    setSelectedDistractions(initialDistractions);
  }, []); // Empty dependency array means this runs only once on mount

  const handleDistractionChange = (distraction: string) => {
    console.log('Changing distraction:', distraction, 'Current value:', selectedDistractions[distraction]);
    
    // Use a more robust state update approach
    setSelectedDistractions(prev => {
      const newState = {
        ...prev,
        [distraction]: !prev[distraction]
      };
      console.log('New state will be:', newState);
      return newState;
    });
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Use selected date or default to current date
    const entryDate = selectedDate || new Date();
    const formattedDate = entryDate.toISOString().split('T')[0];
    
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
      timestamp: new Date().toISOString() // Use full ISO string with timezone information
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

  // Update AI context when form values change
  useEffect(() => {
    // Create a form data snapshot for the AI assistant context
    const formData = {
      date: selectedDate,
      productivityScore,
      hadNoMeetings,
      meetingScore: hadNoMeetings ? null : meetingScore,
      breaksTaken: tookBreak,
      focusTime: completedFocusTime,
      distractions: Object.entries(selectedDistractions)
        .filter(([, selected]) => selected)
        .map(([distraction]) => distraction),
      supportNeeded,
      improvementPlans
    };
    
    updateScreenContext({
      currentData: {
        formType: 'journalEntry',
        formStatus: 'editing',
        formData
      }
    });
  }, [
    selectedDate, productivityScore, hadNoMeetings, meetingScore, 
    tookBreak, completedFocusTime, selectedDistractions, 
    supportNeeded, improvementPlans, updateScreenContext
  ]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
          Daily Journal
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined"
            onClick={() => navigate('/journal-insights')}
            sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
          >
            Journal Insights
          </Button>
          <Button 
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {/* Date Selection - Moved to top and styled for better visibility */}
          <Box sx={{ 
            mb: 4, 
            p: 2, 
            border: '1px solid #e0e0e0', 
            borderRadius: 1, 
            bgcolor: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins', color: '#1056F5', fontWeight: 'bold' }}>
              Entry Date
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontFamily: 'Poppins', color: 'text.secondary' }}>
              Select a date for this journal entry (defaults to today)
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(newDate: Date | null) => setSelectedDate(newDate)}
                disableFuture
                slotProps={{ 
                  textField: { 
                    fullWidth: true,
                    sx: { 
                      fontFamily: 'Poppins',
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: '#1056F5',
                        },
                      },
                    }
                  } 
                }}
              />
            </LocalizationProvider>
          </Box>

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
                        onClick={(e) => {
                          // Stop event propagation
                          e.stopPropagation();
                        }}
                        onChange={(e) => {
                          // Use direct event handling
                          console.log('Checkbox clicked via onChange:', option, e.target.checked);
                          const newValue = e.target.checked;
                          
                          setSelectedDistractions(prev => ({
                            ...prev,
                            [option]: newValue
                          }));
                        }}
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
              disabled={saving}
              sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
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
              {saving ? 'Saving...' : 'Save Reflection'}
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