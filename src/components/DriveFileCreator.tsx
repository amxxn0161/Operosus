import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import {
  Article as DocIcon,
  GridOn as SheetIcon,
  PlayCircleOutline as SlideIcon
} from '@mui/icons-material';
import { GoogleDriveFile } from '../types/commonTypes';
import { createGoogleDoc, createGoogleSheet, createGoogleSlide } from '../services/googleDriveService';

interface DriveFileCreatorProps {
  taskListId?: string;
  taskId?: string;
  onFileCreated: (file: GoogleDriveFile) => void;
  onError: (error: string) => void;
}

const DriveFileCreator: React.FC<DriveFileCreatorProps> = ({
  taskListId,
  taskId,
  onFileCreated,
  onError,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [autoAttach, setAutoAttach] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [creatingType, setCreatingType] = useState<string | null>(null);

  const handleCreateFile = async (type: 'document' | 'spreadsheet' | 'presentation') => {
    if (!fileName.trim()) {
      onError('Please enter a file name');
      return;
    }

    try {
      setCreating(true);
      setCreatingType(type);

      let createdFile: GoogleDriveFile | null = null;

      switch (type) {
        case 'document':
          createdFile = await createGoogleDoc(fileName.trim(), taskListId, taskId, autoAttach);
          break;
        case 'spreadsheet':
          createdFile = await createGoogleSheet(fileName.trim(), taskListId, taskId, autoAttach);
          break;
        case 'presentation':
          createdFile = await createGoogleSlide(fileName.trim(), taskListId, taskId, autoAttach);
          break;
      }

      if (createdFile) {
        onFileCreated(createdFile);
        setFileName(''); // Clear the input after successful creation
      } else {
        onError('Failed to create file');
      }
    } catch (error) {
      console.error('Error creating file:', error);
      onError('Failed to create file. Please try again.');
    } finally {
      setCreating(false);
      setCreatingType(null);
    }
  };

  const getButtonText = (type: 'document' | 'spreadsheet' | 'presentation') => {
    if (creating && creatingType === type) {
      return 'Creating...';
    }
    return `Create ${type === 'document' ? 'Doc' : type === 'spreadsheet' ? 'Sheet' : 'Slides'}`;
  };

  const isCreatingType = (type: string) => creating && creatingType === type;

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontFamily: 'Poppins', fontWeight: 'medium' }}>
        Create New File
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="File Name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Enter file name..."
          disabled={creating}
          sx={{ mb: 2 }}
        />
        
        {taskId && (
          <FormControlLabel
            control={
              <Checkbox
                checked={autoAttach}
                onChange={(e) => setAutoAttach(e.target.checked)}
                disabled={creating}
                color="primary"
              />
            }
            label="Automatically attach to this task"
            sx={{ mb: 2 }}
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={
            isCreatingType('document') ? (
              <CircularProgress size={16} />
            ) : (
              <DocIcon />
            )
          }
          onClick={() => handleCreateFile('document')}
          disabled={creating || !fileName.trim()}
          sx={{
            borderColor: '#4285f4',
            color: '#4285f4',
            '&:hover': {
              borderColor: '#3367d6',
              backgroundColor: 'rgba(66, 133, 244, 0.04)',
            },
          }}
        >
          {getButtonText('document')}
        </Button>

        <Button
          variant="outlined"
          startIcon={
            isCreatingType('spreadsheet') ? (
              <CircularProgress size={16} />
            ) : (
              <SheetIcon />
            )
          }
          onClick={() => handleCreateFile('spreadsheet')}
          disabled={creating || !fileName.trim()}
          sx={{
            borderColor: '#0f9d58',
            color: '#0f9d58',
            '&:hover': {
              borderColor: '#0d8043',
              backgroundColor: 'rgba(15, 157, 88, 0.04)',
            },
          }}
        >
          {getButtonText('spreadsheet')}
        </Button>

        <Button
          variant="outlined"
          startIcon={
            isCreatingType('presentation') ? (
              <CircularProgress size={16} />
            ) : (
              <SlideIcon />
            )
          }
          onClick={() => handleCreateFile('presentation')}
          disabled={creating || !fileName.trim()}
          sx={{
            borderColor: '#ff6d01',
            color: '#ff6d01',
            '&:hover': {
              borderColor: '#e65100',
              backgroundColor: 'rgba(255, 109, 1, 0.04)',
            },
          }}
        >
          {getButtonText('presentation')}
        </Button>
      </Box>
    </Paper>
  );
};

export default DriveFileCreator; 