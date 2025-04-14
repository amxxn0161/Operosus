import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  FormHelperText,
  Alert,
  Chip,
  Paper,
  useMediaQuery,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { CalendarEvent } from '../services/calendarService';
import { useCalendar } from '../contexts/CalendarContext';

// Add interface for attendee type
interface Attendee {
  email: string;
  optional?: boolean;
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
}

interface EventCreationModalProps {
  open: boolean;
  onClose: () => void;
  selectedDate: Date;
  selectedTime?: { hour: number; minute: number };
}

const EventCreationModal: React.FC<EventCreationModalProps> = ({
  open,
  onClose,
  selectedDate,
  selectedTime
}) => {
  const { addEvent } = useCalendar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Calculate initial start and end times based on the selected time or default to current hour
  const getInitialStartTime = (): Date => {
    const date = new Date(selectedDate);
    if (selectedTime) {
      date.setHours(selectedTime.hour, selectedTime.minute, 0, 0);
    } else {
      // Default to current hour rounded to nearest half hour
      const now = new Date();
      const minutes = Math.ceil(now.getMinutes() / 30) * 30;
      date.setHours(now.getHours(), minutes === 60 ? 0 : minutes, 0, 0);
      if (minutes === 60) {
        date.setHours(date.getHours() + 1);
      }
    }
    return date;
  };
  
  const getInitialEndTime = (startTime: Date): Date => {
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1);
    return endTime;
  };
  
  const initialStart = getInitialStartTime();
  const initialEnd = getInitialEndTime(initialStart);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('default');
  const [startDate, setStartDate] = useState(format(initialStart, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(initialStart, 'HH:mm'));
  const [endDate, setEndDate] = useState(format(initialEnd, 'yyyy-MM-dd'));
  const [endTime, setEndTime] = useState(format(initialEnd, 'HH:mm'));
  const [isAllDay, setIsAllDay] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(true);
  const [autoDeclineMeetings, setAutoDeclineMeetings] = useState(true);
  const [addGoogleMeet, setAddGoogleMeet] = useState(false);
  
  // New attendees state
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeOptional, setNewAttendeeOptional] = useState(false);
  const [attendeeError, setAttendeeError] = useState<string | null>(null);
  
  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!startDate) {
      newErrors.startDate = 'Start date is required';
    }
    
    if (!isAllDay && !startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!endDate) {
      newErrors.endDate = 'End date is required';
    }
    
    if (!isAllDay && !endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    // Validate that end date/time is after start date/time
    if (startDate && endDate) {
      const start = new Date(`${startDate}T${isAllDay ? '00:00' : startTime}`);
      const end = new Date(`${endDate}T${isAllDay ? '23:59' : endTime}`);
      
      if (end < start) {
        newErrors.endDate = 'End date/time must be after start date/time';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to validate and add an attendee
  const addAttendee = () => {
    // Reset error
    setAttendeeError(null);
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newAttendeeEmail)) {
      setAttendeeError('Please enter a valid email address');
      return;
    }
    
    // Check if email already exists in attendees
    if (attendees.some(attendee => attendee.email === newAttendeeEmail)) {
      setAttendeeError('This email has already been added');
      return;
    }
    
    // Add new attendee
    const newAttendee: Attendee = {
      email: newAttendeeEmail,
      responseStatus: 'needsAction',
      optional: newAttendeeOptional
    };
    
    setAttendees([...attendees, newAttendee]);
    
    // Reset input fields
    setNewAttendeeEmail('');
    setNewAttendeeOptional(false);
  };
  
  // Function to remove an attendee
  const removeAttendee = (email: string) => {
    setAttendees(attendees.filter(attendee => attendee.email !== email));
  };

  const handleSubmit = async () => {
    // Clear any previous API errors
    setApiError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare start and end dates
      const startDateTime = new Date(`${startDate}T${isAllDay ? '00:00:00' : startTime}`);
      const endDateTime = new Date(`${endDate}T${isAllDay ? '23:59:59' : endTime}`);
      
      // Log the attendees before creating the event object
      console.log(`About to create event with ${attendees.length} attendees:`, 
        JSON.stringify(attendees, null, 2));
      
      // Create base event object
      const newEvent: any = {
        title,
        summary: title, // Ensure summary is set for Google Calendar
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
      };
      
      // Only add optional fields if they have values
      if (description) newEvent.description = description;
      if (location) newEvent.location = location;
      
      // For all events, explicitly set isAllDay property
      newEvent.isAllDay = isAllDay;
      
      // Add attendees if there are any - ensure it's always an array
      newEvent.attendees = attendees.length > 0 ? [...attendees] : [];
      
      // Handle special event types
      if (eventType === 'outOfOffice') {
        // Force Out of Office events to be all-day
        newEvent.isAllDay = true;
        
        // Set the eventType field to outOfOffice
        newEvent.eventType = 'outOfOffice';
        
        // Set out of office properties with correct enum value
        newEvent.outOfOfficeProperties = {
          autoDeclineMode: "DECLINE_ALL",
        };
        
        // Only add declineMessage if description exists
        if (description) {
          newEvent.outOfOfficeProperties.declineMessage = description;
        }
        
        // Remove transparency property - it's set automatically by the backend
      } else if (eventType === 'focusTime') {
        // Set the eventType field to focusTime
        newEvent.eventType = 'focusTime';
        
        // Add focus time properties with values based on user selections
        newEvent.focusTimeProperties = {};
        
        // Only set chatStatus to doNotDisturb if the checkbox is checked
        if (doNotDisturb) {
          newEvent.focusTimeProperties.chatStatus = "doNotDisturb";
        }
        
        // Only set autoDeclineMode if the checkbox is checked
        if (autoDeclineMeetings) {
          newEvent.focusTimeProperties.autoDeclineMode = "declineOnlyNewConflictingInvitations";
        }
        
        // Add decline message if description exists
        if (description) {
          newEvent.focusTimeProperties.declineMessage = description;
        } else if (autoDeclineMeetings) {
          // Add a default decline message if auto-decline is enabled but no description
          newEvent.focusTimeProperties.declineMessage = "Declined because I am in focus time.";
        }
        
        // Ensure we're using dateTime format for Focus Time events
        const startDateTime = new Date(`${startDate}T${isAllDay ? '00:00:00' : startTime}`);
        const endDateTime = new Date(`${endDate}T${isAllDay ? '23:59:59' : endTime}`);
        
        // Override the start and end format
        newEvent.start = startDateTime.toISOString();
        newEvent.end = endDateTime.toISOString();
      } else if (eventType === 'workingLocation') {
        // Set the eventType field to workingLocation
        newEvent.eventType = 'workingLocation';
        
        // Add working location properties
        newEvent.workingLocationProperties = {
          type: 'custom',
        };
        
        // Only add customLocation if location exists
        if (location) {
          newEvent.workingLocationProperties.customLocation = location;
        }
      } else {
        // For regular events, just set the colorId
        newEvent.colorId = eventType;
      }
      
      console.log('Creating new event with properties:', JSON.stringify(newEvent, null, 2));
      
      // Add event using context function (which handles API call)
      try {
        // Pass the addGoogleMeet parameter to tell the backend to create a Google Meet link
        await addEvent(newEvent, addGoogleMeet);
        // Close modal and reset form
        handleClose();
      } catch (apiError: any) {
        console.error('API Error creating event:', apiError);
        // Get more detailed error message
        let errorMessage = 'Failed to create event. Please try again.';
        
        if (apiError.message) {
          errorMessage = apiError.message;
        }
        
        // Special handling for 500 errors
        if (apiError.status === 500 || errorMessage.includes('500')) {
          if (eventType === 'outOfOffice') {
            errorMessage = 'Server error creating Out of Office event. The Google Calendar API may be unavailable or the event format is incorrect.';
          } else {
            errorMessage = 'Server error creating event. The calendar API may be temporarily unavailable.';
          }
        }
        
        setApiError(errorMessage);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setApiError(error instanceof Error ? error.message : 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form state
    setTitle('');
    setDescription('');
    setLocation('');
    setEventType('default');
    setIsAllDay(false);
    setDoNotDisturb(true);
    setAutoDeclineMeetings(true);
    setAddGoogleMeet(false);
    setErrors({});
    setApiError(null);
    setAttendees([]);
    setNewAttendeeEmail('');
    setNewAttendeeOptional(false);
    setAttendeeError(null);
    
    // Call onClose prop
    onClose();
  };

  // Handle automatic all-day selection for Out of Office
  const handleEventTypeChange = (newType: string) => {
    setEventType(newType);
    
    // When selecting Out of Office
    if (newType === 'outOfOffice') {
      // Automatically check the All Day box
      setIsAllDay(true);
      
      // Auto-fill the title with "Out of Office"
      setTitle('Out of Office');
      
      // If no description is set, provide a default decline message
      if (!description) {
        setDescription('I am out of office');
      }
    }
    // When selecting Focus Time
    else if (newType === 'focusTime') {
      // Auto-fill the title if empty
      if (!title) {
        setTitle('Focus Time');
      }
      
      // Set default values for Focus Time options
      setDoNotDisturb(true);
      setAutoDeclineMeetings(true);
    }
  };
  
  // For Out of Office events, show a clearer explanation
  const renderEventTypeDescription = () => {
    if (eventType === 'outOfOffice') {
      return (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          Out of Office events will automatically decline meeting invitations while you're away.
          The message above will be sent to anyone whose invitation is declined.
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Uses DECLINE_ALL mode to reject all meeting invitations.
          </Typography>
        </Alert>
      );
    } else if (eventType === 'focusTime') {
      return (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          Focus Time events help you block time for deep work without interruptions.
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            You can choose whether to enable Do Not Disturb for chat notifications and whether to automatically decline new meeting invitations during this time.
          </Typography>
        </Alert>
      );
    } else if (eventType === 'workingLocation') {
      return (
        <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
          Working Location events help you indicate where you're working from.
        </Alert>
      );
    }
    return null;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          overflow: 'visible',
          maxHeight: isMobile ? '100vh' : '95vh' // Full height on mobile
        }
      }}
    >
      <DialogTitle sx={{ 
        p: isMobile ? 1.5 : 2, 
        backgroundColor: 'rgba(198, 232, 242, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        position: 'relative',
        zIndex: 1
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins', color: '#071C73' }}>
          Add Event
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ 
        p: isMobile ? 2 : 3, 
        pt: isMobile ? 2 : 3,
        mt: 0.5,
        position: 'relative',
        zIndex: 0,
        overflowY: 'auto', // Enable vertical scrolling if needed
        '& .MuiFormHelperText-root': {
          marginTop: '4px', // Reduce the margin above helper text
          position: 'static' // Ensure helper text doesn't float
        }
      }}>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        
        <Box component="form" sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: isMobile ? 2 : 3 // Smaller gap on mobile
        }}>
          <TextField
            label="Event Title"
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={!!errors.title}
            helperText={errors.title}
            variant="outlined"
            autoFocus
            required
            InputLabelProps={{ 
              shrink: true,
              required: true
            }}
            sx={{
              '& .MuiFormLabel-asterisk': {
                color: '#d32f2f' // Make asterisk red
              },
              '& .MuiInputLabel-root': {
                position: 'relative',
                transform: 'none',
                marginBottom: '8px'
              },
              '& .MuiFormHelperText-root': {
                marginLeft: 0 // Align error message with field
              }
            }}
          />
          
          <Box sx={{ 
            display: 'flex', 
            gap: isMobile ? 1 : 2, 
            alignItems: 'flex-start',
            flexWrap: 'wrap', // Allow wrapping on small screens
            flexDirection: isMobile ? 'column' : 'row' // Stack vertically on mobile
          }}>
            <FormControlLabel
              control={
                <Checkbox 
                  checked={isAllDay} 
                  onChange={(e) => setIsAllDay(e.target.checked)} 
                  disabled={eventType === 'outOfOffice'} // Disable checkbox for Out of Office
                />
              }
              label="All Day"
              sx={{ ml: 0 }}
            />
            
            <FormControl sx={{ minWidth: isMobile ? '100%' : 150, flexGrow: 1 }}>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={eventType}
                label="Event Type"
                onChange={(e) => handleEventTypeChange(e.target.value)}
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="outOfOffice">Out of Office</MenuItem>
                <MenuItem value="focusTime">Focus Time</MenuItem>
                <MenuItem value="workingLocation">Working Location</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: isMobile ? 1 : 2,
            flexWrap: 'wrap', // Allow wrapping on small screens
            flexDirection: isMobile ? 'column' : 'row' // Stack vertically on mobile
          }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              error={!!errors.startDate}
              helperText={errors.startDate}
              InputLabelProps={{ 
                shrink: true,
                required: true
              }}
              sx={{
                flexGrow: 1,
                minWidth: isMobile ? '100%' : '200px',
                '& .MuiFormLabel-asterisk': {
                  color: '#d32f2f'
                },
                '& .MuiFormHelperText-root': {
                  marginLeft: 0
                }
              }}
              required
            />
            
            {!isAllDay && (
              <TextField
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                error={!!errors.startTime}
                helperText={errors.startTime}
                InputLabelProps={{ 
                  shrink: true,
                  required: true
                }}
                sx={{
                  flexGrow: 1,
                  minWidth: isMobile ? '100%' : '150px',
                  '& .MuiFormLabel-asterisk': {
                    color: '#d32f2f'
                  },
                  '& .MuiFormHelperText-root': {
                    marginLeft: 0
                  }
                }}
                required
              />
            )}
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            gap: isMobile ? 1 : 2,
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row' // Stack vertically on mobile
          }}>
            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={!!errors.endDate}
              helperText={errors.endDate}
              InputLabelProps={{ 
                shrink: true,
                required: true
              }}
              sx={{
                flexGrow: 1,
                minWidth: isMobile ? '100%' : '200px',
                '& .MuiFormLabel-asterisk': {
                  color: '#d32f2f'
                },
                '& .MuiFormHelperText-root': {
                  marginLeft: 0
                }
              }}
              required
            />
            
            {!isAllDay && (
              <TextField
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                error={!!errors.endTime}
                helperText={errors.endTime}
                InputLabelProps={{ 
                  shrink: true,
                  required: true
                }}
                sx={{
                  flexGrow: 1,
                  minWidth: isMobile ? '100%' : '150px',
                  '& .MuiFormLabel-asterisk': {
                    color: '#d32f2f'
                  },
                  '& .MuiFormHelperText-root': {
                    marginLeft: 0
                  }
                }}
                required
              />
            )}
          </Box>
          
          <TextField
            label="Location"
            fullWidth
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />
          
          <TextField
            label={eventType === 'outOfOffice' ? 'Auto-decline Message' : 'Description'}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            variant="outlined"
            multiline
            rows={3}
            InputLabelProps={{ shrink: true }}
            placeholder={eventType === 'outOfOffice' ? 'I am out of office' : 'Add details about this event'}
          />
          
          {/* Attendees section */}
          {eventType !== 'outOfOffice' && eventType !== 'focusTime' && eventType !== 'workingLocation' && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Attendees
              </Typography>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: 2
              }}>
                {/* Add attendee form */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap'
                }}>
                  <TextField
                    label="Email"
                    placeholder="Enter attendee email"
                    value={newAttendeeEmail}
                    onChange={(e) => setNewAttendeeEmail(e.target.value)}
                    error={!!attendeeError}
                    helperText={attendeeError}
                    sx={{ flexGrow: 1 }}
                  />
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={newAttendeeOptional} 
                        onChange={(e) => setNewAttendeeOptional(e.target.checked)} 
                      />
                    }
                    label="Optional"
                  />
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={addAttendee}
                    sx={{ 
                      minWidth: 'auto',
                      height: '40px'
                    }}
                    disabled={!newAttendeeEmail.trim()}
                  >
                    Add
                  </Button>
                </Box>
                
                {/* Google Meet option */}
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={addGoogleMeet} 
                      onChange={(e) => setAddGoogleMeet(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body2">Add Google Meet video conferencing</Typography>
                    </Box>
                  }
                />
                
                {/* Attendees list */}
                {attendees.length > 0 && (
                  <Paper 
                    variant="outlined" 
                    sx={{ 
                      p: 2, 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: 1,
                      backgroundColor: 'rgba(1, 108, 158, 0.05)'
                    }}
                  >
                    {attendees.map((attendee) => (
                      <Box 
                        key={attendee.email}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          p: 1,
                          borderRadius: '4px',
                          backgroundColor: 'white'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography>{attendee.email}</Typography>
                          {attendee.optional && (
                            <Chip 
                              label="Optional" 
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                        <IconButton 
                          size="small"
                          onClick={() => removeAttendee(attendee.email)}
                          sx={{ color: '#d32f2f' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Box>
            </Box>
          )}
          
          {/* Focus Time specific options */}
          {eventType === 'focusTime' && (
            <Box sx={{ mt: -1, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={doNotDisturb}
                    onChange={(e) => setDoNotDisturb(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Do Not Disturb</Typography>
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      Mute chat notifications
                    </Typography>
                  </Box>
                }
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoDeclineMeetings}
                    onChange={(e) => setAutoDeclineMeetings(e.target.checked)}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Automatically decline meetings</Typography>
                  </Box>
                }
              />
            </Box>
          )}
          
          {renderEventTypeDescription()}
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            <Typography component="span" color="error" sx={{ fontWeight: 'bold' }}>*</Typography> Required fields
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: isMobile ? 1.5 : 2, justifyContent: 'flex-end', gap: 1 }}>
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{ borderRadius: 1, px: 3 }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          sx={{ 
            borderRadius: 1, 
            bgcolor: '#016C9E', 
            '&:hover': { bgcolor: '#015C8E' },
            color: 'white',
            fontWeight: 'bold',
            px: 3
          }}
        >
          {isSubmitting ? 'Saving...' : 'Add Event'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventCreationModal; 