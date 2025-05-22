import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme, responsiveFontSizes } from '@mui/material';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';

import { AuthProvider } from './contexts/AuthContext';
import { JournalProvider } from './contexts/JournalContext';
import { CalendarProvider } from './contexts/CalendarContext';
import { AIAssistantProvider } from './contexts/AIAssistantContext';
import { GoogleTasksProvider } from './contexts/GoogleTasksContext';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import JournalInsights from './pages/JournalInsights';
import EntryDetail from './pages/EntryDetail';
import Worksheet from './pages/Worksheet';
import AllEntries from './pages/AllEntries';
import DiagnosticPage from './pages/DiagnosticPage';
import AdminJournal from './pages/AdminJournal';
import GoogleTasks from './pages/GoogleTasks';
import Layout from './components/Layout';
import MockDataToggle from './components/MockDataToggle';
import AIAssistant from './components/AIAssistant';
import AIAssistantPage from './pages/AIAssistantPage';

console.log(process.env.REACT_APP_API_TARGET);

// Create a custom theme with mobile-first approach
let theme = createTheme({
  // Breakpoints for mobile-first design
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#1056F5',
      light: '#4B7FF7',
      dark: '#0C41C2',
    },
    secondary: {
      main: '#19857b',
      light: '#4FB3A9',
      dark: '#106B63',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    // Mobile-first typography
    h1: {
      fontSize: '2rem',
      '@media (min-width:600px)': {
        fontSize: '2.5rem',
      },
      '@media (min-width:900px)': {
        fontSize: '3rem',
      },
    },
    h2: {
      fontSize: '1.75rem',
      '@media (min-width:600px)': {
        fontSize: '2rem',
      },
      '@media (min-width:900px)': {
        fontSize: '2.5rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      '@media (min-width:600px)': {
        fontSize: '1.75rem',
      },
      '@media (min-width:900px)': {
        fontSize: '2rem',
      },
    },
    h4: {
      fontSize: '1.25rem',
      '@media (min-width:600px)': {
        fontSize: '1.5rem',
      },
    },
    h5: {
      fontSize: '1.1rem',
      '@media (min-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    h6: {
      fontSize: '1rem',
      '@media (min-width:600px)': {
        fontSize: '1.1rem',
      },
    },
    body1: {
      fontSize: '0.95rem',
      '@media (min-width:600px)': {
        fontSize: '1rem',
      },
    },
    body2: {
      fontSize: '0.85rem',
      '@media (min-width:600px)': {
        fontSize: '0.9rem',
      },
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
          '@media (min-width:600px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
          '@media (min-width:600px)': {
            padding: '10px 20px',
          },
        },
        sizeLarge: {
          padding: '12px 24px',
          fontSize: '1.1rem',
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.85rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: '16px',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minWidth: '0',
          padding: '8px 12px',
          '@media (min-width:600px)': {
            padding: '12px 16px',
            minWidth: '90px',
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '@media (min-width:600px)': {
            padding: '20px 24px',
          },
        },
      },
    },
  },
});

// Apply responsive font sizes to the theme
theme = responsiveFontSizes(theme);

// Use a protected route component to handle auth checks
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Create a wrapper component for conditional rendering based on route
const AppContent: React.FC = () => {
  const location = useLocation();
  // Hide sample data controls on specific pages
  const shouldHideSampleControls = 
    location.pathname === '/ai-assistant' || 
    location.pathname.includes('/calendar') ||
    location.pathname === '/dashboard' ||
    location.pathname === '/tasks' ||
    location.pathname.includes('/tasks');
  
  return (
    <AuthProvider>
      <JournalProvider>
        <CalendarProvider>
          <GoogleTasksProvider>
            <AIAssistantProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="journal" element={<Journal />} />
                  <Route path="all-entries" element={<AllEntries />} />
                  <Route path="entry/:entryId" element={<EntryDetail />} />
                  <Route path="worksheet/:worksheetId" element={<Worksheet />} />
                  <Route path="worksheet" element={<Worksheet />} />
                  <Route path="insights" element={<JournalInsights />} />
                  <Route path="diagnostic" element={<DiagnosticPage />} />
                  <Route path="tasks" element={<GoogleTasks />} />
                  <Route path="ai-assistant" element={<AIAssistantPage />} />
                  
                  {/* Admin routes */}
                  <Route path="admin-journal" element={<AdminJournal />} />
                </Route>
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
              
              {/* AI Assistant is always available */}
              <AIAssistant />
              {/* Add the toggle for mock data in development only when not on specific pages */}
              {process.env.NODE_ENV === 'development' && !shouldHideSampleControls && <MockDataToggle />}
            </AIAssistantProvider>
          </GoogleTasksProvider>
        </CalendarProvider>
      </JournalProvider>
    </AuthProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App; 