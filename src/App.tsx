import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme, responsiveFontSizes } from '@mui/material';
import '@fontsource/poppins/300.css';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/700.css';

import { AuthProvider } from './contexts/AuthContext';
import { JournalProvider } from './contexts/JournalContext';
import { TaskProvider } from './contexts/TaskContext';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Journal from './pages/Journal';
import EntryDetail from './pages/EntryDetail';
import Worksheet from './pages/Worksheet';
import Tasks from './pages/Tasks';
import AllEntries from './pages/AllEntries';
import DiagnosticPage from './pages/DiagnosticPage';

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

// Create a ProtectedRoute component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In a real app, we would check authentication status here
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Layout component that conditionally renders the header
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = window.location.pathname;
  const isLoginPage = location === '/login';
  
  return (
    <>
      {!isLoginPage && <Header />}
      {children}
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <JournalProvider>
          <TaskProvider>
            <Router>
              <div className="App">
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/journal" element={<Journal />} />
                    <Route path="/tasks" element={
                      <ProtectedRoute>
                        <Tasks />
                      </ProtectedRoute>
                    } />
                    {/* Worksheet route hidden temporarily
                    <Route path="/worksheet" element={
                      <ProtectedRoute>
                        <Worksheet />
                      </ProtectedRoute>
                    } />
                    */}
                    <Route path="/entry/:entryId" element={
                      <ProtectedRoute>
                        <EntryDetail />
                      </ProtectedRoute>
                    } />
                    <Route path="/entries" element={
                      <ProtectedRoute>
                        <AllEntries />
                      </ProtectedRoute>
                    } />
                    {/* Duplicate Worksheet route hidden temporarily
                    <Route path="/worksheet" element={
                      <ProtectedRoute>
                        <Worksheet />
                      </ProtectedRoute>
                    } />
                    */}
                    <Route path="/diagnostic" element={<DiagnosticPage />} />
                    <Route path="/login" element={<Login />} />
                  </Routes>
                </Layout>
              </div>
            </Router>
          </TaskProvider>
        </JournalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App; 