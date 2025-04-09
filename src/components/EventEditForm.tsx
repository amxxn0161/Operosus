import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  InputAdornment,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Grid
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { CalendarEvent } from '../services/calendarService';
import { useCalendar } from '../contexts/CalendarContext';

interface EventEditFormProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EventEditForm: React.FC<EventEditFormProps> = ({
  event,
  open,
  onClose,
  onSave
}) => {
  const { updateEvent, isLoading, addAttendeesToEvent, removeAttendeesFromEvent } = useCalendar();
  
  // Form state
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [isAllDay, setIsAllDay] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Attendee state
  const [attendees, setAttendees] = useState<Array<{
    email: string;
    displayName?: string | null;
    responseStatus?: string;
    optional?: boolean;
  }>>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState<string>('');
  const [newAttendeeOptional, setNewAttendeeOptional] = useState<boolean>(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  
  // Initialize form with event data when event changes
  useEffect(() => {
    if (event) {
      // Initialize form with event data
      setTitle(event.summary || event.title || '');
      setDescription(event.description || '');
      setLocation(event.location || '');
      setStartDateTime(new Date(event.start));
      setEndDateTime(new Date(event.end));
      setIsAllDay(event.isAllDay || false);
      
      // Initialize attendees if present
      if (event.attendees && event.attendees.length > 0) {
        // Filter out any attendees without email and map to ensure proper type
        const validAttendees = event.attendees
          .filter(att => att.email)
          .map(att => ({
            email: att.email!,  // Non-null assertion since we filtered
            displayName: att.displayName,
            responseStatus: att.responseStatus,
            optional: att.optional
          }));
        
        setAttendees(validAttendees);
      } else {
        setAttendees([]);
      }
    }
  }, [event]);
  
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };
  
  const handleAddAttendee = () => {
    setAttendeeError(null);
    
    // Validate email
    if (!validateEmail(newAttendeeEmail)) {
      setAttendeeError('Please enter a valid email address');
      return;
    }
    
    // Check if email already exists in attendees
    if (attendees.some(att => att.email === newAttendeeEmail)) {
      setAttendeeError('This email is already added as an attendee');
      return;
    }
    
    // Add new attendee to local state
    const newAttendee = {
      email: newAttendeeEmail,
      optional: newAttendeeOptional,
      responseStatus: 'needsAction'
    };
    
    setAttendees([...attendees, newAttendee]);
    
    // Reset input field
    setNewAttendeeEmail('');
    setNewAttendeeOptional(false);
    
    // If we have an event ID, also add to the server
    if (event?.id) {
      addAttendeesToEvent(event.id, [newAttendee])
        .catch(error => {
          console.error('Error adding attendee:', error);
          setAttendeeError('Failed to add attendee. The changes will be saved when you submit the form.');
        });
    }
  };
  
  const handleRemoveAttendee = (email: string) => {
    // Remove from local state
    setAttendees(attendees.filter(att => att.email !== email));
    
    // If we have an event ID, also remove from the server
    if (event?.id) {
      removeAttendeesFromEvent(event.id, [email])
        .catch(error => {
          console.error('Error removing attendee:', error);
          setAttendeeError('Failed to remove attendee. The changes will be saved when you submit the form.');
        });
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    // Validate form
    if (!title.trim()) {
      setFormError('Title is required');
      return;
    }
    
    if (!startDateTime || !endDateTime) {
      setFormError('Start and end dates are required');
      return;
    }
    
    if (startDateTime > endDateTime) {
      setFormError('End date must be after start date');
      return;
    }
    
    try {
      if (event) {
        // Log the event ID to confirm we're updating the correct event
        console.log(`Updating event with ID: ${event.id}`);
        
        // Update existing event
        await updateEvent(event.id, {
          title,
          summary: title, // Ensure both title and summary are set
          description,
          location,
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
          isAllDay,
          attendees, // Include the updated attendees list
        });
        
        console.log(`Successfully updated event with ID: ${event.id}`);
        
        // Call onSave callback to refresh data
        onSave();
        
        // Close the form
        onClose();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setFormError('Failed to save event. Please try again.');
    }
  };
  
  // Format response status for display
  const getResponseStatusLabel = (status?: string): string => {
    if (!status) return 'Pending';
    
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      case 'tentative': return 'Maybe';
      case 'needsAction': return 'Pending';
      default: return status;
    }
  };
  
  // Get color for response status
  const getResponseStatusColor = (status?: string): string => {
    if (!status) return 'default';
    
    switch (status) {
      case 'accepted': return 'success';
      case 'declined': return 'error';
      case 'tentative': return 'warning';
      case 'needsAction': return 'default';
      default: return 'default';
    }
  };
  
  return (
    <Dialog 
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="edit-event-dialog-title"
    >
      <DialogTitle id="edit-event-dialog-title">
        Edit Event
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {formError && (
            <Typography color="error" variant="body2" sx={{ mb: 2 }}>
              {formError}
            </Typography>
          )}
          
          <TextField
            label="Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            label="Location"
            fullWidth
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            margin="normal"
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
              />
            }
            label="All day event"
          />
          
          <Box sx={{ mt: 2, mb: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DateTimePicker
                label="Start Date & Time"
                value={startDateTime}
                onChange={(newValue) => setStartDateTime(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
                disablePast
              />
              
              <DateTimePicker
                label="End Date & Time"
                value={endDateTime}
                onChange={(newValue) => setEndDateTime(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
                disablePast
                minDateTime={startDateTime || undefined}
              />
            </LocalizationProvider>
          </Box>
          
          <TextField
            label="Description"
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="normal"
            multiline
            rows={4}
          />
          
          {/* Attendees Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Attendees
            </Typography>
            
            {/* Add Attendee Form */}
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={7}>
                <TextField
                  label="Email"
                  fullWidth
                  value={newAttendeeEmail}
                  onChange={(e) => setNewAttendeeEmail(e.target.value)}
                  error={!!attendeeError}
                  helperText={attendeeError}
                  placeholder="example@email.com"
                  size="small"
                />
              </Grid>
              <Grid item xs={3}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={newAttendeeOptional}
                      onChange={(e) => setNewAttendeeOptional(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Optional"
                />
              </Grid>
              <Grid item xs={2}>
                <Button 
                  variant="outlined"
                  color="primary"
                  onClick={handleAddAttendee}
                  disabled={!newAttendeeEmail.trim()}
                  startIcon={<PersonAddIcon />}
                  size="small"
                  fullWidth
                >
                  Add
                </Button>
              </Grid>
            </Grid>
            
            {/* Attendee List */}
            {attendees.length > 0 ? (
              <Paper variant="outlined" sx={{ mt: 2, p: 1, maxHeight: '180px', overflow: 'auto' }}>
                <List dense disablePadding>
                  {attendees.map((attendee, index) => (
                    <ListItem 
                      key={attendee.email}
                      secondaryAction={
                        <IconButton 
                          edge="end" 
                          aria-label="delete" 
                          onClick={() => handleRemoveAttendee(attendee.email || '')}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                      divider={index < attendees.length - 1}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{attendee.email}</Typography>
                            {attendee.optional && (
                              <Chip size="small" variant="outlined" label="Optional" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Chip 
                            size="small"
                            label={getResponseStatusLabel(attendee.responseStatus)}
                            color={getResponseStatusColor(attendee.responseStatus) as any}
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                No attendees added yet
              </Typography>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} color="primary">
            Cancel
          </Button>
          <Button 
            type="submit" 
            color="primary" 
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Save'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EventEditForm; 