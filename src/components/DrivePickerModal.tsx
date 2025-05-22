import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  IconButton,
  InputAdornment,
  Tooltip,
  Pagination,
  Divider
} from '@mui/material';
import {
  Description as DocIcon,
  ViewColumn as SheetIcon,
  Slideshow as SlideIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
  InsertDriveFile as FileIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { listDriveFiles, createGoogleDocument, GoogleDriveFile } from '../services/googleDriveService';

interface DrivePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectFile: (file: GoogleDriveFile) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`drive-tabpanel-${index}`}
      aria-labelledby={`drive-tab-${index}`}
      {...other}
      style={{ padding: '10px 0' }}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const ITEMS_PER_PAGE = 12;

const DrivePickerModal: React.FC<DrivePickerModalProps> = ({ open, onClose, onSelectFile }) => {
  const [tabValue, setTabValue] = useState(0);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [newDocName, setNewDocName] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const [newSlideName, setNewSlideName] = useState('');
  const [creatingDoc, setCreatingDoc] = useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (open && tabValue === 0) {
      fetchFiles();
    }
  }, [open, tabValue, page]);

  const fetchFiles = async () => {
    if (tabValue !== 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await listDriveFiles(
        page > 1 ? nextPageToken : undefined,
        searchQuery || undefined
      );
      
      setFiles(response.files);
      setNextPageToken(response.nextPageToken);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files from Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchFiles();
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
    // Trigger a search with empty query
    setTimeout(() => fetchFiles(), 0);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleFileSelect = (file: GoogleDriveFile) => {
    onSelectFile(file);
    onClose();
  };

  const createNewDocument = async (type: 'document' | 'spreadsheet' | 'presentation', name: string) => {
    if (!name.trim()) return;
    
    setCreatingDoc(true);
    setError(null);
    
    try {
      const newFile = await createGoogleDocument(type, name);
      onSelectFile(newFile);
      onClose();
    } catch (err) {
      console.error(`Error creating ${type}:`, err);
      setError(`Failed to create new ${type}`);
    } finally {
      setCreatingDoc(false);
    }
  };

  const getMimeTypeIcon = (mimeType: string) => {
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

  const getFileCardStyle = (mimeType: string) => {
    let borderColor = '#e0e0e0';
    
    if (mimeType === 'application/vnd.google-apps.document') {
      borderColor = '#4285f4';
    } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      borderColor = '#0f9d58';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      borderColor = '#f4b400';
    }
    
    return {
      border: `1px solid ${borderColor}`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }
    };
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Select from Google Drive</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="drive picker tabs">
          <Tab label="Select from Drive" />
          <Tab label="New Google Doc" />
          <Tab label="New Google Sheet" />
          <Tab label="New Google Slide" />
        </Tabs>
        
        <TabPanel value={tabValue} index={0}>
          <Box mb={2} mt={1}>
            <TextField
              fullWidth
              placeholder="Search files in Google Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearSearch} size="small">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box textAlign="center" color="error.main" p={2}>
              <Typography>{error}</Typography>
            </Box>
          ) : files.length === 0 ? (
            <Box textAlign="center" p={3}>
              <Typography color="textSecondary">
                No files found. Try a different search term.
              </Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={2}>
                {files.map((file) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                    <Card sx={getFileCardStyle(file.mimeType)}>
                      <CardActionArea onClick={() => handleFileSelect(file)}>
                        <Box 
                          display="flex" 
                          justifyContent="center" 
                          p={2}
                          height="80px"
                          alignItems="center"
                        >
                          {file.thumbnailLink ? (
                            <CardMedia
                              component="img"
                              image={file.thumbnailLink}
                              alt={file.name}
                              sx={{ height: 70, objectFit: 'contain' }}
                            />
                          ) : (
                            <Box fontSize="3rem">
                              {getMimeTypeIcon(file.mimeType)}
                            </Box>
                          )}
                        </Box>
                        <CardContent>
                          <Tooltip title={file.name}>
                            <Typography 
                              variant="body2" 
                              noWrap
                              textAlign="center"
                            >
                              {file.name}
                            </Typography>
                          </Tooltip>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              
              {nextPageToken && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination 
                    count={Math.ceil(files.length / ITEMS_PER_PAGE) + (nextPageToken ? 1 : 0)} 
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box p={2}>
            <Typography gutterBottom>Create a new Google Document</Typography>
            <TextField
              fullWidth
              label="Document Name"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              margin="normal"
              variant="outlined"
              disabled={creatingDoc}
            />
            {error && (
              <Typography color="error" variant="body2" mt={1}>
                {error}
              </Typography>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          <Box p={2}>
            <Typography gutterBottom>Create a new Google Spreadsheet</Typography>
            <TextField
              fullWidth
              label="Spreadsheet Name"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              margin="normal"
              variant="outlined"
              disabled={creatingDoc}
            />
            {error && (
              <Typography color="error" variant="body2" mt={1}>
                {error}
              </Typography>
            )}
          </Box>
        </TabPanel>
        
        <TabPanel value={tabValue} index={3}>
          <Box p={2}>
            <Typography gutterBottom>Create a new Google Presentation</Typography>
            <TextField
              fullWidth
              label="Presentation Name"
              value={newSlideName}
              onChange={(e) => setNewSlideName(e.target.value)}
              margin="normal"
              variant="outlined"
              disabled={creatingDoc}
            />
            {error && (
              <Typography color="error" variant="body2" mt={1}>
                {error}
              </Typography>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        
        {tabValue === 0 && (
          <Button onClick={handleSearch} color="primary" startIcon={<SearchIcon />}>
            Search
          </Button>
        )}
        
        {tabValue === 1 && (
          <Button 
            onClick={() => createNewDocument('document', newDocName)}
            color="primary"
            disabled={!newDocName.trim() || creatingDoc}
            startIcon={creatingDoc ? <CircularProgress size={20} /> : <DocIcon />}
          >
            Create Document
          </Button>
        )}
        
        {tabValue === 2 && (
          <Button 
            onClick={() => createNewDocument('spreadsheet', newSheetName)}
            color="primary"
            disabled={!newSheetName.trim() || creatingDoc}
            startIcon={creatingDoc ? <CircularProgress size={20} /> : <SheetIcon />}
          >
            Create Spreadsheet
          </Button>
        )}
        
        {tabValue === 3 && (
          <Button 
            onClick={() => createNewDocument('presentation', newSlideName)}
            color="primary"
            disabled={!newSlideName.trim() || creatingDoc}
            startIcon={creatingDoc ? <CircularProgress size={20} /> : <SlideIcon />}
          >
            Create Presentation
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DrivePickerModal; 