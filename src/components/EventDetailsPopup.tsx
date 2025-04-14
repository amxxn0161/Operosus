import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Divider,
  Button,
  Avatar,
  Tooltip,
  Popover,
  ToggleButtonGroup,
  ToggleButton,
  Link,
  Menu,
  MenuItem,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VideocamIcon from '@mui/icons-material/Videocam';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { CalendarEvent, respondToEventInvitation } from '../services/calendarService';
import { format } from 'date-fns';
import EventEditForm from './EventEditForm';
import { useCalendar } from '../contexts/CalendarContext';

interface Guest {
  name: string;
  response: string;
  avatar: string;
  location: string;
  email?: string;
  isOrganizer?: boolean;
  isSelf?: boolean;
}

interface EventDetailsPopupProps {
  event: CalendarEvent | null;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => void;
}

const EventDetailsPopup: React.FC<EventDetailsPopupProps> = ({
  event,
  anchorEl,
  onClose,
  onEdit,
  onDelete
}) => {
  const { fetchEvents } = useCalendar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [rsvpStatus, setRsvpStatus] = useState<string>('Yes');
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [noteDialogOpen, setNoteDialogOpen] = useState<boolean>(false);
  const [responseNote, setResponseNote] = useState<string>('');
  const [recurringDialogOpen, setRecurringDialogOpen] = useState<boolean>(false);
  const [responseScope, setResponseScope] = useState<'single' | 'following' | 'all'>('single');
  const [rsvpMenuAnchorEl, setRsvpMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [recurringDialogMode, setRecurringDialogMode] = useState<'rsvp' | 'note'>('rsvp');
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditClick = () => {
    handleMenuClose();
    setIsEditFormOpen(true);
  };
  
  const handleDeleteClick = () => {
    handleMenuClose();
    if (event && onDelete) {
      onDelete(event);
    }
    onClose();
  };
  
  const handleEditFormClose = () => {
    setIsEditFormOpen(false);
  };
  
  const handleEditFormSave = () => {
    // This function will be called after successful edit
    // We'll refresh the calendar data
    fetchEvents();
  };

  // Map UI response values to API values
  const mapRsvpToApiResponse = (status: string): 'accepted' | 'declined' | 'tentative' => {
    // Extract the base response (Yes, No, Maybe) from enhanced status options
    const baseStatus = status.split(',')[0].trim();
    
    switch (baseStatus) {
      case 'Yes':
        return 'accepted';
      case 'No':
        return 'declined';
      case 'Maybe':
        return 'tentative';
      default:
        return 'accepted';
    }
  };
  
  // The main RSVP change function used with both toggle buttons and menu items
  const handleRsvpChange = (newStatus: string) => {
    setRsvpStatus(newStatus);
    setRsvpMenuAnchorEl(null);
  };
  
  // Specialized handler for ToggleButtonGroup which has a different signature
  const handleRsvpToggleChange = (
    _event: React.MouseEvent<HTMLElement> | null,
    newStatus: string,
  ) => {
    if (newStatus !== null) {
      setRsvpStatus(newStatus);
    }
  };
  
  // Open RSVP menu
  const handleRsvpMenuOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setRsvpMenuAnchorEl(event.currentTarget);
  };
  
  // Close RSVP menu
  const handleRsvpMenuClose = () => {
    setRsvpMenuAnchorEl(null);
  };
  
  // Open note dialog when clicking Update button
  const handleOpenNoteDialog = () => {
    // Check if this is a focus time event
    if (event?.eventType === 'focusTime') {
      console.error('Cannot RSVP to a focus time event');
      setSnackbarMessage('Focus time events cannot have attendees or responses');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setResponseNote(''); // Reset note field
    setRecurringDialogMode('rsvp'); // Set dialog mode to RSVP
    
    // Only show the recurring dialog if this is truly a recurring event
    // Check for both recurringEventId (event instance) and recurrence (master event)
    const isRecurringEvent = Boolean(event?.recurringEventId) || 
                            (Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0);
    
    console.log('Event recurring status check:', {
      isRecurringEvent,
      hasRecurringEventId: Boolean(event?.recurringEventId),
      hasRecurrence: Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0,
      recurringEventId: event?.recurringEventId,
      recurrence: event?.recurrence
    });
    
    if (isRecurringEvent) {
      setRecurringDialogOpen(true);
    } else {
      setNoteDialogOpen(true);
    }
  };
  
  // Open note dialog directly without checking for recurring events
  const handleDirectNoteDialog = () => {
    // Check if this is a focus time event
    if (event?.eventType === 'focusTime') {
      console.error('Cannot add a note to a focus time event');
      setSnackbarMessage('Focus time events cannot have attendees or responses');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    setResponseNote(''); // Reset note field
    setRecurringDialogMode('note'); // Set dialog mode to note
    
    // Check if this is a recurring event, just like in handleOpenNoteDialog
    const isRecurringEvent = Boolean(event?.recurringEventId) || 
                            (Array.isArray(event?.recurrence) && event?.recurrence && event.recurrence.length > 0);
    
    if (isRecurringEvent) {
      setRecurringDialogOpen(true);
    } else {
      setNoteDialogOpen(true);
    }
  };
  
  // Close note dialog
  const handleCloseNoteDialog = () => {
    setNoteDialogOpen(false);
  };
  
  // Handle response scope selection for recurring events
  const handleRecurringScopeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResponseScope(e.target.value as 'single' | 'following' | 'all');
  };
  
  // Close recurring dialog
  const handleCloseRecurringDialog = () => {
    setRecurringDialogOpen(false);
  };
  
  // Open note dialog after selecting response scope
  const handleRecurringConfirm = () => {
    setRecurringDialogOpen(false);
    setNoteDialogOpen(true);
  };
  
  // Handle RSVP update submission
  const handleRsvp = async () => {
    if (!event || !event.id) {
      console.error('Cannot RSVP to event: No event ID available');
      setSnackbarMessage('Failed to update RSVP status: Missing event ID');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }
    
    // Check if this is a focus time event
    if (event.eventType === 'focusTime') {
      console.error('Cannot RSVP to a focus time event');
      setSnackbarMessage('Focus time events cannot have attendees or responses');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setNoteDialogOpen(false);
      return;
    }
    
    setNoteDialogOpen(false);
    
    try {
      const apiResponse = mapRsvpToApiResponse(rsvpStatus);
      
      // Pass the note and responseScope to the API
      const noteValue = responseNote.trim() || undefined;
      await respondToEventInvitation(event.id, apiResponse, noteValue, responseScope);
      
      setSnackbarMessage('RSVP status updated successfully');
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
      fetchEvents();
    } catch (error) {
      console.error('Error updating RSVP status:', error);
      
      // Parse the error message for better user feedback
      let errorMessage = 'Failed to update RSVP status';
      if (error instanceof Error) {
        // Check if it's a focus time error
        if (error.message.includes('focusTime') || error.message.includes('focus time')) {
          errorMessage = 'Focus time events cannot have attendees or responses';
        } else {
          // Try to extract a more specific error message
          const matchError = error.message.match(/"message":\s*"([^"]+)"/);
          if (matchError && matchError[1]) {
            errorMessage = matchError[1];
          }
        }
      }
      
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  // Initialize RSVP status based on current user's response
  useEffect(() => {
    if (event && event.attendees) {
      const selfAttendee = event.attendees.find(attendee => attendee.self);
      if (selfAttendee && selfAttendee.responseStatus) {
        switch (selfAttendee.responseStatus.toLowerCase()) {
          case 'accepted':
            setRsvpStatus('Yes');
            break;
          case 'declined':
            setRsvpStatus('No');
            break;
          case 'tentative':
            setRsvpStatus('Maybe');
            break;
          default:
            setRsvpStatus('Yes');
        }
      }
    }
  }, [event]);

  if (!event) return null;
  
  // Log the event data for debugging
  console.log('Rendering event details popup with data:', event);

  const eventStart = new Date(event.start);
  const eventEnd = new Date(event.end);
  
  const formatEventDate = () => {
    if (event.isAllDay) {
      return format(eventStart, 'EEEE, d MMMM');
    }
    return format(eventStart, 'EEEE, d MMMM');
  };
  
  const formatEventTime = () => {
    if (event.isAllDay) {
      return 'All day';
    }
    const startFormatted = format(eventStart, 'h:mm a');
    const endFormatted = format(eventEnd, 'h:mm a');
    return `${startFormatted} - ${endFormatted}`;
  };
  
  const formatRecurrence = () => {
    // Check both ways a recurring event could be identified
    const isRecurringEvent = Boolean(event.recurringEventId) || 
                             (Array.isArray(event.recurrence) && event.recurrence && event.recurrence.length > 0);
    
    if (isRecurringEvent) {
      // If it's a specific day of the week recurring event
      return 'Weekly on ' + format(eventStart, 'EEEE');
    }
    return '';
  };

  // Get Google Meet link from event data
  const getMeetLink = (): { url: string, label: string } | null => {
    // Check for hangoutLink first (direct Google Meet link)
    if (event.hangoutLink) {
      return {
        url: event.hangoutLink,
        label: event.hangoutLink.replace('https://', '')
      };
    }
    
    // Check conferenceData for Google Meet links
    if (event.conferenceData?.entryPoints) {
      // Find video entry point (Google Meet)
      const videoEntry = event.conferenceData.entryPoints.find(
        entry => entry.entryPointType === 'video'
      );
      
      if (videoEntry?.uri) {
        return {
          url: videoEntry.uri,
          label: videoEntry.label || videoEntry.uri.replace('https://', '')
        };
      }
    }
    
    // No Google Meet link found
    return null;
  };

  // Get phone details from conferenceData
  const getPhoneDetails = (): { number: string, pin: string | null } | null => {
    if (event.conferenceData?.entryPoints) {
      // Find phone entry point
      const phoneEntry = event.conferenceData.entryPoints.find(
        entry => entry.entryPointType === 'phone'
      );
      
      if (phoneEntry?.uri) {
        return {
          number: phoneEntry.label || phoneEntry.uri.replace('tel:', ''),
          pin: phoneEntry.pin ?? null
        };
      }
    }
    
    return null;
  };

  // Get the organizer name from the API data
  const getOrganizer = (): string => {
    // First try from the organizer field
    if (event.organizer) {
      if (event.organizer.displayName) {
        return event.organizer.displayName;
      }
      if (event.organizer.email) {
        // Extract name from email if no display name
        const emailName = event.organizer.email.split('@')[0];
        return emailName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
      }
    }
    
    // Try from creator field
    if (event.creator) {
      if (event.creator.displayName) {
        return event.creator.displayName;
      }
      if (event.creator.email) {
        // Extract name from email
        const emailName = event.creator.email.split('@')[0];
        return emailName.split('.').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
      }
    }
    
    // Default fallback
    return 'Organizer';
  };

  // Get guest list from attendees in API response
  const getGuestList = (): Guest[] => {
    const guests: Guest[] = [];
    
    // Check if we have attendees in the API response
    if (event.attendees && event.attendees.length > 0) {
      // Map API attendees to our Guest format
      event.attendees.forEach(attendee => {
        if (attendee.email) {
          let name = attendee.displayName || '';
          
          // If no display name, try to format from email
          if (!name && attendee.email) {
            const emailName = attendee.email.split('@')[0];
            name = emailName.split('.').map(part => 
              part.charAt(0).toUpperCase() + part.slice(1)
            ).join(' ');
          }
          
          // Determine response status
          let response = 'Invited';
          if (attendee.responseStatus) {
            switch (attendee.responseStatus.toLowerCase()) {
              case 'accepted':
                response = 'Going';
                break;
              case 'declined':
                response = 'No';
                break;
              case 'tentative':
                response = 'Maybe';
                break;
              case 'needsaction':
                response = 'Invited';
                break;
            }
          }
          
          // Determine if this is the organizer
          if (attendee.organizer) {
            response = 'Organiser';
          }
          
          // Determine if this is the current user
          const isSelf = attendee.self || 
                         (event.creator && attendee.email === event.creator.email);
          
          // Create the guest entry (no hardcoded locations)
          guests.push({
            name: name,
            response: response,
            avatar: name.charAt(0).toUpperCase(),
            location: '', // No hardcoded locations
            email: attendee.email,
            isOrganizer: attendee.organizer,
            isSelf: isSelf
          });
        }
      });
    }
    
    // If no attendees from the API, don't add any fake ones
    return guests;
  };
  
  const getAgendaItems = (): string[] => {
    // If event has a description with bullet points, use that
    if (event.description) {
      console.log('Parsing event description for agenda items:', event.description);
      // Look for bullet points or numbered items
      const bulletMatch = event.description.match(/(?:^|\n)[\s-]*([•\-*]\s[^\n]+)/g);
      if (bulletMatch && bulletMatch.length > 0) {
        return bulletMatch.map(item => item.trim());
      }
      
      const numberedMatch = event.description.match(/(?:^|\n)[\s-]*(\d+\.\s[^\n]+)/g);
      if (numberedMatch && numberedMatch.length > 0) {
        return numberedMatch.map(item => item.trim());
      }
      
      // If no bullet points but multiline description, format each line
      if (event.description.includes('\n')) {
        return event.description
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(item => {
            if (!item.startsWith('-') && !item.startsWith('•')) {
              return `- ${item}`;
            }
            return item;
          });
      }
      
      // Single line description
      if (event.description.trim().length > 0) {
        return [`- ${event.description.trim()}`];
      }
    }
    
    // If no agenda items can be extracted from the description, return an empty array
    return [];
  };

  const meetLink = getMeetLink();
  const phoneDetails = getPhoneDetails();
  const guestList = getGuestList();
  const agendaItems = getAgendaItems();
  const organizer = getOrganizer();

  // Count of people who have accepted the invitation - actually count from the data
  const acceptedCount = guestList.filter(guest => 
    guest.response === 'Going' || guest.response === 'Accepted' || guest.response === 'Yes'
  ).length;

  // Check if this is a focus time event
  const isFocusTimeEvent = event.eventType === 'focusTime';

  // Check if the current user has declined this event
  const isDeclinedByCurrentUser = event.attendees?.some(attendee => 
    (attendee.self === true && attendee.responseStatus?.toLowerCase() === 'declined')
  );

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSnackbarMessage('Meeting link copied to clipboard');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        setSnackbarMessage('Failed to copy meeting link');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };

  return (
    <>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: { 
            width: isMobile ? '95vw' : 400, 
            maxHeight: isMobile ? '90vh' : '80vh',
            overflowY: 'auto',
            borderRadius: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Paper elevation={0}>
          {/* Header with close button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: isMobile ? 1.5 : 1 }}>
            <IconButton 
              size={isMobile ? "medium" : "small"} 
              onClick={onClose} 
              aria-label="close"
              sx={{ padding: isMobile ? 1 : 0.5 }} // Larger touch target on mobile
            >
              <CloseIcon fontSize={isMobile ? "medium" : "small"} />
            </IconButton>
          </Box>
          
          {/* Event title and color indicator */}
          <Box sx={{ 
            px: isMobile ? 2.5 : 3, 
            pt: 1, 
            pb: 2, 
            display: 'flex', 
            alignItems: 'flex-start' 
          }}>
            <Box 
              sx={{ 
                width: 12, 
                height: 12, 
                borderRadius: 1, 
                bgcolor: '#1A73E8', 
                mr: 2,
                mt: 0.5 
              }} 
            />
            <Typography 
              variant={isMobile ? "subtitle1" : "h6"} 
              sx={{ 
                fontWeight: 500, 
                flex: 1,
                textDecoration: isDeclinedByCurrentUser ? 'line-through' : 'none',
                opacity: isDeclinedByCurrentUser ? 0.6 : 1
              }}
            >
              {event.summary || event.title}
            </Typography>
            
            {/* More options menu */}
            <IconButton 
              size={isMobile ? "medium" : "small"} 
              sx={{ ml: 1, padding: isMobile ? 1 : 0.5 }} 
              onClick={handleMenuOpen}
            >
              <MoreVertIcon fontSize={isMobile ? "medium" : "small"} />
            </IconButton>
            <Menu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleEditClick} dense>
                <EditIcon fontSize="small" sx={{ mr: 1 }} />
                Edit event
              </MenuItem>
              <MenuItem onClick={handleDeleteClick} dense>
                <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                Delete event
              </MenuItem>
            </Menu>
          </Box>
          
          {/* Date and time */}
          <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
            {isDeclinedByCurrentUser && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#D32F2F', 
                  mb: 0.5, 
                  fontWeight: 'medium',
                  fontSize: isMobile ? '0.9rem' : '0.85rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ● Declined
              </Typography>
            )}
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
            >
              {formatEventDate()} · {formatEventTime()}
            </Typography>
            {formatRecurrence() && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
              >
                {formatRecurrence()}
              </Typography>
            )}
          </Box>
          
          {/* Google Meet section */}
          {meetLink && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Avatar 
                  src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png" 
                  alt="Google Meet"
                  sx={{ width: isMobile ? 24 : 20, height: isMobile ? 24 : 20, mr: 1 }}
                >
                  <VideocamIcon fontSize="small" />
                </Avatar>
                <Button 
                  variant="contained" 
                  href={meetLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    bgcolor: '#1A73E8', 
                    color: 'white',
                    '&:hover': { bgcolor: '#1557b0' },
                    textTransform: 'none',
                    px: 2,
                    py: isMobile ? 0.75 : 0.5,
                    fontSize: isMobile ? '0.9rem' : '0.85rem',
                    minHeight: isMobile ? '36px' : '32px'
                  }}
                >
                  Join with Google Meet
                </Button>
                <IconButton 
                  size={isMobile ? "medium" : "small"} 
                  sx={{ ml: 1 }}
                  onClick={() => copyToClipboard(meetLink.url)}
                >
                  <ContentCopyIcon fontSize={isMobile ? "medium" : "small"} />
                </IconButton>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  ml: 3, 
                  fontSize: isMobile ? '0.875rem' : '0.8rem',
                  wordBreak: 'break-all'
                }}
              >
                {meetLink.label}
              </Typography>
            </Box>
          )}
          
          {/* Phone details */}
          {phoneDetails && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <PhoneIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: '#1A73E8', 
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18 
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="primary" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: isMobile ? '0.9rem' : '0.85rem'
                  }}
                >
                  Join by phone
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  ml: 3, 
                  fontSize: isMobile ? '0.875rem' : '0.8rem' 
                }}
              >
                {phoneDetails.number}{phoneDetails.pin ? ` PIN: ${phoneDetails.pin}` : ''}
              </Typography>
            </Box>
          )}
          
          {/* Location if available */}
          {event.location && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                <LocationOnIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary', 
                    mt: 0.5,
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
                >
                  {event.location}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Guest details */}
          {guestList.length > 0 && (
            <Box sx={{ px: isMobile ? 2.5 : 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon 
                  fontSize={isMobile ? "small" : "small"} 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary',
                    width: isMobile ? 20 : 18, 
                    height: isMobile ? 20 : 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: isMobile ? '0.9rem' : '0.85rem' }}
                >
                  {guestList.length} {guestList.length === 1 ? 'guest' : 'guests'}
                </Typography>
              </Box>
              
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  ml: 3, 
                  mb: 1,
                  fontSize: '0.85rem'
                }}
              >
                {acceptedCount} yes 
                {guestList.some(g => g.location?.toLowerCase().includes('virtual')) && ' (1 virtually)'}
              </Typography>
              
              {guestList.map((guest, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', ml: 3, mb: 1 }}>
                  <Avatar sx={{ 
                    width: 24, 
                    height: 24, 
                    fontSize: '0.75rem', 
                    bgcolor: guest.isOrganizer ? '#4285F4' : 
                             guest.isSelf ? '#34A853' : 
                             '#F4B400'
                  }}>
                    {guest.avatar}
                  </Avatar>
                  <Box sx={{ ml: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {guest.name} 
                      {guest.isOrganizer && (
                        <Typography 
                          component="span" 
                          sx={{ 
                            fontSize: '0.7rem', 
                            color: 'gray', 
                            ml: 0.5, 
                            mt: '-2px' 
                          }}
                        >
                          •
                        </Typography>
                      )}
                    </Typography>
                    {guest.isOrganizer && (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Organiser
                      </Typography>
                    )}
                    <Typography 
                      variant="caption" 
                      display="block" 
                      color="text.secondary"
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {guest.location}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          
          {/* Agenda section - only display if there are actual agenda items */}
          {agendaItems.length > 0 && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  mb: 1,
                  fontSize: '0.85rem' 
                }}
              >
                Agenda
              </Typography>
              
              {agendaItems.map((item, index) => (
                <Typography 
                  key={index} 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 0.5,
                    fontSize: '0.85rem',
                    lineHeight: 1.4
                  }}
                >
                  {item}
                </Typography>
              ))}
            </Box>
          )}
          
          {/* Organizer section */}
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.85rem' }}
            >
              {organizer}
            </Typography>
          </Box>
          
          {/* RSVP section - hide for focus time events */}
          {!isFocusTimeEvent && (
            <>
              <Divider />
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mr: 2, 
                    fontSize: '0.85rem',
                    mb: isMobile ? 1.5 : 0,
                    alignSelf: isMobile ? 'flex-start' : 'center'
                  }}
                >
                  Going?
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  width: isMobile ? '100%' : 'auto'
                }}>
                  <ToggleButtonGroup
                    value={rsvpStatus}
                    exclusive
                    onChange={handleRsvpToggleChange}
                    size={isMobile ? "medium" : "small"}
                    sx={{
                      flexGrow: isMobile ? 1 : 0,
                      '& .MuiToggleButton-root': {
                        px: isMobile ? 2 : 1.5,
                        py: isMobile ? 0.75 : 0.5,
                        flex: isMobile ? '1 1 0' : 'none',
                        textTransform: 'none',
                        fontSize: '0.85rem',
                        '&.Mui-selected': {
                          bgcolor: '#E8F0FE',
                          color: '#1A73E8',
                          '&:hover': { bgcolor: '#D2E3FC' }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="Yes">Yes</ToggleButton>
                    <ToggleButton value="No">No</ToggleButton>
                    <ToggleButton value="Maybe">Maybe</ToggleButton>
                  </ToggleButtonGroup>
                  <Button 
                    variant="contained" 
                    size={isMobile ? "medium" : "small"} 
                    onClick={handleOpenNoteDialog}
                    sx={{ 
                      ml: 1, 
                      bgcolor: '#1A73E8', 
                      '&:hover': { bgcolor: '#1557b0' },
                      fontSize: isMobile ? '0.9rem' : '0.8rem',
                      textTransform: 'none',
                      minHeight: isMobile ? '40px' : '36px',
                      minWidth: isMobile ? '80px' : '64px'
                    }}
                  >
                    Update
                  </Button>
                </Box>
              </Box>
              
              {/* Add a note button */}
              <Box sx={{ px: isMobile ? 2.5 : 2, pb: isMobile ? 2.5 : 2, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="outlined" 
                  fullWidth
                  size={isMobile ? "medium" : "small"} 
                  onClick={handleDirectNoteDialog}
                  sx={{ 
                    textTransform: 'none',
                    fontSize: isMobile ? '0.9rem' : '0.85rem',
                    borderColor: '#dadce0',
                    color: '#3c4043',
                    minHeight: isMobile ? '40px' : '36px',
                    '&:hover': {
                      borderColor: '#d2d5d9',
                      bgcolor: 'rgba(60, 64, 67, 0.04)'
                    }
                  }}
                >
                  Add a note
                </Button>
              </Box>
            </>
          )}
          
          {/* Focus time message - only show for focus time events */}
          {isFocusTimeEvent && (
            <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ fontSize: '0.85rem' }}
              >
                This is a focus time event. You cannot add attendees or responses.
              </Typography>
            </Box>
          )}
        </Paper>
      </Popover>
      
      {/* Recurring Event Dialog */}
      <Dialog
        open={recurringDialogOpen}
        onClose={handleCloseRecurringDialog}
        aria-labelledby="recurring-response-dialog-title"
        PaperProps={{
          sx: { 
            borderRadius: 2,
            width: isMobile ? '95vw' : 400,
            maxWidth: isMobile ? '95vw' : 400
          }
        }}
      >
        <DialogTitle id="recurring-response-dialog-title" sx={{ pb: 1, pt: isMobile ? 2 : 1.5 }}>
          {recurringDialogMode === 'rsvp' ? 'RSVP to recurring event' : 'Add note to recurring event'}
        </DialogTitle>
        <DialogContent sx={{ pt: isMobile ? 1 : 0.5 }}>
          <FormControl component="fieldset">
            <RadioGroup
              aria-label="response-scope"
              name="response-scope"
              value={responseScope}
              onChange={handleRecurringScopeChange}
            >
              <FormControlLabel 
                value="single" 
                control={<Radio size={isMobile ? "medium" : "small"} />} 
                label="This event" 
                sx={{ py: isMobile ? 0.75 : 0.5 }}
              />
              <FormControlLabel 
                value="following" 
                control={<Radio size={isMobile ? "medium" : "small"} />} 
                label="This and following events" 
                sx={{ py: isMobile ? 0.75 : 0.5 }}
              />
              <FormControlLabel 
                value="all" 
                control={<Radio size={isMobile ? "medium" : "small"} />} 
                label="All events" 
                sx={{ py: isMobile ? 0.75 : 0.5 }}
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: isMobile ? 3 : 2 }}>
          <Button 
            onClick={handleCloseRecurringDialog}
            sx={{ 
              color: '#1A73E8', 
              textTransform: 'none',
              fontWeight: 500,
              fontSize: isMobile ? '0.9rem' : '0.85rem',
              minHeight: isMobile ? '40px' : '36px',
              px: isMobile ? 2.5 : 2
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleRecurringConfirm}
            sx={{ 
              bgcolor: '#1A73E8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none',
              fontWeight: 500,
              fontSize: isMobile ? '0.9rem' : '0.85rem',
              minHeight: isMobile ? '40px' : '36px',
              px: isMobile ? 2.5 : 2
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Add Note Dialog - Redesigned to match screenshots */}
      <Dialog
        open={noteDialogOpen}
        onClose={handleCloseNoteDialog}
        aria-labelledby="add-note-dialog-title"
        PaperProps={{
          sx: { 
            borderRadius: 2,
            width: isMobile ? '95vw' : 400,
            maxWidth: isMobile ? '95vw' : 400
          }
        }}
      >
        <DialogTitle 
          id="add-note-dialog-title" 
          sx={{ 
            pt: isMobile ? 3.5 : 3, 
            pb: isMobile ? 2.5 : 2,
            px: isMobile ? 3.5 : 3,
            fontSize: isMobile ? '1.6rem' : '1.5rem',
            fontWeight: 400
          }}
        >
          Add a note
        </DialogTitle>
        <DialogContent sx={{ px: isMobile ? 3.5 : 3, pt: 1, pb: isMobile ? 3.5 : 3 }}>
          {/* Note input field styled to match Google Calendar */}
          <Box 
            component="div" 
            sx={{
              width: '100%',
              mb: 3,
              mt: 1,
              backgroundColor: '#f1f3f4',
              borderRadius: '8px',
              position: 'relative',
              '&:focus-within': {
                outline: '2px solid #1a73e8'
              }
            }}
          >
            <Box
              component="textarea"
              placeholder="Add a note"
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              sx={{
                width: '100%',
                minHeight: isMobile ? '180px' : '150px',
                p: 2,
                border: 'none',
                borderRadius: '8px',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: isMobile ? '1.1rem' : '1rem',
                backgroundColor: 'transparent',
                '&:focus': {
                  outline: 'none'
                }
              }}
            />
          </Box>
          
          {/* RSVP dropdown styled to match Google Calendar */}
          <Box 
            onClick={handleRsvpMenuOpen}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: isMobile ? 2 : 1.5,
              backgroundColor: '#f1f3f4',
              borderRadius: '4px',
              cursor: 'pointer',
              minHeight: isMobile ? '48px' : '40px',
              '&:hover': {
                backgroundColor: '#e8eaed'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box 
                component="span" 
                sx={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a73e8',
                  mr: 1,
                  fontSize: isMobile ? '1.1rem' : '1rem'
                }}
              >
                ✓
              </Box>
              <Typography sx={{ 
                color: '#202124',
                fontSize: isMobile ? '1rem' : '0.9rem'
              }}>
                RSVP: {rsvpStatus}
              </Typography>
            </Box>
            <Box 
              component="span" 
              sx={{ 
                color: '#5f6368',
                fontSize: isMobile ? '1rem' : '0.9rem'
              }}
            >
              ▼
            </Box>
          </Box>
          
          {/* RSVP dropdown menu */}
          <Menu
            anchorEl={rsvpMenuAnchorEl}
            open={Boolean(rsvpMenuAnchorEl)}
            onClose={handleRsvpMenuClose}
            sx={{
              '& .MuiPaper-root': {
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                mt: 1,
                width: isMobile ? '95vw' : 'auto',
                maxWidth: isMobile ? '95vw' : 400
              }
            }}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
          >
            <MenuItem onClick={() => handleRsvpChange('Yes')} sx={{ py: isMobile ? 2 : 1.5, px: isMobile ? 3 : 2 }}>
              <Box 
                component="span" 
                sx={{ 
                  color: '#1a73e8', 
                  mr: 2,
                  fontSize: isMobile ? '1.1rem' : '1rem'
                }}
              >
                ✓
              </Box>
              <Typography sx={{ fontSize: isMobile ? '1rem' : '0.9rem' }}>
                Yes
              </Typography>
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('Yes, in a meeting room')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>🏢</Box>
              Yes, in a meeting room
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('Yes, joining virtually')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>🎥</Box>
              Yes, joining virtually
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('No')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>✕</Box>
              No
            </MenuItem>
            <MenuItem onClick={() => handleRsvpChange('Maybe')} sx={{ py: 1.5, px: 2 }}>
              <Box component="span" sx={{ mr: 2, width: '1em', display: 'inline-block' }}>?</Box>
              Maybe
            </MenuItem>
          </Menu>
        </DialogContent>
        <DialogActions sx={{ px: isMobile ? 3.5 : 3, pb: isMobile ? 3.5 : 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            onClick={handleCloseNoteDialog}
            sx={{ 
              color: '#1A73E8', 
              textTransform: 'none',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.25px',
              px: isMobile ? 2.5 : 2,
              py: isMobile ? 1.25 : 1,
              minHeight: isMobile ? '44px' : '36px'
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained"
            onClick={handleRsvp}
            sx={{ 
              bgcolor: '#1A73E8', 
              '&:hover': { bgcolor: '#1557b0' },
              textTransform: 'none',
              fontSize: isMobile ? '0.95rem' : '0.875rem',
              fontWeight: 500,
              borderRadius: '4px',
              px: isMobile ? 3.5 : 3,
              py: isMobile ? 1.25 : 1,
              ml: 1,
              minHeight: isMobile ? '44px' : '36px'
            }}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Edit form dialog */}
      <EventEditForm 
        event={event}
        open={isEditFormOpen}
        onClose={handleEditFormClose}
        onSave={handleEditFormSave}
      />
      
      {/* Notification snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EventDetailsPopup; 