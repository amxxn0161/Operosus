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
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import GoalItem from '../components/GoalItem';

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
  const [sessions, setSessions] = useState<CoachingSession[]>([
    { 
      id: 'session-1', 
      name: 'Session 1',
      achievements: [{ id: 1, description: '', howAchieved: '' }],
      personalValues: [{ id: 1, description: '' }],
      coreValues: '',
      goals: [{ id: 1, description: '', deadline: '', keyResults: [''] }],
      actions: [{ id: 1, description: '', deadline: '', status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed' }],
      alignment: '',
      reflections: ''
    }
  ]);
  const [currentSessionId, setCurrentSessionId] = useState('session-1');
  const [isEditingSessionName, setIsEditingSessionName] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Derived state - current session data
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  
  // Destructure current session for easier access
  const { 
    achievements, 
    personalValues, 
    coreValues, 
    goals, 
    actions, 
    alignment, 
    reflections 
  } = currentSession;

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
    }

    // Load previously saved sessions from localStorage
    const savedSessions = localStorage.getItem('productivitySessions');
    if (savedSessions) {
      try {
        const parsedSessions = JSON.parse(savedSessions) as CoachingSession[];
        setSessions(parsedSessions);
        
        // If there are sessions, set current to the first one
        if (parsedSessions.length > 0) {
          setCurrentSessionId(parsedSessions[0].id);
        }
      } catch (error) {
        console.error('Error parsing saved sessions:', error);
      }
    }
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
  
  const handleSaveSessionName = () => {
    if (newSessionName.trim()) {
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, name: newSessionName.trim() } 
          : session
      );
      setSessions(updatedSessions);
      localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
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

  const handleSaveWorksheet = () => {
    // Save current session
    handleSaveSession();
    
    // Show brief saved message
    alert('Your progress has been saved!');
  };

  const handlePrevious = () => {
    if (currentTab > 0) {
      setCurrentTab(currentTab - 1);
    }
  };

  const handleNext = () => {
    if (currentTab < 5) {
      setCurrentTab(currentTab + 1);
    } else {
      // If on the last tab, save and redirect to dashboard
      handleSaveWorksheet();
      navigate('/dashboard');
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

  return (
    <Container sx={{ py: 4 }}>
      <Typography 
        variant="h4" 
        component="h1" 
        sx={{ fontWeight: 'bold', fontFamily: 'Poppins', mb: 3 }}
      >
        Productivity Pulse Worksheet
      </Typography>

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
                    sx={{ 
                      fontFamily: 'Poppins', 
                      textTransform: 'none',
                      backgroundColor: '#1056F5',
                      height: '48px',
                      minWidth: '90px',
                    }}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={handleCancelEditSessionName}
                    variant="outlined"
                    size="medium"
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined"
                  onClick={handleStartEditSessionName}
                  size="medium"
                  sx={{ 
                    fontFamily: 'Poppins', 
                    textTransform: 'none',
                    height: '48px',
                    minWidth: '90px',
                  }}
                >
                  Rename
                </Button>
                <Button 
                  variant="contained"
                  onClick={handleAddSession}
                  startIcon={<AddIcon />}
                  size="medium"
                  sx={{ 
                    fontFamily: 'Poppins', 
                    textTransform: 'none',
                    backgroundColor: '#1056F5',
                    height: '48px',
                    minWidth: '130px',
                  }}
                >
                  New Session
                </Button>
              </Box>
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
            <Tab label="Actions" />
            <Tab label="Reflections" />
          </Tabs>
        </Box>

        {/* Tab Content - updated references to access current session data via destructured variables */}
        <TabPanel value={currentTab} index={0}>
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
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
            Core Values
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              Define Your Core Values
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              placeholder="What matters most to me..."
              value={coreValues}
              onChange={(e) => updateCoreValues(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" sx={{ fontFamily: 'Poppins', color: 'text.secondary' }}>
              Minimum 50 characters, maximum 1000 characters
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
            Alignment
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              How Your Values Align With Your Work
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              placeholder="Describe how your work aligns with your personal and core values..."
              value={alignment}
              onChange={(e) => updateAlignment(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" sx={{ fontFamily: 'Poppins', color: 'text.secondary' }}>
              Minimum 50 characters, maximum 1000 characters
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
            Goals
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                Your Objectives & Key Results (OKRs)
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
              <GoalItem
                key={goal.id}
                goal={goal}
                index={index}
                canRemove={goals.length > 1}
                onUpdateGoal={updateGoal}
                onRemoveGoal={removeGoal}
                onAddKeyResult={addKeyResult}
                onUpdateKeyResult={updateKeyResult}
                onRemoveKeyResult={removeKeyResult}
              />
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
            Actions
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
                  Description
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Describe the action to take..."
                  value={action.description}
                  onChange={(e) => updateAction(action.id, 'description', e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                  Deadline
                </Typography>
                <TextField
                  type="date"
                  value={action.deadline}
                  onChange={(e) => updateAction(action.id, 'deadline', e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                  Status
                </Typography>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <Select
                    value={action.status}
                    onChange={(e) => updateAction(action.id, 'status', e.target.value as 'Not Started' | 'In Progress' | 'Completed')}
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
          <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
            Reflections
          </Typography>
          
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: 'Poppins', mb: 2 }}>
              Session Reflections
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={10}
              placeholder="Reflect on your progress, challenges, and insights..."
              value={reflections}
              onChange={(e) => updateReflections(e.target.value)}
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" sx={{ fontFamily: 'Poppins', color: 'text.secondary' }}>
              Minimum 50 characters, maximum 1000 characters
            </Typography>
          </Box>
        </TabPanel>

        {/* Navigation Buttons - Update the message to clarify auto-saving */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handlePrevious}
            disabled={currentTab === 0}
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
            Your progress is automatically saved when you switch sessions.
          </Typography>
          <Button
            variant="contained"
            onClick={handleNext}
            sx={{
              fontFamily: 'Poppins',
              textTransform: 'none',
              backgroundColor: '#1056F5',
              '&:hover': {
                backgroundColor: '#0D47D9',
              },
            }}
          >
            {currentTab === 5 ? 'Finish' : 'Next: ' + 
              ['Core Values', 'Alignment', 'Goals', 'Actions', 'Reflections', 'Submit'][currentTab]}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Worksheet; 