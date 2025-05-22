import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  InsertDriveFile as FileIcon,
  Delete as DeleteIcon,
  OpenInNew as OpenIcon,
  Description as DocIcon,
  ViewColumn as SheetIcon,
  Slideshow as SlideIcon
} from '@mui/icons-material';
import { getTaskAttachments, removeTaskAttachment, TaskAttachment } from '../services/googleDriveService';

interface TaskAttachmentsProps {
  taskListId: string;
  taskId: string;
  onAttachmentChange?: () => void;
}

const TaskAttachments: React.FC<TaskAttachmentsProps> = ({ taskListId, taskId, onAttachmentChange }) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<TaskAttachment | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (taskId) {
      fetchAttachments();
    }
  }, [taskId, taskListId]);

  const fetchAttachments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const attachmentData = await getTaskAttachments(taskListId, taskId);
      setAttachments(attachmentData);
    } catch (err) {
      console.error('Error fetching attachments:', err);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAttachment = (attachment: TaskAttachment) => {
    if (attachment.webViewLink) {
      window.open(attachment.webViewLink, '_blank');
    }
  };

  const handleDeleteClick = (attachment: TaskAttachment) => {
    setSelectedAttachment(attachment);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedAttachment) return;
    
    setDeleting(true);
    
    try {
      await removeTaskAttachment(taskListId, taskId, selectedAttachment.id);
      setAttachments(attachments.filter(a => a.id !== selectedAttachment.id));
      if (onAttachmentChange) {
        onAttachmentChange();
      }
    } catch (err) {
      console.error('Error removing attachment:', err);
      setError('Failed to remove attachment');
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
      setSelectedAttachment(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setSelectedAttachment(null);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.document') {
      return <DocIcon color="primary" />;
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      return <SheetIcon style={{ color: '#0f9d58' }} />;
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      return <SlideIcon style={{ color: '#f4b400' }} />;
    } else {
      return <FileIcon color="action" />;
    }
  };

  if (loading && attachments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error && attachments.length === 0) {
    return (
      <Box p={2}>
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </Box>
    );
  }

  if (attachments.length === 0) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="textSecondary">
          No attachments
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <List dense>
        {attachments.map((attachment) => (
          <ListItem 
            key={attachment.id}
            button
            onClick={() => handleOpenAttachment(attachment)}
          >
            <ListItemIcon>
              {getFileIcon(attachment.mimeType)}
            </ListItemIcon>
            <ListItemText 
              primary={attachment.fileName}
              primaryTypographyProps={{ noWrap: true }}
            />
            <ListItemSecondaryAction>
              <Tooltip title="Open">
                <IconButton 
                  edge="end" 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAttachment(attachment);
                  }}
                >
                  <OpenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove">
                <IconButton 
                  edge="end" 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(attachment);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Remove Attachment</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{selectedAttachment?.fileName}" from this task?
            This won't delete the file from Google Drive.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TaskAttachments; 