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
  Collapse,
  ListItemIcon
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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AlarmIcon from '@mui/icons-material/Alarm';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import { useAuth } from '../contexts/AuthContext';
import operosusLogo from '../assets/operosus-logo.png';
import OpoSmallImage from '../assets/Oposmall.png';

const API_BASE_URL = process.env.REACT_APP_API_TARGET || 'https://app2.operosus.com';

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
  
  // State for the dashboards submenu
  const [dashboardsSubmenuOpen, setDashboardsSubmenuOpen] = useState(false);
  
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
        
        const response = await fetch(`${API_BASE_URL}/api/productivity/admin`, {
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
  
  // Toggle the dashboards submenu
  const handleDashboardsSubmenuToggle = () => {
    setDashboardsSubmenuOpen(!dashboardsSubmenuOpen);
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
                     location.pathname.includes('/insights') ||
                     location.pathname.includes('/admin-journal') ? 
                     'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <BookIcon sx={{ 
            mr: 2, 
            color: location.pathname.includes('/journal') || 
                  location.pathname.includes('/entry') ||
                  location.pathname.includes('/all-entries') ||
                  location.pathname.includes('/insights') ||
                  location.pathname.includes('/admin-journal') ? 
                  'primary.main' : 'text.secondary',
            fontSize: { xs: 20, sm: 22 } 
          }} />
          <ListItemText 
            primary="Daily Journal" 
            primaryTypographyProps={{
              fontWeight: location.pathname.includes('/journal') || 
                    location.pathname.includes('/entry') ||
                    location.pathname.includes('/all-entries') ||
                    location.pathname.includes('/insights') ||
                    location.pathname.includes('/admin-journal') ? 
                    'bold' : 'normal',
              color: location.pathname.includes('/journal') || 
                    location.pathname.includes('/entry') ||
                    location.pathname.includes('/all-entries') ||
                    location.pathname.includes('/insights') ||
                    location.pathname.includes('/admin-journal') ? 
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
            
            {/* Admin Journal Button - moved inside journal submenu */}
            {isAdmin && (
              <ListItemButton 
                onClick={() => handleNavigation('/admin-journal')}
                selected={isActive('/admin-journal')}
                sx={{ 
                  py: 1.5, 
                  pl: 7,
                  mx: 1,
                  borderRadius: '12px',
                  bgcolor: isActive('/admin-journal') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
                }}
              >
                <AdminPanelSettingsIcon 
                  sx={{ 
                    mr: 1, 
                    color: isActive('/admin-journal') ? 'primary.main' : 'text.secondary',
                    fontSize: { xs: 16, sm: 18 } 
                  }} 
                />
                <ListItemText 
                  primary="Journal Admin" 
                  primaryTypographyProps={{
                    fontWeight: isActive('/admin-journal') ? 'bold' : 'normal',
                    color: isActive('/admin-journal') ? 'primary.main' : 'text.primary',
                    fontSize: { xs: '0.9rem', sm: '0.95rem' }
                  }}
                />
              </ListItemButton>
            )}
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
            primary="Tasks" 
            primaryTypographyProps={{
              fontWeight: isActive('/tasks') ? 'bold' : 'normal',
              color: isActive('/tasks') ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
        </ListItemButton>
        
        {/* Dashboards menu item with submenu */}
        <ListItemButton 
          onClick={handleDashboardsSubmenuToggle}
          sx={{ 
            py: 1.8,
            mx: 1,
            borderRadius: '12px',
            bgcolor: (location.pathname.includes('/meeting-insights') || location.pathname.includes('/focus-planning') || location.pathname.includes('/leaderboard') || location.pathname.includes('/team-comparison')) ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}
        >
          <DashboardIcon sx={{ 
            mr: 2, 
            color: (location.pathname.includes('/meeting-insights') || location.pathname.includes('/focus-planning') || location.pathname.includes('/leaderboard') || location.pathname.includes('/team-comparison')) ? 'primary.main' : 'text.secondary',
            fontSize: { xs: 20, sm: 22 } 
          }} />
          <ListItemText 
            primary="Dashboards" 
            primaryTypographyProps={{
              fontWeight: (location.pathname.includes('/meeting-insights') || location.pathname.includes('/focus-planning') || location.pathname.includes('/leaderboard') || location.pathname.includes('/team-comparison')) ? 'bold' : 'normal',
              color: (location.pathname.includes('/meeting-insights') || location.pathname.includes('/focus-planning') || location.pathname.includes('/leaderboard') || location.pathname.includes('/team-comparison')) ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
          {dashboardsSubmenuOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        
        {/* Dashboards submenu */}
        <Collapse in={dashboardsSubmenuOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton 
              onClick={() => handleNavigation('/meeting-insights')}
              selected={isActive('/meeting-insights')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/meeting-insights') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <ShowChartIcon 
                sx={{ 
                  mr: 1, 
                  color: isActive('/meeting-insights') ? 'primary.main' : 'text.secondary',
                  fontSize: { xs: 16, sm: 18 } 
                }} 
              />
              <ListItemText 
                primary="Meeting Insights" 
                primaryTypographyProps={{
                  fontWeight: isActive('/meeting-insights') ? 'bold' : 'normal',
                  color: isActive('/meeting-insights') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
            
            <ListItemButton 
              onClick={() => handleNavigation('/focus-planning')}
              selected={isActive('/focus-planning')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/focus-planning') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <AlarmIcon 
                sx={{ 
                  mr: 1, 
                  color: isActive('/focus-planning') ? 'primary.main' : 'text.secondary',
                  fontSize: { xs: 16, sm: 18 } 
                }} 
              />
              <ListItemText 
                primary="Focus & Planning" 
                primaryTypographyProps={{
                  fontWeight: isActive('/focus-planning') ? 'bold' : 'normal',
                  color: isActive('/focus-planning') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
            
            <ListItemButton 
              onClick={() => handleNavigation('/leaderboard')}
              selected={isActive('/leaderboard')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/leaderboard') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <BarChartIcon 
                sx={{ 
                  mr: 1, 
                  color: isActive('/leaderboard') ? 'primary.main' : 'text.secondary',
                  fontSize: { xs: 16, sm: 18 } 
                }} 
              />
              <ListItemText 
                primary="Leaderboard" 
                primaryTypographyProps={{
                  fontWeight: isActive('/leaderboard') ? 'bold' : 'normal',
                  color: isActive('/leaderboard') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
            
            <ListItemButton 
              onClick={() => handleNavigation('/team-comparison')}
              selected={isActive('/team-comparison')}
              sx={{ 
                py: 1.5, 
                pl: 7,
                mx: 1,
                borderRadius: '12px',
                bgcolor: isActive('/team-comparison') ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
              }}
            >
              <GroupIcon 
                sx={{ 
                  mr: 1, 
                  color: isActive('/team-comparison') ? 'primary.main' : 'text.secondary',
                  fontSize: { xs: 16, sm: 18 } 
                }} 
              />
              <ListItemText 
                primary="Team Comparison" 
                primaryTypographyProps={{
                  fontWeight: isActive('/team-comparison') ? 'bold' : 'normal',
                  color: isActive('/team-comparison') ? 'primary.main' : 'text.primary',
                  fontSize: { xs: '0.9rem', sm: '0.95rem' }
                }}
              />
            </ListItemButton>
          </List>
        </Collapse>
        
        <ListItemButton 
          onClick={() => handleNavigation('/dashboard')}
          selected={false}
          sx={{ 
            py: 1.8,
            mx: 1,
            borderRadius: '12px',
            bgcolor: 'transparent'
          }}
        >
          <CalendarMonthIcon sx={{ mr: 2, color: 'text.secondary', fontSize: { xs: 20, sm: 22 } }} />
          <ListItemText 
            primary="Calendar" 
            primaryTypographyProps={{
              fontWeight: 'normal',
              color: 'text.primary',
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
          <Box 
            component="img"
            src={OpoSmallImage}
            alt="Opo"
            sx={{ 
              width: 22,
              height: 'auto',
              mr: 2,
              filter: isActive('/ai-assistant') ? 'none' : 'grayscale(0.5)',
              opacity: isActive('/ai-assistant') ? 1 : 0.7
            }} 
          />
          <ListItemText 
            primary="Opo AI" 
            primaryTypographyProps={{
              fontWeight: isActive('/ai-assistant') ? 'bold' : 'normal',
              color: isActive('/ai-assistant') ? 'primary.main' : 'text.primary',
              fontSize: { xs: '0.95rem', sm: '1rem' }
            }}
          />
        </ListItemButton>
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

  // Auto-open the journal submenu if we're on journal-related pages
  useEffect(() => {
    if ((isActive('/journal-insights') || 
         isActive('/journal') || 
         isActive('/all-entries') || 
         isActive('/insights') || 
         isActive('/admin-journal')) && 
         !journalSubmenuOpen) {
      setJournalSubmenuOpen(true);
    }
  }, [location.pathname, journalSubmenuOpen, isActive]);

  // Auto-open the dashboards submenu if we're on dashboard-related pages
  useEffect(() => {
    if ((isActive('/meeting-insights') || isActive('/focus-planning') || isActive('/leaderboard') || isActive('/team-comparison')) && !dashboardsSubmenuOpen) {
      setDashboardsSubmenuOpen(true);
    }
  }, [location.pathname, dashboardsSubmenuOpen, isActive]);

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
      <Box sx={{ width: '100%', px: { xs: 1, sm: 2 } }}>
        <Toolbar 
          disableGutters 
          sx={{ 
            justifyContent: 'space-between',
            py: { xs: 0.5, sm: 1 },
            minHeight: '56px'
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
                textDecoration: 'none'
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
            </Box>
          </Box>

          {/* Profile Button - shown in both mobile and desktop */}
          <Box sx={{ mr: { xs: 1, sm: 2 } }}>
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
      </Box>

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