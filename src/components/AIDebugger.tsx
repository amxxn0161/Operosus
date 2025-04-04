import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { isOpenAIAvailable, sendOpenAIQuery, getApiKey } from '../services/openaiService';

/**
 * A debugging component to verify OpenAI integration is working
 */
const AIDebugger: React.FC = () => {
  const [openaiAvailable, setOpenaiAvailable] = useState<boolean>(false);
  const [apiKeyDetected, setApiKeyDetected] = useState<boolean>(false);
  const [testQuery, setTestQuery] = useState<string>('Suggest three ways to improve productivity based on common distractions.');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Check if OpenAI is available
    const available = isOpenAIAvailable();
    setOpenaiAvailable(available);
    
    // Check if API key is configured
    const apiKey = getApiKey();
    setApiKeyDetected(!!apiKey);
    
    // Add initial logs
    addLog(`OpenAI available: ${available}`);
    addLog(`API key detected: ${!!apiKey}`);
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTestQuery(event.target.value);
  };

  const handleSendQuery = async () => {
    if (!testQuery.trim()) {
      addLog('ERROR: Empty query');
      return;
    }

    setIsLoading(true);
    addLog(`Sending test query: "${testQuery.substring(0, 30)}..."`);
    
    try {
      // Simple message array with the test query
      const response = await sendOpenAIQuery([
        { role: 'system', content: 'You are a helpful assistant focusing on productivity advice.' },
        { role: 'user', content: testQuery }
      ]);
      
      if (response) {
        addLog('Received OpenAI response successfully');
        setTestResponse(response);
      } else {
        addLog('ERROR: No response received from OpenAI');
        setTestResponse('Error: No response received from OpenAI');
      }
    } catch (error) {
      console.error('Error in test query:', error);
      addLog(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTestResponse('Error occurred during the test. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        OpenAI Integration Debugger
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use this tool to verify that the OpenAI integration is working correctly.
        </Typography>
        
        {openaiAvailable ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            OpenAI client is initialized and available
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>
            OpenAI client is NOT available
          </Alert>
        )}
        
        {apiKeyDetected ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            API key is detected
          </Alert>
        ) : (
          <Alert severity="error" sx={{ mb: 2 }}>
            No API key detected
          </Alert>
        )}
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Test OpenAI Query
      </Typography>
      
      <TextField
        label="Test Query"
        fullWidth
        multiline
        rows={3}
        value={testQuery}
        onChange={handleQueryChange}
        margin="normal"
        disabled={isLoading}
      />
      
      <Box sx={{ mt: 2, mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleSendQuery}
          disabled={isLoading || !openaiAvailable}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
          sx={{ mr: 2 }}
        >
          {isLoading ? 'Sending...' : 'Send Test Query'}
        </Button>
      </Box>
      
      {testResponse && (
        <Box sx={{ mt: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Response:
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: 'background.default',
              borderRadius: 1,
              maxHeight: '200px',
              overflow: 'auto'
            }}
          >
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {testResponse}
            </Typography>
          </Paper>
        </Box>
      )}
      
      <Divider sx={{ mb: 3 }} />
      
      <Typography variant="h6" gutterBottom>
        Debug Logs
      </Typography>
      
      <Paper
        variant="outlined"
        sx={{
          maxHeight: '200px',
          overflow: 'auto',
          backgroundColor: '#1e1e1e',
          color: '#eee',
          p: 1,
          fontFamily: 'monospace'
        }}
      >
        <List dense disablePadding>
          {logs.map((log, index) => (
            <ListItem key={index} disablePadding sx={{ py: 0 }}>
              <ListItemText
                primary={log}
                primaryTypographyProps={{
                  sx: { 
                    fontSize: '0.85rem', 
                    color: log.includes('ERROR') ? '#ff6b6b' : '#eee'
                  }
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Paper>
  );
};

export default AIDebugger; 