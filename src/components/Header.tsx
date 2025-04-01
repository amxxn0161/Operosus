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
  Divider,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme,
  ListItemButton
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useAuth } from '../contexts/AuthContext';
import operosusLogo from '../assets/operosus-logo.png';

const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Debug log to see user data
  console.log('Header rendering with user:', user);
  
  // State for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // State for mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Handle opening and closing the menu
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleLogout = () => {
    handleClose();
    setDrawerOpen(false);
    logout();
  };
  
  const handleProfileClick = () => {
    handleClose();
    // Navigate to profile page (not implemented yet)
    console.log('Navigate to profile page');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };
  
  // Check if we're on the login page
  const isLoginPage = location.pathname === '/login';

  const isActive = (path: string) => {
    return location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  };

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

  // Mobile drawer content
  const drawer = (
    <Box sx={{ width: 250, height: '100%', bgcolor: 'background.paper' }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2, 
        borderBottom: '1px solid #e8e8e8'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Menu
        </Typography>
        <IconButton onClick={handleDrawerToggle}>
          <CloseIcon />
        </IconButton>
      </Box>

      <List>
        <ListItemButton 
          onClick={() => handleNavigation('/dashboard')}
          selected={isActive('/dashboard')}
          sx={{ 
            py: 1.5,
            bgcolor: isActive('/dashboard') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <HomeIcon sx={{ mr: 2, color: isActive('/dashboard') ? 'primary.main' : 'text.secondary' }} />
          <ListItemText 
            primary="Home" 
            primaryTypographyProps={{
              fontWeight: 'bold',
              color: isActive('/dashboard') ? 'primary.main' : 'text.primary'
            }}
          />
        </ListItemButton>
        
        <ListItemButton 
          onClick={() => handleNavigation('/journal')}
          selected={isActive('/journal')}
          sx={{ 
            py: 1.5,
            bgcolor: isActive('/journal') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <BookIcon sx={{ mr: 2, color: isActive('/journal') ? 'primary.main' : 'text.secondary' }} />
          <ListItemText 
            primary="Daily Journal" 
            primaryTypographyProps={{
              fontWeight: 'bold',
              color: isActive('/journal') ? 'primary.main' : 'text.primary'
            }}
          />
        </ListItemButton>
        
        {/* Worksheet option hidden temporarily
        <ListItemButton 
          onClick={() => handleNavigation('/worksheet')}
          selected={isActive('/worksheet')}
          sx={{ 
            py: 1.5,
            bgcolor: isActive('/worksheet') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <AssignmentIcon sx={{ mr: 2, color: isActive('/worksheet') ? 'primary.main' : 'text.secondary' }} />
          <ListItemText 
            primary="Worksheet" 
            primaryTypographyProps={{
              fontWeight: 'bold',
              color: isActive('/worksheet') ? 'primary.main' : 'text.primary'
            }}
          />
        </ListItemButton>
        */}
      </List>

      <Divider sx={{ my: 2 }} />

      {isAuthenticated && (
        <Box sx={{ p: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 2
          }}>
            <Avatar 
              sx={{ 
                width: 35, 
                height: 35, 
                bgcolor: 'primary.main',
                fontFamily: 'Poppins',
                mr: 2
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {user && user.name ? user.name : localStorage.getItem('userName') || 'User'}
            </Typography>
          </Box>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={handleLogout}
            sx={{ textTransform: 'none' }}
          >
            Sign out
          </Button>
        </Box>
      )}
    </Box>
  );

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
            {/* Mobile menu button - now on the left */}
            {isMobile && isAuthenticated && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            {/* Logo and Brand */}
            <Box 
              component={Link} 
              to="/" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                textDecoration: 'none',
                mr: { xs: 1, sm: 2, md: 4 }
              }}
            >
              <img 
                src={operosusLogo} 
                alt="Operosus Logo" 
                style={{ 
                  height: isMobile ? '30px' : '38px', 
                  marginRight: isMobile ? '8px' : '12px' 
                }} 
              />
              <Typography
                variant="h6"
                sx={{
                  fontFamily: 'Poppins',
                  fontWeight: 'bold',
                  color: '#1056F5',
                  letterSpacing: '0.5px',
                  textDecoration: 'none',
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }}
              >
                {isMobile ? 'PP' : 'Productivity Pulse'}
              </Typography>
            </Box>

            {/* Navigation Links (only show if authenticated and not mobile) */}
            {isAuthenticated && !isMobile && (
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
                {/* Worksheet option hidden temporarily
                <Button 
                  component={Link}
                  to="/worksheet"
                  sx={{ 
                    fontFamily: 'Poppins',
                    textTransform: 'none',
                    color: '#333',
                    fontSize: '1rem',
                    mx: 1,
                    fontWeight: isActive('/worksheet') ? 'bold' : 'normal'
                  }}
                >
                  Worksheet
                </Button>
                */}
              </Box>
            )}
          </Box>

          {/* Profile/Login Button (not mobile) */}
          {!isMobile && (
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
          )}
        </Toolbar>
      </Container>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': { 
            width: 250,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Header; 