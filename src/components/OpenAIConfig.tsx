import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  Snackbar,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import { initializeOpenAI, isOpenAIAvailable, sendOpenAIQuery } from '../services/openaiService';

interface OpenAIConfigProps {
  onClose?: () => void;
}

const OpenAIConfig: React.FC<OpenAIConfigProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'unconfigured' | 'configured' | 'verified' | 'error'>('unconfigured');
  const [message, setMessage] = useState<string>('');
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [useLocalFallback, setUseLocalFallback] = useState<boolean>(
    localStorage.getItem('useLocalAIFallback') !== 'false' // Default to true
  );

  // Check if OpenAI is already configured
  useEffect(() => {
    const openaiAvailable = isOpenAIAvailable();
    setIsConfigured(openaiAvailable);
    setApiKeyStatus(openaiAvailable ? 'configured' : 'unconfigured');
    
    // Try to get the stored key to show in the field
    const storedKey = localStorage.getItem('openaiApiKey');
    if (storedKey) {
      // Mask the key for display
      setApiKey(maskAPIKey(storedKey));
    }
  }, []);

  const maskAPIKey = (key: string): string => {
    // Only show first 4 and last 4 characters
    if (key.length <= 8) return key;
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const handleApiKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
  };

  const handleToggleLocalFallback = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setUseLocalFallback(newValue);
    localStorage.setItem('useLocalAIFallback', newValue.toString());
  };

  const handleSaveConfig = async () => {
    if (!apiKey.trim()) {
      setMessage('Please enter a valid API key');
      setIsSuccess(false);
      setShowSnackbar(true);
      return;
    }

    setIsLoading(true);
    
    try {
      // If the API key is masked, it means we're using the stored key
      const keyToUse = apiKey.includes('...') ? localStorage.getItem('openaiApiKey') || '' : apiKey.trim();
      
      // Try to initialize OpenAI with the provided API key
      const success = initializeOpenAI(keyToUse);
      
      if (success) {
        // Only save to localStorage if it's a new key (not the masked version)
        if (!apiKey.includes('...')) {
          localStorage.setItem('openaiApiKey', keyToUse);
        }
        
        setMessage('OpenAI API configured successfully! Testing connection...');
        setIsSuccess(true);
        setIsConfigured(true);
        setApiKeyStatus('configured');
        
        // Test the connection
        testAPIConnection();
      } else {
        setMessage('Failed to initialize OpenAI client. Please check your API key format.');
        setIsSuccess(false);
        setApiKeyStatus('error');
      }
    } catch (error) {
      console.error('Error configuring OpenAI:', error);
      setMessage('An error occurred while configuring OpenAI');
      setIsSuccess(false);
      setApiKeyStatus('error');
    } finally {
      setShowSnackbar(true);
      setIsLoading(false);
    }
  };

  const testAPIConnection = async () => {
    setIsTesting(true);
    
    try {
      // Make a simple query to test the connection
      const testResponse = await sendOpenAIQuery([
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Respond with "Connection successful" if you receive this message.' }
      ], 'gpt-3.5-turbo', 0.7, 20);
      
      if (testResponse && testResponse.includes('Connection successful')) {
        setApiKeyStatus('verified');
        setMessage('OpenAI API connection verified successfully!');
        setIsSuccess(true);
        setShowSnackbar(true);
      } else {
        setApiKeyStatus('error');
        setMessage('API key accepted, but connection test failed. The key may be invalid or rate limited.');
        setIsSuccess(false);
        setShowSnackbar(true);
      }
    } catch (error) {
      console.error('Error testing OpenAI connection:', error);
      setApiKeyStatus('error');
      setMessage('Error testing connection. Please check your API key and try again.');
      setIsSuccess(false);
      setShowSnackbar(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearConfig = () => {
    // Clear the API key from localStorage
    localStorage.removeItem('openaiApiKey');
    localStorage.removeItem('openaiModel');
    
    // Reset states
    setApiKey('');
    setIsConfigured(false);
    setApiKeyStatus('unconfigured');
    setMessage('OpenAI configuration cleared');
    setShowSnackbar(true);
    
    // Reinitialize OpenAI with no key to ensure it's cleared
    initializeOpenAI(undefined);
  };

  const handleSnackbarClose = () => {
    setShowSnackbar(false);
  };

  const getApiKeyStatusColor = () => {
    switch (apiKeyStatus) {
      case 'verified': return 'success';
      case 'configured': return 'info';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getApiKeyStatusText = () => {
    switch (apiKeyStatus) {
      case 'verified': return 'Verified';
      case 'configured': return 'Configured (Not Verified)';
      case 'error': return 'Error';
      default: return 'Not Configured';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 500, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        OpenAI Configuration
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure your OpenAI API key to enable AI assistant capabilities beyond local responses.
      </Typography>
      
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">Status:</Typography>
        <Chip 
          label={getApiKeyStatusText()} 
          color={getApiKeyStatusColor() as any}
          size="small"
        />
      </Box>
      
      {apiKeyStatus === 'verified' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          OpenAI API is configured and working properly
        </Alert>
      )}
      
      {apiKeyStatus === 'configured' && !isTesting && (
        <Alert severity="info" sx={{ mb: 2 }}>
          OpenAI API key is configured but hasn't been verified
        </Alert>
      )}
      
      {apiKeyStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          There was an issue with your OpenAI API key. It may be invalid or rate limited.
        </Alert>
      )}
      
      <Box component="form" noValidate autoComplete="off" sx={{ mt: 2 }}>
        <TextField
          label="OpenAI API Key"
          type="password"
          fullWidth
          value={apiKey}
          onChange={handleApiKeyChange}
          margin="normal"
          helperText="Your API key will only be stored in your browser's local storage"
          placeholder="sk-..."
        />
        
        <FormControlLabel
          control={
            <Switch 
              checked={useLocalFallback}
              onChange={handleToggleLocalFallback}
            />
          }
          label="Use local responses when OpenAI is unavailable"
          sx={{ mb: 2 }}
        />
        
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSaveConfig}
            disabled={isLoading || isTesting}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isConfigured ? 'Update Configuration' : 'Save Configuration'}
          </Button>
          
          {isConfigured && (
            <Button 
              variant="outlined" 
              color="secondary"
              onClick={testAPIConnection}
              disabled={isTesting || !isConfigured}
              startIcon={isTesting ? <CircularProgress size={20} /> : null}
            >
              Test Connection
            </Button>
          )}
          
          {isConfigured && (
            <Button 
              variant="outlined" 
              color="error" 
              onClick={handleClearConfig}
              disabled={isTesting || isLoading}
            >
              Clear Configuration
            </Button>
          )}
          
          {onClose && (
            <Button 
              variant="outlined" 
              onClick={onClose}
            >
              Close
            </Button>
          )}
        </Box>
      </Box>
      
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={isSuccess ? 'success' : 'error'} 
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default OpenAIConfig; 