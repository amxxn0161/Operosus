import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tab,
  Tabs
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGoogleServices } from '../contexts/GoogleServicesContext';
import GoogleIcon from '@mui/icons-material/Google';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SyncIcon from '@mui/icons-material/Sync';
import LogoutIcon from '@mui/icons-material/Logout';

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
      id={`google-tabpanel-${index}`}
      aria-labelledby={`google-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const GoogleIntegration: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [syncEnabled, setSyncEnabled] = useState({
    tasks: false,
    calendar: false
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const {
    isSignedIn,
    isInitialized,
    handleSignIn,
    handleSignOut,
    fetchTasks,
    fetchCalendarEvents,
    taskLists,
    loadingTasks,
    loadingEvents,
    error
  } = useGoogleServices();

  useEffect(() => {
    // Redirect to login if not authenticated in our app
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Load the stored sync preferences from localStorage
    const savedPreferences = localStorage.getItem('google_sync_preferences');
    if (savedPreferences) {
      setSyncEnabled(JSON.parse(savedPreferences));
    }
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleGoogleSignIn = async () => {
    try {
      await handleSignIn();
      showNotification('Successfully connected to Google account', 'success');
    } catch (error) {
      showNotification('Failed to connect to Google account', 'error');
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await handleSignOut();
      // Reset sync preferences
      setSyncEnabled({ tasks: false, calendar: false });
      localStorage.removeItem('google_sync_preferences');
      showNotification('Disconnected from Google account', 'info');
    } catch (error) {
      showNotification('Failed to disconnect from Google account', 'error');
    }
  };

  const handleSyncToggle = (service: 'tasks' | 'calendar') => {
    const newState = {
      ...syncEnabled,
      [service]: !syncEnabled[service]
    };
    setSyncEnabled(newState);
    localStorage.setItem('google_sync_preferences', JSON.stringify(newState));
    
    showNotification(
      `${service.charAt(0).toUpperCase() + service.slice(1)} sync ${newState[service] ? 'enabled' : 'disabled'}`,
      'info'
    );
  };

  const showNotification = (message: string, severity: 'success' | 'error' | 'info') => {
    setNotification({
      open: true,
      message,
      severity
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };

  const testTasksSync = async () => {
    try {
      const tasks = await fetchTasks();
      showNotification(`Successfully fetched ${tasks.length} tasks`, 'success');
    } catch (error) {
      showNotification('Failed to fetch tasks', 'error');
    }
  };

  const testCalendarSync = async () => {
    try {
      // Fetch events for the next 7 days
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);
      
      const events = await fetchCalendarEvents(now.toISOString(), nextWeek.toISOString());
      showNotification(`Successfully fetched ${events.length} events for the next 7 days`, 'success');
    } catch (error) {
      showNotification('Failed to fetch calendar events', 'error');
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        sx={{ fontWeight: 'bold', fontFamily: 'Poppins', mb: 3 }}
      >
        Google Integration
      </Typography>

      <Paper sx={{ p: 4, borderRadius: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <GoogleIcon sx={{ fontSize: 32, color: '#1056F5', mr: 2 }} />
          <Typography variant="h5" sx={{ fontFamily: 'Poppins', fontWeight: 'bold' }}>
            Google Account
          </Typography>
        </Box>

        {!isInitialized ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : isSignedIn ? (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your Google account is connected. You can now sync your tasks and calendar.
            </Alert>
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleGoogleSignOut}
              sx={{ 
                fontFamily: 'Poppins', 
                textTransform: 'none',
              }}
            >
              Disconnect Google Account
            </Button>
          </Box>
        ) : (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Connect your Google account to sync your tasks and calendar with Productivity Pulse.
            </Alert>
            <Button
              variant="contained"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              sx={{ 
                fontFamily: 'Poppins', 
                textTransform: 'none',
                backgroundColor: '#1056F5',
                '&:hover': {
                  backgroundColor: '#0D47D9',
                },
              }}
            >
              Connect Google Account
            </Button>
          </Box>
        )}
      </Paper>

      {isSignedIn && (
        <Paper sx={{ borderRadius: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  fontFamily: 'Poppins',
                  textTransform: 'none',
                  fontWeight: 'medium',
                },
                '& .Mui-selected': {
                  color: '#1056F5',
                  fontWeight: 'bold',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1056F5',
                },
              }}
            >
              <Tab 
                label="Tasks" 
                icon={<TaskAltIcon />} 
                iconPosition="start" 
              />
              <Tab 
                label="Calendar" 
                icon={<CalendarMonthIcon />} 
                iconPosition="start" 
              />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 2 }}>
                Google Tasks Integration
              </Typography>
              
              <Typography variant="body1" sx={{ fontFamily: 'Poppins', mb: 3, color: 'text.secondary' }}>
                Sync your Google Tasks with Productivity Pulse to manage all your tasks in one place.
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Enable Tasks Sync" 
                    secondary="Allow the app to sync tasks between Productivity Pulse and Google Tasks"
                    primaryTypographyProps={{ fontFamily: 'Poppins', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ fontFamily: 'Poppins' }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={syncEnabled.tasks}
                      onChange={() => handleSyncToggle('tasks')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                
                {taskLists.length > 0 && (
                  <>
                    <ListItem>
                      <ListItemText 
                        primary="Available Task Lists" 
                        secondary="Your Google Tasks lists that will be synced"
                        primaryTypographyProps={{ fontFamily: 'Poppins', fontWeight: 'medium' }}
                        secondaryTypographyProps={{ fontFamily: 'Poppins' }}
                      />
                    </ListItem>
                    
                    {taskLists.map((list: any) => (
                      <ListItem key={list.id} sx={{ pl: 4 }}>
                        <ListItemText 
                          primary={list.title} 
                          primaryTypographyProps={{ fontFamily: 'Poppins' }}
                        />
                      </ListItem>
                    ))}
                    <Divider />
                  </>
                )}
                
                <ListItem>
                  <Button
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={testTasksSync}
                    disabled={loadingTasks || !isSignedIn}
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none',
                      color: '#1056F5',
                      borderColor: '#1056F5',
                    }}
                  >
                    {loadingTasks ? 'Testing...' : 'Test Tasks Sync'}
                  </Button>
                </ListItem>
              </List>
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 2 }}>
                Google Calendar Integration
              </Typography>
              
              <Typography variant="body1" sx={{ fontFamily: 'Poppins', mb: 3, color: 'text.secondary' }}>
                Sync your Google Calendar with Productivity Pulse to view and manage your events.
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Enable Calendar Sync" 
                    secondary="Allow the app to sync calendar events between Productivity Pulse and Google Calendar"
                    primaryTypographyProps={{ fontFamily: 'Poppins', fontWeight: 'medium' }}
                    secondaryTypographyProps={{ fontFamily: 'Poppins' }}
                  />
                  <ListItemSecondaryAction>
                    <Switch
                      edge="end"
                      checked={syncEnabled.calendar}
                      onChange={() => handleSyncToggle('calendar')}
                      color="primary"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
                
                <ListItem>
                  <Button
                    variant="outlined"
                    startIcon={<SyncIcon />}
                    onClick={testCalendarSync}
                    disabled={loadingEvents || !isSignedIn}
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none',
                      color: '#1056F5',
                      borderColor: '#1056F5',
                    }}
                  >
                    {loadingEvents ? 'Testing...' : 'Test Calendar Sync'}
                  </Button>
                </ListItem>
              </List>
            </Box>
          </TabPanel>
        </Paper>
      )}
      
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: '100%' }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GoogleIntegration; 