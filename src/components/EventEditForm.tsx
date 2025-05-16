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
  Grid,
  useMediaQuery,
  useTheme,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
  
  // Recurring event state
  const [isRecurringEvent, setIsRecurringEvent] = useState<boolean>(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState<boolean>(false);
  const [recurringEventScope, setRecurringEventScope] = useState<'single' | 'all'>('single');
  const [eventData, setEventData] = useState<any>(null);
  
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
      
      // Check if this is a recurring event
      const isRecurring = Boolean(event.recurringEventId) || 
                         (Array.isArray(event.recurrence) && event.recurrence && event.recurrence.length > 0);
      setIsRecurringEvent(isRecurring);
      
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
    
    if (event) {
      // Prepare event data for updating
      const eventUpdateData = {
        title,
        summary: title, // Ensure both title and summary are set
        description,
        location,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        isAllDay,
        attendees, // Include the updated attendees list
      };
      
      // Store event data for use in recurring dialog
      setEventData(eventUpdateData);
      
      // Check if this is a recurring event
      if (isRecurringEvent) {
        // Open the recurring event dialog
        setRecurringDialogOpen(true);
      } else {
        // Proceed with regular update
        await updateEventWithData(event.id, eventUpdateData);
      }
    }
  };
  
  // Separate function to update event with data
  const updateEventWithData = async (eventId: string, data: any) => {
    try {
      console.log(`Updating event with ID: ${eventId}`);
      console.log('Update scope:', recurringEventScope);
      console.log('Event data:', data);
      
      // Update the event, passing the scope parameter for recurring events
      await updateEvent(eventId, {
        ...data,
        // Pass the recurring event scope if applicable
        ...(isRecurringEvent && { responseScope: recurringEventScope })
      });
      
      console.log(`Successfully updated event with ID: ${eventId}`);
      
      // Call onSave callback to refresh data
      onSave();
      
      // Close the recurring dialog if open
      setRecurringDialogOpen(false);
      
      // Close the form
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      setFormError('Failed to save event. Please try again.');
      setRecurringDialogOpen(false);
    }
  };
  
  // Handle recurring event dialog close
  const handleRecurringDialogClose = () => {
    setRecurringDialogOpen(false);
  };
  
  // Handle recurring event scope change
  const handleRecurringScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRecurringEventScope(e.target.value as 'single' | 'all');
  };
  
  // Handle recurring event update confirmation
  const handleRecurringConfirm = () => {
    if (event && eventData) {
      updateEventWithData(event.id, eventData);
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
    <>
      <Dialog 
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        fullScreen={isMobile}
        aria-labelledby="edit-event-dialog-title"
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
            overflow: 'visible',
            maxHeight: isMobile ? '100vh' : '95vh', // Full height on mobile
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle 
          id="edit-event-dialog-title"
          sx={{ 
            p: isMobile ? 1.5 : 2,
            backgroundColor: 'rgba(198, 232, 242, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          Edit Event
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={onClose} 
            aria-label="close"
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent 
          sx={{ 
            p: isMobile ? 1.5 : 2, 
            overflowX: 'hidden',
            flexGrow: 1
          }}
        >
          <form id="event-edit-form" onSubmit={handleSubmit}>
            <Grid container spacing={2} sx={{ mb: 1 }}>
              <Grid item xs={12}>
                <TextField
                  required
                  autoFocus
                  margin="dense"
                  id="title"
                  label="Title"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  id="location"
                  label="Location"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                    />
                  }
                  label="All day event"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="Start Date & Time"
                    value={startDateTime}
                    onChange={(newDateTime) => setStartDateTime(newDateTime)}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true,
                        variant: 'outlined',
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DateTimePicker
                    label="End Date & Time"
                    value={endDateTime}
                    onChange={(newDateTime) => setEndDateTime(newDateTime)}
                    slotProps={{
                      textField: {
                        required: true,
                        fullWidth: true,
                        variant: 'outlined',
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  margin="dense"
                  id="description"
                  label="Description"
                  multiline
                  rows={4}
                  fullWidth
                  variant="outlined"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Grid>
              
              {/* Attendees section */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Attendees
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                  <TextField
                    id="attendee-email"
                    label="Attendee Email"
                    type="email"
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    error={!!attendeeError}
                    helperText={attendeeError}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddAttendee();
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="add attendee"
                            onClick={handleAddAttendee}
                            edge="end"
                          >
                            <PersonAddIcon />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newAttendeeOptional}
                      onChange={(e) => setNewAttendeeOptional(e.target.checked)}
                      size="small"
                    />
                  }
                  label="Optional attendee"
                />
                
                {attendees.length > 0 && (
                  <Paper variant="outlined" sx={{ mt: 2, p: 1 }}>
                    <List dense>
                      {attendees.map((attendee, index) => (
                        <ListItem
                          key={attendee.email + index}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              aria-label="delete" 
                              onClick={() => handleRemoveAttendee(attendee.email)}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={attendee.email}
                            secondary={
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <Chip 
                                  label={getResponseStatusLabel(attendee.responseStatus)}
                                  size="small"
                                  color={getResponseStatusColor(attendee.responseStatus) as any}
                                  sx={{ mr: 1 }}
                                />
                                {attendee.optional && (
                                  <Chip 
                                    label="Optional" 
                                    size="small" 
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Grid>
            </Grid>
            
            {formError && (
              <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                {formError}
              </Typography>
            )}
          </form>
        </DialogContent>
        
        <DialogActions sx={{ p: isMobile ? 1.5 : 2, bgcolor: 'background.default' }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button 
            type="submit"
            form="event-edit-form"
            variant="contained" 
            color="primary"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Recurring Event Dialog */}
      <Dialog
        open={recurringDialogOpen}
        onClose={handleRecurringDialogClose}
        aria-labelledby="recurring-event-dialog-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="recurring-event-dialog-title">
          Edit Recurring Event
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            This is a recurring event. Would you like to edit just this instance or all instances of this event?
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="recurring-event-scope"
              name="recurring-event-scope"
              value={recurringEventScope}
              onChange={handleRecurringScopeChange}
            >
              <FormControlLabel value="single" control={<Radio />} label="Edit only this instance" />
              <FormControlLabel value="all" control={<Radio />} label="Edit all instances" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRecurringDialogClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleRecurringConfirm} color="primary" variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EventEditForm;