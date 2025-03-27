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

const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Debug log to see user data
  console.log('Header rendering with user:', user);
  
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

  // Get user's initials for avatar
  const getUserInitials = () => {
    // Try to get name from user state first
    let userName = user?.name;
    
    // If not available, try localStorage
    if (!userName) {
      userName = localStorage.getItem('userName') || '';
    }
    
    // If we have a name, extract initials
    if (userName) {
      const nameParts = userName.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
      }
      return userName[0].toUpperCase();
    }
    
    // Fallback
    return 'U';
  };

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
                {/* Task button removed temporarily */}
                {/* 
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
                */}
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
                  {getUserInitials()}
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
                      width: '250px',
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
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      width: '100%'
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                        Signed in as
                      </Typography>
                      <Typography sx={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
                        {user && user.name ? user.name : localStorage.getItem('userName') || 'User'}
                      </Typography>
                    </Box>
                  </MenuItem>
                  <Divider />
                  {/* Profile option hidden temporarily */}
                  {/* <MenuItem onClick={handleProfileClick}>Your Profile</MenuItem> */}
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