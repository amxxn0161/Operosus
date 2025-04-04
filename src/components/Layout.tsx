import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import { Box } from '@mui/material';
import { useAIAssistant } from '../contexts/AIAssistantContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { updateScreenContext } = useAIAssistant();
  
  // Update screen context when location changes
  useEffect(() => {
    // Map paths to component names
    const pathToComponent: {[key: string]: string} = {
      '/dashboard': 'Dashboard',
      '/journal': 'Journal',
      '/tasks': 'Tasks',
      '/all-entries': 'All Entries',
      '/entry': 'Entry Detail',
      '/worksheet': 'Worksheet',
      '/diagnostic': 'Diagnostic',
      '/admin-journal': 'Admin Journal',
    };
    
    // Get the base path (e.g., '/entry/123' becomes '/entry')
    const basePath = '/' + location.pathname.split('/')[1];
    
    // Find the corresponding component name or use the path if not found
    const componentName = pathToComponent[basePath] || basePath.slice(1);
    
    // Update context with current location information
    updateScreenContext({
      currentPath: location.pathname,
      currentComponent: componentName,
    });
  }, [location, updateScreenContext]);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout; 