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
  ListItemButton,
  Collapse
} from '@mui/material';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import BookIcon from '@mui/icons-material/Book';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import InsightsIcon from '@mui/icons-material/Insights';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAuth } from '../contexts/AuthContext';
import operosusLogo from '../assets/operosus-logo.png';

const Header: React.FC = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State for the journal submenu
  const [journalSubmenuOpen, setJournalSubmenuOpen] = useState(false);
  
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
  }, [isAuthenticated, forceUpdate]); // Also check when forceUpdate changes
  
  // Debug log to see user data and admin status
  console.log('Header rendering with user:', user, 'isAdmin:', isAdmin, 'userEmail:', localStorage.getItem('userEmail'));
  
  // State for dropdown menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  // State for sidebar
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
    // Immediately clear admin status before logout is called
    setIsAdmin(false);
    console.log('Logout initiated, admin status cleared');
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
  
  // Toggle the journal submenu
  const handleJournalSubmenuToggle = () => {
    setJournalSubmenuOpen(!journalSubmenuOpen);
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

  // Sidebar drawer content - same for both mobile and desktop
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
            py: 1.8,
            mx: 1,
            borderRadius: '12px',
            bgcolor: isActive('/dashboard') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <HomeIcon sx={{ mr: 2, color: isActive('/dashboard') ? 'primary.main' : 'text.secondary', fontSize: { xs: 20, sm: 22 } }} />
          <ListItemText 
            primary="Home" 
            primaryTypographyProps={{
              fontWeight: isActive('/dashboard') ? 'bold' : 'normal',
              color: isActive('/dashboard') ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
        </ListItemButton>
        
        {/* Journal menu item with submenu */}
        <ListItemButton 
          onClick={handleJournalSubmenuToggle}
          sx={{ 
            py: 1.8,
            mx: 1,
            borderRadius: '12px',
            bgcolor: location.pathname.includes('/journal') || 
                     location.pathname.includes('/entry') ||
                     location.pathname.includes('/all-entries') ||
                     location.pathname.includes('/insights') ? 
                     'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <BookIcon sx={{ 
            mr: 2, 
            color: location.pathname.includes('/journal') || 
                  location.pathname.includes('/entry') ||
                  location.pathname.includes('/all-entries') ||
                  location.pathname.includes('/insights') ? 
                  'primary.main' : 'text.secondary',
            fontSize: { xs: 20, sm: 22 } 
          }} />
          <ListItemText 
            primary="Daily Journal" 
            primaryTypographyProps={{
              fontWeight: location.pathname.includes('/journal') || 
                    location.pathname.includes('/entry') ||
                    location.pathname.includes('/all-entries') ||
                    location.pathname.includes('/insights') ? 
                    'bold' : 'normal',
              color: location.pathname.includes('/journal') || 
                    location.pathname.includes('/entry') ||
                    location.pathname.includes('/all-entries') ||
                    location.pathname.includes('/insights') ? 
                    'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
          {journalSubmenuOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        {/* Journal submenu */}
        <Collapse in={journalSubmenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton 
              onClick={() => handleNavigation('/journal')}
              selected={isActive('/journal')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/journal') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <ListItemText 
                primary="Today's Entry" 
                primaryTypographyProps={{
                  fontWeight: isActive('/journal') ? 'bold' : 'normal',
                  color: isActive('/journal') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
            
            <ListItemButton 
              onClick={() => handleNavigation('/all-entries')}
              selected={isActive('/all-entries')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/all-entries') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <ListItemText 
                primary="All Entries" 
                primaryTypographyProps={{
                  fontWeight: isActive('/all-entries') ? 'bold' : 'normal',
                  color: isActive('/all-entries') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
            
            <ListItemButton 
              onClick={() => handleNavigation('/insights')}
              selected={isActive('/insights')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/insights') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <InsightsIcon 
                sx={{ 
                  mr: 1, 
                  color: isActive('/insights') ? 'primary.main' : 'text.secondary',
                  fontSize: { xs: 16, sm: 18 } 
                }} 
              />
              <ListItemText 
                primary="Insights" 
                primaryTypographyProps={{
                  fontWeight: isActive('/insights') ? 'bold' : 'normal',
                  color: isActive('/insights') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
          </List>
        </Collapse>
        
        <ListItemButton 
          onClick={() => handleNavigation('/tasks')}
          selected={isActive('/tasks')}
          sx={{ 
            py: 1.8,
            mx: 1,
            borderRadius: '12px',
            bgcolor: isActive('/tasks') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <AssignmentIcon sx={{ mr: 2, color: isActive('/tasks') ? 'primary.main' : 'text.secondary', fontSize: { xs: 20, sm: 22 } }} />
          <ListItemText 
            primary="Google Tasks" 
            primaryTypographyProps={{
              fontWeight: isActive('/tasks') ? 'bold' : 'normal',
              color: isActive('/tasks') ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
        </ListItemButton>
        
        <ListItemButton 
          onClick={() => handleNavigation('/ai-assistant')}
          selected={isActive('/ai-assistant')}
          sx={{ 
            py: 1.8,
            mx: 1,
            borderRadius: '12px',
            bgcolor: isActive('/ai-assistant') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <SmartToyIcon sx={{ mr: 2, color: isActive('/ai-assistant') ? 'primary.main' : 'text.secondary', fontSize: { xs: 20, sm: 22 } }} />
          <ListItemText 
            primary="AI Assistant" 
            primaryTypographyProps={{
              fontWeight: isActive('/ai-assistant') ? 'bold' : 'normal',
              color: isActive('/ai-assistant') ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
        </ListItemButton>
        
        {/* Admin Journal Button - only shown for admins */}
        {isAdmin && (
          <ListItemButton 
            onClick={() => handleNavigation('/admin-journal')}
            selected={isActive('/admin-journal')}
            sx={{ 
              py: 1.8,
              mx: 1,
              borderRadius: '12px',
              bgcolor: isActive('/admin-journal') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
            }}
          >
            <AdminPanelSettingsIcon sx={{ mr: 2, color: isActive('/admin-journal') ? 'primary.main' : 'text.secondary', fontSize: { xs: 20, sm: 22 } }} />
            <ListItemText 
              primary="Admin Journal" 
              primaryTypographyProps={{
                fontWeight: isActive('/admin-journal') ? 'bold' : 'normal',
                color: isActive('/admin-journal') ? 'primary.main' : 'text.primary',
                fontSize: { xs: '0.95rem', sm: '1rem' }
              }}
            />
          </ListItemButton>
        )}
      </List>

      <Divider sx={{ my: 2 }} />

      {isAuthenticated && (
        <Box sx={{ position: 'absolute', bottom: 0, width: '100%', borderTop: '1px solid #e8e8e8', p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36, 
                mr: 1.5, 
                bgcolor: 'primary.main' 
              }}
            >
              {getUserInitials()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" noWrap sx={{ maxWidth: 180 }}>
                {user?.name || localStorage.getItem('userName') || 'User'}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 180, fontSize: '0.75rem' }}>
                {user?.email || localStorage.getItem('userEmail') || 'user@example.com'}
              </Typography>
            </Box>
          </Box>
          <Button 
            variant="outlined" 
            color="primary" 
            fullWidth 
            onClick={handleLogout}
            size="small"
          >
            Sign out
          </Button>
        </Box>
      )}
    </Box>
  );

  // Auto-open the journal submenu if we're on journal-insights page
  useEffect(() => {
    if (isActive('/journal-insights') && !journalSubmenuOpen) {
      setJournalSubmenuOpen(true);
    }
  }, [location.pathname, journalSubmenuOpen, isActive]);

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
      <Container maxWidth="xl">
        <Toolbar 
          disableGutters 
          sx={{ 
            justifyContent: 'space-between',
            py: { xs: 0.5, sm: 1 }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Menu button for both mobile and desktop */}
            {isAuthenticated && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ 
                  mr: 2,
                  color: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'rgba(16, 86, 245, 0.08)'
                  },
                  p: { xs: 1, sm: 1.2 }
                }}
              >
                <MenuIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
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
                  fontSize: { xs: '1rem', sm: '1.25rem', md: '1.4rem' }
                }}
              >
                {isMobile ? 'PP' : 'Productivity Pulse'}
              </Typography>
            </Box>
          </Box>

          {/* Profile Button - shown in both mobile and desktop */}
          <Box>
            {isAuthenticated ? (
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
        </Toolbar>
      </Container>

      {/* Sidebar drawer - for both mobile and desktop */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        sx={{
          '& .MuiDrawer-paper': { 
            width: { xs: 250, sm: 280 },
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