import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DescriptionIcon from '@mui/icons-material/Description';
import TableChartIcon from '@mui/icons-material/TableChart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import FolderIcon from '@mui/icons-material/Folder';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import { TaskFileAttachment, GoogleDriveFile } from '../types/commonTypes';
import { getFileTypeIconName, formatFileSize, attachFileToTask, removeFileFromTask } from '../services/googleDriveService';
import DriveFileSelector from './DriveFileSelector';

interface TaskFileAttachmentsProps {
  taskId: string;
  taskListId: string;
  attachments: TaskFileAttachment[];
  onAttachmentsChange: (attachments: TaskFileAttachment[]) => void;
  disabled?: boolean;
}

const TaskFileAttachments: React.FC<TaskFileAttachmentsProps> = ({
  taskId,
  taskListId,
  attachments,
  onAttachmentsChange,
  disabled = false
}) => {
  const [fileSelectorOpen, setFileSelectorOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleFileSelect = async (file: GoogleDriveFile) => {
    console.log('TaskFileAttachments: handleFileSelect called with file:', file);
    
    try {
      setLoading(true);
      
      // Check if file is already attached
      const isAlreadyAttached = attachments.some(attachment => attachment.fileId === file.id);
      if (isAlreadyAttached) {
        console.log('File is already attached, skipping API call');
        showSnackbar('File is already attached to this task', 'error');
        setLoading(false); // Make sure to reset loading state
        return;
      }

      console.log('Calling attachFileToTask API with:', { taskListId, taskId, fileId: file.id });
      const attachment = await attachFileToTask(taskListId, taskId, file.id);
      console.log('API response:', attachment);
      
      if (attachment) {
        const updatedAttachments = [...attachments, attachment];
        onAttachmentsChange(updatedAttachments);
        showSnackbar('File attached successfully', 'success');
      } else {
        showSnackbar('Failed to attach file', 'error');
      }
    } catch (error) {
      console.error('Error attaching file:', error);
      showSnackbar('Error attaching file', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = async (attachment: TaskFileAttachment) => {
    try {
      setRemovingFileId(attachment.fileId);
      
      const success = await removeFileFromTask(taskListId, taskId, attachment.fileId);
      
      if (success) {
        const updatedAttachments = attachments.filter(a => a.fileId !== attachment.fileId);
        onAttachmentsChange(updatedAttachments);
        showSnackbar('File removed successfully', 'success');
      } else {
        showSnackbar('Failed to remove file', 'error');
      }
    } catch (error) {
      console.error('Error removing file:', error);
      showSnackbar('Error removing file', 'error');
    } finally {
      setRemovingFileId(null);
    }
  };

  const handleOpenFile = (attachment: TaskFileAttachment) => {
    if (attachment.webViewLink) {
      window.open(attachment.webViewLink, '_blank');
    }
  };

  // Function to render Material-UI icon based on mime type
  const renderFileTypeIcon = (mimeType?: string) => {
    const iconName = getFileTypeIconName(mimeType);
    const iconProps = { 
      sx: { 
        color: mimeType?.includes('document') ? '#4285f4' : 
               mimeType?.includes('spreadsheet') ? '#0f9d58' :
               mimeType?.includes('presentation') ? '#ff6d01' : 'text.secondary'
      }
    };

    switch (iconName) {
      case 'Description':
        return <DescriptionIcon {...iconProps} />;
      case 'TableChart':
        return <TableChartIcon {...iconProps} />;
      case 'Slideshow':
        return <SlideshowIcon {...iconProps} />;
      case 'Folder':
        return <FolderIcon {...iconProps} />;
      case 'PictureAsPdf':
        return <PictureAsPdfIcon {...iconProps} />;
      case 'Image':
        return <ImageIcon {...iconProps} />;
      case 'VideoFile':
        return <VideoFileIcon {...iconProps} />;
      case 'AudioFile':
        return <AudioFileIcon {...iconProps} />;
      case 'TextSnippet':
        return <TextSnippetIcon {...iconProps} />;
      default:
        return <AttachFileIcon {...iconProps} />;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AttachFileIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle1" fontWeight="medium">
            File Attachments
          </Typography>
          {attachments.length > 0 && (
            <Chip
              label={attachments.length}
              size="small"
              sx={{ ml: 2 }}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
        
        <Button
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={() => setFileSelectorOpen(true)}
          variant="outlined"
          size="small"
          disabled={disabled || loading}
        >
          Add File
        </Button>
      </Box>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 3,
            border: '2px dashed',
            borderColor: 'divider',
            borderRadius: 1,
            color: 'text.secondary'
          }}
        >
          <AttachFileIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">
            No files attached
          </Typography>
          <Typography variant="caption">
            Click "Add File" to attach Google Drive files
          </Typography>
        </Box>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          {attachments.map((attachment, index) => (
            <ListItem
              key={attachment.id}
              divider={index < attachments.length - 1}
              sx={{ 
                '&:hover': { 
                  bgcolor: 'action.hover',
                  cursor: 'pointer'
                }
              }}
              onClick={() => handleOpenFile(attachment)}
            >
              <ListItemIcon>
                {renderFileTypeIcon(attachment.mimeType)}
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" noWrap>
                      {attachment.fileName}
                    </Typography>
                    <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatFileSize(attachment.size)}
                      {attachment.attachedAt && (
                        <> • Attached {new Date(attachment.attachedAt).toLocaleDateString()}</>
                      )}
                    </Typography>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Tooltip title="Remove attachment">
                  <IconButton
                    edge="end"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(attachment);
                    }}
                    disabled={disabled || removingFileId === attachment.fileId}
                    color="error"
                    size="small"
                  >
                    {removingFileId === attachment.fileId ? (
                      <CircularProgress size={16} />
                    ) : (
                      <DeleteIcon fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      {/* File Selector Dialog */}
      <DriveFileSelector
        open={fileSelectorOpen}
        onClose={() => setFileSelectorOpen(false)}
        onFileSelect={handleFileSelect}
        loading={loading}
        taskListId={taskListId}
        taskId={taskId}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TaskFileAttachments; 