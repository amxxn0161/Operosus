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
  AccordionDetails
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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

// Update the text field styling for a more elegant appearance
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
};

const numberedFieldStyles = {
  ...textFieldStyles,
  '& .MuiInputBase-root': {
    minHeight: '80px',
    backgroundColor: '#f9f9fd',
  },
  '& .MuiOutlinedInput-inputMultiline': {
    padding: '12px 14px',
  },
};

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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography 
                variant="h5" 
                sx={{ fontWeight: 'bold', fontFamily: 'Poppins', mb: 1 }}
              >
                Productivity Pulse Coaching Worksheet
              </Typography>
              
              <Typography variant="body1" sx={{ fontFamily: 'Poppins', color: 'text.secondary', maxWidth: '70%' }}>
                Complete the following sections to track your productivity journey. Each session builds on your previous work.
              </Typography>
            </Box>
            
            <DocumentUploader onDocumentProcessed={handleProcessExtractedDocument} />
          </Box>

          {/* Session Selection with Add & Edit */}
          <Box sx={{ mt: 3, mb: 3 }}>
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
              <Tab label="1. PLAN" />
              <Tab label="2. MY VALUES" />
              <Tab label="3. MY PRODUCTIVITY" />
              <Tab label="4. MY GOALS" />
              <Tab label="5. ACTIONS & REFLECTIONS" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <TabPanel value={currentTab} index={0}>
            {/* Personal Values Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              1. PLAN
            </Typography>

            <Paper sx={{ 
              p: 4, 
              mb: 2, 
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 6px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontFamily: 'Poppins', 
                    fontWeight: 'medium', 
                    color: '#1056F5'
                  }}
                >
                  MY PERSONAL VALUES: Finding meaning and importance
                </Typography>
                
                {/* Document extraction status */}
                <Tooltip title="Document extraction status for personal values section">
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    bgcolor: personalValues.proudOf.some(v => v) || 
                      personalValues.achievement.some(v => v) || 
                      personalValues.happiness.some(v => v) || 
                      personalValues.inspiration.some(v => v) ? '#e6f7e6' : '#f9f9fd',
                    px: 2,
                    py: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: personalValues.proudOf.some(v => v) || 
                      personalValues.achievement.some(v => v) || 
                      personalValues.happiness.some(v => v) || 
                      personalValues.inspiration.some(v => v) ? '#a3e0a3' : '#e0e0e0'
                  }}>
                    {personalValues.proudOf.some(v => v) || 
                     personalValues.achievement.some(v => v) || 
                     personalValues.happiness.some(v => v) || 
                     personalValues.inspiration.some(v => v) ? (
                      <>
                        <CheckCircleOutline sx={{ color: 'success.main', mr: 1, fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                          Document values mapped
                        </Typography>
                      </>
                    ) : (
                      <>
                        <InfoOutlined sx={{ color: 'text.secondary', mr: 1, fontSize: 18 }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          No document values mapped
                        </Typography>
                      </>
                    )}
                  </Box>
                </Tooltip>
              </Box>
              
              <Box sx={{ mb: 3, p: 2, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #d0e1f9' }}>
                <Typography variant="body2" sx={{ color: 'info.dark', display: 'flex', alignItems: 'center' }}>
                  <InfoOutlined sx={{ mr: 1, fontSize: 18 }} />
                  When you upload your initial productivity superhero worksheet, the system will attempt to extract your personal values and map them to these fields. You can also enter your values directly.
                </Typography>
                <Typography variant="body2" sx={{ color: 'info.dark', display: 'flex', alignItems: 'center', mt: 1 }}>
                  <InfoOutlined sx={{ mr: 1, fontSize: 18 }} />
                  Please note that document extraction may not always map values correctly depending on the document format. Manual adjustments may be needed.
                </Typography>
              </Box>

              {/* First pair of questions */}
              <Grid container spacing={4} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                  }}>
                    <Typography variant="body2" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                      What am I most proud of?
                    </Typography>
                    {personalValues.proudOf.some(v => v) && (
                      <Chip 
                        size="small" 
                        label="Extracted" 
                        color="success"
                        variant="outlined"
                        sx={{ height: '24px' }}
                      />
                    )}
                  </Box>
                  {/* Make sure we're iterating through all 3 items in the proudOf array */}
                  {Array.from({length: 3}).map((_, index) => (
                    <Box key={`proud-${index}`} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mr: 1, mt: 1.5, minWidth: '20px' }}>
                        {index + 1}.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={personalValues.proudOf[index] || ''}
                        onChange={(e) => updatePersonalValue('proudOf', index, e.target.value)}
                        placeholder="Enter what you're most proud of..."
                        sx={{ 
                          ...numberedFieldStyles,
                          '& .MuiOutlinedInput-root': {
                            ...numberedFieldStyles['& .MuiOutlinedInput-root'],
                            backgroundColor: personalValues.proudOf[index] ? '#fbfbff' : '#f9f9fd',
                            transition: 'all 0.2s',
                            border: personalValues.proudOf[index] ? '1px solid #d0d8ff' : '1px solid transparent',
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                  }}>
                    <Typography variant="body2" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                      What did it take for me to achieve those things?
                    </Typography>
                    {personalValues.achievement.some(v => v) && (
                      <Chip 
                        size="small" 
                        label="Extracted" 
                        color="success"
                        variant="outlined"
                        sx={{ height: '24px' }}
                      />
                    )}
                  </Box>
                  {/* Make sure we're iterating through all 3 items in the achievement array */}
                  {Array.from({length: 3}).map((_, index) => (
                    <Box key={`achieve-${index}`} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mr: 1, mt: 1.5, minWidth: '20px' }}>
                        {index + 1}.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={personalValues.achievement[index] || ''}
                        onChange={(e) => updatePersonalValue('achievement', index, e.target.value)}
                        placeholder="Enter what it took to achieve this..."
                        sx={{ 
                          ...numberedFieldStyles,
                          '& .MuiOutlinedInput-root': {
                            ...numberedFieldStyles['& .MuiOutlinedInput-root'],
                            backgroundColor: personalValues.achievement[index] ? '#fbfbff' : '#f9f9fd',
                            transition: 'all 0.2s',
                            border: personalValues.achievement[index] ? '1px solid #d0d8ff' : '1px solid transparent',
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Grid>
              </Grid>

              {/* Second pair of questions */}
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                  }}>
                    <Typography variant="body2" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                      What makes me happiest in life?
                    </Typography>
                    {personalValues.happiness.some(v => v) && (
                      <Chip 
                        size="small" 
                        label="Extracted" 
                        color="success"
                        variant="outlined"
                        sx={{ height: '24px' }}
                      />
                    )}
                  </Box>
                  {/* Make sure we're iterating through all 3 items in the happiness array */}
                  {Array.from({length: 3}).map((_, index) => (
                    <Box key={`happy-${index}`} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mr: 1, mt: 1.5, minWidth: '20px' }}>
                        {index + 1}.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={personalValues.happiness[index] || ''}
                        onChange={(e) => updatePersonalValue('happiness', index, e.target.value)}
                        placeholder="Enter what makes you happiest..."
                        sx={{ 
                          ...numberedFieldStyles,
                          '& .MuiOutlinedInput-root': {
                            ...numberedFieldStyles['& .MuiOutlinedInput-root'],
                            backgroundColor: personalValues.happiness[index] ? '#fbfbff' : '#f9f9fd',
                            transition: 'all 0.2s',
                            border: personalValues.happiness[index] ? '1px solid #d0d8ff' : '1px solid transparent',
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    mb: 1, 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center'
                  }}>
                    <Typography variant="body2" sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>
                      Who do I find inspiring...and then, what are the qualities I am admiring?
                    </Typography>
                    {personalValues.inspiration.some(v => v) && (
                      <Chip 
                        size="small" 
                        label="Extracted" 
                        color="success"
                        variant="outlined"
                        sx={{ height: '24px' }}
                      />
                    )}
                  </Box>
                  {/* Make sure we're iterating through all 3 items in the inspiration array */}
                  {Array.from({length: 3}).map((_, index) => (
                    <Box key={`inspire-${index}`} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'Poppins', mr: 1, mt: 1.5, minWidth: '20px' }}>
                        {index + 1}.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={personalValues.inspiration[index] || ''}
                        onChange={(e) => updatePersonalValue('inspiration', index, e.target.value)}
                        placeholder="Enter who inspires you and what qualities you admire..."
                        sx={{ 
                          ...numberedFieldStyles,
                          '& .MuiOutlinedInput-root': {
                            ...numberedFieldStyles['& .MuiOutlinedInput-root'],
                            backgroundColor: personalValues.inspiration[index] ? '#fbfbff' : '#f9f9fd',
                            transition: 'all 0.2s',
                            border: personalValues.inspiration[index] ? '1px solid #d0d8ff' : '1px solid transparent',
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Grid>
              </Grid>
            </Paper>
            
            {/* Manual Document Mapping Tool */}
            <Paper sx={{ 
              p: 3, 
              mb: 4, 
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 'medium', 
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <AutoAwesomeOutlined sx={{ mr: 1, color: '#1056F5' }} />
                Document Mapping Helper
              </Typography>
              
              <Typography variant="body2" sx={{ mb: 2 }}>
                If your uploaded document wasn't fully extracted, you can use this helper to map content from your document to the fields above.
              </Typography>
              
              <Accordion sx={{ 
                mb: 2, 
                boxShadow: 'none', 
                border: '1px solid #e0e0e0',
                '&:before': { display: 'none' } 
              }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>How to map document values</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" component="div">
                    <ol style={{ paddingLeft: '1.5rem', margin: 0 }}>
                      <li>Upload your document using the document uploader at the top</li>
                      <li>Check if values were automatically extracted and populated in the fields</li>
                      <li>If some fields weren't populated, you can manually enter them</li>
                      <li>Look for common patterns like numbered lists in your document</li>
                      <li>Click "Save" when you're satisfied with the mapping</li>
                    </ol>
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    // Reset all fields
                    const updatedValues: PersonalValue = {
                      id: personalValues.id,
                      proudOf: ['', '', ''],
                      achievement: ['', '', ''],
                      happiness: ['', '', ''],
                      inspiration: ['', '', '']
                    };
                    
                    const updatedSessions = sessions.map(session => 
                      session.id === currentSessionId 
                        ? { ...session, personalValues: updatedValues } 
                        : session
                    );
                    setSessions(updatedSessions);
                  }}
                >
                  Clear All Fields
                </Button>
              </Box>
            </Paper>
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            {/* MY VALUES Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              2. MY VALUES
            </Typography>

            <Paper sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 6px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 'medium', 
                  mb: 2,
                  color: '#1056F5'
                }}
              >
                MY VALUES - what matters most to me?
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={12}
                placeholder="Based on your answers to the questions in the previous section, write down what matters most to you..."
                value={productivityConnection.coreValues}
                onChange={(e) => updateProductivityConnection('coreValues', e.target.value)}
                sx={{ mb: 2, ...textFieldStyles }}
              />
            </Paper>
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            {/* MY PRODUCTIVITY Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              3. MY PRODUCTIVITY
            </Typography>

            <Paper sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 6px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 'medium', 
                  mb: 2,
                  color: '#1056F5'
                }}
              >
                MY PRODUCTIVITY - how does it link to my values?
              </Typography>

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1, fontStyle: 'italic' }}>
                When I become more effective, efficient and productive in my work........the impact in terms of my values will be....
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={10}
                placeholder="Describe how improved productivity connects to your core values..."
                value={productivityConnection.valueImpact}
                onChange={(e) => updateProductivityConnection('valueImpact', e.target.value)}
                sx={{ mb: 2, ...textFieldStyles }}
              />
            </Paper>
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            {/* Goals Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              4. MY GOALS
            </Typography>

            <Paper sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 6px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 'medium', 
                  mb: 2,
                  color: '#1056F5'
                }}
              >
                MY GOALS: what do I want to achieve?
              </Typography>

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                Imagine it's the end of this coaching, and we've made amazing progress and change:
              </Typography>

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1, fontWeight: 'medium' }}>
                What will be different for you?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                placeholder="Describe what changes you'd like to see..."
                value={goals.description}
                onChange={(e) => updateGoal('description', e.target.value)}
                sx={{ mb: 3, ...textFieldStyles }}
              />

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1, fontWeight: 'medium' }}>
                How will you feel?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Describe your emotional state after achieving your goal..."
                value={goals.impact[0]}
                onChange={(e) => updateGoalImpact(0, e.target.value)}
                sx={{ mb: 3, ...textFieldStyles }}
              />

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1, fontWeight: 'medium' }}>
                Who benefits?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Describe who will benefit from your achievement..."
                value={goals.impact[1]}
                onChange={(e) => updateGoalImpact(1, e.target.value)}
                sx={{ mb: 3, ...textFieldStyles }}
              />

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1, fontWeight: 'medium', mt: 3 }}>
                MY PRODUCTIVITY GOAL
              </Typography>
              
              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                I want to improve.....
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                placeholder="Describe what specific aspect of productivity you want to improve..."
                value={goals.impact[2]}
                onChange={(e) => updateGoalImpact(2, e.target.value)}
                sx={{ mb: 3, ...textFieldStyles }}
              />
            </Paper>
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            {/* Workshop Outputs Tab Content */}
            <Typography variant="h6" sx={{ fontFamily: 'Poppins', mb: 3 }}>
              5. ACTIONS & REFLECTIONS
            </Typography>

            <Paper sx={{ 
              p: 4, 
              mb: 4, 
              bgcolor: '#ffffff',
              borderRadius: 2,
              border: '1px solid rgba(0, 0, 0, 0.2)',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 6px 12px rgba(0, 0, 0, 0.15)'
            }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 'medium', 
                  mb: 2,
                  color: '#1056F5'
                }}
              >
                WORKSHOP ONE ACTIONS / COMMITMENTS
              </Typography>

              {workshopOutput.actions.map((action, index) => (
                <Box key={`action-${index}`} sx={{ mb: 2, display: 'flex', alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontFamily: 'Poppins', mr: 1, mt: 1.5, minWidth: '20px' }}>
                    {index + 1}.
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder={`Action item ${index + 1}...`}
                    value={action}
                    onChange={(e) => updateWorkshopAction(index, e.target.value)}
                    sx={{ ...numberedFieldStyles }}
                    error={validationErrors.actions !== null && action.trim() === '' && index === 0}
                  />
                </Box>
              ))}

              {validationErrors.actions && (
                <Typography color="error" sx={{ mb: 2 }}>
                  {validationErrors.actions}
                </Typography>
              )}

              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontFamily: 'Poppins', 
                  fontWeight: 'medium', 
                  mb: 2,
                  mt: 3,
                  color: '#1056F5'
                }}
              >
                WORKSHOP ONE REFLECTIONS
              </Typography>

              <Typography variant="body2" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                What am I learning?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Reflect on what you're learning through this process..."
                value={workshopOutput.reflections}
                onChange={(e) => updateReflections(e.target.value)}
                sx={{ mb: 2, ...textFieldStyles }}
                error={validationErrors.reflections !== null}
              />

              {validationErrors.reflections && (
                <Typography color="error" sx={{ mb: 2 }}>
                  {validationErrors.reflections}
                </Typography>
              )}
            </Paper>
          </TabPanel>
          
          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={currentTab === 0}
              sx={{ 
                fontFamily: 'Poppins', 
                textTransform: 'none'
              }}
            >
              Previous
            </Button>
            
            <Box>
              <Button
                variant="outlined"
                onClick={handleSaveWorksheet}
                sx={{ 
                  fontFamily: 'Poppins', 
                  textTransform: 'none', 
                  color: '#1056F5',
                  borderColor: '#1056F5',
                  mr: 2
                }}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
              
              <Button
                variant="contained"
                onClick={handleNext}
                sx={{ 
                  fontFamily: 'Poppins', 
                  textTransform: 'none',
                  backgroundColor: '#1056F5'
                }}
              >
                {currentTab === 4 ? 'Finish' : 'Next'}
              </Button>
            </Box>
          </Box>
        </Paper>
      )}
      
      {/* Success Snackbar */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSaveSuccess(false)} 
          severity="success"
          sx={{ width: '100%', fontFamily: 'Poppins' }}
        >
          Worksheet saved successfully!
        </Alert>
      </Snackbar>
      
      {/* Delete Confirmation Dialog */}
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