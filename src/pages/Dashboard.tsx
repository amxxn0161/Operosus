import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Container, 
  Grid, 
  Paper, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Chip,
  GlobalStyles,
  Tooltip as MuiTooltip,
  Card,
  CardHeader,
  CardContent,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  DialogContentText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import { useCalendar } from '../contexts/CalendarContext';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import { JournalEntry } from '../services/journalService';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CoffeeIcon from '@mui/icons-material/Coffee';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine, 
  ReferenceArea,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import StatCard from '../components/StatCard';
import CalendarView from '../components/CalendarView';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import DashboardWidget from '../components/DashboardWidget';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { alpha } from '@mui/material/styles';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import dashboardService from '../services/dashboardService';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';

// Import default layouts from DashboardLayout component
const defaultLayout: Layout[] = [
  { i: 'calendar', x: 0, y: 0, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 }
];

const defaultMobileLayout: Layout[] = [
  { i: 'calendar', x: 0, y: 0, w: 12, h: 16, minW: 12, minH: 12, maxW: 12, maxH: 30 }
];

// Dummy data for initial display
const initialStats = {
  averageScore: '0%',
  avgProductivity: 0,
  avgMeetingScore: 0,
  breakRate: '0%',
  focusSuccess: '0%',
  journalStreak: '0 days'
};

// Color palette for pie chart
const COLORS = ['#1056F5', '#071C73', '#016C9E', '#C6E8F2', '#F29702', '#E04330', '#49C1E3'];

interface DistractionData {
  name: string;
  value: number;
  percentage: string;
}

// Replace with mock implementation for now since we don't have the actual service
// This will be replaced when the actual service is implemented
const mockStatsService = {
  getQuickStats: async () => {
    return {
      focusTime: 6,
      productivity: 78,
      tasksDone: 12,
      distractions: 5
    };
  }
};

// Use the mock service for now
const statsServiceImpl = mockStatsService;

// API service for dashboard layout
const dashboardLayoutService = {
  // Get saved layout from backend
  getLayout: async (): Promise<any> => {
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any authentication headers needed
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch layout: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching dashboard layout:', error);
      throw error;
    }
  },
  
  // Save layout to backend
  saveLayout: async (layoutData: any): Promise<any> => {
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any authentication headers needed
        },
        body: JSON.stringify(layoutData),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save layout: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
      throw error;
    }
  },
  
  // Reset layout to default
  resetLayout: async (): Promise<any> => {
    try {
      const response = await fetch('/api/dashboard/layout', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          // Add any authentication headers needed
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to reset layout: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error resetting dashboard layout:', error);
      throw error;
    }
  },
};

// Add dashboard service types
interface DashboardLayoutResponse {
  status: string;
  data?: any;
  message?: string;
}

