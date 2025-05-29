import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Button,
  Paper
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';

const API_BASE_URL = process.env.REACT_APP_API_TARGET || 'https://app2.operosus.com';

interface UserData {
  googleId: string;
  userEmail: string;
  datasetName: string;
}

interface DashboardData {
  guestToken: string;
  userData: UserData;
}

interface SupersetApiResponse {
  success: boolean;
  data: {
    guestToken: string;
    dashboardId: string;
    userEmail: string;
    googleId: string;
    datasetName: string;
    supersetDomain: string;
    embedConfig: {
      hideTitle: boolean;
      hideChartControls: boolean;
    };
  };
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const dashboardId = 'a19c2e0f-6992-44ed-ad4c-105e4f8df16c';

  const fetchUserData = async (): Promise<UserData> => {
    const token = localStorage.getItem('authToken');
    console.log('Fetching user data with auth token:', token ? 'exists' : 'missing');
    
    const response = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('User data response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('User data fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch user data: ${response.status} - ${errorText}`);
    }

    const userData = await response.json();
    console.log('User data response:', userData);
    
    // Use datasetName from API response if available, otherwise determine from email
    let datasetName = userData.datasetName;
    if (!datasetName) {
      // Fallback: determine dataset based on email domain (as shown in the Dart code)
      datasetName = 'customer_individual_user';
      if (userData.userEmail && userData.userEmail.includes('purple')) {
        datasetName = 'customer_purple_ai';
      }
    }

    const result = {
      googleId: userData.googleId,
      userEmail: userData.userEmail,
      datasetName
    };
    
    console.log('Processed user data:', result);
    return result;
  };

  const fetchGuestToken = async (): Promise<string> => {
    const token = localStorage.getItem('authToken');
    console.log('Fetching guest token with auth token:', token ? 'exists' : 'missing');
    
    const response = await fetch(`${API_BASE_URL}/api/superset/dashboard-data`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Guest token response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Guest token fetch failed:', response.status, errorText);
      throw new Error(`Failed to fetch guest token: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Guest token response data:', responseData);
    
    // Handle different possible response formats
    let guestToken: string;
    if (responseData.data && responseData.data.guestToken) {
      // Format: { success: true, data: { guestToken: "..." } }
      guestToken = responseData.data.guestToken;
    } else if (responseData.guestToken) {
      // Format: { guestToken: "..." }
      guestToken = responseData.guestToken;
    } else {
      console.error('No guestToken found in response:', responseData);
      throw new Error('No guestToken found in response');
    }
    
    console.log('Extracted guest token:', guestToken ? 'exists' : 'missing');
    return guestToken;
  };

  const generateEmbedHTML = (guestToken: string, userData: UserData): string => {
    return `<!doctype html>
<html>
    <head>
        <title>Leaderboard Dashboard</title>
        <style>
            html, body {
                height: 100%;
                margin: 0;
                padding: 0;
                font-family: 'Poppins', 'Roboto', 'Helvetica', 'Arial', sans-serif;
                background-color: #f5f5f5;
            }
            iframe {
                width: 100%;
                height: 100vh;
                border: none;
                border-radius: 8px;
            }
            #dashboard-container {
                width: 100%;
                height: 100vh;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
        </style>
        <script src="https://unpkg.com/@superset-ui/embedded-sdk"></script>
    </head>
    <body>
        <div id="dashboard-container"></div>
        <script>
            console.log('=== SUPERSET DASHBOARD INITIALIZATION ===');
            console.log('Dashboard ID: ${dashboardId}');
            console.log('Guest Token (truncated):', '${guestToken.substring(0, 20)}...');
            console.log('Dataset Name:', '${userData.datasetName}');
            console.log('Google ID:', '${userData.googleId}');
            console.log('User Email:', '${userData.userEmail}');
            console.log('=======================================');
            
            const fetchGuestTokenFunction = async () => {
                console.log('Superset SDK requesting guest token...');
                try {
                    const response = await fetch('${API_BASE_URL}/api/superset/dashboard-data', {
                        method: 'GET',
                        headers: {
                            'Authorization': 'Bearer ' + localStorage.getItem('authToken'),
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (!response.ok) {
                        console.error('Failed to fetch guest token:', response.status, response.statusText);
                        throw new Error('Failed to fetch guest token: ' + response.status);
                    }
                    
                    const data = await response.json();
                    console.log('Fresh guest token fetched by SDK');
                    
                    // Handle different possible response formats
                    let guestToken;
                    if (data.data && data.data.guestToken) {
                        guestToken = data.data.guestToken;
                    } else if (data.guestToken) {
                        guestToken = data.guestToken;
                    } else {
                        throw new Error('No guestToken found in response');
                    }
                    
                    return guestToken;
                } catch (error) {
                    console.error('Error fetching fresh guest token:', error);
                    console.log('Using cached guest token as fallback');
                    // Fallback to the token we already have
                    return '${guestToken}';
                }
            };
            
            supersetEmbeddedSdk.embedDashboard({
                id: '${dashboardId}', 
                supersetDomain: 'https://superset.operosus.com', 
                mountPoint: document.getElementById('dashboard-container'),
                fetchGuestToken: fetchGuestTokenFunction,
                dashboardUiConfig: {
                    hideTitle: true,
                    hideChartControls: true,
                    urlParams: {
                        my_dataset: '${userData.datasetName}',
                        google_id: '${userData.googleId}',
                    }
                },
            }).then(() => {
                console.log('Dashboard embedded successfully');
            }).catch((error) => {
                console.error('Error embedding dashboard:', error);
                // Show error message to user
                document.getElementById('dashboard-container').innerHTML = 
                    '<div style="padding: 20px; text-align: center; color: #f44336;"><h3>Error loading dashboard</h3><p>' + error.message + '</p><p>Check console for details</p></div>';
            });
        </script>
    </body>
</html>`;
  };

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all dashboard data from superset API
      const token = localStorage.getItem('authToken');
      console.log('Fetching dashboard data with auth token:', token ? 'exists' : 'missing');
      
      const response = await fetch(`${API_BASE_URL}/api/superset/dashboard-data`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Dashboard data response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Dashboard data fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch dashboard data: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Dashboard data response:', responseData);
      
      // Handle different possible response formats
      let guestToken: string;
      let userData: UserData;
      
      if (responseData.data) {
        // Format: { success: true, data: { guestToken: "...", userEmail: "...", etc } }
        const data = responseData.data;
        guestToken = data.guestToken;
        userData = {
          googleId: data.googleId || '',
          userEmail: data.userEmail || '',
          datasetName: data.datasetName || ''
        };
      } else if (responseData.guestToken) {
        // Format: { guestToken: "...", userEmail: "...", etc }
        guestToken = responseData.guestToken;
        userData = {
          googleId: responseData.googleId || '',
          userEmail: responseData.userEmail || '',
          datasetName: responseData.datasetName || ''
        };
      } else {
        console.error('Invalid response format:', responseData);
        throw new Error('Invalid API response format');
      }
      
      if (!guestToken) {
        throw new Error('No guestToken found in response');
      }
      
      // If we don't have user data from the superset API, fetch it separately
      if (!userData.googleId || !userData.userEmail) {
        console.log('Missing user data from superset API, fetching from /api/user...');
        try {
          const userResponse = await fetch(`${API_BASE_URL}/api/user`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (userResponse.ok) {
            const userApiData = await userResponse.json();
            console.log('User API response:', userApiData);
            userData.googleId = userData.googleId || userApiData.googleId || '';
            userData.userEmail = userData.userEmail || userApiData.userEmail || '';
          }
        } catch (userErr) {
          console.warn('Failed to fetch user data:', userErr);
        }
      }
      
      if (!userData.datasetName) {
        // Fallback: determine dataset based on email domain
        userData.datasetName = 'customer_individual_user';
        if (userData.userEmail && userData.userEmail.includes('purple')) {
          userData.datasetName = 'customer_purple_ai';
        }
        console.log('Dataset name determined from email:', userData.datasetName);
      }
      
      console.log('Extracted guest token:', guestToken ? 'exists' : 'missing');
      console.log('Extracted user data:', userData);

      setDashboardData({ guestToken, userData });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadDashboard();
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back to Calendar
          </Button>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '60vh',
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Loading your leaderboard dashboard...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back to Calendar
          </Button>
        </Box>
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={handleRetry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Back to Calendar
          </Button>
        </Box>
        <Alert severity="warning">
          No dashboard data available. Please try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      position: 'fixed',
      top: '60px', // Account for header height
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      maxWidth: '100vw',
      height: 'calc(100vh - 60px)',
      overflow: 'hidden',
      m: 0,
      p: 0,
      boxSizing: 'border-box',
      zIndex: 10,
      transform: 'translateZ(0)',
      willChange: 'transform',
      backgroundColor: 'background.paper'
    }}>
      {/* Minimal Header - just back and refresh buttons */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 1,
        borderBottom: '1px solid #e8e8e8',
        bgcolor: 'background.paper',
        minHeight: '48px',
        flexShrink: 0
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          size="small"
          sx={{ fontSize: '0.875rem' }}
        >
          Back to Calendar
        </Button>
        <Button
          startIcon={<RefreshIcon />}
          onClick={handleRetry}
          variant="outlined"
          size="small"
          sx={{ fontSize: '0.875rem' }}
        >
          Refresh
        </Button>
      </Box>

      {/* Dashboard Container - takes remaining space */}
      <Box sx={{ 
        flexGrow: 1, 
        height: 'calc(100% - 48px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <iframe
          srcDoc={generateEmbedHTML(dashboardData.guestToken, dashboardData.userData)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          title="Leaderboard Dashboard"
        />
      </Box>
    </Box>
  );
};

export default Leaderboard; 