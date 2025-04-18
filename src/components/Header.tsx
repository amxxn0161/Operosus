import React, { useState, useEffect } from 'react';
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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../contexts/AuthContext';
import operosusLogo from '../assets/operosus-logo.png';

const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Check admin access by calling the API endpoint
  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!isAuthenticated) {
        setIsAdmin(false);
        return;
      }
      
      try {
        const token = localStorage.getItem('authToken');
        console.log('Checking admin access with token:', token ? 'exists' : 'missing');
        
        const response = await fetch('https://app2.operosus.com/api/productivity/admin', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        // If we get a 200 response, user is an admin
        if (response.ok) {
          console.log('User has admin access');
          setIsAdmin(true);
        } else {
          console.log('User does not have admin access:', response.status);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAdmin(false);
      }
    };
    
    checkAdminAccess();
  }, [isAuthenticated]);
  
  // Debug log to see user data and admin status
  console.log('Header rendering with user:', user, 'isAdmin:', isAdmin, 'userEmail:', localStorage.getItem('userEmail'));
  
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
        
        {/* Admin Journal Button - only shown for admins */}
        {isAdmin && (
          <ListItemButton 
            onClick={() => handleNavigation('/admin-journal')}
            selected={isActive('/admin-journal')}
            sx={{ 
              py: 1.5,
              bgcolor: isActive('/admin-journal') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
            }}
          >
            <AdminPanelSettingsIcon sx={{ mr: 2, color: isActive('/admin-journal') ? 'primary.main' : 'text.secondary' }} />
            <ListItemText 
              primary="Admin Journal" 
              primaryTypographyProps={{
                fontWeight: 'bold',
                color: isActive('/admin-journal') ? 'primary.main' : 'text.primary'
              }}
            />
          </ListItemButton>
        )}
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
            {/* Mobile menu button */}
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

            {/* Navigation Links (only show if authenticated and not on mobile) */}
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
                
                {/* Admin Journal Button - only shown for admins */}
                {isAdmin && (
                  <Button 
                    component={Link}
                    to="/admin-journal"
                    sx={{ 
                      fontFamily: 'Poppins',
                      textTransform: 'none',
                      color: '#333',
                      fontSize: '1rem',
                      mx: 1,
                      fontWeight: isActive('/admin-journal') ? 'bold' : 'normal'
                    }}
                  >
                    Admin Journal
                  </Button>
                )}
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
                  <Box sx={{ px: 3, py: 1.5 }}>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {user?.name || localStorage.getItem('userName') || 'User'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {user?.email || localStorage.getItem('userEmail') || 'user@example.com'}
                    </Typography>
                  </Box>
                  <Divider />
                  <MenuItem onClick={handleLogout}>Sign Out</MenuItem>
                </Menu>
              </Box>
            ) : !isLoginPage ? (
              <Button 
                variant="contained" 
                onClick={() => navigate('/login')}
                sx={{ 
                  fontFamily: 'Poppins', 
                  textTransform: 'none',
                  fontWeight: 'medium'
                }}
              >
                Sign in
              </Button>
            ) : null}
          </Box>
        </Toolbar>
      </Container>
      
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 250 
          },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
};

export default Header; 