const Dashboard: React.FC<{}> = () => {
  const { isAuthenticated } = useAuth();
  const { entries, refreshEntries, loading: journalLoading, error: journalError } = useJournal();
  const { events, isConnected, connectCalendar } = useCalendar();
  const { updateScreenContext } = useAIAssistant();
  const navigate = useNavigate();
  const [stats, setStats] = useState(initialStats);
  const [hasData, setHasData] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [distractionData, setDistractionData] = useState<DistractionData[]>([]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeDataPoint, setActiveDataPoint] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  
  // New state for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLayout, setCurrentLayout] = useState<Layout[]>(
    isMobile ? defaultMobileLayout : defaultLayout
  );
  // Add a random key for grid layout to force complete reset
  const [gridKey, setGridKey] = useState<string>('grid-layout-' + Date.now());
  
  const [savedLayouts, setSavedLayouts] = useState<{[key: string]: Layout[]}>({
    lg: defaultLayout,
    md: defaultLayout,
    sm: defaultLayout,
    xs: defaultMobileLayout,
    xl: defaultLayout
  });

  // State to track widget visibility
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([
    'calendar'
  ]);
  
  // State to control the widget visibility dialog
  const [widgetDialogOpen, setWidgetDialogOpen] = useState(false);

  // State for reset confirmation dialog
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Add a state for container width
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add ref and state for calendar widget width
  const calendarWidgetRef = useRef<HTMLDivElement>(null);
  const quickStatsWidgetRef = useRef<HTMLDivElement>(null);
  const topDistractionsWidgetRef = useRef<HTMLDivElement>(null);
  const recentEntriesWidgetRef = useRef<HTMLDivElement>(null);
  const [calendarWidgetWidth, setCalendarWidgetWidth] = useState<number>(0);
  const [quickStatsWidgetWidth, setQuickStatsWidgetWidth] = useState<number>(0);
  const [topDistractionsWidgetWidth, setTopDistractionsWidgetWidth] = useState<number>(0);
  const [recentEntriesWidgetWidth, setRecentEntriesWidgetWidth] = useState<number>(0);
  const [quickStatsCompactLayout, setQuickStatsCompactLayout] = useState<boolean>(false);
  const [topDistractionsCompactLayout, setTopDistractionsCompactLayout] = useState<boolean>(false);
  const [recentEntriesCompactLayout, setRecentEntriesCompactLayout] = useState<boolean>(false);

  const isExtraSmall = useMediaQuery('(max-width:375px)');
  
  // Add loading state for API operations
  const [isLayoutLoading, setIsLayoutLoading] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  // Replace SWR with our own state and useEffect
  const [quickStats, setQuickStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Add loading state for API operations
  const [isLayoutSaving, setIsLayoutSaving] = useState(false);
  
  // Fetch quick stats on mount
  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        setIsLoading(true);
        const data = await statsServiceImpl.getQuickStats();
        setQuickStats(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchQuickStats();
  }, []);

  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label, ...props }: any) => {
    // For desktop view, use the standard recharts active/payload system
    // For mobile view with our fixed tooltip, use the activeDataPoint state
    const isDesktop = !isMobile;
    
    // Desktop: use standard recharts behavior
    // Mobile: only use this for the internal Recharts tooltip (not our fixed one)
    if ((isDesktop && active && payload) || 
        (isMobile && active && payload && !activeDataPoint)) {
      const dataPoint = payload[0].payload;
      const tooltipLabel = isMobile ? dataPoint.mobileName : label;
      
      return (
        <Paper
          elevation={3}
          sx={{
            backgroundColor: 'white',
            padding: isMobile ? '10px 14px' : '10px 15px',
            border: '1px solid #f5f5f5',
            fontFamily: 'Poppins',
            minWidth: isMobile ? '180px' : '200px',
            maxWidth: isMobile ? '240px' : '300px',
            boxShadow: isMobile ? '0px 4px 20px rgba(0, 0, 0, 0.15)' : '0px 2px 8px rgba(0, 0, 0, 0.1)',
            // Only use fixed positioning for our separate mobile tooltip, not here
            position: 'relative'
          }}
        >
          <Typography sx={{ 
            fontFamily: 'Poppins', 
            fontSize: isMobile ? '0.85rem' : '0.9rem', 
            mb: isMobile ? 0.8 : 1,
            fontWeight: 'medium',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            color: '#333'
          }}>
            {tooltipLabel}
          </Typography>
          <Box sx={{ 
            mb: 0.8,
            p: isMobile ? 1 : 0,
            borderRadius: 1,
            bgcolor: isMobile ? 'rgba(16, 86, 245, 0.08)' : 'transparent'
          }}>
            <Typography sx={{ 
              fontFamily: 'Poppins', 
              fontSize: isMobile ? '1rem' : '0.9rem', 
              color: '#1056F5', 
              fontWeight: 'bold'
            }}>
              Overall Score: {dataPoint.comprehensive}%
            </Typography>
          </Box>
          <Typography sx={{ 
            fontFamily: 'Poppins', 
            fontSize: isMobile ? '0.85rem' : '0.9rem', 
            color: '#666' 
          }}>
            Productivity: {dataPoint.productivity}%
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Separate component for our fixed mobile tooltip
  const MobileFixedTooltip = () => {
    if (!activeDataPoint || !tooltipPosition) return null;
    
    return (
      <Paper
        elevation={4}
        sx={{
          backgroundColor: 'white',
          padding: '10px 14px',
          border: '1px solid #f5f5f5',
          fontFamily: 'Poppins',
          width: '85%', // Fixed width for mobile
          maxWidth: '280px',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
          position: 'absolute',
          // Position directly over the data point (50px above the dot)
          bottom: `calc(100% - ${tooltipPosition.y}px + 10px)`,
          left: tooltipPosition.x,
          transform: 'translateX(-50%)',
          zIndex: 100,
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid white',
          }
        }}
      >
        <Typography sx={{ 
          fontFamily: 'Poppins', 
          fontSize: '0.85rem', 
          mb: 0.8,
          fontWeight: 'medium',
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          color: '#333'
        }}>
          {activeDataPoint.mobileName}
        </Typography>
        <Box sx={{ 
          mb: 0.8,
          p: 1,
          borderRadius: 1,
          bgcolor: 'rgba(16, 86, 245, 0.08)'
        }}>
          <Typography sx={{ 
            fontFamily: 'Poppins', 
            fontSize: '1rem', 
            color: '#1056F5', 
            fontWeight: 'bold'
          }}>
            Overall Score: {activeDataPoint.comprehensive}%
          </Typography>
        </Box>
        <Typography sx={{ 
          fontFamily: 'Poppins', 
          fontSize: '0.85rem', 
          color: '#666' 
        }}>
          Productivity: {activeDataPoint.productivity}%
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          mt: 1.5 
        }}>
          <Button 
            size="small" 
            onClick={(e) => {
              e.stopPropagation();
              setActiveDataPoint(null);
              setTooltipPosition(null);
            }}
            sx={{ 
              fontSize: '0.75rem', 
              minWidth: 'auto', 
              p: '2px 8px',
              color: '#666',
              pointerEvents: 'auto'
            }}
          >
            Close
          </Button>
        </Box>
      </Paper>
    );
  };

  // Tooltip component for distractions pie chart
  const DistractionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            backgroundColor: 'white',
            padding: '10px 15px',
            border: '1px solid #f5f5f5',
            fontFamily: 'Poppins',
            minWidth: '150px',
            boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Typography sx={{ 
            fontFamily: 'Poppins', 
            fontSize: '0.9rem', 
            fontWeight: 'medium',
            color: payload[0].payload.name === 'Low Energy/Fatigue' ? '#F29702' : payload[0].payload.fill
          }}>
            {payload[0].payload.name}
          </Typography>
          <Typography sx={{ 
            fontFamily: 'Poppins', 
            fontSize: '0.95rem', 
            fontWeight: 'bold'
          }}>
            {payload[0].payload.percentage} ({payload[0].value} times)
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Move all useEffects outside of conditionals
  // Authentication check
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // For simplicity, we'll check if the user is an admin based on their email
    // In a real app, this would come from the user's role/permissions in the auth context
    const userEmail = localStorage.getItem('userEmail');
    // Only grant admin access to specific email addresses
    const isAdminUser = Boolean(userEmail && (
      userEmail === 'dc@operosus.com' || 
      userEmail === 'as@operosus.com'
    ));
    setIsAdmin(isAdminUser);
  }, [isAuthenticated, navigate]);

  // Process journal entries when they change
  useEffect(() => {
    if (entries && entries.length > 0) {
      setHasData(true);
      
      // Calculate stats based on entries
      const totalProductivity = entries.reduce((sum, entry) => sum + entry.productivityScore, 0);
      const meetingsEntries = entries.filter(entry => entry.meetingScore !== null);
      const totalMeetingScore = meetingsEntries.reduce((sum, entry) => sum + (entry.meetingScore || 0), 0);
      const breakRateCount = entries.filter(entry => entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes').length;
      const focusSuccessCount = entries.filter(entry => entry.focusTime === 'Yes' || entry.focusTime === 'yes').length;
      
      // Calculate journal streak properly
      const calculateStreak = (): number => {
        // Extract dates and convert to standard format (YYYY-MM-DD)
        const entryDates = entries.map(entry => {
          return entry.date; // Already in YYYY-MM-DD format from API
        });
        
        // Get unique dates (in case of multiple entries per day)
        const uniqueDatesSet = new Set<string>(entryDates);
        const uniqueDates = Array.from(uniqueDatesSet).sort();
        
        if (uniqueDates.length === 0) return 0;
        
        // Check current date to see if today is included
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // Start counting streak backward from the most recent entry
        let streak = 1;
        let currentDate = uniqueDates[uniqueDates.length - 1];
        
        // If most recent entry is not from today or yesterday, streak is just 1
        if (currentDate !== today && currentDate !== yesterday) {
          return uniqueDates.length === 1 ? 1 : uniqueDates.length;
        }
        
        // Count consecutive days going backwards
        for (let i = uniqueDates.length - 2; i >= 0; i--) {
          const expectedPreviousDate = new Date(new Date(currentDate).getTime() - 86400000)
            .toISOString().split('T')[0];
          
          if (uniqueDates[i] === expectedPreviousDate) {
            streak++;
            currentDate = expectedPreviousDate;
          } else {
            break; // Streak is broken
          }
        }
        
        return streak;
      };
      
      const streak = calculateStreak();
      
      // Calculate a comprehensive score that follows the specified point system
      const comprehensiveScores = entries.map(entry => {
        let totalPoints = 0;
        let maxPossiblePoints = 40; // Default maximum
        
        // Productivity score (1-10 points)
        totalPoints += entry.productivityScore;
        
        // Meeting score (0-10 points)
        if (entry.hadNoMeetings) {
          maxPossiblePoints = 30; // Reduce maximum if no meetings
        } else if (entry.meetingScore !== null) {
          totalPoints += entry.meetingScore;
        }
        
        // Break points (Yes = 10, No = 0)
        if (entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes') {
          totalPoints += 10;
        }
        
        // Focus time points (Yes = 10, Partial = 5, No = 0)
        if (entry.focusTime === 'Yes' || entry.focusTime === 'yes') {
          totalPoints += 10;
        } else if (entry.focusTime === 'Partially' || entry.focusTime === 'partially') {
          totalPoints += 5;
        }
        
        // Subtract 2 points for each distraction
        const distractionPenalty = entry.distractions ? Math.min(entry.distractions.length * 2, totalPoints) : 0;
        totalPoints -= distractionPenalty;
        
        // Ensure points don't go below zero
        totalPoints = Math.max(0, totalPoints);
        
        // Calculate percentage
        const scorePercentage = Math.round((totalPoints / maxPossiblePoints) * 100);
        
        return {
          points: totalPoints,
          maxPoints: maxPossiblePoints,
          percentage: scorePercentage
        };
      });
      
      // Calculate average comprehensive score
      const totalPercentage = comprehensiveScores.reduce((sum, score) => sum + score.percentage, 0);
      const avgComprehensiveScore = Math.round(totalPercentage / entries.length);
      
      // Set calculated stats to state
      if (entries.length > 0) {
        setStats({
          averageScore: `${avgComprehensiveScore}%`,
          avgProductivity: +(totalProductivity / entries.length).toFixed(1),
          avgMeetingScore: meetingsEntries.length > 0 ? 
            +(totalMeetingScore / meetingsEntries.length).toFixed(1) : 0,
          breakRate: `${Math.round((breakRateCount / entries.length) * 100)}%`,
          focusSuccess: `${Math.round((focusSuccessCount / entries.length) * 100)}%`,
          journalStreak: `${streak} day${streak !== 1 ? 's' : ''}`
        });
      }
      
      // Process data for chart
      prepareChartData(entries);
      
      // Process distraction data
      processDistractionData(entries);
      
      // Update context for AI Assistant with dashboard data
      const dashboardData = {
        metricsOverview: {
          totalEntries: entries.length,
          avgProductivity: +(totalProductivity / entries.length).toFixed(1),
          avgMeetingScore: meetingsEntries.length > 0 ? 
            +(totalMeetingScore / meetingsEntries.length).toFixed(1) : 0,
          breakRate: Math.round((breakRateCount / entries.length) * 100),
          focusSuccess: Math.round((focusSuccessCount / entries.length) * 100),
          journalStreak: streak
        },
        recentEntries: entries.slice(0, 3).map(entry => ({
          date: entry.date,
          productivityScore: entry.productivityScore
        }))
      };
      
      updateScreenContext({
        currentComponent: 'Dashboard',
        currentData: dashboardData,
        journalEntries: entries
      });
    } else {
      setHasData(false);
      
      // Update context even with no data
      updateScreenContext({
        currentComponent: 'Dashboard',
        currentData: { noData: true, suggestJournalEntry: true }
      });
    }
  }, [entries, updateScreenContext]);

  // Reset to default layout using the API
  const resetToDefaultLayout = async () => {
    try {
      setIsLayoutLoading(true);
      setLayoutError(null);
      
      // Call the API to reset the layout on the server
      const response = await dashboardService.resetLayout() as DashboardLayoutResponse;
      
      if (response.status === 'success') {
        console.log('Layout reset successfully via API');
        
        // Clear all saved layout data from localStorage
        localStorage.removeItem('dashboardLayout');
        localStorage.removeItem('userCustomizedLayout');
        localStorage.removeItem('lastSavedLayout');
        localStorage.removeItem('layoutMigrationV1');
        
        // Reset to original visible widgets
        setVisibleWidgets([
          'calendar'
        ]);
        
        // Save the default visibility settings to localStorage
        localStorage.setItem('dashboardVisibleWidgets', JSON.stringify([
          'calendar'
        ]));
        
        // IMPORTANT: Use the hard-coded default layouts instead of any saved layouts
        // This ensures we're truly resetting to the original default
        let newLayout;
        if (isMobile) {
          newLayout = [...defaultMobileLayout]; // Create a fresh copy
        } else if (window.innerWidth >= 1920) {
          newLayout = [  // XL layout
            { i: 'quickStats', x: 0, y: 0, w: 60, h: 7, minW: 4, minH: 4, maxW: 100, maxH: 12 },
            { i: 'calendar', x: 0, y: 7, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 },
            { i: 'progress', x: 0, y: 22, w: 60, h: 15, minW: 4, minH: 8, maxW: 100, maxH: 30 },
            { i: 'recentEntries', x: 0, y: 37, w: 35, h: 18, minW: 4, minH: 10, maxW: 100, maxH: 36 },
            { i: 'topDistractions', x: 35, y: 37, w: 25, h: 18, minW: 4, minH: 6, maxW: 100, maxH: 36 }
          ];
        } else {
          newLayout = [...defaultLayout]; // Create a fresh copy
        }
        
        // Reset saved layouts back to defaults
        setSavedLayouts({
          lg: [...defaultLayout],
          md: [...defaultLayout],
          sm: [...defaultLayout],
          xs: [...defaultMobileLayout],
          xl: defaultLayout.map(item => ({ ...item }))
        });
        
        // Apply the default layout
        setCurrentLayout(newLayout);
        
        // Force a remount of the GridLayout component
        const newKey = 'grid-layout-' + Date.now();
        setGridKey(newKey);
        console.log('Setting grid key to force remount:', newKey);
        
        // Exit edit mode if active
        if (isEditMode) {
          setIsEditMode(false);
        }
        
        // Force a resize event to ensure proper rendering
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      } else {
        console.error('API returned error when resetting layout:', response);
        setLayoutError('Failed to reset your dashboard layout from the server.');
      }
    } catch (error) {
      console.error('Error resetting dashboard layout:', error);
      setLayoutError('Failed to reset your dashboard layout. Please try again later.');
    } finally {
      setIsLayoutLoading(false);
      // Close the confirmation dialog
      setResetConfirmOpen(false);
    }
  };

  // Load saved layout from the API when the component mounts
  useEffect(() => {
    const fetchSavedLayout = async () => {
      try {
        setIsLayoutLoading(true);
        setLayoutError(null);
        
        // Load saved widget visibility settings from localStorage
        const savedVisibleWidgets = localStorage.getItem('dashboardVisibleWidgets');
        if (savedVisibleWidgets) {
          try {
            const parsedWidgets = JSON.parse(savedVisibleWidgets);
            if (Array.isArray(parsedWidgets) && parsedWidgets.length > 0) {
              setVisibleWidgets(parsedWidgets);
            }
          } catch (error) {
            console.error('Error parsing saved widget visibility settings:', error);
          }
        }
        
        const response = await dashboardService.getLayout() as DashboardLayoutResponse;
        
        if (response.status === 'success' && response.data) {
          // If we have saved layout data, parse and use it
          console.log('Loading saved layout from API');
          const parsedLayout = response.data;
          
          // Ensure the layout is appropriate for the current device
          if (isMobile) {
            // Always use default mobile layout for mobile devices
            setCurrentLayout(isExtraSmall ? defaultMobileLayout : defaultMobileLayout);
          } else {
            // For desktop, check if the saved layout has valid desktop dimensions
            const normalizedLayout = normalizeLayout(parsedLayout);
            const calendarWidget = normalizedLayout.find(item => item.i === 'calendar');
            
            if (calendarWidget && calendarWidget.w >= 20) {
              // Valid desktop layout with proper dimensions
              setCurrentLayout(normalizedLayout);
            } else {
              // Invalid desktop dimensions, use default
              setCurrentLayout(defaultLayout);
            }
          }
          
          // Store a key to force re-render after layout is set
          const newKey = 'grid-layout-' + Date.now();
          setGridKey(newKey);
          console.log('Setting grid key to force remount:', newKey);
        } else {
          console.log('No saved layout found on server, using default');
          // If no saved layout, use the default based on device type
          setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
        }
      } catch (e) {
        console.error('Error loading saved layout from API', e);
        setLayoutError('Failed to load your dashboard layout. Default layout applied.');
        // If there's an error, use the default layout
        setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
      } finally {
        setIsLayoutLoading(false);
        
        // Force a resize event after layout is set to ensure proper rendering
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    };
    
    // Call the function to fetch the layout
    fetchSavedLayout();
  }, []);  // Run only on component mount

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        
        // Add extra width to allow for widgets to be dragged to the right
        // This creates the space needed for widgets to be placed in grey areas
        const extraRightSpace = 800; // Increase from 600px to 800px for more space
        
        // Specific handling for smaller devices like iPhone SE
        if (window.innerWidth <= 375) { // iPhone SE width
          setContainerWidth(Math.min(newWidth, window.innerWidth - 4) + extraRightSpace);
        }
        // For regular mobile devices
        else if (window.innerWidth < theme.breakpoints.values.sm) {
          setContainerWidth(Math.min(newWidth, window.innerWidth - 8) + extraRightSpace);
        } else {
          setContainerWidth(newWidth + extraRightSpace);
        }
        
        // Reset to default layouts when screen size changes significantly
        const newIsMobile = window.innerWidth < theme.breakpoints.values.sm;
        if (newIsMobile !== isMobile) {
          // Set the appropriate layout based on device size
          setCurrentLayout(newIsMobile ? defaultMobileLayout : defaultLayout);
          
          // Force a complete re-render of the grid layout
          setGridKey('grid-layout-' + Date.now());
          
          // Force a resize event after a short delay to ensure proper re-rendering
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 100);
        }
      }
    };
    
    updateWidth(); // Initial call
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isMobile, theme.breakpoints.values.sm]);

  // Add measurement of calendar widget width
  useEffect(() => {
    const measureCalendarWidth = () => {
      if (calendarWidgetRef.current) {
        const width = calendarWidgetRef.current.clientWidth;
        setCalendarWidgetWidth(width);
      }
    };
    
    // Initial measurement
    measureCalendarWidth();
    
    // Measure on resize and layout changes
    window.addEventListener('resize', measureCalendarWidth);
    
    // Create a ResizeObserver to detect when the widget changes size
    // This is especially important when the user resizes the widget in edit mode
    const resizeObserver = new ResizeObserver(measureCalendarWidth);
    if (calendarWidgetRef.current) {
      resizeObserver.observe(calendarWidgetRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', measureCalendarWidth);
      resizeObserver.disconnect();
    };
  }, []);

  // Effect to check if we need to clear any saved layouts on first component mount
  // Moved this here to avoid breaking hooks rules (must be called unconditionally)
  useEffect(() => {
    // Force layout update to the new version
    const layoutVersion = "4.0"; // Update this version whenever layout defaults change
    const currentVersion = localStorage.getItem('layoutVersion');
    
    // If version has changed or no version exists, reset layouts
    if (currentVersion !== layoutVersion) {
      console.log('Layout version changed, resetting to new defaults');
      
      // Clear any existing layout data
      localStorage.removeItem('dashboardLayout');
      localStorage.removeItem('userCustomizedLayout');
      localStorage.removeItem('lastSavedLayout');
      localStorage.removeItem('layoutMigrationV1');
      
      // Set the new version
      localStorage.setItem('layoutVersion', layoutVersion);
      
      // Set default layout based on device
      setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
      
      // Force a complete re-render of the grid
      setGridKey('grid-layout-' + Date.now());
      
      // Force a resize event
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
    
    // Check if need to reset to default layout (for testing/development)
    const forceDefault = new URLSearchParams(window.location.search).get('default') === 'true';
    
    if (forceDefault) {
      resetToDefaultLayout();
      return;
    }
    
    // One-time migration of any old layouts to the new format with expanded constraints
    const hasPerformedMigration = localStorage.getItem('layoutMigrationV1') === 'true';
    if (!hasPerformedMigration) {
      try {
        // Migrate lastSavedLayout if it exists
        const lastSavedLayout = localStorage.getItem('lastSavedLayout');
        if (lastSavedLayout) {
          const parsed = JSON.parse(lastSavedLayout);
          const normalized = normalizeLayout(parsed);
          localStorage.setItem('lastSavedLayout', JSON.stringify(normalized));
        }
        
        // Migrate dashboardLayout if it exists
        const savedLayout = localStorage.getItem('dashboardLayout');
        if (savedLayout) {
          const parsed = JSON.parse(savedLayout);
          const normalized = {
            lg: parsed.lg ? normalizeLayout(parsed.lg) : defaultLayout,
            md: parsed.md ? normalizeLayout(parsed.md) : defaultLayout,
            sm: parsed.sm ? normalizeLayout(parsed.sm) : defaultLayout,
            xs: parsed.xs ? normalizeLayout(parsed.xs) : defaultMobileLayout,
            xl: parsed.xl ? normalizeLayout(parsed.xl) : defaultLayout
          };
          localStorage.setItem('dashboardLayout', JSON.stringify(normalized));
        }
        
        // Mark migration as completed
        localStorage.setItem('layoutMigrationV1', 'true');
        console.log('Successfully migrated saved layouts to expanded constraints');
      } catch (e) {
        console.error('Error during layout migration, resetting to defaults', e);
        resetToDefaultLayout();
      }
    }
  }, []); // Run once on component mount

  // Helper functions and handlers (no hooks, safe to keep as is)
  const processDistractionData = (journalEntries: JournalEntry[]) => {
    // Create a counter for distractions
    const distractionCounter: { [key: string]: number } = {};
    let totalDistractions = 0;
    
    // Count occurrences of each distraction type
    journalEntries.forEach(entry => {
      if (entry.distractions && entry.distractions.length > 0) {
        entry.distractions.forEach(distraction => {
          // Skip empty or whitespace-only distractions
          if (distraction && distraction.trim()) {
            const normalizedDistraction = distraction.trim();
            if (distractionCounter[normalizedDistraction]) {
              distractionCounter[normalizedDistraction]++;
            } else {
              distractionCounter[normalizedDistraction] = 1;
            }
            totalDistractions++;
          }
        });
      }
    });
    
    // Transform into array format for pie chart
    const distractionArray = Object.keys(distractionCounter).map(key => ({
      name: key,
      value: distractionCounter[key],
      percentage: `${Math.round((distractionCounter[key] / totalDistractions) * 100)}%`
    }));
    
    // Sort by frequency (highest first)
    distractionArray.sort((a, b) => b.value - a.value);
    
    // Take top 5 distractions
    setDistractionData(distractionArray.slice(0, 5));
  };

  const prepareChartData = (journalEntries: JournalEntry[]) => {
    // Transform entries for the chart
    const processedData = journalEntries.map(entry => {
      // Format date/time for display
      // Use the timestamp field which contains the actual time the entry was created
      const date = new Date(entry.timestamp || entry.date);
      
      // Format date for desktop view
      const formattedDate = `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })}, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
      
      // Create a more compact format for mobile
      const mobileDate = `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })}`;
      
      // Calculate comprehensive score for this entry
      let totalPoints = 0;
      let maxPossiblePoints = 40; // Default maximum
      
      // Productivity score (1-10 points)
      totalPoints += entry.productivityScore;
      
      // Meeting score (0-10 points)
      if (entry.hadNoMeetings) {
        maxPossiblePoints = 30; // Reduce maximum if no meetings
      } else if (entry.meetingScore !== null) {
        totalPoints += entry.meetingScore;
      }
      
      // Break points (Yes = 10, No = 0)
      if (entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes') {
        totalPoints += 10;
      }
      
      // Focus time points (Yes = 10, Partial = 5, No = 0)
      if (entry.focusTime === 'Yes' || entry.focusTime === 'yes') {
        totalPoints += 10;
      } else if (entry.focusTime === 'Partially' || entry.focusTime === 'partially') {
        totalPoints += 5;
      }
      
      // Subtract 2 points for each distraction
      const distractionPenalty = entry.distractions ? Math.min(entry.distractions.length * 2, totalPoints) : 0;
      totalPoints -= distractionPenalty;
      
      // Ensure points don't go below zero
      totalPoints = Math.max(0, totalPoints);
      
      // Calculate percentage
      const scorePercentage = Math.round((totalPoints / maxPossiblePoints) * 100);
      
      return {
        name: formattedDate,
        mobileName: mobileDate,
        productivity: Math.round(entry.productivityScore * 10),
        comprehensive: scorePercentage,
        date: date // Keep the Date object for sorting
      };
    });
    
    // Sort by date (newest first for the chart)
    processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setChartData(processedData);
  };

  // Helper function to calculate comprehensive score for an entry
  const calculateEntryScore = (entry: JournalEntry): number => {
    let totalPoints = 0;
    let maxPossiblePoints = 40; // Default maximum
    
    // Productivity score (1-10 points)
    totalPoints += entry.productivityScore;
    
    // Meeting score (0-10 points)
    if (entry.hadNoMeetings) {
      maxPossiblePoints = 30; // Reduce maximum if no meetings
    } else if (entry.meetingScore !== null) {
      totalPoints += entry.meetingScore;
    }
    
    // Break points (Yes = 10, No = 0)
    if (entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes') {
      totalPoints += 10;
    }
    
    // Focus time points (Yes = 10, Partial = 5, No = 0)
    if (entry.focusTime === 'Yes' || entry.focusTime === 'yes') {
      totalPoints += 10;
    } else if (entry.focusTime === 'Partially' || entry.focusTime === 'partially') {
      totalPoints += 5;
    }
    
    // Subtract 2 points for each distraction
    const distractionPenalty = entry.distractions ? Math.min(entry.distractions.length * 2, totalPoints) : 0;
    totalPoints -= distractionPenalty;
    
    // Ensure points don't go below zero
    totalPoints = Math.max(0, totalPoints);
    
    // Calculate percentage
    return Math.round((totalPoints / maxPossiblePoints) * 100);
  };

  const handleNewEntry = () => {
    navigate('/journal');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Use Promise.allSettled to handle multiple refresh operations independently
      const results = await Promise.allSettled([
        refreshEntries(),
        (async () => {
          try {
            // Attempt to refresh calendar data if available
            if (typeof connectCalendar === 'function') {
              console.log('Refreshing calendar data from dashboard');
              // Check if the refreshCalendarData function is available in the Calendar context
              // This is a safer approach than directly calling refreshCalendarData
              if (events && Array.isArray(events)) {
                // If we have events, we're likely connected to calendar
                await new Promise<void>((resolve) => {
                  // Set timeout to prevent blocking the UI
                  setTimeout(async () => {
                    try {
                      // Attempt to refresh calendar data
                      await fetch('/api/calendar/events', { 
                        method: 'GET',
                        headers: { 'Cache-Control': 'no-cache' } 
                      });
                      console.log('Calendar data refresh triggered');
                    } catch (error) {
                      console.error('Error during calendar refresh:', error);
                    }
                    resolve();
                  }, 100);
                });
              }
            }
          } catch (calendarError) {
            console.error('Error refreshing calendar:', calendarError);
            // Don't rethrow to prevent blocking other refresh operations
          }
        })()
      ]);
      
      // Log results for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Refresh operation ${index} failed:`, result.reason);
        }
      });
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
      
      // Force grid to remount to prevent display issues
      setGridKey('grid-layout-' + Date.now());
      
      // Force a resize event after a short delay
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  };

  const handleViewEntry = (index: number) => {
    if (entries && entries[index]) {
      navigate(`/entry/${entries[index].id}`);
    } else {
      navigate(`/entry/${index}`);
    }
  };

  // Handler for calendar event click
  const handleCalendarEventClick = (event: any) => {
    console.log('Calendar event clicked:', event);
    // No longer need to show an alert since EventDetailsPopup handles this now
    // The EventDetailsPopup component will be triggered by the CalendarView component directly
  };

  // Handler for adding new calendar events
  const handleAddCalendarEvent = () => {
    if (!isConnected) {
      // Show connect prompt with explanation
      const result = window.confirm(
        "You're currently viewing sample calendar data. Connect to Google Calendar to add real events?"
      );
      
      if (result) {
        connectCalendar();
      }
    } else {
      console.log('Add new calendar event');
      // The EventCreationModal component will be opened by the CalendarView component directly
    }
  };

  // Toggle edit mode
  const handleToggleEditMode = () => {
    setIsEditMode(!isEditMode);
    // If turning off edit mode, save the current layout
    if (isEditMode) {
      saveLayout();
    }
  };

  // Save the current layout
  const saveLayout = async () => {
    try {
      setIsLayoutSaving(true);
      setLayoutError(null);
      
      const breakpoint = getBreakpoint();
      
      // Update the saved layouts with current settings
      // Set expanded maxW values for all widgets
      const expandedLayout = currentLayout.map(item => ({
        ...item,
        maxW: 100
      }));
      
      // Save current layout to state
      setSavedLayouts({
        ...savedLayouts,
        [breakpoint]: expandedLayout
      });

      // Save to the API
      console.log('Saving layout to API:', expandedLayout);
      const response = await dashboardService.saveLayout(expandedLayout) as DashboardLayoutResponse;
      
      if (response.status === 'success') {
        console.log('Layout saved successfully to API');
      } else {
        console.error('API returned error when saving layout:', response);
        setLayoutError('Failed to save your dashboard layout to the server.');
      }
      
      // Close widget dialog if open
      if (widgetDialogOpen) {
        setWidgetDialogOpen(false);
      }
      
      // Set edit mode to false
      setIsEditMode(false);
      
      // Force a re-render and update on save
      setGridKey('grid-layout-' + Date.now());
      
      // Trigger a resize event to ensure everything renders correctly
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);

      console.log('Layout saved successfully:', expandedLayout);
    } catch (error) {
      console.error('Error saving layout to API:', error);
      setLayoutError('Failed to save your dashboard layout. Please try again later.');
    } finally {
      setIsLayoutSaving(false);
    }
  };

  // Force refresh all layouts and apply expanded maxW values
  const forceRefreshLayouts = async () => {
    try {
      setIsLayoutLoading(true);
      setLayoutError(null);
      
      // Apply expanded maxW values to current layout
      const expandedLayout = currentLayout.map(item => ({
        ...item,
        maxW: 100
      }));
      
      // Set current layout
      setCurrentLayout(expandedLayout);
      
      // Save to the API
      console.log('Saving refreshed layout to API:', expandedLayout);
      const response = await dashboardService.saveLayout(expandedLayout) as DashboardLayoutResponse;
      
      if (response.status === 'success') {
        console.log('Refreshed layout saved successfully to API');
      } else {
        console.error('API returned error when saving refreshed layout:', response);
        setLayoutError('Failed to save your refreshed dashboard layout to the server.');
      }
      
      // Refresh the grid
      setGridKey('grid-layout-' + Date.now());
      
      // Force a resize event
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      
      console.log('Layout has been refreshed');
    } catch (error) {
      console.error('Error refreshing layout via API:', error);
      setLayoutError('Failed to refresh your dashboard layout. Please try again later.');
    } finally {
      setIsLayoutLoading(false);
    }
  };

  // Handle layout change
  const handleLayoutChange = (layout: Layout[]) => {
    // Don't apply mobile layout to desktop or vice versa to prevent layout corruption
    const breakpoint = getBreakpoint();
    const isCurrentlyMobile = breakpoint === 'xs';
    
    // If this is a mobile layout but we're on desktop, or vice versa, don't apply it
    if ((isCurrentlyMobile && !isMobile) || (!isCurrentlyMobile && isMobile)) {
      console.log('Preventing layout corruption between mobile/desktop views');
      return;
    }
    
    // Save the new layout
    setCurrentLayout(layout);
    
    // When layout changes in edit mode, update the calendar width
    if (isEditMode && calendarWidgetRef.current) {
      const width = calendarWidgetRef.current.clientWidth;
      setCalendarWidgetWidth(width);
    }
  };

  // Add a function to normalize layouts - it ensures any loaded layout has the proper constraints
  const normalizeLayout = (layout: Layout[]): Layout[] => {
    return layout.map(item => ({
      ...item,
      maxW: 100, // Always use the expanded maxW value
    }));
  };

  // Get the current breakpoint
  const getBreakpoint = () => {
    if (isMobile) return 'xs';
    if (window.innerWidth < 960) return 'sm';
    if (window.innerWidth < 1280) return 'md';
    if (window.innerWidth < 1920) return 'lg';
    return 'xl'; // Added 'xl' breakpoint for very large screens
  };

  // Get layout for current breakpoint
  const getCurrentLayout = () => {
    const breakpoint = getBreakpoint();
    
    // Always use predefined layouts for mobile devices regardless of any saved customizations
    if (breakpoint === 'xs' || isMobile) {
      if (isExtraSmall) {
        // Special layout for iPhone SE with same type as Layout[]
        const iphoneSELayout: Layout[] = [
          { i: 'quickStats', x: 0, y: 0, w: 12, h: 8, minW: 12, minH: 8, maxW: 12, maxH: 20 },
          { i: 'calendar', x: 0, y: 8, w: 12, h: 16, minW: 12, minH: 12, maxW: 12, maxH: 30 },
          { i: 'progress', x: 0, y: 24, w: 12, h: 16, minW: 12, minH: 10, maxW: 12, maxH: 24 },
          { i: 'recentEntries', x: 0, y: 40, w: 12, h: 16, minW: 12, minH: 10, maxW: 12, maxH: 32 },
          { i: 'topDistractions', x: 0, y: 56, w: 12, h: 11, minW: 12, minH: 8, maxW: 12, maxH: 24 }
        ];
        return getVisibleLayout(iphoneSELayout);
      }
      // For other mobile devices, always use default mobile layout 
      return getVisibleLayout(defaultMobileLayout);
    }
    
    // For desktop devices, check if current layout has proper desktop dimensions
    if (currentLayout && currentLayout.length > 0) {
      // Check if the calendar widget has proper desktop dimensions
      const calendarWidget = currentLayout.find(item => item.i === 'calendar');
      if (calendarWidget && calendarWidget.w >= 20) {
      return getVisibleLayout(currentLayout);
      }
    }
    
    // If current layout isn't valid for desktop or doesn't exist,
    // use appropriate default layout based on screen size
    if (breakpoint === 'xl') {
      // Special wide layout for xl screens
      const xlLayout: Layout[] = [
        { i: 'calendar', x: 0, y: 0, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 }
      ];
      return getVisibleLayout(xlLayout);
    }
    
    // For all other desktop sizes, use the default layout
    return getVisibleLayout(defaultLayout);
  };
  
  // Helper function to get XL layout
  const getXLLayout = (): Layout[] => {
    // Special wide layout for xl screens that matches the desired default view
    return [
        { i: 'quickStats', x: 0, y: 0, w: 60, h: 7, minW: 4, minH: 4, maxW: 100, maxH: 12 },
        { i: 'calendar', x: 0, y: 7, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 },
        { i: 'progress', x: 0, y: 22, w: 60, h: 15, minW: 4, minH: 8, maxW: 100, maxH: 30 },
        { i: 'recentEntries', x: 0, y: 37, w: 35, h: 18, minW: 4, minH: 10, maxW: 100, maxH: 36 },
        { i: 'topDistractions', x: 35, y: 37, w: 25, h: 18, minW: 4, minH: 6, maxW: 100, maxH: 36 }
      ];
  };

  // Filter layout to only show visible widgets
  const getVisibleLayout = (layout: Layout[]): Layout[] => {
    return layout.filter(item => visibleWidgets.includes(item.i));
  };

  // Effect to ensure layout is properly set when component mounts
  useEffect(() => {
    // Force a resize to make sure everything renders correctly
    window.dispatchEvent(new Event('resize'));
    
    // Reset grid key to force a remount if needed
    setGridKey('grid-layout-' + Date.now());
    
    // Ensure proper layout is applied based on screen size
    const currentBreakpoint = getBreakpoint();
    if (currentBreakpoint !== 'xs' && isMobile) {
      // Screen is desktop but isMobile state hasn't caught up
      setCurrentLayout(defaultLayout);
    } else if (currentBreakpoint === 'xs' && !isMobile) {
      // Screen is mobile but isMobile state hasn't caught up
      setCurrentLayout(defaultMobileLayout);
    }
  }, []); // Only run this effect once on mount

  // Check loading state after all hooks are declared
  if (isLoading) return <CircularProgress />;

  // Prevent widgets from being placed above the header
  const handleDrag = (layout: Layout[], oldItem: Layout, newItem: Layout) => {
    // If the new position would place the item with a y < 0, reset to y=0
    if (newItem.y < 0) {
      newItem.y = 0;
    }
    return layout;
  };

  return (
    <Container 
      disableGutters={isMobile}
      maxWidth="xl" 
      sx={{ 
        pt: 4,
        pb: 8,
        minHeight: '100vh',
        position: 'relative'
      }}
    >
      {/* Display layout loading indicator */}
      {isLayoutLoading && (
        <Box sx={{ 
          position: 'fixed', 
          top: '16px', 
          right: '16px',
          zIndex: 9999,
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 1.5,
          boxShadow: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          maxWidth: '250px'
        }}>
          <CircularProgress size={20} />
          <Typography variant="body2">
            Updating layout...
          </Typography>
        </Box>
      )}
      
      {/* Widget Visibility Dialog */}
      <Dialog 
        open={widgetDialogOpen} 
        onClose={() => setWidgetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: 'Poppins', fontWeight: 'bold' }}>
          Show/Hide Widgets
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, fontFamily: 'Poppins', fontSize: '0.9rem' }}>
            Select which widgets you want to display on your dashboard.
          </Typography>
          <FormGroup>
            {/* Quick Stats, Progress Chart, Recent Entries, and Top Distractions widgets
               have been moved to Journal Insights page */}
            <FormControlLabel
              control={
                <Checkbox 
                  checked={visibleWidgets.includes('calendar')}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setVisibleWidgets(prev => [...prev, 'calendar']);
                    } else {
                      setVisibleWidgets(prev => prev.filter(w => w !== 'calendar'));
                    }
                    setGridKey('grid-layout-' + Date.now()); // Force remount
                  }}
                  sx={{
                    color: '#1056F5',
                    '&.Mui-checked': {
                      color: '#1056F5',
                    },
                  }}
                />
              }
              label="Calendar"
            />
            {/* Progress Chart, Recent Entries, and Top Distractions widgets have been moved to Journal Insights page */}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              // Save visibility settings to localStorage
              localStorage.setItem('dashboardVisibleWidgets', JSON.stringify(visibleWidgets));
              
              // Update the layout if in edit mode
              if (isEditMode) {
                setCurrentLayout(getCurrentLayout());
              }
              
              // Close the dialog
              setWidgetDialogOpen(false);
            }} 
            color="primary"
            sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Display layout error if there is one */}
      {layoutError && (
        <Alert 
          severity="error" 
          onClose={() => setLayoutError(null)}
          sx={{ mb: 2 }}
        >
          {layoutError}
        </Alert>
      )}
      
      {/* Add CSS for the pulsing dot animation using MUI's GlobalStyles */}
      <GlobalStyles 
        styles={{
          '@keyframes pulse': {
            '0%': {
              r: 8,
              opacity: 1,
            },
            '50%': {
              r: 10,
              opacity: 0.8,
            },
            '100%': {
              r: 8,
              opacity: 1,
            }
          },
          '.pulsing-dot': {
            animation: 'pulse 1.5s infinite ease-in-out',
          },
          '.react-grid-layout': {
            position: 'relative',
            width: '100%',
            overflow: 'visible !important', // Ensure content doesn't get clipped when dragging
            margin: '0 auto', // Center the grid layout
            maxWidth: '1600px' // Limit max width for very large screens
          },
          '.react-grid-item.react-grid-placeholder': {
            background: '#1056F5 !important',
            opacity: '0.2 !important',
            borderRadius: '8px',
            transition: 'all 150ms ease',
          },
          '.react-resizable-handle': {
            visibility: isEditMode ? 'visible' : 'hidden',
            opacity: isEditMode ? 0.7 : 0,
            transition: 'all 0.3s ease'
          },
          '.react-grid-item': {
            // Fix for mobile to ensure proper width
            width: isMobile ? '100% !important' : 'auto',
            // Increase touch area for mobile
            touchAction: isMobile ? 'pan-y' : 'auto',
          },
          '.react-grid-item > .react-resizable-handle': {
            position: 'absolute',
            width: '20px',
            height: '20px'
          },
          '.react-grid-item > .react-resizable-handle.react-resizable-handle-se': {
            bottom: '0',
            right: '0',
            cursor: 'se-resize'
          },
          '.react-grid-item > .react-resizable-handle.react-resizable-handle-e': {
            right: '0',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'e-resize'
          },
          '.react-grid-item > .react-resizable-handle.react-resizable-handle-s': {
            bottom: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            cursor: 's-resize'
          },
          '.dashboard-widget': {
            transition: 'all 0.3s ease',
            border: isEditMode ? '1px dashed #1056F5' : 'none',
            width: '100%', // Ensure widgets use full width
            maxWidth: '100%', // Remove any max-width constraints
            margin: isMobile ? '0 auto 8px auto' : '0',
          },
          '.dashboard-widget:hover': {
            boxShadow: isEditMode ? '0 0 0 2px #1056F5' : 'none',
          }
        }}
      />
      
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: isExtraSmall ? 1 : 2, sm: 4 },
        px: { xs: isExtraSmall ? 0.5 : 1, sm: 0 }
      }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"}
          component="h1" 
          sx={{ 
            fontWeight: 'bold', 
            fontFamily: 'Poppins',
            fontSize: { xs: isExtraSmall ? '1.1rem' : '1.25rem', sm: '2rem' },
            pl: { xs: 1, sm: 2 } // Add left padding to move it to the right
          }}
        >
          Your Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Customize button - only show on desktop */}
          {!isMobile && (
            <MuiTooltip title={isEditMode ? "Save layout" : "Customize dashboard"}>
          <Button 
                variant={isEditMode ? "contained" : "outlined"}
                startIcon={isEditMode ? <SaveIcon /> : <DashboardCustomizeIcon />}
                onClick={handleToggleEditMode}
            sx={{
              borderColor: '#1056F5',
                  backgroundColor: isEditMode ? '#1056F5' : 'transparent',
                  color: isEditMode ? 'white' : '#1056F5',
              fontFamily: 'Poppins',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#0D47D9',
                    backgroundColor: isEditMode ? '#0D47D9' : '#f5f9ff',
              },
            }}
          >
                {isEditMode ? "Save Layout" : "Customize"}
          </Button>
            </MuiTooltip>
          )}
        </Box>
      </Box>

      <Box ref={containerRef} sx={{ 
        width: '100%',
        minWidth: '100%',
        overflow: 'visible'  // Allow content to overflow, important for dragging
      }}>
      {journalLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : journalError ? (
        <Paper sx={{ p: 4, textAlign: 'center', my: 4 }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Error loading journal entries
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Try Again
          </Button>
        </Paper>
      ) : (
        <>
            {isEditMode && !isMobile && (
              <Paper 
                className="edit-mode-banner"
                sx={{ 
                  p: 2, 
                  mb: 3, 
                  bgcolor: '#FFF8E1', 
                  border: '1px solid #FFD54F', 
                  borderRadius: 2,
                  transition: 'all 0.3s ease'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: '#FF8F00' }}>
                    <strong>Edit Mode:</strong> Drag widgets to reposition them or resize using the handles on the edges and corners. Click "Save Layout" when you're done.
                    {' '}<span style={{ fontSize: '0.85rem' }}>If you have issues dragging widgets past a certain point, use the Fix Layout button.</span>
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<VisibilityIcon />}
                      onClick={() => setWidgetDialogOpen(true)}
                      sx={{ 
                        fontFamily: 'Poppins',
                        borderColor: '#2196F3',
                        color: '#2196F3', 
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        py: 0.8,
                        '&:hover': {
                          backgroundColor: 'rgba(33, 150, 243, 0.08)',
                          borderColor: '#1976D2',
                        }
                      }}
                    >
                      Show/Hide Widgets
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<TuneIcon />}
                      onClick={forceRefreshLayouts}
                      sx={{ 
                        fontFamily: 'Poppins',
                        borderColor: '#1056F5',
                        color: '#1056F5', 
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        py: 0.8,
                        '&:hover': {
                          backgroundColor: 'rgba(16, 86, 245, 0.08)',
                          borderColor: '#0D47D9',
                        }
                      }}
                    >
                      Fix Layout
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<RestartAltIcon />}
                      onClick={() => setResetConfirmOpen(true)}
                      sx={{ 
                        fontFamily: 'Poppins',
                        borderColor: '#F29702',
                        color: '#F29702', 
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        py: 0.8,
                        '&:hover': {
                          backgroundColor: 'rgba(255, 143, 0, 0.08)',
                          borderColor: '#D18702',
                        }
                      }}
                    >
                      Reset to Default
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      startIcon={<CancelIcon />}
                      onClick={() => {
                        setIsEditMode(false);
                        // Don't save changes - revert to the last saved layout
                        const breakpoint = getBreakpoint();
                        if (savedLayouts[breakpoint]) {
                          setCurrentLayout(savedLayouts[breakpoint]);
                        } else {
                          // If no saved layout exists, use default
                          setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
                        }
                        setGridKey('grid-layout-' + Date.now()); // Force refresh
                      }}
                      sx={{ 
                        fontFamily: 'Poppins',
                        borderColor: '#F44336',
                        color: '#F44336', 
                        textTransform: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 'medium',
                        py: 0.8,
                        '&:hover': {
                          backgroundColor: 'rgba(244, 67, 54, 0.08)',
                          borderColor: '#D32F2F',
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              </Paper>
            )}
            
            <GridLayout
              key={gridKey} // Add key to force remount of the component
              className="layout"
              layout={getCurrentLayout()}
              cols={isMobile ? 12 : 100}  // Increase cols from 60 to 100 to allow more horizontal space
              rowHeight={isMobile ? (isExtraSmall ? 16 : 25) : 30}
              width={containerWidth}
              margin={[isMobile ? (isExtraSmall ? 2 : 6) : 15, isMobile ? (isExtraSmall ? 6 : 10) : 15]}
              containerPadding={[isMobile ? 0 : 20, 0]} // Add horizontal padding for centering on desktop
              isDraggable={isEditMode}
              isResizable={isEditMode}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".drag-handle"
              resizeHandles={['se', 'e', 's', 'sw', 'w', 'nw']}
              compactType={null}
              useCSSTransforms={true}
              autoSize={true}
              preventCollision={false}
              isBounded={false}
              allowOverlap={true}  // Change to true to allow widgets to overlap
              verticalCompact={false}
              onDragStop={(layout) => {
                setCurrentLayout(layout);
              }}
              onResizeStop={(layout) => {
                setCurrentLayout(layout);
              }}
              onResize={(layout, oldItem, newItem) => {
                // This is important for left-side resizing to properly update the layout
                const updatedLayout = layout.map(item => {
                  if (item.i === newItem.i) {
                    return newItem;
                  }
                  return item;
                });
                setCurrentLayout(updatedLayout);
              }}
              onDrag={handleDrag}
            >
          {/* Quick Stats Section */}
              {/* Quick Stats Section - Removed, now in Journal Insights */}

              {/* Calendar Section */}
              {visibleWidgets.includes('calendar') && (
              <div key="calendar" className="dashboard-widget">
                <Paper sx={{ 
                  p: 0, 
                  height: '100%',
                  borderRadius: 2, 
                  overflow: 'auto',
                  position: 'relative',
                  boxShadow: isMobile ? 1 : 3
                }}>
                  {isEditMode && (
                    <Box 
                      className="drag-handle"
                      sx={{ 
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '30px',
                        cursor: 'move',
                        backgroundColor: 'rgba(16, 86, 245, 0.05)',
                        borderBottom: '1px dashed #1056F5',
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#1056F5'
                      }}
                    >
                      Drag to move
                    </Box>
                  )}
                  <Box 
                    ref={calendarWidgetRef}
                    sx={{ 
                      height: '100%',
                      pt: isEditMode ? 4 : 0,
                      minHeight: '200px',
                      overflow: 'auto'
                    }}
                  >
            <CalendarView 
              onEventClick={handleCalendarEventClick}
              onAddEvent={handleAddCalendarEvent}
                      containerWidth={calendarWidgetWidth}
            />
                  </Box>
          </Paper>
              </div>
              )}

          {/* Progress Graph Section - Removed, now in Journal Insights */}
              
              {/* Recent Entries Section - Removed, now in Journal Insights */}

              {/* Top Distractions Section - Removed, now in Journal Insights */}
            </GridLayout>
        </>
      )}
                            </Box>

      {/* Mobile fixed tooltip */}
      {isMobile && activeDataPoint && tooltipPosition && (
        <MobileFixedTooltip />
      )}

      {/* Add styles for proper widget display on mobile */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
        }
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          z-index: 20; /* Ensure handles are above other content */
        }
        /* Southeast (bottom-right) resize handle */
        .react-resizable-handle-se {
          bottom: 0;
          right: 0;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCAwIDYgTCAwIDQuMiBMIDQgNC4yIEwgNC4yIDQuMiBMIDQuMiAwIEwgNiAwIEwgNiA2IEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: bottom right;
          padding: 0 3px 3px 0;
          cursor: se-resize;
          width: 24px;
          height: 24px;
        }
        /* South (bottom) resize handle */
        .react-resizable-handle-s {
          bottom: 0;
          left: 50%;
          margin-left: -10px;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCAwIDYgTCAwIDQuMiBMIDYgNC4yIEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: bottom center;
          padding: 0 0 3px 0;
          cursor: s-resize;
        }
        /* East (right) resize handle */
        .react-resizable-handle-e {
          right: 0;
          top: 50%;
          margin-top: -10px;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCA0LjIgNiBMIDQuMiAwIEwgNiAwIEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: center right;
          padding: 0 3px 0 0;
          cursor: e-resize;
        }
        /* Southwest (bottom-left) resize handle */
        .react-resizable-handle-sw {
          bottom: 0;
          left: 0;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSAwIDYgTCAwIDAgTCAxLjggMCBMIDEuOCA0IEwgNiA0IEwgNiA2IEwgMCA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: bottom left;
          padding: 0 0 3px 3px;
          cursor: sw-resize;
          transform: rotate(90deg);
          width: 24px;
          height: 24px;
          background-color: rgba(200, 200, 200, 0.1); /* Light background to make it more visible */
        }
        /* West (left) resize handle */
        .react-resizable-handle-w {
          left: 0;
          top: 50%;
          margin-top: -10px;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSAwIDAgTCAxLjggMCBMIDEuOCA2IEwgMCA2IEwgMCAwIFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: center left;
          padding: 0 0 0 3px;
          cursor: w-resize;
        }
        /* Northwest (top-left) resize handle */
        .react-resizable-handle-nw {
          top: 0;
          left: 0;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSAwIDAgTCA2IDAgTCA2IDEuOCBMIDIgMS44IEwgMS44IDEuOCBMIDEuOCA2IEwgMCA2IEwgMCAwIEwgMCAwIFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: top left;
          padding: 3px 0 0 3px;
          cursor: nw-resize;
          transform: rotate(180deg);
        }
        
        /* Add hover effect for all resize handles to make them more noticeable */
        .react-resizable-handle:hover {
          background-color: rgba(16, 86, 245, 0.1);
        }
        
        /* Special treatment for the southwest handle to ensure it's always visible and accessible */
        .dashboard-widget .react-resizable-handle-sw {
          z-index: 25; /* Higher z-index than other handles */
          width: 26px;
          height: 26px;
          bottom: 0;
          left: 0;
          background-size: 12px 12px; /* Make the icon slightly larger */
          pointer-events: all; /* Ensure it captures mouse events */
          position: absolute; /* Ensure absolute positioning */
          background-color: rgba(200, 200, 200, 0.2); /* Light background to make it more visible */
        }
        
        /* Ensure southwest handle is visible even with different overflow settings */
        .dashboard-widget .react-resizable-handle-sw:before {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          bottom: 2px;
          left: 2px;
          border-left: 2px solid rgba(16, 86, 245, 0.3);
          border-bottom: 2px solid rgba(16, 86, 245, 0.3);
          border-radius: 0 0 0 3px;
        }
        
        /* Enhance southwest handle on hover */
        .dashboard-widget .react-resizable-handle-sw:hover {
          background-color: rgba(16, 86, 245, 0.15);
        }
        
        .dashboard-widget .react-resizable-handle-sw:hover:before {
          border-left: 2px solid rgba(16, 86, 245, 0.6);
          border-bottom: 2px solid rgba(16, 86, 245, 0.6);
        }
        
        /* Make sure overflow doesn't hide resize handles */
        .dashboard-widget .MuiPaper-root {
          overflow: visible !important;
        }
        
        .edit-mode-banner.highlight-reset {
          background-color: #FFECB3;
          border-color: #FFA000;
          transform: scale(1.01);
          box-shadow: 0 0 8px rgba(255, 160, 0, 0.3);
        }
        
        @media (max-width: 375px) {
          .dashboard-widget {
            padding: 0.25rem !important;
          }
          .dashboard-widget .MuiCardHeader-root {
            padding: 4px 8px !important;
          }
          .dashboard-widget .MuiCardHeader-title {
            font-size: 0.75rem !important;
          }
          .dashboard-widget .MuiCardContent-root {
            padding: 4px !important;
          }
          .react-grid-item {
            margin-bottom: 2px !important;
          }
          .MuiBox-root {
            font-size: 0.85rem !important;
          }
          .MuiButton-root {
            padding: 2px 8px !important;
            font-size: 0.75rem !important;
          }
          /* Specific for Quick Stats on iPhone SE */
          .dashboard-widget[style*="quickStats"] {
            overflow: visible !important;
          }
          .dashboard-widget[style*="quickStats"] .MuiPaper-root {
            overflow: visible !important;
          }
          .dashboard-widget[style*="quickStats"] .MuiBox-root {
            padding: 0.2rem !important;
          }
          .dashboard-widget[style*="quickStats"] .MuiTypography-root {
            margin-bottom: 0 !important;
          }
          .dashboard-widget[style*="quickStats"] .MuiTypography-subtitle2 {
            font-size: 0.6rem !important;
          }
          .dashboard-widget[style*="quickStats"] .MuiTypography-h6 {
            font-size: 0.85rem !important;
          }
        }
      `}} />
      
      
      {/* Reset Layout Confirmation Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        aria-labelledby="reset-layout-dialog-title"
        aria-describedby="reset-layout-dialog-description"
      >
        <DialogTitle id="reset-layout-dialog-title" sx={{ fontFamily: 'Poppins', fontWeight: 'bold' }}>
          Reset Dashboard Layout
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-layout-dialog-description" sx={{ fontFamily: 'Poppins' }}>
            Are you sure you want to reset your dashboard to the default layout? This will remove all customizations you've made, including widget positions, sizes, and visibility settings.
            <Box mt={1} sx={{ color: '#F29702', fontWeight: 'medium' }}>
              This action cannot be undone.
            </Box>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
                          <Button
            onClick={() => setResetConfirmOpen(false)} 
                            sx={{ 
                              fontFamily: 'Poppins', 
                              textTransform: 'none', 
              color: '#666'
                            }}
                          >
            Cancel
                          </Button>
          <Button 
            onClick={resetToDefaultLayout} 
            variant="contained"
            color="primary"
            sx={{ 
              fontFamily: 'Poppins', 
              textTransform: 'none',
              bgcolor: '#F29702',
              '&:hover': {
                bgcolor: '#D18702',
              }
            }}
          >
            Reset Layout
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard; 