import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Button,
  TextField
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface SessionHeaderProps {
  title: string;
  sessions: { id: string; name: string }[];
  currentSessionId: string;
  onSessionChange: (sessionId: string) => void;
  onAddSession: () => void;
  onRenameSession: (newName: string) => void;
  helperText?: string;
}

const SessionHeader: React.FC<SessionHeaderProps> = ({
  title,
  sessions,
  currentSessionId,
  onSessionChange,
  onAddSession,
  onRenameSession,
  helperText
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const currentSession = sessions.find(s => s.id === currentSessionId);
  
  const handleStartRename = () => {
    if (currentSession) {
      setNewSessionName(currentSession.name);
      setIsEditingName(true);
    }
  };
  
  const handleSaveRename = () => {
    if (newSessionName.trim()) {
      onRenameSession(newSessionName.trim());
    }
    setIsEditingName(false);
  };
  
  const handleCancelRename = () => {
    setIsEditingName(false);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 2 }}>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ flexGrow: 1 }}>
          {isEditingName ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField 
                fullWidth 
                value={newSessionName} 
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Enter session name..."
                size="small"
                sx={{ fontFamily: 'Poppins' }}
              />
              <Button 
                onClick={handleSaveRename}
                variant="contained"
                size="small"
                sx={{ 
                  fontFamily: 'Poppins', 
                  textTransform: 'none',
                  backgroundColor: '#1056F5',
                  height: '40px',
                }}
              >
                Save
              </Button>
              <Button 
                onClick={handleCancelRename}
                variant="outlined"
                size="small"
                sx={{ 
                  fontFamily: 'Poppins', 
                  textTransform: 'none',
                  height: '40px',
                }}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <FormControl fullWidth>
              <Select
                value={currentSessionId}
                onChange={(e) => onSessionChange(e.target.value as string)}
                displayEmpty
                sx={{ fontFamily: 'Poppins', height: '48px' }}
              >
                {sessions.map(session => (
                  <MenuItem key={session.id} value={session.id}>
                    {session.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        {!isEditingName && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined"
              onClick={handleStartRename}
              size="medium"
              sx={{ 
                fontFamily: 'Poppins', 
                textTransform: 'none',
                height: '48px',
                minWidth: '90px',
              }}
            >
              Rename
            </Button>
            <Button 
              variant="contained"
              onClick={onAddSession}
              startIcon={<AddIcon />}
              size="medium"
              sx={{ 
                fontFamily: 'Poppins', 
                textTransform: 'none',
                backgroundColor: '#1056F5',
                height: '48px',
                minWidth: '130px',
              }}
            >
              New Session
            </Button>
          </Box>
        )}
      </Box>
      {helperText && (
        <Typography variant="body2" sx={{ fontFamily: 'Poppins', color: 'text.secondary', mt: 2 }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default SessionHeader; 