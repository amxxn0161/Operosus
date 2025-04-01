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
  CircularProgress,
  Grid,
  Divider,
  Chip,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GoalItem from '../components/GoalItem';
import { fetchUserSessions, saveUserSession, deleteUserSession, UserSession, Achievement as ApiAchievement, Goal as ApiGoal, Action as ApiAction } from '../services/worksheetService';
import DocumentUploader from '../components/DocumentUploader';
import { ExtractedContent } from '../utils/documentParser';
import { CheckCircleOutline, InfoOutlined, AutoAwesomeOutlined, ExpandMore } from '@mui/icons-material';

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

// Simplified interfaces for the productivity superhero worksheet
interface PersonalValue {
  id: number;
  proudOf: string[];  // What am I most proud of?
  achievement: string[]; // What did it take for me to achieve those things?
  happiness: string[]; // What makes me happiest in life?
  inspiration: string[]; // Who do I find inspiring and what qualities am I admiring?
}

interface ProductivityConnection {
  id: number;
  coreValues: string; // MY VALUES - what matters most to me?
  valueImpact: string; // MY PRODUCTIVITY - how does it link to my values?
}

interface Goal {
  id: number;
  description: string;  
  impact: string[]; // What will be different? How will you feel? Who benefits?
}

interface WorkshopOutput {
  id: number;
  actions: string[]; // Workshop actions/commitments
  reflections: string; // Workshop reflections
}

interface CoachingSession {
  id: string;
  name: string;
  personalValues: PersonalValue;
  productivityConnection: ProductivityConnection;
  goals: Goal;
  workshopOutput: WorkshopOutput;
}

// Update the text field styling for a more elegant appearance and mobile friendliness
const textFieldStyles = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '8px',
    transition: 'all 0.2s ease-in-out',
    backgroundColor: '#f9f9fd',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
    '& fieldset': {
      borderColor: 'transparent',
    },
    '&:hover': {
      backgroundColor: '#f5f5fc',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
      '& fieldset': {
        borderColor: 'transparent',
      },
    },
    '&.Mui-focused': {
      boxShadow: '0 3px 6px rgba(75, 0, 130, 0.08)',
      backgroundColor: '#ffffff',
      '& fieldset': {
        borderColor: 'transparent',
      },
    },
  },
  '& .MuiInputBase-input': {
    fontFamily: 'Poppins',
    padding: '12px 14px',
  },
  mb: { xs: 2, sm: 3 },
};

// Compact button style for web view
const compactButtonStyle = {
  py: { sm: 0.5, md: 0.75 },
  px: { sm: 1, md: 1.5 },
  fontSize: { sm: '0.75rem', md: '0.8125rem' },
  minWidth: { sm: 'auto' },
  maxHeight: { sm: '32px', md: '36px' },
};

const numberedFieldStyles = {
  ...textFieldStyles,
  '& .MuiInputBase-root': {
    minHeight: { xs: '60px', sm: '80px' },
    backgroundColor: '#f9f9fd',
  },
  '& .MuiOutlinedInput-inputMultiline': {
    padding: '12px 14px',
  },
};

