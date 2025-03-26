import React, { useState, useEffect } from 'react';
import { startWebAuth } from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Box, 
  Button, 
  Typography, 
  Grid, 
  Container, 
  Paper, 
  TextField,
  Tabs,
  Tab
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

// Import the Operosus logo
import operosusLogo from '../assets/operosus-logo.png';

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
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
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

const Login: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogin = () => {
    startWebAuth();
  };

  return (
    <Box sx={{ width: '100vw', height: '100vh', m: 0, p: 0, overflow: 'hidden' }}>
      <Grid container sx={{ height: '100%', width: '100%', m: 0, p: 0 }}>
        {/* Left side - Login content */}
        <Grid item xs={12} md={6} lg={8} component={Paper} elevation={0} square sx={{ p: 0, m: 0 }}>
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 3,
            }}
          >
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <img src={operosusLogo} alt="Operosus Logo" style={{ height: '70px', marginBottom: '16px' }} />
              <Typography
                component="h1"
                variant="h4"
                sx={{ color: '#1056F5', fontWeight: 'bold', fontFamily: 'Poppins', textAlign: 'center' }}
              >
                Productivity Pulse
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ mb: 4, fontFamily: 'Poppins', textAlign: 'center' }}
              >
                Track your productivity journey
              </Typography>
            </Box>

            <Box sx={{ width: '100%', maxWidth: '400px', mt: 2 }}>
              <Box sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                backgroundColor: '#f5f5f5',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px'
              }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange} 
                  variant="fullWidth"
                  sx={{
                    '& .MuiTab-root': {
                      fontFamily: 'Poppins',
                      color: '#666',
                      fontSize: '0.95rem',
                      textTransform: 'uppercase',
                      backgroundColor: '#f5f5f5',
                      borderTopLeftRadius: '8px',
                      borderTopRightRadius: '8px',
                      '&.Mui-selected': {
                        color: '#1056F5',
                        backgroundColor: 'white'
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#1056F5'
                    }
                  }}
                >
                  <Tab label="Log In" />
                  <Tab label="Register" />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Box 
                  sx={{ 
                    mt: 2, 
                    p: 3, 
                    border: '1px solid #E1E1E1', 
                    borderRadius: '12px',
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <Typography
                    component="h2"
                    variant="h5"
                    sx={{ mb: 2, fontFamily: 'Poppins', fontWeight: 'medium' }}
                  >
                    Welcome Back
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 3, color: '#666', fontFamily: 'Poppins' }}
                  >
                    Please sign in with your Google account to continue
                  </Typography>

                  <Box component="form" sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleLogin}
                        startIcon={<GoogleIcon />}
                        sx={{
                          py: 1.5,
                          backgroundColor: '#1056F5',
                          color: 'white',
                          fontFamily: 'Poppins',
                          textTransform: 'none',
                          fontWeight: 'medium',
                          borderRadius: '8px',
                          '&:hover': {
                            backgroundColor: '#0D47D9',
                          },
                        }}
                      >
                        Sign in with Google
                      </Button>
                    </Box>
                    
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#666', 
                          fontFamily: 'Poppins',
                          '& span': {
                            color: '#1056F5',
                            cursor: 'pointer'
                          }
                        }}
                      >
                        Don't have an account? <span onClick={() => setTabValue(1)}>Sign up</span>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box 
                  sx={{ 
                    mt: 2, 
                    p: 3, 
                    border: '1px solid #E1E1E1', 
                    borderRadius: '12px',
                    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <Typography
                    component="h2"
                    variant="h5"
                    sx={{ mb: 2, fontFamily: 'Poppins', fontWeight: 'medium' }}
                  >
                    Create an Account
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 3, color: '#666', fontFamily: 'Poppins' }}
                  >
                    Sign up with your Google account to start tracking your productivity
                  </Typography>

                  <Box component="form" sx={{ mt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={handleLogin}
                        startIcon={<GoogleIcon />}
                        sx={{
                          py: 1.5,
                          backgroundColor: '#1056F5',
                          color: 'white',
                          fontFamily: 'Poppins',
                          textTransform: 'none',
                          fontWeight: 'medium',
                          borderRadius: '8px',
                          '&:hover': {
                            backgroundColor: '#0D47D9',
                          },
                        }}
                      >
                        Sign up with Google
                      </Button>
                    </Box>
                    
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#666', 
                          fontFamily: 'Poppins',
                          '& span': {
                            color: '#1056F5',
                            cursor: 'pointer'
                          }
                        }}
                      >
                        Already have an account? <span onClick={() => setTabValue(0)}>Log in</span>
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </TabPanel>
            </Box>
          </Box>
        </Grid>
        {/* Right side - Blue background with information */}
        <Grid
          item
          xs={false}
          md={6}
          lg={4}
          sx={{
            backgroundImage: 'none',
            backgroundColor: '#1056F5',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            color: 'white',
            p: 6,
            m: 0
          }}
        >
          <Typography
            component="h1"
            variant="h3"
            sx={{ mb: 4, fontWeight: 'bold', fontFamily: 'Poppins' }}
          >
            Boost Your Productivity
          </Typography>
          <Typography
            variant="body1"
            sx={{ mb: 6, fontFamily: 'Poppins', lineHeight: 1.7 }}
          >
            Track your daily productivity, identify distractions, and gain valuable insights to
            improve your work habits. Reflect on your journey and make measurable progress.
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <span role="img" aria-label="chart">
                  📊
                </span>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
                >
                  Data Visualization
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Poppins' }}>
                  See your progress over time with beautiful charts and analytics.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <span role="img" aria-label="light-bulb">
                  💡
                </span>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
                >
                  Identify Patterns
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Poppins' }}>
                  Discover what's holding you back and what helps you succeed.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <span role="img" aria-label="upward-trend">
                  📈
                </span>
              </Box>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
                >
                  Continuous Improvement
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Poppins' }}>
                  Set goals, track progress, and celebrate your achievements.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login; 