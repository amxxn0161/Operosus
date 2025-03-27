import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
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

// Create a custom theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1056F5',
    },
    secondary: {
      main: '#19857b',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

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
                    <Route path="/worksheet" element={
                      <ProtectedRoute>
                        <Worksheet />
                      </ProtectedRoute>
                    } />
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
                    <Route path="/worksheet" element={
                      <ProtectedRoute>
                        <Worksheet />
                      </ProtectedRoute>
                    } />
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