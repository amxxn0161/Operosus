import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Divider,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
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
import { GoogleDriveFile } from '../types/commonTypes';
import { fetchGoogleDriveFiles, getFileTypeIconName, formatFileSize } from '../services/googleDriveService';
import DriveFileCreator from './DriveFileCreator';

interface DriveFileSelectorProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (file: GoogleDriveFile) => void;
  loading?: boolean;
  taskListId?: string;
  taskId?: string;
}

const DriveFileSelector: React.FC<DriveFileSelectorProps> = ({
  open,
  onClose,
  onFileSelect,
  loading: externalLoading = false,
  taskListId,
  taskId
}) => {
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMimeTypes, setSelectedMimeTypes] = useState<string[]>([]);
  const [creationSuccess, setCreationSuccess] = useState<string | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Common file type filters
  const fileTypeFilters = [
    { label: 'Documents', mimeType: 'application/vnd.google-apps.document' },
    { label: 'Sheets', mimeType: 'application/vnd.google-apps.spreadsheet' },
    { label: 'Slides', mimeType: 'application/vnd.google-apps.presentation' },
    { label: 'PDFs', mimeType: 'application/pdf' },
    { label: 'Images', mimeType: 'image/' },
  ];

  // Fetch files when dialog opens
  useEffect(() => {
    if (open) {
      loadFiles();
      // Clear any previous messages
      setCreationSuccess(null);
      setCreationError(null);
    }
  }, [open]);

  // Filter files based on search query and mime types
  useEffect(() => {
    let filtered = files;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by mime types
    if (selectedMimeTypes.length > 0) {
      filtered = filtered.filter(file =>
        selectedMimeTypes.some(mimeType =>
          file.mimeType && (file.mimeType === mimeType || file.mimeType.startsWith(mimeType))
        )
      );
    }

    setFilteredFiles(filtered);
  }, [files, searchQuery, selectedMimeTypes]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const driveFiles = await fetchGoogleDriveFiles({
        pageSize: 50 // Limit to 50 files for better performance
      });
      setFiles(driveFiles);
    } catch (err) {
      console.error('Failed to load Google Drive files:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: GoogleDriveFile) => {
    console.log('DriveFileSelector: handleFileSelect called with file:', file);
    console.log('DriveFileSelector: calling onFileSelect prop');
    onFileSelect(file);
    onClose();
  };

  const handleFileCreated = (file: GoogleDriveFile) => {
    setCreationSuccess(`${file.name} created successfully!`);
    setCreationError(null);
    
    // Add the new file to the top of the list
    setFiles(prevFiles => [file, ...prevFiles]);
    
    // If auto-attach is enabled, select the file and close
    if (taskId) {
      setTimeout(() => {
        handleFileSelect(file);
      }, 1000); // Give user a moment to see the success message
    }
  };

  const handleCreationError = (error: string) => {
    setCreationError(error);
    setCreationSuccess(null);
  };

  const toggleMimeTypeFilter = (mimeType: string) => {
    setSelectedMimeTypes(prev =>
      prev.includes(mimeType)
        ? prev.filter(type => type !== mimeType)
        : [...prev, mimeType]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedMimeTypes([]);
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
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="drive-file-selector-title"
    >
      <DialogTitle id="drive-file-selector-title" sx={{ pr: 6 }}>
        Select or Create Google Drive File
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

      <DialogContent dividers>
        {/* Success/Error Messages */}
        {creationSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {creationSuccess}
          </Alert>
        )}
        {creationError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {creationError}
          </Alert>
        )}

        {/* File Creator Section */}
        <DriveFileCreator
          taskListId={taskListId}
          taskId={taskId}
          onFileCreated={handleFileCreated}
          onError={handleCreationError}
        />

        <Divider sx={{ my: 3 }}>
          <Typography variant="body2" color="text.secondary">
            OR SELECT EXISTING FILE
          </Typography>
        </Divider>

        {/* Search and Filters */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          {/* File type filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {fileTypeFilters.map(filter => (
              <Chip
                key={filter.mimeType}
                label={filter.label}
                variant={selectedMimeTypes.includes(filter.mimeType) ? 'filled' : 'outlined'}
                onClick={() => toggleMimeTypeFilter(filter.mimeType)}
                color={selectedMimeTypes.includes(filter.mimeType) ? 'primary' : 'default'}
                size="small"
              />
            ))}
            {(searchQuery || selectedMimeTypes.length > 0) && (
              <Chip
                label="Clear filters"
                variant="outlined"
                onClick={clearFilters}
                size="small"
                color="secondary"
              />
            )}
          </Box>
        </Box>

        {/* Loading state */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Error state */}
        {error && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="error" gutterBottom>
              {error}
            </Typography>
            <Button onClick={loadFiles} variant="outlined">
              Retry
            </Button>
          </Box>
        )}

        {/* Files list */}
        {!loading && !error && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {filteredFiles.length} of {files.length} files
              {searchQuery && ` matching "${searchQuery}"`}
            </Typography>

            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {filteredFiles.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    {files.length === 0 ? 'No files found in Google Drive' : 'No files match your search criteria'}
                  </Typography>
                </Box>
              ) : (
                filteredFiles.map((file) => (
                  <ListItem key={file.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleFileSelect(file)}
                      disabled={externalLoading}
                    >
                      <ListItemIcon>
                        {renderFileTypeIcon(file.mimeType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name || 'Unnamed file'}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(file.size)}
                              {file.modifiedTime && (
                                <> • Modified {new Date(file.modifiedTime).toLocaleDateString()}</>
                              )}
                            </Typography>
                          </Box>
                        }
                      />
                      <AttachFileIcon color="action" />
                    </ListItemButton>
                  </ListItem>
                ))
              )}
            </List>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DriveFileSelector; 