const Worksheet: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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
    personalValues = {
      id: 1,
      proudOf: ['', '', ''],
      achievement: ['', '', ''],
      happiness: ['', '', ''],
      inspiration: ['', '', '']
    }, 
    productivityConnection = {
      id: 1,
      coreValues: '',
      valueImpact: ''
    }, 
    goals = {
      id: 1,
      description: '',
      impact: ['', '', '']
    }, 
    workshopOutput = {
      id: 1,
      actions: ['', '', '', '', ''],
      reflections: ''
    }
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
        console.log('API sessions received:', apiSessions);
        
        if (apiSessions.length > 0) {
          // Convert API sessions to the format expected by the component
          const formattedSessions = apiSessions.map((apiSession: UserSession) => {
            console.log(`Processing session ID ${apiSession.id}: "${apiSession.name}"`);
            
            // Add debugging for personalValues from API
            console.log('Processing personalValues from API:', apiSession.personalValues);
            console.log('First 3 values (happiness):', apiSession.personalValues?.slice(0, 3));
            console.log('Next 3 values (inspiration):', apiSession.personalValues?.length > 3 ? 
              apiSession.personalValues.slice(3, 6) : 'Not available');
            
            // Extract impact fields from goal descriptions if they exist
            const impactFields = ['', '', ''];
            let mainDescription = ''; // Declare the variable to fix linter errors
            
            // If there are goals in the API response
            if (apiSession.goals?.length) {
              console.log(`Found ${apiSession.goals.length} goals in API response`);
              
              // First goal is always the main description
              if (apiSession.goals[0]) {
                mainDescription = apiSession.goals[0].description || '';
                console.log(`Main goal description from API:`, mainDescription);
              }
              
              // Look for additional goals that contain the impact fields
              apiSession.goals.forEach(goal => {
                const description = goal.description || '';
                
                // Check for specific impact field prefixes
                if (description.startsWith('How will you feel:')) {
                  impactFields[0] = description.replace('How will you feel:', '').trim();
                  console.log(`Found 'How will you feel' goal (ID: ${goal.id}): "${impactFields[0]}"`);
                } 
                else if (description.startsWith('Who benefits:')) {
                  impactFields[1] = description.replace('Who benefits:', '').trim();
                  console.log(`Found 'Who benefits' goal (ID: ${goal.id}): "${impactFields[1]}"`);
                } 
                else if (description.startsWith('I want to improve:')) {
                  impactFields[2] = description.replace('I want to improve:', '').trim();
                  console.log(`Found 'I want to improve' goal (ID: ${goal.id}): "${impactFields[2]}"`);
                }
              });
              
              // Log out what we found
              console.log(`Extracted impact fields from API:`, impactFields);
              
              // Also check for bullet points (•) which might indicate a list of goals
              if (mainDescription.includes('•')) {
                console.log('Bullet points found in goal description - preserving original format');
              }
            } else {
              console.log('No goals found in API response');
            }
            
            const formattedSession = {
              id: String(apiSession.id),
              name: apiSession.name,
              personalValues: {
                id: 1,
                proudOf: apiSession.achievements?.length ? 
                  apiSession.achievements.map(a => a.description).slice(0, 3) : 
                  ['', '', ''],
                achievement: apiSession.achievements?.length ? 
                  apiSession.achievements.map(a => a.howAchieved).slice(0, 3) : 
                  ['', '', ''],
                happiness: apiSession.personalValues?.length ? 
                  apiSession.personalValues.slice(0, 3).map(v => v.description) : 
                  ['', '', ''],
                inspiration: apiSession.personalValues?.length && apiSession.personalValues.length > 3 ? 
                  apiSession.personalValues.slice(3, 6).map(v => v.description) : 
                  ['', '', ''] // Now properly extracting values with IDs 4-6
              },
              productivityConnection: {
                id: 1,
                coreValues: apiSession.coreValues || '',
                valueImpact: apiSession.alignment || ''
              },
              goals: {
                id: 1,
                // Use the extracted main description instead of just the first line
                description: apiSession.goals?.length ? mainDescription : '',
                impact: impactFields // Use the extracted impact fields
              },
              workshopOutput: {
                id: 1,
                actions: apiSession.actions?.length ? 
                  apiSession.actions.map(a => a.description).slice(0, 5) : 
                  ['', '', '', '', ''],
                reflections: apiSession.reflections || ''
              }
            };
            
            console.log('Formatted session with extracted impact fields:', {
              ...formattedSession,
              goals: {
                ...formattedSession.goals,
                impact: formattedSession.goals.impact
              }
            });
            
            return formattedSession;
          });
          
          setSessions(formattedSessions);
          setCurrentSessionId(String(apiSessions[0].id));
        } else {
          // If no sessions from API, create an empty default one
          setSessions([{ 
            id: 'session-default', 
            name: 'Session 1',
            personalValues: {
              id: 1,
              proudOf: ['', '', ''],
              achievement: ['', '', ''],
              happiness: ['', '', ''],
              inspiration: ['', '', '']
            },
            productivityConnection: {
              id: 1,
              coreValues: '',
              valueImpact: ''
            },
            goals: {
              id: 1,
              description: '',
              impact: ['', '', '']
            },
            workshopOutput: {
              id: 1,
              actions: ['', '', '', '', ''],
              reflections: ''
            }
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
      personalValues: {
        id: 1,
        proudOf: ['', '', ''],
        achievement: ['', '', ''],
        happiness: ['', '', ''],
        inspiration: ['', '', '']
      },
      productivityConnection: {
        id: 1,
        coreValues: '',
        valueImpact: ''
      },
      goals: {
        id: 1,
        description: '',
        impact: ['', '', '']
      },
      workshopOutput: {
        id: 1,
        actions: ['', '', '', '', ''],
        reflections: ''
      }
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
    if (!newSessionName.trim()) {
      return; // Don't save empty session names
    }
    
    try {
      // Update session name in state
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId 
          ? { ...session, name: newSessionName } 
          : session
      );
      setSessions(updatedSessions);
      
      // If session exists on server (not local-only), update it there too
      if (!currentSessionId.startsWith('session-')) {
        setSaving(true);
        
        // Find the current session
        const currentSessionData = updatedSessions.find(s => s.id === currentSessionId);
        
        if (currentSessionData) {
          // Prepare session for API (format back to API structure)
          const sessionForApi = {
            id: Number(currentSessionId),
            name: newSessionName,
            achievements: currentSessionData.personalValues.proudOf.map((text, i) => ({
              id: i + 1,
              description: text,
              howAchieved: currentSessionData.personalValues.achievement[i] || ''
            })),
            personalValues: currentSessionData.personalValues.happiness.map((text, i) => ({
              id: i + 1,
              description: text
            })),
            coreValues: currentSessionData.productivityConnection.coreValues,
            goals: [{
              id: 1,
              description: currentSessionData.goals.description,
              deadline: '',
              keyResults: []
            }],
            actions: currentSessionData.workshopOutput.actions.map((text, i) => ({
              id: i + 1,
              description: text,
              deadline: '',
              status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed'
            })),
            alignment: currentSessionData.productivityConnection.valueImpact,
            reflections: currentSessionData.workshopOutput.reflections
          };
          
          await saveUserSession(sessionForApi);
        }
        
        setSaving(false);
      }
      
      // Save to localStorage
      localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
      
      // Reset editing state
      setIsEditingSessionName(false);
    } catch (error) {
      console.error('Error saving session name:', error);
      setError('Failed to update session name. Please try again.');
      setSaving(false);
    }
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
            personalValues,
            productivityConnection,
            goals,
            workshopOutput
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
      console.log('🔄 Starting save process - saving to local state first');
      // Save to local state first
      handleSaveSession();
      
      // Find the current session
      const currentSessionData = sessions.find(s => s.id === currentSessionId);
      
      if (!currentSessionData) {
        throw new Error('Current session not found');
      }
      
      console.log('📋 Preparing data for API submission');
      // Format data for API - convert from new format to API format
      const sessionForApi = {
        id: currentSessionData.id.startsWith('session-') ? undefined : Number(currentSessionData.id),
        name: currentSessionData.name,
        achievements: currentSessionData.personalValues.proudOf.map((text, i) => ({
          id: i + 1,
          description: text,
          howAchieved: currentSessionData.personalValues.achievement[i] || ''
        })).filter(item => item.description.trim() !== ''),
        // Include both happiness and inspiration in personalValues
        personalValues: [
          ...currentSessionData.personalValues.happiness.map((text, i) => ({
            id: i + 1,
            description: text
          })),
          ...currentSessionData.personalValues.inspiration.map((text, i) => ({
            id: currentSessionData.personalValues.happiness.length + i + 1,
            description: text
          })).filter(item => item.description.trim() !== '') // Only include non-empty inspiration values
        ],
        coreValues: currentSessionData.productivityConnection.coreValues,
        goals: [
          // Main goal - always include this
          {
            id: 1,
            description: currentSessionData.goals.description.includes('\n') || 
                        currentSessionData.goals.description.includes('•') ?
              // If it already has bullet points or line breaks, preserve them
              currentSessionData.goals.description :
              // Otherwise just use the main description
              currentSessionData.goals.description,
            deadline: '',
            keyResults: []
          },
          // Add additional goals for each impact field with non-empty values
          ...(currentSessionData.goals.impact[0]?.trim() ? [{
            id: 2,
            description: `How will you feel: ${currentSessionData.goals.impact[0]}`,
            deadline: '',
            keyResults: []
          }] : []),
          ...(currentSessionData.goals.impact[1]?.trim() ? [{
            id: 3,
            description: `Who benefits: ${currentSessionData.goals.impact[1]}`,
            deadline: '',
            keyResults: []
          }] : []),
          ...(currentSessionData.goals.impact[2]?.trim() ? [{
            id: 4,
            description: `I want to improve: ${currentSessionData.goals.impact[2]}`,
            deadline: '',
            keyResults: []
          }] : [])
        ],
        actions: currentSessionData.workshopOutput.actions.map((text, i) => ({
          id: i + 1,
          description: text,
          deadline: '',
          status: 'Not Started' as 'Not Started' | 'In Progress' | 'Completed'
        })).filter(action => action.description.trim() !== ''), // Only include non-empty actions
        alignment: currentSessionData.productivityConnection.valueImpact,
        reflections: currentSessionData.workshopOutput.reflections
      };
      
      console.log('🔍 Full session data being saved to API:', sessionForApi);
      console.log('📊 Personal values breakdown:');
      console.log('- Happiness values:', currentSessionData.personalValues.happiness);
      console.log('- Inspiration values:', currentSessionData.personalValues.inspiration);
      console.log('- API format personal values:', sessionForApi.personalValues);
      
      console.log('📤 Calling API to save session...', sessionForApi.id ? 'UPDATE' : 'CREATE', sessionForApi);
      // Save to API
      const savedSession = await saveUserSession(sessionForApi);
      
      if (savedSession) {
        console.log('✅ API save successful, received session ID:', savedSession.id);
        
        // Important: Preserve the current UI state of the goals and impact fields
        // that might not be reflected in the API response
        let updatedSession = { ...currentSession };
        
        // Update the session ID in case it was a new session and got an ID from the server
        if (currentSessionData.id.startsWith('session-')) {
          updatedSession = { ...updatedSession, id: String(savedSession.id) };
          
          // Update sessions array with the new ID
          const newSessions = sessions.map(session => 
            session.id === currentSessionId 
              ? updatedSession
              : session
          );
          
          setSessions(newSessions);
          setCurrentSessionId(String(savedSession.id));
          localStorage.setItem('productivitySessions', JSON.stringify(newSessions));
        } else {
          // Even for existing sessions, ensure we keep our UI state
          // but with any updated info from the server
          const newSessions = sessions.map(session => 
            session.id === currentSessionId 
              ? updatedSession
              : session
          );
          
          setSessions(newSessions);
          localStorage.setItem('productivitySessions', JSON.stringify(newSessions));
        }
        
        setSaveSuccess(true);
        // Hide success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error('❌ API save failed - saveUserSession returned null');
        setError('Failed to save to the API. Please check your connection and try again.');
      }
      
      setSaving(false);
    } catch (error) {
      console.error('❌ Error saving worksheet:', error);
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
    
    if (currentTab === 3) { // Actions tab
      // Check if at least one action has a non-empty description
      const isActionsValid = workshopOutput.actions.some(action => action.trim() !== '');
      
      if (!isActionsValid) {
        setValidationErrors(prev => ({ ...prev, actions: 'Please add at least one action item' }));
        return; // Prevent moving to next tab
      }
    }
    
    if (currentTab === 4) { // Reflections tab
      // Check if reflections field is filled out
      if (!workshopOutput.reflections || workshopOutput.reflections.trim() === '') {
        setValidationErrors(prev => ({ ...prev, reflections: 'Please add your reflections' }));
        return; // Prevent finishing the worksheet
      }
      
      // If on the last tab and validation passes, save and redirect to dashboard
      await handleSaveWorksheet();
      navigate('/dashboard');
      return;
    }
    
    // For other tabs, proceed without validation
    if (currentTab < 4) {
      setCurrentTab(currentTab + 1);
    }
  };

  // Update methods for personal values
  const updatePersonalValue = (field: 'proudOf' | 'achievement' | 'happiness' | 'inspiration', index: number, value: string) => {
    const updatedValues = { ...personalValues };
    updatedValues[field][index] = value;
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, personalValues: updatedValues } 
        : session
    );
    setSessions(updatedSessions);
  };

  // Update methods for productivity connection
  const updateProductivityConnection = (field: 'coreValues' | 'valueImpact', value: string) => {
    const updatedConnection = { 
      ...productivityConnection,
      [field]: value 
    };
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, productivityConnection: updatedConnection } 
        : session
    );
    setSessions(updatedSessions);
  };

  // Update methods for goals
  const updateGoal = (field: 'description', value: string) => {
    const updatedGoal = { 
      ...goals,
      [field]: value 
    };
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: updatedGoal } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updateGoalImpact = (index: number, value: string) => {
    const updatedImpact = [...goals.impact];
    updatedImpact[index] = value;
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, goals: { ...goals, impact: updatedImpact } } 
        : session
    );
    setSessions(updatedSessions);
  };

  // Update methods for workshop output
  const updateWorkshopAction = (index: number, value: string) => {
    const updatedActions = [...workshopOutput.actions];
    updatedActions[index] = value;
    
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, workshopOutput: { ...workshopOutput, actions: updatedActions } } 
        : session
    );
    setSessions(updatedSessions);
  };

  const updateReflections = (value: string) => {
    // Update session data
    const updatedSessions = sessions.map(session => 
      session.id === currentSessionId 
        ? { ...session, workshopOutput: { ...workshopOutput, reflections: value } } 
        : session
    );
    setSessions(updatedSessions);
  };

  // Update where the onDocumentProcessed handler is defined
  const handleProcessExtractedDocument = (extractedContent: ExtractedContent) => {
    console.log('Received extracted content for processing:', extractedContent);
    
    // Check if personal values were extracted
    const hasPersonalValues = extractedContent.personalValues.proudOf.some(v => v) || 
                            extractedContent.personalValues.achievement.some(v => v) ||
                            extractedContent.personalValues.happiness.some(v => v) ||
                            extractedContent.personalValues.inspiration.some(v => v);
                            
    console.log('Has personal values:', hasPersonalValues);
    
    try {
      // Deep clone the current session to avoid mutation issues
      const sessionToUpdate = JSON.parse(JSON.stringify(
        sessions.find(s => s.id === currentSessionId) || sessions[0]
      ));
      
      // Ensure each array has exactly 3 elements - define function at the top level
      const ensureThreeElements = (arr: string[]): string[] => {
        const result = [...arr];
        while (result.length < 3) result.push('');
        return result.slice(0, 3);
      };
      
      // Apply extracted content to the current session
      if (hasPersonalValues) {
        console.log('Applying personal values to session:');
        console.log('- proudOf:', extractedContent.personalValues.proudOf);
        console.log('- achievement:', extractedContent.personalValues.achievement);
        console.log('- happiness:', extractedContent.personalValues.happiness);
        console.log('- inspiration:', extractedContent.personalValues.inspiration);
        
        // Direct assignment of each field separately to preserve extracted data structure
        sessionToUpdate.personalValues = {
          ...sessionToUpdate.personalValues,
          proudOf: ensureThreeElements(extractedContent.personalValues.proudOf),
          achievement: ensureThreeElements(extractedContent.personalValues.achievement),
          happiness: ensureThreeElements(extractedContent.personalValues.happiness),
          inspiration: ensureThreeElements(extractedContent.personalValues.inspiration)
        };
      }
      
      // Apply productivity connection if available
      if (extractedContent.productivityConnection.coreValues || 
          extractedContent.productivityConnection.valueImpact) {
        sessionToUpdate.productivityConnection = {
          ...sessionToUpdate.productivityConnection,
          coreValues: extractedContent.productivityConnection.coreValues || sessionToUpdate.productivityConnection.coreValues,
          valueImpact: extractedContent.productivityConnection.valueImpact || sessionToUpdate.productivityConnection.valueImpact
        };
      }
      
      // Apply goals if available
      if (extractedContent.goals.description || extractedContent.goals.impact.some(v => v)) {
        sessionToUpdate.goals = {
          ...sessionToUpdate.goals,
          description: extractedContent.goals.description || sessionToUpdate.goals.description,
          impact: extractedContent.goals.impact.length > 0 ? 
                  ensureThreeElements(extractedContent.goals.impact) : 
                  sessionToUpdate.goals.impact
        };
      }
      
      // Apply workshop output if available
      if (extractedContent.workshopOutput.actions.some(v => v) || 
          extractedContent.workshopOutput.reflections) {
        sessionToUpdate.workshopOutput = {
          ...sessionToUpdate.workshopOutput,
          actions: extractedContent.workshopOutput.actions.some(v => v) ? 
                  extractedContent.workshopOutput.actions :
                  sessionToUpdate.workshopOutput.actions,
          reflections: extractedContent.workshopOutput.reflections || 
                    sessionToUpdate.workshopOutput.reflections
        };
      }
      
      // Update the sessions array with the modified session
      const updatedSessions = sessions.map(session => 
        session.id === currentSessionId ? sessionToUpdate : session
      );
      
      // Set the current tab to the Plan section (index 0) to show the updated values
      setCurrentTab(0);
      
      // Update state and save to localStorage
      setSessions(updatedSessions);
      localStorage.setItem('productivitySessions', JSON.stringify(updatedSessions));
      
      // Show success message
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error applying document data:', error);
      setError('Failed to apply document data to the worksheet. Please try again.');
    }
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
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 2, sm: 3, md: 4 }, 
          borderRadius: '12px', 
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' 
        }}
      >
        {/* Header section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' }, 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: { xs: 3, sm: 4 }
        }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1056F5' }}>
              Productivity Superhero
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Your personalized productivity coaching worksheet
            </Typography>
          </Box>

          {/* Session selector/manager */}
          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              mt: { xs: 2, sm: 0 },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            {isEditingSessionName ? (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: { xs: '100%', sm: 'auto' },
                flexDirection: { xs: 'column', sm: 'row' }
              }}>
                <TextField
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="Session name"
                  size="small"
                  fullWidth
                  sx={{ 
                    mr: { xs: 0, sm: 1 },
                    mb: { xs: 2, sm: 0 },
                    '& .MuiInputBase-root': {
                      backgroundColor: '#fff'
                    }
                  }}
                />
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 1, sm: 0.75 },
                  width: { xs: '100%', sm: 'auto' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' }
                }}>
                  <Button 
                    onClick={handleSaveSessionName} 
                    variant="contained" 
                    size="small"
                    disabled={saving}
                    sx={{ 
                      flex: { xs: 1, sm: 'initial' },
                      py: { sm: 0.5, md: 0.75 },
                      px: { sm: 1, md: 1.5 },
                      fontSize: { sm: '0.75rem', md: '0.8125rem' },
                      minWidth: { sm: 'auto' },
                      maxHeight: { sm: '32px', md: '36px' },
                      mr: { sm: 0.75 }
                    }}
                  >
                    Save
                  </Button>
                  <Button 
                    onClick={handleCancelEditSessionName} 
                    variant="outlined" 
                    size="small"
                    sx={{ 
                      flex: { xs: 1, sm: 'initial' },
                      py: { sm: 0.5, md: 0.75 },
                      px: { sm: 1, md: 1.5 },
                      fontSize: { sm: '0.75rem', md: '0.8125rem' },
                      minWidth: { sm: 'auto' },
                      maxHeight: { sm: '32px', md: '36px' }
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <FormControl 
                  sx={{ 
                    mr: { xs: 0, sm: 2 }, 
                    mb: { xs: 2, sm: 0 },
                    minWidth: { xs: '200px', sm: '180px', md: '200px' },
                    maxWidth: { sm: '200px', md: '220px' },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  <InputLabel>Session</InputLabel>
                  <Select
                    value={currentSessionId || ''}
                    onChange={(e) => handleSessionChange(e as any)}
                    size="small"
                    label="Session"
                    MenuProps={{
                      PaperProps: {
                        sx: { maxHeight: 200 }
                      }
                    }}
                  >
                    {sessions.map((session) => (
                      <MenuItem key={session.id} value={session.id}>
                        {session.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 1, sm: 0.75 },
                  width: { xs: '100%', sm: 'auto' },
                  justifyContent: { xs: 'space-between', sm: 'flex-start' }
                }}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon sx={{ fontSize: { sm: '1rem', md: '1.25rem' } }} />}
                    onClick={handleAddSession}
                    disabled={saving}
                    sx={{ 
                      flex: { xs: 1, sm: 'initial' },
                      py: { sm: 0.5, md: 0.75 },
                      px: { sm: 1, md: 1.5 },
                      fontSize: { sm: '0.75rem', md: '0.8125rem' },
                      minWidth: { sm: 'auto' },
                      maxHeight: { sm: '32px', md: '36px' },
                      mr: { sm: 0.75 }
                    }}
                  >
                    {isMobile ? 'New' : 'New'}
                  </Button>
                  {currentSession && (
                    <Button
                      variant="outlined"
                      onClick={handleStartEditSessionName}
                      disabled={saving}
                      sx={{ 
                        flex: { xs: 1, sm: 'initial' },
                        py: { sm: 0.5, md: 0.75 },
                        px: { sm: 1, md: 1.5 },
                        fontSize: { sm: '0.75rem', md: '0.8125rem' },
                        minWidth: { sm: 'auto' },
                        maxHeight: { sm: '32px', md: '36px' },
                        mr: { sm: 0.75 }
                      }}
                    >
                      {isMobile ? 'Rename' : 'Rename'}
                    </Button>
                  )}
                  {currentSession && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon sx={{ fontSize: { sm: '1rem', md: '1.25rem' } }} />}
                      onClick={handleDeleteClick}
                      disabled={saving}
                      sx={{ 
                        flex: { xs: 1, sm: 'initial' },
                        py: { sm: 0.5, md: 0.75 },
                        px: { sm: 1, md: 1.5 },
                        fontSize: { sm: '0.75rem', md: '0.8125rem' },
                        minWidth: { sm: 'auto' },
                        maxHeight: { sm: '32px', md: '36px' }
                      }}
                    >
                      {isMobile ? 'Delete' : 'Delete'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '400px' 
          }}>
            <CircularProgress />
          </Box>
        ) : sessions.length === 0 ? (
          <Box sx={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            py: 8
          }}>
            <InfoOutlined sx={{ fontSize: '3rem', color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No sessions yet
            </Typography>
            <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: '500px' }}>
              Create a new coaching session to get started with your productivity journey
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddSession}
              size="large"
            >
              Create First Session
            </Button>
          </Box>
        ) : (
          <>
            {/* Tabs for worksheet sections */}
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              mb: 3,
              overflowX: 'auto',
              '&::-webkit-scrollbar': {
                height: '4px'
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px'
              }
            }}>
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                variant={isMobile ? "scrollable" : "fullWidth"}
                scrollButtons={isMobile ? "auto" : false}
                allowScrollButtonsMobile={isMobile}
                aria-label="worksheet sections"
              >
                <Tab label="Personal Values" />
                <Tab label="Productivity Link" />
                <Tab label="Goal Setting" />
                <Tab label="Actions & Reflection" />
                <Tab label="Document Upload" disabled={!currentSession} />
              </Tabs>
            </Box>

            {/* Personal Values Tab */}
            <TabPanel value={currentTab} index={0}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                  My Personal Values
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Understanding what drives you at a deeper level helps establish why productivity matters to you personally.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  What are you most proud of in your life?
                </Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {personalValues.proudOf.map((value, index) => (
                    <Grid item xs={12} key={index}>
                      <TextField
                        fullWidth
                        placeholder={`#${index + 1}`}
                        value={value}
                        multiline
                        rows={2}
                        onChange={(e) => updatePersonalValue('proudOf', index, e.target.value)}
                        sx={numberedFieldStyles}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Typography variant="h6" gutterBottom>
                  What did it take for you to achieve those things?
                </Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {personalValues.achievement.map((value, index) => (
                    <Grid item xs={12} key={index}>
                      <TextField
                        fullWidth
                        placeholder={`#${index + 1}`}
                        value={value}
                        multiline
                        rows={2}
                        onChange={(e) => updatePersonalValue('achievement', index, e.target.value)}
                        sx={numberedFieldStyles}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Typography variant="h6" gutterBottom>
                  What makes you happiest in life?
                </Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {personalValues.happiness.map((value, index) => (
                    <Grid item xs={12} key={index}>
                      <TextField
                        fullWidth
                        placeholder={`#${index + 1}`}
                        value={value}
                        multiline
                        rows={2}
                        onChange={(e) => updatePersonalValue('happiness', index, e.target.value)}
                        sx={numberedFieldStyles}
                      />
                    </Grid>
                  ))}
                </Grid>

                <Typography variant="h6" gutterBottom>
                  Who do you find inspiring and what qualities are you admiring?
                </Typography>
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  {personalValues.inspiration.map((value, index) => (
                    <Grid item xs={12} key={index}>
                      <TextField
                        fullWidth
                        placeholder={`#${index + 1}`}
                        value={value}
                        multiline
                        rows={2}
                        onChange={(e) => updatePersonalValue('inspiration', index, e.target.value)}
                        sx={numberedFieldStyles}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>

            {/* Productivity Connection Tab */}
            <TabPanel value={currentTab} index={1}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Connect Values to Productivity
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Now let's connect your core values to your productivity goals for deeper motivation.
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  MY VALUES - What matters most to me?
                </Typography>
                <TextField
                  fullWidth
                  placeholder="From reflecting on the previous questions, what core values can you identify?"
                  value={productivityConnection.coreValues}
                  multiline
                  rows={4}
                  onChange={(e) => updateProductivityConnection('coreValues', e.target.value)}
                  sx={{ ...numberedFieldStyles, mb: 4 }}
                />

                <Typography variant="h6" gutterBottom>
                  MY PRODUCTIVITY - How does productivity link to my values?
                </Typography>
                <TextField
                  fullWidth
                  placeholder="How will improving your productivity support what matters most to you?"
                  value={productivityConnection.valueImpact}
                  multiline
                  rows={4}
                  onChange={(e) => updateProductivityConnection('valueImpact', e.target.value)}
                  sx={numberedFieldStyles}
                />
              </Box>
            </TabPanel>

            {/* Goal Setting Tab */}
            <TabPanel value={currentTab} index={2}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Set Your Productivity Goal
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  What specific productivity goal would you like to work toward?
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom>
                  My productivity goal is:
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Be specific about what you want to achieve"
                  value={goals.description}
                  multiline
                  rows={3}
                  onChange={(e) => updateGoal('description', e.target.value)}
                  sx={{ ...numberedFieldStyles, mb: 4 }}
                />

                <Typography variant="h6" gutterBottom>
                  What will be different when you achieve this goal?
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    How will you feel?
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Describe the emotional benefits"
                    value={goals.impact[0]}
                    multiline
                    rows={2}
                    onChange={(e) => updateGoalImpact(0, e.target.value)}
                    sx={{ ...textFieldStyles, mb: 3 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Who benefits?
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Who else will benefit from your productivity improvements?"
                    value={goals.impact[1]}
                    multiline
                    rows={2}
                    onChange={(e) => updateGoalImpact(1, e.target.value)}
                    sx={{ ...textFieldStyles, mb: 3 }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    What will change?
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="What specific results will you see?"
                    value={goals.impact[2]}
                    multiline
                    rows={2}
                    onChange={(e) => updateGoalImpact(2, e.target.value)}
                    sx={textFieldStyles}
                  />
                </Box>
              </Box>
            </TabPanel>

            {/* Actions & Reflection Tab */}
            <TabPanel value={currentTab} index={3}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Actions & Reflections
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Define specific actions to take and reflect on your productivity journey.
                </Typography>
              </Box>

              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleOutline sx={{ mr: 1, color: 'primary.main' }} />
                  My Action Steps
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  List specific actions you'll take to improve your productivity
                </Typography>

                {workshopOutput.actions.map((action, index) => (
                  <TextField
                    key={index}
                    fullWidth
                    placeholder={`Action ${index + 1}`}
                    value={action}
                    multiline
                    rows={2}
                    onChange={(e) => updateWorkshopAction(index, e.target.value)}
                    sx={{ ...textFieldStyles, mb: 2 }}
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ 
                          mr: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '50%', 
                          bgcolor: 'primary.main', 
                          color: 'white', 
                          fontWeight: 'bold' 
                        }}>
                          {index + 1}
                        </Box>
                      ),
                    }}
                  />
                ))}
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <AutoAwesomeOutlined sx={{ mr: 1, color: 'primary.main' }} />
                  My Reflections
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  Reflect on your productivity journey and what you've learned
                </Typography>

                <TextField
                  fullWidth
                  placeholder="What insights have you gained about your productivity? What challenges do you anticipate?"
                  value={workshopOutput.reflections}
                  multiline
                  rows={5}
                  onChange={(e) => updateReflections(e.target.value)}
                  sx={textFieldStyles}
                />
              </Box>
            </TabPanel>

            {/* Document Upload Tab */}
            <TabPanel value={currentTab} index={4}>
              <DocumentUploader onDocumentProcessed={handleProcessExtractedDocument} />
            </TabPanel>

            {/* Navigation buttons */}
            <Box 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 4,
                gap: 2,
                flexDirection: { xs: 'column', sm: 'row' }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                order: { xs: 2, sm: 1 },
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Button
                  variant="outlined"
                  onClick={handlePrevious}
                  disabled={currentTab === 0 || saving}
                  startIcon={<ArrowBackIcon sx={{ fontSize: { sm: '1rem', md: '1.25rem' } }} />}
                  sx={{ 
                    flex: { xs: 1, sm: 'initial' },
                    py: { sm: 0.5, md: 0.75 },
                    px: { sm: 1, md: 1.5 },
                    fontSize: { sm: '0.75rem', md: '0.8125rem' },
                    minWidth: { sm: 'auto' },
                    maxHeight: { sm: '32px', md: '36px' },
                    mr: { sm: 0.75 }
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleNext}
                  disabled={currentTab === 4 || saving}
                  endIcon={<ArrowForwardIcon sx={{ fontSize: { sm: '1rem', md: '1.25rem' } }} />}
                  sx={{ 
                    flex: { xs: 1, sm: 'initial' },
                    py: { sm: 0.5, md: 0.75 },
                    px: { sm: 1, md: 1.5 },
                    fontSize: { sm: '0.75rem', md: '0.8125rem' },
                    minWidth: { sm: 'auto' },
                    maxHeight: { sm: '32px', md: '36px' }
                  }}
                >
                  Next
                </Button>
              </Box>
              
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveWorksheet}
                disabled={saving || sessions.length === 0}
                sx={{ 
                  ml: 'auto', 
                  order: { xs: 1, sm: 2 },
                  alignSelf: { xs: 'stretch', sm: 'auto' },
                  height: { xs: '48px', sm: '32px', md: '36px' },
                  py: { sm: 0.5, md: 0.75 },
                  px: { sm: 1.5, md: 2 },
                  fontSize: { sm: '0.75rem', md: '0.8125rem' }
                }}
              >
                {saving ? <CircularProgress size={20} color="inherit" /> : 'Save'}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* Success Snackbar */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={5000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaveSuccess(false)} severity="success">
          Worksheet saved successfully
        </Alert>
      </Snackbar>

      {/* Delete Session Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCancelDelete}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the session "{currentSession?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCancelDelete} 
            disabled={isDeleting}
            sx={{ 
              ...compactButtonStyle,
              minWidth: { sm: '60px' }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error" 
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon sx={{ fontSize: { sm: '1rem', md: '1.25rem' } }} />}
            sx={{ 
              ...compactButtonStyle,
              minWidth: { sm: '60px' }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Worksheet; 