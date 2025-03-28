import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { handleDocumentUpload, ExtractedContent } from '../utils/documentParser';

interface DocumentUploaderProps {
  onDocumentProcessed: (data: ExtractedContent) => void;
}

const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onDocumentProcessed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedContent | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Check if file is PDF or Word
    if (
      file.type !== 'application/pdf' && 
      file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      file.type !== 'application/msword'
    ) {
      setError('Please upload a PDF or Word document.');
      return;
    }
    
    setIsUploading(true);
    setError(null);
    
    try {
      const data = await handleDocumentUpload(file);
      setExtractedData(data);
      setSuccessMessage('Document successfully processed. Review the extracted data below.');
      setPreviewDialogOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the document.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleImportClick = () => {
    // Trigger file input click
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleApplyData = () => {
    if (extractedData) {
      onDocumentProcessed(extractedData);
      setPreviewDialogOpen(false);
      setSuccessMessage('Document data successfully applied to the worksheet.');
    }
  };
  
  const handleClosePreview = () => {
    setPreviewDialogOpen(false);
  };
  
  const handleCloseSnackbar = () => {
    setSuccessMessage(null);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      />
      
      {/* Import button */}
      <Button
        variant="contained"
        onClick={handleImportClick}
        disabled={isUploading}
        startIcon={isUploading ? <CircularProgress size={20} color="inherit" /> : null}
        sx={{ 
          fontFamily: 'Poppins',
          textTransform: 'none',
          backgroundColor: '#1056F5',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          px: 3,
          py: 1
        }}
      >
        {isUploading ? 'Importing...' : 'Import'}
      </Button>
      
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* Success Message */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity="success"
          sx={{ width: '100%', fontFamily: 'Poppins' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
      
      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Poppins' }}>
          Document Data Preview
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontFamily: 'Poppins' }}>
            Review the extracted data before applying it to your worksheet:
          </DialogContentText>
          
          {extractedData && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins', color: '#1056F5', mt: 2 }}>
                Personal Values
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • What am I most proud of: {extractedData.personalValues.proudOf.filter(Boolean).join(', ') || '(No data extracted)'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • What did it take: {extractedData.personalValues.achievement.filter(Boolean).join(', ') || '(No data extracted)'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • What makes me happiest: {extractedData.personalValues.happiness.filter(Boolean).join(', ') || '(No data extracted)'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • Who I find inspiring: {extractedData.personalValues.inspiration.filter(Boolean).join(', ') || '(No data extracted)'}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins', color: '#1056F5', mt: 2 }}>
                Core Values & Productivity
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • My Values: {extractedData.productivityConnection.coreValues ? 'Data found' : '(No data extracted)'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • Productivity Impact: {extractedData.productivityConnection.valueImpact ? 'Data found' : '(No data extracted)'}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins', color: '#1056F5', mt: 2 }}>
                Goals
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • Description: {extractedData.goals.description ? 'Data found' : '(No data extracted)'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • Impact: {extractedData.goals.impact.some(Boolean) ? 'Data found' : '(No data extracted)'}
              </Typography>
              
              <Typography variant="subtitle2" sx={{ fontFamily: 'Poppins', color: '#1056F5', mt: 2 }}>
                Workshop Output
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • Actions: {extractedData.workshopOutput.actions.some(Boolean) ? 'Data found' : '(No data extracted)'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mt: 1 }}>
                • Reflections: {extractedData.workshopOutput.reflections ? 'Data found' : '(No data extracted)'}
              </Typography>
            </Box>
          )}
          
          <Alert severity="info" sx={{ mt: 2 }}>
            Note: The system extracts data based on pattern matching. Some fields may not be extracted correctly depending on the document formatting.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleClosePreview} 
            sx={{ fontFamily: 'Poppins', color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApplyData} 
            variant="contained"
            sx={{ 
              fontFamily: 'Poppins', 
              textTransform: 'none',
              backgroundColor: '#1056F5'
            }}
          >
            Apply to Worksheet
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DocumentUploader; 