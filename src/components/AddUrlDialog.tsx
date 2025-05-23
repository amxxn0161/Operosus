import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Avatar,
  IconButton
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import { TaskUrlAttachment } from '../types/commonTypes';
import { attachUrlToTask, isValidUrl, extractDomain, fetchUrlPreview } from '../services/googleDriveService';
import URLPreview from './URLPreview';

interface AddUrlDialogProps {
  open: boolean;
  onClose: () => void;
  onUrlAttached: (attachment: TaskUrlAttachment) => void;
  taskId: string;
  taskListId: string;
}

const AddUrlDialog: React.FC<AddUrlDialogProps> = ({
  open,
  onClose,
  onUrlAttached,
  taskId,
  taskListId
}) => {
  const [url, setUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [urlValid, setUrlValid] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [preview, setPreview] = useState<any | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setUrl('');
      setTitle('');
      setDescription('');
      setError('');
      setUrlValid(false);
      setPreview(null);
    }
  }, [open]);

  // URL input handler following the requirements pattern
  const handleUrlChange = async (inputUrl: string) => {
    console.log('URL changed:', inputUrl);
    
    // Auto-add https:// if no protocol specified
    let processedUrl = inputUrl.trim();
    if (processedUrl && !processedUrl.match(/^https?:\/\//)) {
      processedUrl = `https://${processedUrl}`;
    }
    
    setUrl(processedUrl);
    setPreview(null); // Clear previous preview
    
    // Validate URL
    const valid = isValidUrl(processedUrl);
    setUrlValid(valid);
    
    if (!valid && processedUrl.length > 7) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    } else {
      setError('');
    }
    
    // Fetch preview if URL is valid
    if (valid) {
      setPreviewLoading(true);
      try {
        const previewData = await fetchUrlPreview(processedUrl);
        setPreview(previewData);
        
        // Auto-fill title and description if they're empty and preview has them
        if (!title && previewData?.title) {
          setTitle(previewData.title);
        }
        if (!description && previewData?.description) {
          setDescription(previewData.description);
        }
      } catch (error) {
        console.error('Error fetching preview:', error);
        // Don't show error to user for preview failures
      } finally {
        setPreviewLoading(false);
      }
    }
  };

  // Debounced URL change handler
  useEffect(() => {
    if (url) {
      const timeoutId = setTimeout(() => {
        if (url !== '') {
          // Only fetch if URL actually changed
          handleUrlChange(url);
        }
      }, 1000); // Wait 1 second after user stops typing
      
      return () => clearTimeout(timeoutId);
    }
  }, [url]);

  const handleRefreshPreview = () => {
    if (urlValid && url) {
      handleUrlChange(url);
    }
  };

  const handleSubmit = async () => {
    if (!urlValid || !url) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const attachment = await attachUrlToTask(
        taskListId,
        taskId,
        url,
        title || undefined,
        description || undefined
      );

      if (attachment) {
        onUrlAttached(attachment);
        onClose();
      } else {
        setError('Failed to attach URL. Please try again.');
      }
    } catch (error) {
      console.error('Error attaching URL:', error);
      setError('Failed to attach URL. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const domain = urlValid ? extractDomain(url) : '';

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 2,
          maxHeight: '90vh',
          m: 2
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          pb: 1,
          pr: 6
        }}
      >
        <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h6" component="span">
          Attach URL to Task
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent 
        sx={{ 
          pt: 3,
          pb: 2,
          px: 3,
          overflow: 'auto',
          maxHeight: 'calc(90vh - 160px)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {/* URL Input */}
          <TextField
            autoFocus
            label="URL"
            type="url"
            fullWidth
            variant="outlined"
            size="small"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon color={urlValid ? 'primary' : 'disabled'} />
                </InputAdornment>
              ),
              endAdornment: urlValid && domain && (
                <InputAdornment position="end">
                  <Chip 
                    label={domain} 
                    size="small" 
                    variant="outlined"
                    avatar={<Avatar sx={{ width: 16, height: 16, fontSize: '0.7rem' }}>🌐</Avatar>}
                  />
                </InputAdornment>
              )
            }}
            error={!!error}
            helperText={error || (urlValid ? 'Valid URL' : 'Enter a valid URL')}
          />

          {/* URL Preview */}
          {urlValid && (
            <Box sx={{ position: 'relative' }}>
              {previewLoading ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  py: 4,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2
                }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Loading preview...
                  </Typography>
                </Box>
              ) : preview ? (
                <Box sx={{ position: 'relative' }}>
                  <URLPreview preview={preview} />
                  <IconButton
                    size="small"
                    onClick={handleRefreshPreview}
                    sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 8,
                      bgcolor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': { bgcolor: 'grey.100' }
                    }}
                    title="Refresh Preview"
                  >
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 4,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  color: 'text.secondary'
                }}>
                  <LinkIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">
                    No preview available
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Title Input (Optional) */}
          <TextField
            label="Title (Optional)"
            fullWidth
            variant="outlined"
            size="small"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Custom title for this link"
            helperText="Leave empty to use the webpage's title"
          />

          {/* Description Input (Optional) */}
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            size="small"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a note about this link..."
          />

          {/* Smart URL Detection Info */}
          <Alert severity="info" sx={{ mt: 0.5 }}>
            <Typography variant="caption">
              <strong>💡 Tip:</strong> We'll automatically fetch the title, description, and preview image from the webpage.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          color="inherit"
          size="small"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!urlValid || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <LinkIcon />}
          size="small"
        >
          {loading ? 'Attaching...' : 'Attach URL'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddUrlDialog; 