import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  Button, 
  Avatar,
  Container,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import operosusLogo from '../assets/operosus-logo.png';
import GoogleIcon from '@mui/icons-material/Google';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // State for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // Handle opening and closing the menu
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    handleClose();
    logout();
  };
  
  const handleProfileClick = () => {
    handleClose();
    // Navigate to profile page (not implemented yet)
    console.log('Navigate to profile page');
  };
  
  // Check if we're on the login page
  const isLoginPage = location.pathname === '/login';

  const isActive = (path: string) => location.pathname === path;

  return (
    <AppBar 
      position="static" 
      color="default" 
      elevation={0}
      sx={{ 
        borderBottom: '1px solid #e8e8e8',
        backgroundColor: 'white'
      }}
    >
      <Container>
        <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Logo and Brand */}
            <Box 
              component={Link} 
              to="/" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                textDecoration: 'none',
                mr: 4
              }}
            >
              <img src={operosusLogo} alt="Operosus Logo" style={{ height: '38px', marginRight: '12px' }} />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Poppins',
                  fontWeight: 'bold',
                  color: '#1056F5',
                  letterSpacing: '0.5px',
                  textDecoration: 'none'
                }}
              >
                Productivity Pulse
              </Typography>
            </Box>

            {/* Navigation Links (only show if authenticated) */}
            {isAuthenticated && (
              <Box sx={{ display: 'flex' }}>
                <Button 
                  component={Link}
                  to="/dashboard"
                  sx={{ 
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                    color: '#333',
                    fontSize: '1rem',
                    mx: 1,
                    fontWeight: isActive('/dashboard') || isActive('/') ? 'bold' : 'normal'
                  }}
                >
                  Home
                </Button>
                <Button 
                  component={Link}
                  to="/journal"
                  sx={{ 
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                    color: '#333',
                    fontSize: '1rem',
                    mx: 1,
                    fontWeight: isActive('/journal') ? 'bold' : 'normal'
                  }}
                >
                  Daily Journal
                </Button>
                <Button
                  color={isActive('/tasks') ? 'primary' : 'inherit'}
                  onClick={() => navigate('/tasks')}
                  sx={{
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                    color: '#333',
                    fontSize: '1rem',
                    mx: 1,
                    fontWeight: isActive('/tasks') ? 'bold' : 'normal'
                  }}
                >
                  Tasks
                </Button>
                <Button
                  component={Link}
                  to="/google-integration"
                  startIcon={<GoogleIcon />}
                  sx={{
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                    color: '#333',
                    fontSize: '1rem',
                    mx: 1,
                    fontWeight: isActive('/google-integration') ? 'bold' : 'normal'
                  }}
                >
                  Google
                </Button>
              </Box>
            )}
          </Box>

          {/* Profile/Login Button */}
          <Box>
            {isAuthenticated ? (
              <Box>
                <Avatar 
                  onClick={handleClick}
                  sx={{ 
                    width: 35, 
                    height: 35, 
                    bgcolor: '#1056F5',
                    fontFamily: 'Poppins',
                    cursor: 'pointer'
                  }}
                >
                  A
                </Avatar>
                <Menu
                  anchorEl={anchorEl}
                  open={open}
                  onClose={handleClose}
                  onClick={handleClose}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      width: '200px',
                      mt: 1.5,
                      '& .MuiMenuItem-root': {
                        fontFamily: 'Poppins',
                        fontSize: '0.9rem',
                        py: 1.5
                      }
                    }
                  }}
                >
                  <MenuItem onClick={(e) => e.stopPropagation()} sx={{ color: '#333' }}>
                    Signed in as <Box component="span" sx={{ fontWeight: 'bold', ml: 0.5 }}>Amaan</Box>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleProfileClick}>Your Profile</MenuItem>
                  <MenuItem onClick={handleLogout}>Sign out</MenuItem>
                </Menu>
              </Box>
            ) : (
              !isLoginPage && (
                <Button
                  variant="contained"
                  onClick={() => navigate('/login')}
                  sx={{
                    backgroundColor: '#1056F5',
                    color: 'white',
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: '#0D47D9',
                    },
                  }}
                >
                  Log In
                </Button>
              )
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header; 