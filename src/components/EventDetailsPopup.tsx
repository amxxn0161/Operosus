import React, { useState } from 'react';
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
  MenuItem
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
import { CalendarEvent } from '../services/calendarService';
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
  const [rsvpStatus, setRsvpStatus] = useState<string>('Yes');
  const [isEditFormOpen, setIsEditFormOpen] = useState<boolean>(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
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
    // Use recurringEventId to determine if this is a recurring event
    if (event.recurringEventId) {
      return 'Weekly on ' + format(eventStart, 'EEEE');
    }
    return '';
  };

  const handleRsvpChange = (
    e: React.MouseEvent<HTMLElement>,
    newStatus: string,
  ) => {
    if (newStatus !== null) {
      setRsvpStatus(newStatus);
    }
  };

  // Get meeting link from htmlLink or description
  const getMeetingLink = (): string | null => {
    // Try to use htmlLink first if it's a Google Meet link
    if (event.htmlLink && event.htmlLink.includes('meet.google.com')) {
      return event.htmlLink;
    }
    
    // Fall back to parsing description
    if (event.description) {
      const meetRegex = /meet\.google\.com\/[a-z0-9\-]+/g;
      const matches = event.description.match(meetRegex);
      if (matches && matches.length > 0) {
        return matches[0];
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

  const meetingUrl = getMeetingLink();
  const hasPhoneDetails = event.description?.includes('PIN:');
  // Only use the phone details if explicitly mentioned in the event description
  const phoneDetails = event.description?.includes('PIN:') ? 
    event.description.match(/\(\w+\)\s+[+\d\s]+PIN:\s+[\d\s#]+/)?.[0] : null;
  
  const guestList = getGuestList();
  const agendaItems = getAgendaItems();
  const organizer = getOrganizer();

  // Count of people who have accepted the invitation - actually count from the data
  const acceptedCount = guestList.filter(guest => 
    guest.response === 'Going' || guest.response === 'Accepted' || guest.response === 'Yes'
  ).length;

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
            width: 400, 
            maxHeight: '80vh',
            overflowY: 'auto',
            borderRadius: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }
        }}
      >
        <Paper elevation={0}>
          {/* Header with close button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
            <IconButton size="small" onClick={onClose} aria-label="close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          {/* Event title and color indicator */}
          <Box sx={{ px: 3, pt: 1, pb: 2, display: 'flex', alignItems: 'flex-start' }}>
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
            <Typography variant="h6" sx={{ fontWeight: 500, flex: 1 }}>
              {event.summary || event.title}
            </Typography>
            
            {/* More options menu */}
            <IconButton size="small" sx={{ ml: 1 }} onClick={handleMenuOpen}>
              <MoreVertIcon fontSize="small" />
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
          <Box sx={{ px: 3, pb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {formatEventDate()} · {formatEventTime()}
            </Typography>
            {formatRecurrence() && (
              <Typography variant="body2" color="text.secondary">
                {formatRecurrence()}
              </Typography>
            )}
          </Box>
          
          {/* Google Meet section */}
          {meetingUrl && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  mb: 1,
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Avatar 
                    sx={{ 
                      width: 20, 
                      height: 20, 
                      mr: 1,
                      bgcolor: '#1A73E8'
                    }}
                  >
                    <VideocamIcon fontSize="small" sx={{ width: 14, height: 14 }} />
                  </Avatar>
                  <Button 
                    variant="contained" 
                    sx={{ 
                      bgcolor: '#1A73E8', 
                      color: 'white',
                      '&:hover': { bgcolor: '#1557b0' },
                      textTransform: 'none',
                      px: 2,
                      fontSize: '0.85rem',
                      borderRadius: 1
                    }}
                  >
                    Join with Google Meet
                  </Button>
                </Box>
                <IconButton size="small">
                  <ContentCopyIcon fontSize="small" sx={{ width: 18, height: 18 }} />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 3, fontSize: '0.8rem' }}>
                {meetingUrl}
              </Typography>
            </Box>
          )}
          
          {/* Phone details */}
          {phoneDetails && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <PhoneIcon 
                  fontSize="small" 
                  sx={{ 
                    mr: 1, 
                    color: '#1A73E8', 
                    width: 18, 
                    height: 18 
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="primary" 
                  sx={{ 
                    fontWeight: 500,
                    fontSize: '0.85rem'
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
                  fontSize: '0.8rem' 
                }}
              >
                {phoneDetails}
              </Typography>
            </Box>
          )}
          
          {/* Location if available */}
          {event.location && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 0.5 }}>
                <LocationOnIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                <Typography variant="body2" color="text.secondary">
                  {event.location}
                </Typography>
              </Box>
            </Box>
          )}
          
          {/* Guest details */}
          {guestList.length > 0 && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PeopleIcon 
                  fontSize="small" 
                  sx={{ 
                    mr: 1, 
                    color: 'text.secondary',
                    width: 18,
                    height: 18
                  }} 
                />
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ fontSize: '0.85rem' }}
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
          
          {/* RSVP section */}
          <Divider />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                mr: 2, 
                mt: 0.5,
                fontSize: '0.85rem'
              }}
            >
              Going?
            </Typography>
            <ToggleButtonGroup
              value={rsvpStatus}
              exclusive
              onChange={handleRsvpChange}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2,
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
          </Box>
        </Paper>
      </Popover>
      
      {/* Edit form dialog */}
      <EventEditForm 
        event={event}
        open={isEditFormOpen}
        onClose={handleEditFormClose}
        onSave={handleEditFormSave}
      />
    </>
  );
};

export default EventDetailsPopup; 