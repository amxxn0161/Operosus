import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LinkIcon from '@mui/icons-material/Link';
import RefreshIcon from '@mui/icons-material/Refresh';
import { TaskUrlAttachment } from '../types/commonTypes';
import { removeUrlFromTask, refreshUrlMetadata, getTaskUrlAttachments } from '../services/googleDriveService';
import AddUrlDialog from './AddUrlDialog';
import URLPreview from './URLPreview';

interface TaskUrlAttachmentsProps {
  taskId: string;
  taskListId: string;
  attachments: TaskUrlAttachment[];
  onAttachmentsChange: (attachments: TaskUrlAttachment[]) => void;
  disabled?: boolean;
}

const TaskUrlAttachments: React.FC<TaskUrlAttachmentsProps> = ({
  taskId,
  taskListId,
  attachments,
  onAttachmentsChange,
  disabled = false
}) => {
  const [addUrlDialogOpen, setAddUrlDialogOpen] = useState(false);
  const [removingUrlId, setRemovingUrlId] = useState<string | null>(null);
  const [refreshingUrlId, setRefreshingUrlId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
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

  const handleUrlAttached = (attachment: TaskUrlAttachment) => {
    const updatedAttachments = [...attachments, attachment];
    onAttachmentsChange(updatedAttachments);
    showSnackbar('URL attached successfully', 'success');
  };

  const handleRemoveUrl = async (attachment: TaskUrlAttachment) => {
    try {
      setRemovingUrlId(attachment.id);
      
      const success = await removeUrlFromTask(taskListId, taskId, attachment.id);
      
      if (success) {
        const updatedAttachments = attachments.filter(a => a.id !== attachment.id);
        onAttachmentsChange(updatedAttachments);
        showSnackbar('URL removed successfully', 'success');
      } else {
        showSnackbar('Failed to remove URL', 'error');
      }
    } catch (error) {
      console.error('Error removing URL:', error);
      showSnackbar('Error removing URL', 'error');
    } finally {
      setRemovingUrlId(null);
    }
  };

  const handleRefreshMetadata = async (attachment: TaskUrlAttachment) => {
    try {
      setRefreshingUrlId(attachment.id);
      
      const refreshedAttachment = await refreshUrlMetadata(taskListId, taskId, attachment.id);
      
      if (refreshedAttachment) {
        const updatedAttachments = attachments.map(a => 
          a.id === attachment.id ? refreshedAttachment : a
        );
        onAttachmentsChange(updatedAttachments);
        showSnackbar('Preview refreshed successfully', 'success');
      } else {
        showSnackbar('Failed to refresh preview', 'error');
      }
    } catch (error) {
      console.error('Error refreshing metadata:', error);
      showSnackbar('Error refreshing preview', 'error');
    } finally {
      setRefreshingUrlId(null);
    }
  };

  const handleOpenUrl = (attachment: TaskUrlAttachment) => {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  };

  const handleRefreshAllUrls = async () => {
    try {
      setRefreshingAll(true);
      
      const refreshedAttachments = await getTaskUrlAttachments(taskListId, taskId);
      onAttachmentsChange(refreshedAttachments);
      showSnackbar('URL attachments refreshed successfully', 'success');
    } catch (error) {
      console.error('Error refreshing URL attachments:', error);
      showSnackbar('Error refreshing URL attachments', 'error');
    } finally {
      setRefreshingAll(false);
    }
  };

  // Convert TaskUrlAttachment to URLPreview format
  const convertToPreviewFormat = (attachment: TaskUrlAttachment) => {
    // Extract domain from URL if not provided or ensure it's clean
    let domain = attachment.domain;
    if (!domain && attachment.url) {
      try {
        const urlObj = new URL(attachment.url.startsWith('http') ? attachment.url : `https://${attachment.url}`);
        domain = urlObj.hostname;
      } catch {
        // Fallback domain extraction
        const match = attachment.url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
        domain = match ? match[1] : attachment.url;
      }
    }

    // Ensure we always have a favicon - use multiple fallback strategies
    let best_icon = attachment.bestIcon || attachment.faviconUrl;
    
    // If no icon available, generate Google favicon URL
    if (!best_icon && domain) {
      best_icon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    }

    return {
      preview_image: attachment.previewImage,
      best_icon: best_icon,
      display_site_name: attachment.displaySiteName || domain || 'Website',
      title: attachment.title || attachment.previewTitle || attachment.url,
      description: attachment.description || attachment.previewDescription,
      domain: domain,
      is_special_url: false // This would come from backend
    };
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
          <Typography variant="subtitle1" fontWeight="medium">
            URL Attachments
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
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh All URLs">
            <IconButton
              onClick={handleRefreshAllUrls}
              disabled={disabled || refreshingAll}
              size="small"
            >
              {refreshingAll ? (
                <CircularProgress size={20} />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Tooltip>
          
          <Button
            startIcon={<AddIcon />}
            onClick={() => setAddUrlDialogOpen(true)}
            variant="outlined"
            size="small"
            disabled={disabled}
          >
            Add URL
          </Button>
        </Box>
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
          <LinkIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">
            No URLs attached
          </Typography>
          <Typography variant="caption">
            Click "Add URL" to attach web links
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {attachments.map((attachment) => {
            const previewData = convertToPreviewFormat(attachment);
            
            return (
              <Box key={attachment.id} sx={{ position: 'relative' }}>
                {/* Action Header */}
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  mb: 1,
                  px: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {attachment.isMetadataStale && (
                      <Chip 
                        label="Stale" 
                        size="small" 
                        color="warning" 
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: 20 }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Attached {new Date(attachment.attachedAt).toLocaleDateString()}
                      {attachment.lastMetadataRefresh && (
                        <> • Last updated {new Date(attachment.lastMetadataRefresh).toLocaleDateString()}</>
                      )}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="Refresh Preview">
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefreshMetadata(attachment);
                        }}
                        disabled={disabled || refreshingUrlId === attachment.id}
                      >
                        {refreshingUrlId === attachment.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <RefreshIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open URL">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenUrl(attachment)}
                        color="primary"
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove URL">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUrl(attachment);
                        }}
                        disabled={disabled || removingUrlId === attachment.id}
                        color="error"
                      >
                        {removingUrlId === attachment.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* URL Preview */}
                <Box 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { 
                      opacity: 0.8,
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleOpenUrl(attachment)}
                >
                  <URLPreview preview={previewData} />
                </Box>

                {/* URL Link */}
                <Box sx={{ mt: 1, px: 2 }}>
                  <Typography variant="caption" color="primary.main" sx={{ display: 'block' }}>
                    {attachment.url}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Add URL Dialog */}
      <AddUrlDialog
        open={addUrlDialogOpen}
        onClose={() => setAddUrlDialogOpen(false)}
        onUrlAttached={handleUrlAttached}
        taskId={taskId}
        taskListId={taskListId}
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

export default TaskUrlAttachments; 