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
  InputAdornment
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import CloseIcon from '@mui/icons-material/Close';
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
  const { updateEvent, isLoading } = useCalendar();
  
  // Form state
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [startDateTime, setStartDateTime] = useState<Date | null>(null);
  const [endDateTime, setEndDateTime] = useState<Date | null>(null);
  const [isAllDay, setIsAllDay] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
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
    }
  }, [event]);
  
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
          isAllDay
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