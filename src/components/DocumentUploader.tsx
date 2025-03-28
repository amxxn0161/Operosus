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
      console.log("Starting document extraction process for file:", file.name);
      
      const data = await handleDocumentUpload(file);
      
      console.log("Document extraction completed. Results:");
      console.log("- Personal Values:", {
        proudOf: data.personalValues.proudOf,
        achievement: data.personalValues.achievement,
        happiness: data.personalValues.happiness,
        inspiration: data.personalValues.inspiration
      });
      console.log("- Core Values:", data.productivityConnection.coreValues ? "Present" : "Not found");
      console.log("- Productivity Connection:", data.productivityConnection.valueImpact ? "Present" : "Not found");
      console.log("- Goals:", data.goals.description ? "Present" : "Not found");
      console.log("- Workshop Output:", data.workshopOutput.actions.some(a => a) ? "Present" : "Not found");
      
      setExtractedData(data);
      setSuccessMessage('Document successfully processed. Review the extracted data below.');
      setPreviewDialogOpen(true);
    } catch (err) {
      console.error("Document extraction failed:", err);
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
      try {
        // Create a deep copy to avoid mutations
        const processedData: ExtractedContent = JSON.parse(JSON.stringify(extractedData));
        
        // Advanced debugging output for field mapping
        console.log("===== DOCUMENT EXTRACTION FIELD MAPPING ANALYSIS =====");
        console.log("1. What am I most proud of? →", processedData.personalValues.proudOf);
        console.log("2. What did it take? →", processedData.personalValues.achievement);
        console.log("3. What makes me happiest? →", processedData.personalValues.happiness);
        console.log("4. Who do I find inspiring? →", processedData.personalValues.inspiration);
        
        // Analyze the distribution of content across fields
        const fieldCounts = {
          proudOf: processedData.personalValues.proudOf.filter(Boolean).length,
          achievement: processedData.personalValues.achievement.filter(Boolean).length,
          happiness: processedData.personalValues.happiness.filter(Boolean).length,
          inspiration: processedData.personalValues.inspiration.filter(Boolean).length
        };
        
        console.log("Field content distribution:", fieldCounts);
        
        // Check for structural imbalances that might indicate wrong field mapping
        const hasImbalance = (Math.max(...Object.values(fieldCounts)) > 0) && 
                            (Object.values(fieldCounts).filter(count => count === 0).length >= 2);
        
        // Common 2x2 grid format that causes incorrect grouping
        const has2x2GridPattern = (
          // Case 1: Content in fields 1 & 3, but not 2 & 4
          (fieldCounts.proudOf > 0 && fieldCounts.achievement === 0 && 
           fieldCounts.happiness > 0 && fieldCounts.inspiration === 0) ||
          // Case 2: Content in fields 2 & 4, but not 1 & 3
          (fieldCounts.proudOf === 0 && fieldCounts.achievement > 0 && 
           fieldCounts.happiness === 0 && fieldCounts.inspiration > 0)
        );
        
        // If we detect a 2x2 grid pattern, rebalance the fields based on structure
        if (has2x2GridPattern) {
          console.log("📊 Detected 2x2 grid format with imbalanced field mapping");
          
          // Case 1: Content in fields 1 & 3, but not 2 & 4
          if (fieldCounts.proudOf > 0 && fieldCounts.achievement === 0 && 
              fieldCounts.happiness > 0 && fieldCounts.inspiration === 0) {
            console.log("🔄 Rebalancing fields: Moving content from happiness to achievement");
            processedData.personalValues.achievement = [...processedData.personalValues.happiness];
            processedData.personalValues.happiness = ['', '', ''];
          }
          // Case 2: Content in fields 2 & 4, but not 1 & 3
          else if (fieldCounts.proudOf === 0 && fieldCounts.achievement > 0 && 
                  fieldCounts.happiness === 0 && fieldCounts.inspiration > 0) {
            console.log("🔄 Rebalancing fields: Moving content from achievement to proudOf");
            processedData.personalValues.proudOf = [...processedData.personalValues.achievement];
            processedData.personalValues.achievement = [...processedData.personalValues.inspiration];
            processedData.personalValues.inspiration = ['', '', ''];
          }
        }
        // Check for the case where all content is in one field
        else if (hasImbalance) {
          const nonEmptyField = Object.entries(fieldCounts)
            .find(([_, count]) => count > 8)?.[0] as keyof typeof processedData.personalValues | undefined;
          
          if (nonEmptyField && fieldCounts[nonEmptyField] >= 8) {
            console.log(`🔄 Detected all content in single field: ${nonEmptyField}`);
            
            // Get all content from the non-empty field
            const allContent = [...processedData.personalValues[nonEmptyField]].filter(Boolean);
            
            // Distribute content across all fields
            if (allContent.length >= 8) {
              console.log("🔄 Distributing content from single field to all fields");
              
              // Distribute items across fields (3 items per field)
              processedData.personalValues.proudOf = allContent.slice(0, 3);
              processedData.personalValues.achievement = allContent.slice(3, 6);
              processedData.personalValues.happiness = allContent.slice(6, 9);
              processedData.personalValues.inspiration = allContent.slice(9, 12);
              
              // Ensure each field has exactly 3 elements
              Object.keys(processedData.personalValues).forEach(field => {
                const values = processedData.personalValues[field as keyof typeof processedData.personalValues];
                while (values.length < 3) values.push('');
                if (values.length > 3) values.splice(3);
              });
            }
          }
        }
        
        // Ensure each personal value array has exactly 3 elements
        const ensureThreeElements = (arr: string[]): string[] => {
          const result = arr.filter(Boolean); // Remove empty strings
          while (result.length < 3) result.push('');
          return result.slice(0, 3);
        };
        
        // Define question patterns to filter out questions accidentally included as content
        const questionPatterns = [
          /what am i most proud of\??/i,
          /what did it take for me to achieve those things\??/i,
          /what makes me happiest in life\??/i,
          /who do i find inspiring|qualities i am admiring/i
        ];
        
        // Remove any question text from content fields
        Object.keys(processedData.personalValues).forEach(field => {
          const values = processedData.personalValues[field as keyof typeof processedData.personalValues] as string[];
          for (let i = 0; i < values.length; i++) {
            if (values[i] && questionPatterns.some(pattern => pattern.test(values[i]))) {
              console.log(`Removing question text from ${field}[${i}]: "${values[i]}"`);
              values[i] = '';
            }
          }
        });
        
        // Process each personal value array to ensure three elements
        processedData.personalValues.proudOf = ensureThreeElements(processedData.personalValues.proudOf);
        processedData.personalValues.achievement = ensureThreeElements(processedData.personalValues.achievement);
        processedData.personalValues.happiness = ensureThreeElements(processedData.personalValues.happiness);
        processedData.personalValues.inspiration = ensureThreeElements(processedData.personalValues.inspiration);
        
        // Log the final processed data
        console.log("FINAL PROCESSED DATA TO APPLY:");
        console.log("1. What am I most proud of? →", processedData.personalValues.proudOf);
        console.log("2. What did it take? →", processedData.personalValues.achievement);
        console.log("3. What makes me happiest? →", processedData.personalValues.happiness);
        console.log("4. Who do I find inspiring? →", processedData.personalValues.inspiration);
        console.log("========================================");
        
        // Send the processed data to the parent component
        onDocumentProcessed(processedData);
        setPreviewDialogOpen(false);
        setSuccessMessage('Document data successfully applied to the worksheet.');
      } catch (error) {
        console.error("Error processing extracted data:", error);
        setError("Error processing document data. Please try again.");
      }
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
            Note: The system extracts data based on document structure and proximity of content to questions. Some fields may not be extracted correctly depending on the document formatting.
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