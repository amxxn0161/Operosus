import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const DiagnosticPage: React.FC = () => {
  const { isAuthenticated, token, user, refreshUserProfile } = useAuth();
  const [localStorageItems, setLocalStorageItems] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileTestResult, setProfileTestResult] = useState<any>(null);

  // Get all localStorage items
  useEffect(() => {
    const items: {[key: string]: string} = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        items[key] = value;
      }
    }
    setLocalStorageItems(items);
  }, []);

  // Test the profile API
  const testProfileApi = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('https://app2.operosus.com/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setProfileTestResult(data);
      
      if (!response.ok) {
        setError(`API Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      setError(`Error testing API: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    try {
      await refreshUserProfile();
      // Refresh localStorage display
      const items: {[key: string]: string} = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          items[key] = value;
        }
      }
      setLocalStorageItems(items);
    } catch (err) {
      setError(`Error refreshing profile: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
        Diagnostic Page
      </Typography>

      {/* Authentication Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Authentication Status
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText 
              primary="Is Authenticated" 
              secondary={isAuthenticated ? '✅ Yes' : '❌ No'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Token Available" 
              secondary={token ? `✅ Yes (${token.substring(0, 10)}...)` : '❌ No'} 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="User Object" 
              secondary={user ? '✅ Available' : '❌ Not available'} 
            />
          </ListItem>
          {user && (
            <>
              <ListItem>
                <ListItemText 
                  primary="User ID" 
                  secondary={user.id || 'Not available'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="User Name" 
                  secondary={user.name || 'Not available'} 
                />
              </ListItem>
              <ListItem>
                <ListItemText 
                  primary="User Email" 
                  secondary={user.email || 'Not available'} 
                />
              </ListItem>
            </>
          )}
        </List>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRefreshProfile}
            sx={{ mr: 2 }}
          >
            Refresh User Profile
          </Button>
        </Box>
      </Paper>

      {/* LocalStorage Items */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          LocalStorage Contents
        </Typography>
        <List dense>
          {Object.entries(localStorageItems).map(([key, value]) => (
            <ListItem key={key}>
              <ListItemText 
                primary={key} 
                secondary={
                  key.includes('token') 
                    ? `${value.substring(0, 10)}...` 
                    : value
                } 
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* API Test */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Test Profile API
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={testProfileApi}
            disabled={isLoading || !token}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Test Profile API'}
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {profileTestResult && (
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f5f5f5', 
            borderRadius: 1,
            maxHeight: '300px',
            overflow: 'auto'
          }}>
            <pre>{JSON.stringify(profileTestResult, null, 2)}</pre>
          </Box>
        )}
      </Paper>

      {/* Common Issues */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Common Issues
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="No token in localStorage" 
              secondary="If you're not seeing a token, you need to log in again."
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Profile API returns error" 
              secondary="This could indicate an expired token or server issues."
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="User name not displayed" 
              secondary="Check if the API is returning the correct user data structure."
            />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default DiagnosticPage; 