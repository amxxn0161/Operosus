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
  DialogTitle,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip
} from '@mui/material';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import { JournalEntry } from '../services/journalService';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeIcon from '@mui/icons-material/Coffee';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

// Interface for admin journal entries which includes user info
interface AdminJournalEntry extends JournalEntry {
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

const API_BASE_URL = process.env.REACT_APP_API_TARGET || 'https://app2.operosus.com';

const EntryDetail: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { entries, loading, error, deleteEntry, saveEntry } = useJournal();
  const navigate = useNavigate();
  const location = useLocation();
  const { entryId } = useParams<{ entryId: string }>();
  const [entry, setEntry] = useState<AdminJournalEntry | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAdminEntry, setIsAdminEntry] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  
  // New state for date editing
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    const loadEntry = async () => {
      if (!entryId) return;
      
      const id = parseInt(entryId);
      console.log(`Loading entry with ID: ${id}`);
      
      // Step 1: Try to find the entry in the entries from context
      if (entries.length > 0) {
        const foundEntry = entries.find(e => e.id === id);
        if (foundEntry) {
          console.log('Found entry in context:', foundEntry);
          setEntry(foundEntry);
          setSelectedDate(new Date(foundEntry.date));
          setLocalLoading(false);
          return;
        }
        console.log('Entry not found in context, checking localStorage');
      }
      
      // Step 2: Check localStorage for admin entry
      try {
        const savedAdminEntry = localStorage.getItem('currentAdminEntry');
        if (savedAdminEntry) {
          const parsedEntry = JSON.parse(savedAdminEntry);
          console.log('Found admin entry in localStorage:', parsedEntry);
          
          if (parsedEntry && parsedEntry.id === id) {
            setEntry(parsedEntry);
            setSelectedDate(new Date(parsedEntry.date));
            setIsAdminEntry(true);
            setLocalLoading(false);
            return;
          } else {
            console.log('Admin entry ID mismatch or invalid entry:', parsedEntry?.id, 'vs', id);
          }
        } else {
          console.log('No admin entry found in localStorage');
        }
      } catch (e) {
        console.error('Error parsing saved admin entry:', e);
      }
      
      // Step 3: Try to fetch admin entry directly
      console.log('Attempting to fetch admin entry directly');
      try {
        setLocalLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/productivity/admin/entry/${id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const adminEntry = await response.json();
          console.log('Successfully fetched admin entry:', adminEntry);
          setEntry(adminEntry);
          setSelectedDate(new Date(adminEntry.date));
          setIsAdminEntry(true);
          setLocalLoading(false);
          return;
        } else {
          console.error('Failed to fetch admin entry:', response.status);
        }
      } catch (err) {
        console.error('Error fetching admin entry:', err);
      } finally {
        setLocalLoading(false);
      }
      
      // If we get here, the entry was not found anywhere
      console.log('Entry not found anywhere, redirecting to dashboard');
      navigate('/dashboard');
    };
    
    loadEntry();
  }, [isAuthenticated, navigate, entryId, entries]);
  
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
  
  // Handle back button click - check if we came from admin or entries
  const handleBack = () => {
    // Clear the admin entry from localStorage when navigating away
    localStorage.removeItem('currentAdminEntry');
    
    // If it's an admin entry, go back to admin page
    if (isAdminEntry) {
      navigate('/admin-journal');
      return;
    }
    
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

  const handleConfirmDelete = async () => {
    if (!entryId || !entry) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Different delete logic for admin entries
      if (isAdminEntry) {
        // Delete admin entry through the admin API
        const response = await fetch(`${API_BASE_URL}/api/productivity/admin/${entry.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          // Clear the entry from localStorage
          localStorage.removeItem('currentAdminEntry');
          
          // Close the dialog and navigate back to admin page
          setConfirmDeleteOpen(false);
          navigate('/admin-journal');
          return;
        } else {
          setDeleteError('Failed to delete the admin entry. Please try again.');
        }
      } else {
        // Delete regular entry using context function
        const success = await deleteEntry(entry.id);
        
        if (success) {
          // Close the dialog and navigate back
          setConfirmDeleteOpen(false);
          
          // Navigate back to the appropriate page
          const fromEntriesPage = location.key !== 'default' && document.referrer.includes('/entries');
          navigate(fromEntriesPage ? '/entries' : '/dashboard');
        } else {
          setDeleteError('Failed to delete the entry. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      setDeleteError('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Start editing date
  const handleEditDate = () => {
    setIsEditingDate(true);
  };

  // Cancel date editing
  const handleCancelEditDate = () => {
    if (entry) {
      setSelectedDate(new Date(entry.date)); // Reset to original date
    }
    setIsEditingDate(false);
  };

  // Save the new date
  const handleSaveDate = async () => {
    if (!entry || !selectedDate) return;
    
    setIsSavingDate(true);
    setSaveError(null);
    
    // Format the date to YYYY-MM-DD
    const formattedDate = selectedDate.toISOString().split('T')[0];
    
    try {
      // Update entry with new date
      const updatedEntry = {
        ...entry,
        date: formattedDate,
        // Update timestamp to match new date but keep time
        timestamp: `${formattedDate} ${entry.timestamp.split(' ')[1]}`
      };
      
      const result = await saveEntry(updatedEntry);
      
      if (result) {
        // Update local entry state
        setEntry(result);
        setIsEditingDate(false);
      } else {
        setSaveError('Failed to update date. Please try again.');
      }
    } catch (error) {
      console.error('Error updating date:', error);
      setSaveError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSavingDate(false);
    }
  };
  
  // If entry is still loading or not found
  if (loading || localLoading) {
    return (
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!entry && !loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Entry not found</Typography>
          <Button 
            variant="contained" 
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </Box>
      </Container>
    );
  }

  if (!entry) {
    return null;
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
          <Button 
            onClick={() => navigate('/journal-insights')}
            sx={{ 
              mr: 2,
              fontFamily: 'Poppins', 
              textTransform: 'none',
              color: '#1056F5'
            }}
          >
            Journal Insights
          </Button>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#333' }}>
              {isAdminEntry && entry.user ? `${entry.user.name}'s Reflection` : 'Daily Reflection'}
            </Typography>
            {isAdminEntry && (
              <Chip 
                label="Admin View" 
                color="primary" 
                size="small" 
                sx={{ ml: 1, mt: 0.5 }}
              />
            )}
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outlined"
              size="small"
              color="success"
              onClick={() => {
                console.log('Debug Info:');
                console.log('Entry:', entry);
                console.log('Is Admin Entry:', isAdminEntry);
                console.log('LocalStorage:', localStorage.getItem('currentAdminEntry'));
                
                // Try setting admin entry directly again
                if (entry) {
                  localStorage.setItem('currentAdminEntry', JSON.stringify(entry));
                  setIsAdminEntry(true);
                  alert('Admin entry status updated. Check console for details.');
                }
              }}
              sx={{ mr: 1 }}
            >
              Debug
            </Button>
          )}
        
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        {/* Header with date and scores */}
        <Box sx={{ mb: 4 }}>
          {isEditingDate ? (
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Select Date"
                  value={selectedDate}
                  onChange={(newDate: Date | null) => setSelectedDate(newDate)}
                  disableFuture
                  slotProps={{ 
                    textField: { 
                      fullWidth: true,
                      sx: { fontFamily: 'Poppins' }
                    } 
                  }}
                />
              </LocalizationProvider>
              <IconButton 
                color="primary" 
                onClick={handleSaveDate}
                disabled={isSavingDate}
              >
                <SaveIcon />
              </IconButton>
              <IconButton 
                color="default" 
                onClick={handleCancelEditDate}
                disabled={isSavingDate}
              >
                <CloseIcon />
              </IconButton>
              {isSavingDate && <CircularProgress size={24} />}
            </Box>
          ) : (
            <Box sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
              <Typography 
                variant="h5" 
                sx={{ fontWeight: 'medium', fontFamily: 'Poppins', color: '#333' }}
              >
                {formatDate(entry.date)}
              </Typography>
              <Tooltip title="Edit Date">
                <IconButton 
                  color="primary" 
                  onClick={handleEditDate}
                  sx={{ ml: 1 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
          
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
                  {entry.hadNoMeetings ? 'N/A' : (entry.meetingScore !== null ? `${entry.meetingScore * 10}%` : 'N/A')}
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
        
        {/* Distractions Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h6" 
            sx={{ mb: 2, fontWeight: 'medium', fontFamily: 'Poppins', color: '#333' }}
          >
            What got in the way?
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {entry.distractions && entry.distractions.length > 0 ? (
              entry.distractions.map((distraction, index) => (
                <Chip 
                  key={index}
                  label={distraction} 
                  sx={{ 
                    fontFamily: 'Poppins',
                    bgcolor: '#e0e0e0',
                    color: '#333',
                    fontWeight: 'medium',
                    py: 0.5
                  }}
                />
              ))
            ) : (
              <Typography color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                No distractions recorded.
              </Typography>
            )}
          </Box>
        </Box>
        
        <Divider sx={{ my: 3 }} />
        
        {/* Support Needed Section */}
        <Box sx={{ mb: 4 }}>
          <Typography 
            variant="h6" 
            sx={{ mb: 2, fontWeight: 'medium', fontFamily: 'Poppins', color: '#333' }}
          >
            Support Needed
          </Typography>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              borderColor: '#e0e0e0',
              bgcolor: '#fafafa'
            }}
          >
            <Typography sx={{ fontFamily: 'Poppins', color: '#555', whiteSpace: 'pre-line' }}>
              {entry.supportNeeded || 'No support needs were recorded for this entry.'}
            </Typography>
          </Paper>
        </Box>
        
        {/* Improvement Plans Section */}
        <Box>
          <Typography 
            variant="h6" 
            sx={{ mb: 2, fontWeight: 'medium', fontFamily: 'Poppins', color: '#333' }}
          >
            Improvement Plans
          </Typography>
          
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              borderRadius: 2, 
              borderColor: '#e0e0e0',
              bgcolor: '#fafafa'
            }}
          >
            <Typography sx={{ fontFamily: 'Poppins', color: '#555', whiteSpace: 'pre-line' }}>
              {entry.improvementPlans || 'No improvement plans were recorded for this entry.'}
            </Typography>
          </Paper>
        </Box>
      </Paper>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={!isDeleting ? handleCancelDelete : undefined}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Delete this reflection entry?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This action cannot be undone. Are you sure you want to permanently delete this reflection entry?
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete} 
            disabled={isDeleting}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            autoFocus
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : undefined}
            sx={{ fontFamily: 'Poppins' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {saveError}
        </Alert>
      )}
    </Container>
  );
};

export default EntryDetail; 