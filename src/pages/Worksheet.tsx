import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  TextField,
  Button,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Tabs,
  Tab,
  TextareaAutosize,
  IconButton,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GoalItem from '../components/GoalItem';
import { fetchUserSessions, saveUserSession, deleteUserSession, UserSession, Achievement as ApiAchievement, Goal as ApiGoal, Action as ApiAction } from '../services/worksheetService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`worksheet-tabpanel-${index}`}
      aria-labelledby={`worksheet-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface Achievement {
  id: number;
  description: string;
  howAchieved: string;
}

interface Value {
  id: number;
  description: string;
}

interface Goal {
  id: number;
  description: string;
  deadline: string;
  keyResults: string[];
}

interface Action {
  id: number;
  description: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

interface CoachingSession {
  id: string;
  name: string;
  achievements: Achievement[];
  personalValues: Value[];
  coreValues: string;
  goals: Goal[];
  actions: Action[];
  alignment: string;
  reflections: string;
}

const Worksheet: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState(0);
  const [sessions, setSessions] = useState<CoachingSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [isEditingSessionName, setIsEditingSessionName] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    actions: string | null;
    reflections: string | null;
  }>({
    actions: null,
    reflections: null
  });
  
  // Derived state - current session data
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  
  // Destructure current session for easier access (only if a session exists)
  const { 
    achievements = [], 
    personalValues = [], 
    coreValues = '', 
    goals = [], 
    actions = [], 
    alignment = '', 
    reflections = '' 
  } = currentSession || {};

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Fetch user sessions from API
    const loadSessions = async () => {
      try {
        setLoading(true);
        const apiSessions = await fetchUserSessions();
        
        if (apiSessions.length > 0) {
          // Convert API sessions to the format expected by the component
          const formattedSessions = apiSessions.map((apiSession: UserSession) => ({
            id: String(apiSession.id),
            name: apiSession.name,
            achievements: apiSession.achievements,
            personalValues: apiSession.personalValues,
            coreValues: apiSession.coreValues || '',
            goals: apiSession.goals.map((goal: ApiGoal) => ({
              id: goal.id,
              description: goal.description,
              deadline: goal.deadline,
              keyResults: goal.keyResults || []
            })),
            actions: apiSession.actions.map((action: ApiAction) => ({
              id: action.id,
              description: action.description,
              deadline: action.deadline,
              status: action.status as 'Not Started' | 'In Progress' | 'Completed'
            })),
            alignment: apiSession.alignment || '',
            reflections: apiSession.reflections || ''
          }));
          
          setSessions(formattedSessions);
          setCurrentSessionId(String(apiSessions[0].id));
        } else {
          // If no sessions from API, create an empty default one
          setSessions([{ 
            id: 'session-default', 
            name: 'Session 1',
            achievements: [{ id: 1, description: '', howAchieved: '' }],
            personalValues: [{ id: 1, description: '' }],
            coreValues: '',
            goals: [{ id: 1, description: '', deadline: '', keyResults: [''] }],
            actions: [{ id: 1, description: '', deadline: '', status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' }],
            alignment: '',
            reflections: ''
          }]);
          setCurrentSessionId('session-default');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setError('Failed to load sessions. Please try again later.');
        setLoading(false);
      }
    };

    loadSessions();
  }, [isAuthenticated, navigate]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSessionChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    // Save current session before switching
    handleSaveSession();
    
    // Update current session
    setCurrentSessionId(event.target.value as string);
  };
  
  const handleAddSession = () => {
    // Save current session first
    handleSaveSession();
    
    // Create new session with a unique ID
    const newSessionId = `session-${Date.now()}`;
    const newSession: CoachingSession = {
      id: newSessionId,
      name: `Session ${sessions.length + 1}`,
      achievements: [{ id: 1, description: '', howAchieved: '' }],
      personalValues: [{ id: 1, description: '' }],
      coreValues: '',
      goals: [{ id: 1, description: '', deadline: '', keyResults: [''] }],
      actions: [{ id: 1, description: '', deadline: '', status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' }],
      alignment: '',
      reflections: ''
    };
    
    // Add to sessions and set as current
    const updatedSessions = [...sessions, newSession];
    setSessions(updatedSessions);
    setCurrentSessionId(newSessionId);
    
    // Save to localStorage
    localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
  };
  
  const handleStartEditSessionName = () => {
    setNewSessionName(currentSession.name);
    setIsEditingSessionName(true);
  };
  
  const handleSaveSessionName = async () => {
    if (newSessionName.trim()) {
      // Update session name in local state
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, name: newSessionName.trim() } 
          : session
      );
      setSessions(updatedSessions);
      localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
      
      // Get the current session to update
      const currentSessionData = updatedSessions.find(s => s.id === currentSessionId);
      
      // Only send to API if it's not a temporary local session
      if (currentSessionData && !currentSessionData.id.startsWith('session-')) {
        try {
          setSaving(true);
          
          // Prepare minimal data to update just the name
          const sessionUpdate = {
            id: Number(currentSessionData.id),
            name: newSessionName.trim()
          };
          
          // Save to API
          await saveUserSession(sessionUpdate);
          
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
          console.error('Error updating session name:', error);
          setError('Failed to update session name. Please try again.');
        } finally {
          setSaving(false);
        }
      }
    }
    setIsEditingSessionName(false);
  };
  
  const handleCancelEditSessionName = () => {
    setIsEditingSessionName(false);
  };

  const handleSaveSession = () => {
    // Update the current session in the sessions array
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { 
            ...session, 
            achievements,
            personalValues,
            coreValues,
            goals,
            actions,
            alignment,
            reflections
          } 
        : session
    );
    
    // Update state and save to localStorage
    setSessions(updatedSessions);
    localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
  };

  const handleSaveWorksheet = async () => {
    try {
      setSaving(true);
      // Save to local state first
      handleSaveSession();
      
      // Find the current session
      const currentSessionData = sessions.find(s => s.id === currentSessionId);
      
      if (!currentSessionData) {
        throw new Error('Current session not found');
      }
      
      // Format data for API - ID will be handled by saveUserSession
      const sessionForApi = {
        id: currentSessionData.id.startsWith('session-') ? undefined : Number(currentSessionData.id),
        name: currentSessionData.name,
        achievements: currentSessionData.achievements,
        personalValues: currentSessionData.personalValues,
        coreValues: currentSessionData.coreValues,
        goals: currentSessionData.goals.map(goal => ({
          id: goal.id,
          description: goal.description,
          deadline: goal.deadline,
          keyResults: goal.keyResults
        })),
        actions: currentSessionData.actions.map(action => ({
          id: action.id,
          description: action.description,
          deadline: action.deadline,
          status: action.status
        })),
        alignment: currentSessionData.alignment,
        reflections: currentSessionData.reflections
      };
      
      // Save to API
      const savedSession = await saveUserSession(sessionForApi);
      
      if (savedSession) {
        // Update the session ID in case it was a new session and got an ID from the server
        if (currentSessionData.id.startsWith('session-')) {
          const newSessions = sessions.map(session => 
            session.id === currentSessionId 
              ? { ...session, id: String(savedSession.id) } 
              : session
          );
          setSessions(newSessions);
          setCurrentSessionId(String(savedSession.id));
          localStorage.setItem('productivitySessions', JSON.stringify(newSessions));
        }
        
        setSaveSuccess(true);
        // Hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      }
      
      setSaving(false);
    } catch (error) {
      console.error('Error saving worksheet:', error);
      setSaving(false);
      setError('Failed to save your session. Please try again.');
    }
  };

  const handlePrevious = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }
  };

  const handleNext = async () => {
    // Clear any previous validation errors
    setValidationErrors({ actions: null, reflections: null });
    
    if (currentTab === 4) { // Actions tab
      // Check if at least one action has description filled out
      const isActionsValid = actions.some(action => action.description.trim() !== '');
      
      if (!isActionsValid) {
        setValidationErrors(prev => ({ ...prev, actions: 'Please add at least one action item' }));
        return; // Prevent moving to next tab
      }
    }
    
    if (currentTab === 5) { // Reflections tab
      // Check if reflections field is filled out
      if (!reflections || reflections.trim() === '') {
        setValidationErrors(prev => ({ ...prev, reflections: 'Please add your reflections' }));
        return; // Prevent finishing the worksheet
      }
      
      // If on the last tab and validation passes, save and redirect to dashboard
      await handleSaveWorksheet();
      navigate('/dashboard');
      return;
    }
    
    // For other tabs, proceed without validation
    if (currentTab < 5) {
      setCurrentTab(currentTab + 1);
    }
  };

  // Achievement handlers - updated to work with the currentSession
  const addAchievement = () => {
    const newId = achievements.length > 0 ? Math.max(...achievements.map(a => a.id)) + 1 : 1;
    const updatedAchievements = [...achievements, { id: newId, description: '', howAchieved: '' }];
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, achievements: updatedAchievements } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updateAchievement = (id: number, field: keyof Achievement, value: string) => {
    const updatedAchievements = achievements.map(achievement => 
      achievement.id === id ? { ...achievement, [field]: value } : achievement
    );
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, achievements: updatedAchievements } 
        : session
    );
    setSessions(updatedSessions);
  };

  const removeAchievement = (id: number) => {
    if (achievements.length > 1) {
      const updatedAchievements = achievements.filter(achievement => achievement.id !== id);
      
      // Update session data
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, achievements: updatedAchievements } 
          : session
      );
      setSessions(updatedSessions);
    }
  };

  // Personal Value handlers - updated to work with the currentSession
  const addPersonalValue = () => {
    const newId = personalValues.length > 0 ? Math.max(...personalValues.map(v => v.id)) + 1 : 1;
    const updatedPersonalValues = [...personalValues, { id: newId, description: '' }];
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, personalValues: updatedPersonalValues } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updatePersonalValue = (id: number, value: string) => {
    const updatedPersonalValues = personalValues.map(personalValue => 
      personalValue.id === id ? { ...personalValue, description: value } : personalValue
    );
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, personalValues: updatedPersonalValues } 
        : session
    );
    setSessions(updatedSessions);
  };

  const removePersonalValue = (id: number) => {
    if (personalValues.length > 1) {
      const updatedPersonalValues = personalValues.filter(value => value.id !== id);
      
      // Update session data
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, personalValues: updatedPersonalValues } 
          : session
      );
      setSessions(updatedSessions);
    }
  };

  // Goal handlers - updated to work with the currentSession
  const addGoal = () => {
    const newId = goals.length > 0 ? Math.max(...goals.map(g => g.id)) + 1 : 1;
    const updatedGoals = [...goals, { id: newId, description: '', deadline: '', keyResults: [''] }];
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: updatedGoals } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updateGoal = (id: number, field: keyof Goal, value: any) => {
    const updatedGoals = goals.map(goal => 
      goal.id === id ? { ...goal, [field]: value } : goal
    );
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: updatedGoals } 
        : session
    );
    setSessions(updatedSessions);
  };

  const removeGoal = (id: number) => {
    if (goals.length > 1) {
      const updatedGoals = goals.filter(goal => goal.id !== id);
      
      // Update session data
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, goals: updatedGoals } 
          : session
      );
      setSessions(updatedSessions);
    }
  };

  const addKeyResult = (goalId: number) => {
    const updatedGoals = goals.map(goal => 
      goal.id === goalId ? { ...goal, keyResults: [...goal.keyResults, ''] } : goal
    );
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: updatedGoals } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updateKeyResult = (goalId: number, index: number, value: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedKeyResults = [...goal.keyResults];
        updatedKeyResults[index] = value;
        return { ...goal, keyResults: updatedKeyResults };
      }
      return goal;
    });
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: updatedGoals } 
        : session
    );
    setSessions(updatedSessions);
  };

  const removeKeyResult = (goalId: number, index: number) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId && goal.keyResults.length > 1) {
        const updatedKeyResults = goal.keyResults.filter((_, i) => i !== index);
        return { ...goal, keyResults: updatedKeyResults };
      }
      return goal;
    });
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: updatedGoals } 
        : session
    );
    setSessions(updatedSessions);
  };

  // Action handlers - updated to work with the currentSession
  const addAction = () => {
    const newId = actions.length > 0 ? Math.max(...actions.map(a => a.id)) + 1 : 1;
    const updatedActions = [...actions, { 
      id: newId, 
      description: '', 
      deadline: '', 
      status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' 
    }];
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, actions: updatedActions } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updateAction = (id: number, field: keyof Action, value: any) => {
    const updatedActions = actions.map(action => {
      if (action.id === id) {
        if (field === 'status') {
          return { 
            ...action, 
            [field]: value as 'Not Started' | 'In Progress' | 'Completed' 
          };
        }
        return { ...action, [field]: value };
      }
      return action;
    });
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, actions: updatedActions } 
        : session
    );
    setSessions(updatedSessions);
  };

  const removeAction = (id: number) => {
    if (actions.length > 1) {
      const updatedActions = actions.filter(action => action.id !== id);
      
      // Update session data
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, actions: updatedActions } 
          : session
      );
      setSessions(updatedSessions);
    }
  };
  
  // Update TextField handlers for the text fields that directly map to the session
  const updateCoreValues = (value: string) => {
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, coreValues: value } 
        : session
    );
    setSessions(updatedSessions);
  };
  
  const updateAlignment = (value: string) => {
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, alignment: value } 
        : session
    );
    setSessions(updatedSessions);
  };
  
  const updateReflections = (value: string) => {
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, reflections: value } 
        : session
    );
    setSessions(updatedSessions);
  };

  // Session deletion handlers
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    setDeleteError(null);
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!currentSession || !currentSessionId) return;
    
    // Don't allow deleting the last session
    if (sessions.length <= 1) {
      setDeleteError("You cannot delete your only coaching session.");
      return;
    }
    
    // If it's a local session that hasn't been saved to the API yet
    if (currentSessionId.startsWith('session-')) {
      // Just remove from local state
      const updatedSessions = sessions.filter(session => session.id !== currentSessionId);
      setSessions(updatedSessions);
      // Set first session as current
      setCurrentSessionId(updatedSessions[0].id);
      localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
      setDeleteDialogOpen(false);
      return;
    }
    
    try {
      setIsDeleting(true);
      const success = await deleteUserSession(Number(currentSessionId));
      
      if (success) {
        // Remove the deleted session from state
        const updatedSessions = sessions.filter(session => session.id !== currentSessionId);
        setSessions(updatedSessions);
        // Set first session as current
        setCurrentSessionId(updatedSessions[0].id);
        localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
        setDeleteDialogOpen(false);
        setSaveSuccess(true); // Show success message
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setDeleteError("Failed to delete session. Please try again.");
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setDeleteError("An error occurred while deleting the session.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Container sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        sx={{ fontWeight: 'bold', fontFamily: 'Poppins', mb: 3 }}
      >
        Productivity Pulse Worksheet
      </Typography>

      {loading ? (
        <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h6">Loading your sessions...</Typography>
        </Paper>
      ) : error ? (
        <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h6" color="error">{error}</Typography>
          <Button 
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Paper>
      ) : (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography 
            variant="h5" 
            sx={{ fontWeight: 'bold', fontFamily: 'Poppins', mb: 3 }}
          >
            Productivity Pulse Coaching Worksheet
          </Typography>
          <Typography variant="body1" sx={{ fontFamily: 'Poppins', mb: 3, color: 'text.secondary' }}>
            Complete the following sections to track your productivity journey. Each session builds on your previous work.
          </Typography>

          {/* Session Selection with Add & Edit */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              Coaching Session
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ flexGrow: 1 }}>
                {isEditingSessionName ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField 
                      fullWidth 
                      value={newSessionName} 
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="Enter session name..."
                      sx={{ fontFamily: 'Poppins', height: '48px', '& .MuiInputBase-root': { height: '48px' } }}
                    />
                    <Button 
                      onClick={handleSaveSessionName}
                      variant="contained"
                      size="medium"
                      disabled={saving}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none',
                        backgroundColor: '#1056F5',
                        height: '48px',
                        minWidth: '90px',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button 
                      onClick={handleCancelEditSessionName}
                      variant="outlined"
                      size="medium"
                      disabled={saving}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none',
                        height: '48px',
                        minWidth: '90px',
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                ) : (
                  <FormControl fullWidth>
                    <Select
                      value={currentSessionId}
                      onChange={(e) => handleSessionChange(e as React.ChangeEvent<{ value: unknown }>)}
                      displayEmpty
                      sx={{ fontFamily: 'Poppins', height: '48px' }}
                    >
                      {sessions.map(session => (
                        <MenuItem key={session.id} value={session.id}>
                          {session.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              {!isEditingSessionName && (
                <>
                  <Button 
                    onClick={handleStartEditSessionName}
                    variant="outlined"
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none', 
                      color: '#1056F5',
                      borderColor: '#1056F5',
                    }}
                  >
                    Rename
                  </Button>
                  
                  <Button 
                    onClick={handleDeleteClick}
                    variant="outlined"
                    color="error"
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none'
                    }}
                    disabled={sessions.length <= 1}
                  >
                    Delete
                  </Button>
                  
                  <Button 
                    onClick={handleAddSession}
                    variant="contained"
                    startIcon={<AddIcon />}
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none', 
                      bgcolor: '#1056F5',
                      '&:hover': {
                        bgcolor: '#0c43d0',
                      },
                    }}
                  >
                    New Session
                  </Button>
                </>
              )}
            </Box>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', color: 'text.secondary', mt: 2 }}>
              Select which coaching session you're currently working on or create a new one
            </Typography>
          </Box>

          {/* Navigation Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  fontFamily: 'Poppins',
                  textTransform: 'none',
                  fontWeight: 'medium',
                },
                '& .Mui-selected': {
                  color: '#1056F5',
                  fontWeight: 'bold',
                },
                '& .MuiTabs-indicator': {
                  backgroundColor: '#1056F5',
                },
              }}
            >
              <Tab label="Personal Values" />
              <Tab label="Core Values" />
              <Tab label="Alignment" />
              <Tab label="Goals" />
              <Tab label={<Box component="span">Actions<Box component="span" sx={{ color: '#f44336' }}>*</Box></Box>} />
              <Tab label={<Box component="span">Reflections<Box component="span" sx={{ color: '#f44336' }}>*</Box></Box>} />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <TabPanel value={currentTab} index={0}>
            {/* Personal Values Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              Personal Values
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                  Proud Achievements
                </Typography>
                <Button 
                  startIcon={<AddIcon />} 
                  onClick={addAchievement}
                  sx={{ 
                    fontFamily: 'Poppins', 
                    textTransform: 'none', 
                    color: '#1056F5',
                    backgroundColor: 'white',
                    border: '1px solid #1056F5',
                    '&:hover': {
                      backgroundColor: '#f0f7ff',
                    },
                  }}
                >
                  Add Achievement
                </Button>
              </Box>

              {achievements.map((achievement, index) => (
                <Box key={achievement.id} sx={{ mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
                    Achievement {index + 1}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Achievement Description
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Describe an achievement you're proud of..."
                    value={achievement.description}
                    onChange={(e) => updateAchievement(achievement.id, 'description', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    How You Achieved It
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    placeholder="Describe what it took to achieve this..."
                    value={achievement.howAchieved}
                    onChange={(e) => updateAchievement(achievement.id, 'howAchieved', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  {achievements.length > 1 && (
                    <Button 
                      startIcon={<DeleteIcon />} 
                      onClick={() => removeAchievement(achievement.id)}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none', 
                        color: '#d32f2f'
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              ))}
            </Box>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                  Personal Values
                </Typography>
                <Button 
                  startIcon={<AddIcon />} 
                  onClick={addPersonalValue}
                  sx={{ 
                    fontFamily: 'Poppins', 
                    textTransform: 'none', 
                    color: '#1056F5',
                    backgroundColor: 'white',
                    border: '1px solid #1056F5',
                    '&:hover': {
                      backgroundColor: '#f0f7ff',
                    },
                  }}
                >
                  Add Value
                </Button>
              </Box>

              {personalValues.map((value, index) => (
                <Box key={value.id} sx={{ mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
                    Value {index + 1}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Value Description
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Describe what you value in life..."
                    value={value.description}
                    onChange={(e) => updatePersonalValue(value.id, e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  {personalValues.length > 1 && (
                    <Button 
                      startIcon={<DeleteIcon />} 
                      onClick={() => removePersonalValue(value.id)}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none', 
                        color: '#d32f2f'
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {/* Core Values Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              Core Values
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              Reflect on the achievements and personal values you've identified. What core values emerge from these?
            </Typography>
            
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
              Your Core Values
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Identify and describe your core values based on your achievements and personal values..."
              value={coreValues}
              onChange={(e) => updateCoreValues(e.target.value)}
              sx={{ mb: 4 }}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {/* Alignment Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              Alignment
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              Consider how your daily actions align with your core values. Are there areas of misalignment?
            </Typography>
            
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
              Value Alignment Assessment
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={6}
              placeholder="Describe how your daily activities align or don't align with your core values..."
              value={alignment}
              onChange={(e) => updateAlignment(e.target.value)}
              sx={{ mb: 4 }}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            {/* Goals Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              Goals
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              Set goals that align with your core values to increase your productivity and fulfillment.
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                  Your Goals
                </Typography>
                <Button 
                  startIcon={<AddIcon />} 
                  onClick={addGoal}
                  sx={{ 
                    fontFamily: 'Poppins', 
                    textTransform: 'none', 
                    color: '#1056F5',
                    backgroundColor: 'white',
                    border: '1px solid #1056F5',
                    '&:hover': {
                      backgroundColor: '#f0f7ff',
                    },
                  }}
                >
                  Add Goal
                </Button>
              </Box>

              {goals.map((goal, index) => (
                <Box key={goal.id} sx={{ mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
                    Goal {index + 1}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Goal Description
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Describe your goal..."
                    value={goal.description}
                    onChange={(e) => updateGoal(goal.id, 'description', e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Target Deadline
                  </Typography>
                  <TextField
                    type="date"
                    fullWidth
                    value={goal.deadline}
                    onChange={(e) => updateGoal(goal.id, 'deadline', e.target.value)}
                    sx={{ mb: 3 }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Key Results
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'Poppins', mb: 2, display: 'block', color: 'text.secondary' }}>
                    How will you measure success for this goal?
                  </Typography>
                  
                  {goal.keyResults.map((keyResult, keyIndex) => (
                    <Box key={keyIndex} sx={{ display: 'flex', mb: 2, gap: 1 }}>
                      <TextField
                        fullWidth
                        placeholder={`Key result ${keyIndex + 1}...`}
                        value={keyResult}
                        onChange={(e) => updateKeyResult(goal.id, keyIndex, e.target.value)}
                      />
                      {goal.keyResults.length > 1 && (
                        <IconButton 
                          onClick={() => removeKeyResult(goal.id, keyIndex)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                  
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => addKeyResult(goal.id)}
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none', 
                      mb: 2,
                      color: '#1056F5'
                    }}
                  >
                    Add Key Result
                  </Button>
                  
                  {goals.length > 1 && (
                    <Button 
                      startIcon={<DeleteIcon />} 
                      onClick={() => removeGoal(goal.id)}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none', 
                        color: '#d32f2f',
                        display: 'block'
                      }}
                    >
                      Remove Goal
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            {/* Actions Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              Actions
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 2, color: validationErrors.actions ? 'error.main' : 'text.secondary' }}>
              {validationErrors.actions || 'Break down your goals into actionable steps. What specific actions will help you achieve your goals?'}
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                  Action Items
                </Typography>
                <Button 
                  startIcon={<AddIcon />} 
                  onClick={addAction}
                  sx={{ 
                    fontFamily: 'Poppins', 
                    textTransform: 'none', 
                    color: '#1056F5',
                    backgroundColor: 'white',
                    border: '1px solid #1056F5',
                    '&:hover': {
                      backgroundColor: '#f0f7ff',
                    },
                  }}
                >
                  Add Action
                </Button>
              </Box>

              {actions.map((action, index) => (
                <Box key={action.id} sx={{ mb: 3, p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
                    Action {index + 1}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Action Description
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Describe the specific action to take..."
                    value={action.description}
                    onChange={(e) => updateAction(action.id, 'description', e.target.value)}
                    sx={{ mb: 2 }}
                    error={validationErrors.actions !== null && action.description.trim() === ''}
                  />
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Deadline
                  </Typography>
                  <TextField
                    type="date"
                    fullWidth
                    value={action.deadline}
                    onChange={(e) => updateAction(action.id, 'deadline', e.target.value)}
                    sx={{ mb: 2 }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                  
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Status
                  </Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <Select
                      value={action.status}
                      onChange={(e) => updateAction(action.id, 'status', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="Not Started">Not Started</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {actions.length > 1 && (
                    <Button 
                      startIcon={<DeleteIcon />} 
                      onClick={() => removeAction(action.id)}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none', 
                        color: '#d32f2f'
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              ))}
            </Box>
          </TabPanel>

          <TabPanel value={currentTab} index={5}>
            {/* Reflections Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              Reflections
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 2, color: validationErrors.reflections ? 'error.main' : 'text.secondary' }}>
              {validationErrors.reflections || 'Reflect on your productivity journey. What insights have you gained? How do you feel about your progress?'}
            </Typography>

            <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
              Your Reflections
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              placeholder="Share your thoughts, insights, and reflections about your productivity journey..."
              value={reflections}
              onChange={(e) => updateReflections(e.target.value)}
              sx={{ mb: 4 }}
              error={validationErrors.reflections !== null}
            />
          </TabPanel>
          
          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={currentTab === 0 || saving}
              sx={{
                fontFamily: 'Poppins',
                textTransform: 'none',
                color: '#1056F5',
                borderColor: '#1056F5',
                '&:hover': {
                  borderColor: '#0D47D9',
                },
              }}
            >
              Previous
            </Button>
            <Typography variant="body2" sx={{ fontFamily: 'Poppins', color: 'text.secondary', alignSelf: 'center' }}>
              {saving ? 'Saving your progress...' : 'Your progress is automatically saved when you switch sessions.'}
            </Typography>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={saving}
              sx={{
                fontFamily: 'Poppins',
                textTransform: 'none',
                backgroundColor: '#1056F5',
                '&:hover': {
                  backgroundColor: '#0D47D9',
                },
              }}
            >
              {saving ? 'Saving...' : currentTab === 5 ? 'Finish' : 'Next: ' + 
                ['Core Values', 'Alignment', 'Goals', 'Actions', 'Reflections', 'Submit'][currentTab]}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Success Notification */}
      <Snackbar 
        open={saveSuccess} 
        autoHideDuration={6000} 
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaveSuccess(false)} severity="success">
          Your worksheet has been saved successfully!
        </Alert>
      </Snackbar>

      {/* Delete Session Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={!isDeleting ? handleCancelDelete : undefined}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Coaching Session
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this coaching session? This action cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete} 
            disabled={isDeleting}
            sx={{ fontFamily: 'Poppins' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            autoFocus
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={20} /> : <DeleteIcon />}
            sx={{ fontFamily: 'Poppins' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete Session'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Worksheet; 