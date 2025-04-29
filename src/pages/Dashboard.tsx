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
  CardContent
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

// Import default layouts from DashboardLayout component
const defaultLayout: Layout[] = [
  { i: 'quickStats', x: 0, y: 0, w: 60, h: 7, minW: 4, minH: 4, maxW: 100, maxH: 12 },
  { i: 'calendar', x: 0, y: 7, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 },
  { i: 'progress', x: 0, y: 22, w: 60, h: 15, minW: 4, minH: 8, maxW: 100, maxH: 30 },
  { i: 'recentEntries', x: 0, y: 37, w: 35, h: 18, minW: 4, minH: 10, maxW: 100, maxH: 36 },
  { i: 'topDistractions', x: 35, y: 37, w: 25, h: 18, minW: 4, minH: 6, maxW: 100, maxH: 36 }
];

const defaultMobileLayout: Layout[] = [
  { i: 'quickStats', x: 0, y: 0, w: 12, h: 12, minW: 12, minH: 8, maxW: 12, maxH: 24 },
  { i: 'calendar', x: 0, y: 12, w: 12, h: 16, minW: 12, minH: 12, maxW: 12, maxH: 30 },
  { i: 'progress', x: 0, y: 28, w: 12, h: 16, minW: 12, minH: 10, maxW: 12, maxH: 24 },
  { i: 'recentEntries', x: 0, y: 44, w: 12, h: 16, minW: 12, minH: 10, maxW: 12, maxH: 32 },
  { i: 'topDistractions', x: 0, y: 60, w: 12, h: 12, minW: 12, minH: 8, maxW: 12, maxH: 24 }
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

const Dashboard: React.FC = () => {
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

  // Add a state for container width
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Add ref and state for calendar widget width
  const calendarWidgetRef = useRef<HTMLDivElement>(null);
  const [calendarWidgetWidth, setCalendarWidgetWidth] = useState<number>(0);

  const isExtraSmall = useMediaQuery('(max-width:375px)');
  
  // Replace SWR with our own state and useEffect
  const [quickStats, setQuickStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
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

  // Define resetToDefaultLayout before using it in useEffect
  const resetToDefaultLayout = () => {
    // Clear any saved layouts from localStorage
    localStorage.removeItem('dashboardLayout');
    localStorage.removeItem('userCustomizedLayout');
    localStorage.removeItem('lastSavedLayout');
    
    // Get the appropriate default layout based on screen size
    const defaultLayoutToApply = isMobile ? 
      (isExtraSmall ? 
        // iPhone SE layout
        [
          { i: 'quickStats', x: 0, y: 0, w: 12, h: 8, minW: 12, minH: 8, maxW: 12, maxH: 20 },
          { i: 'calendar', x: 0, y: 8, w: 12, h: 16, minW: 12, minH: 12, maxW: 12, maxH: 30 },
          { i: 'progress', x: 0, y: 24, w: 12, h: 16, minW: 12, minH: 10, maxW: 12, maxH: 24 },
          { i: 'recentEntries', x: 0, y: 40, w: 12, h: 16, minW: 12, minH: 10, maxW: 12, maxH: 32 },
          { i: 'topDistractions', x: 0, y: 56, w: 12, h: 11, minW: 12, minH: 8, maxW: 12, maxH: 24 }
        ] : 
        defaultMobileLayout) : 
      (getBreakpoint() === 'xl' ? 
        // XL layout
        [
          { i: 'quickStats', x: 0, y: 0, w: 60, h: 7, minW: 4, minH: 4, maxW: 100, maxH: 12 },
          { i: 'calendar', x: 0, y: 7, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 },
          { i: 'progress', x: 0, y: 22, w: 60, h: 15, minW: 4, minH: 8, maxW: 100, maxH: 30 },
          { i: 'recentEntries', x: 0, y: 37, w: 35, h: 18, minW: 4, minH: 10, maxW: 100, maxH: 36 },
          { i: 'topDistractions', x: 35, y: 37, w: 25, h: 18, minW: 4, minH: 6, maxW: 100, maxH: 36 }
        ] : 
        defaultLayout);
    
    // Reset layouts with a clean array reference
    setCurrentLayout([...defaultLayoutToApply]);
    
    // Reset savedLayouts state to defaults
    setSavedLayouts({
      lg: defaultLayout,
      md: defaultLayout,
      sm: defaultLayout,
      xs: defaultMobileLayout,
      xl: defaultLayout
    });
    
    // Force a complete re-render of the grid by changing its key
    setGridKey('grid-layout-' + Date.now());
    
    // For extra measure, force a resize event
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    
    console.log('Layout has been reset to default');
  };

  // Load saved layout from localStorage on component mount
  useEffect(() => {
    try {
      // First check for the most reliable saved layout
      const lastSavedLayout = localStorage.getItem('lastSavedLayout');
      if (lastSavedLayout) {
        const parsedLayout = JSON.parse(lastSavedLayout);
        // Normalize the layout to ensure it has the updated constraints
        setCurrentLayout(normalizeLayout(parsedLayout));
      } else {
        // Otherwise check for regular saved layouts
        const savedLayout = localStorage.getItem('dashboardLayout');
        const userHasCustomized = localStorage.getItem('userCustomizedLayout') === 'true';
        
        if (savedLayout && userHasCustomized) {
          try {
            const parsed = JSON.parse(savedLayout);
            // Store the normalized layouts
            const normalizedLayouts = {
              lg: parsed.lg ? normalizeLayout(parsed.lg) : defaultLayout,
              md: parsed.md ? normalizeLayout(parsed.md) : defaultLayout,
              sm: parsed.sm ? normalizeLayout(parsed.sm) : defaultLayout,
              xs: parsed.xs ? normalizeLayout(parsed.xs) : defaultMobileLayout,
              xl: parsed.xl ? normalizeLayout(parsed.xl) : defaultLayout
            };
            setSavedLayouts(normalizedLayouts);
            
            // Apply the correct layout for current breakpoint
            const breakpoint = getBreakpoint();
            if (parsed[breakpoint]) {
              // Use normalized layout
              setCurrentLayout(normalizeLayout(parsed[breakpoint]));
            } else {
              // Default to current device type
              setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
            }
          } catch (e) {
            console.error('Error parsing saved layout', e);
            // If there's an error parsing, reset to default
            resetToDefaultLayout();
          }
        } else {
          // If user hasn't customized or no saved layout, ensure we're using default
          setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
        }
      }
    } catch (e) {
      console.error('Error loading saved layout', e);
      setCurrentLayout(isMobile ? defaultMobileLayout : defaultLayout);
    }
  }, [isMobile]);

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
          setCurrentLayout(newIsMobile ? defaultMobileLayout : defaultLayout);
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
      await Promise.all([
        refreshEntries()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
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
  const saveLayout = () => {
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

    // Save to localStorage with the exact current layout
    localStorage.setItem('dashboardLayout', JSON.stringify({
      ...savedLayouts,
      [breakpoint]: expandedLayout
    }));
    
    // Set flag that user has customized the layout
    localStorage.setItem('userCustomizedLayout', 'true');
    
    // Also save this as a snapshot for persistence
    localStorage.setItem('lastSavedLayout', JSON.stringify(expandedLayout));
    
    // Set edit mode to false
    setIsEditMode(false);
  };

  // Force refresh all layouts and apply expanded maxW values
  const forceRefreshLayouts = () => {
    // Clear current layouts from localStorage
    localStorage.removeItem('dashboardLayout');
    localStorage.removeItem('lastSavedLayout');
    
    // Don't clear userCustomizedLayout flag to preserve customizations
    
    // Apply expanded maxW values to current layout
    const expandedLayout = currentLayout.map(item => ({
      ...item,
      maxW: 100
    }));
    
    // Set current layout
    setCurrentLayout(expandedLayout);
    
    // Save the updated layout
    const breakpoint = getBreakpoint();
    localStorage.setItem('dashboardLayout', JSON.stringify({
      ...savedLayouts,
      [breakpoint]: expandedLayout
    }));
    localStorage.setItem('lastSavedLayout', JSON.stringify(expandedLayout));
    
    // Refresh the grid
    setGridKey('grid-layout-' + Date.now());
    
    // Force a resize event
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  };

  // Handle layout change
  const handleLayoutChange = (layout: Layout[]) => {
    // Save the new layout immediately
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
        return iphoneSELayout;
      }
      // For other mobile devices, always use default mobile layout 
      return defaultMobileLayout;
    }
    
    // For non-mobile devices, check if we have a saved layout
    const userHasCustomized = Boolean(localStorage.getItem('userCustomizedLayout'));
    
    // Check for the last saved layout first (most reliable)
    const lastSavedLayout = localStorage.getItem('lastSavedLayout');
    if (userHasCustomized && lastSavedLayout) {
      try {
        // Apply the normalizeLayout function to ensure proper constraints
        return normalizeLayout(JSON.parse(lastSavedLayout));
      } catch (e) {
        console.error('Error parsing last saved layout', e);
      }
    }
    
    // Try the breakpoint-specific saved layout
    if (userHasCustomized) {
      try {
        const savedLayoutStr = localStorage.getItem('dashboardLayout');
        if (savedLayoutStr) {
          const savedLayouts = JSON.parse(savedLayoutStr);
          if (savedLayouts[breakpoint]) {
            // Apply the normalizeLayout function to ensure proper constraints
            return normalizeLayout(savedLayouts[breakpoint]);
          }
        }
      } catch (e) {
        console.error('Error parsing saved layout for breakpoint', e);
      }
    }
    
    // If no valid saved layout was found, use the default
    if (breakpoint === 'xl') {
      // Special wide layout for xl screens that matches the desired default view
      const xlLayout: Layout[] = [
        { i: 'quickStats', x: 0, y: 0, w: 60, h: 7, minW: 4, minH: 4, maxW: 100, maxH: 12 },
        { i: 'calendar', x: 0, y: 7, w: 60, h: 15, minW: 4, minH: 10, maxW: 100, maxH: 36 },
        { i: 'progress', x: 0, y: 22, w: 60, h: 15, minW: 4, minH: 8, maxW: 100, maxH: 30 },
        { i: 'recentEntries', x: 0, y: 37, w: 35, h: 18, minW: 4, minH: 10, maxW: 100, maxH: 36 },
        { i: 'topDistractions', x: 35, y: 37, w: 25, h: 18, minW: 4, minH: 6, maxW: 100, maxH: 36 }
      ];
      return xlLayout;
    }
    
    return defaultLayout;
  };

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
        mt: { xs: isExtraSmall ? 0.5 : 1, sm: 4 }, 
        mb: { xs: isExtraSmall ? 0.5 : 1, sm: 4 }, 
        paddingBottom: { xs: isExtraSmall ? 4 : 6, sm: 10 },
        px: { xs: isExtraSmall ? 0.2 : 0.5, sm: 1, md: 1 } // Reduced horizontal padding
      }}
    >
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
            fontSize: { xs: isExtraSmall ? '1.1rem' : '1.25rem', sm: '2rem' }
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
          
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleNewEntry} 
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
            New Entry
          </Button>
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
                      onClick={resetToDefaultLayout}
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
              resizeHandles={['se', 'e', 's']}
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
              onDrag={handleDrag}
            >
              {/* Quick Stats Section */}
              <div key="quickStats" className="dashboard-widget">
                <Paper 
                  sx={{ 
                    p: isMobile ? isExtraSmall ? 1 : 1.5 : 4, 
                    height: '100%',
                    borderRadius: 2,
                    overflow: 'auto',
                    position: 'relative',
                    boxShadow: isMobile ? 1 : 3
                  }}
                >
                  {/* Drag handle shown only in edit mode */}
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
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: isExtraSmall ? 0.5 : 2,
                    pt: isEditMode ? 4 : 0 
                  }}>
                    <Typography 
                      variant={isMobile ? "subtitle1" : "h6"}
                      sx={{ 
                        fontWeight: 'bold', 
                        fontFamily: 'Poppins',
                        fontSize: isExtraSmall ? '0.9rem' : undefined
                      }}
                    >
                      Quick Stats
                    </Typography>
                    <Button 
                      size="small" 
                      startIcon={<RefreshIcon />}
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      sx={{ display: { xs: 'none', sm: 'flex' } }}
                    >
                      Refresh
                    </Button>
                  </Box>
                  <Box
                    sx={{
                      display: 'grid',
                      gap: { xs: isExtraSmall ? 0.5 : 1, sm: 2, md: 3 },
                      gridTemplateColumns: {
                        xs: isExtraSmall ? 'repeat(1, 1fr)' : 'repeat(2, 1fr)', // Single column on iPhone SE
                        sm: 'repeat(3, 1fr)', // Three columns on small screens 
                        md: 'repeat(6, 1fr)'  // Six columns on medium and larger screens for all stats in one row
                      },
                      width: '100%',
                      overflow: isExtraSmall ? 'visible' : 'auto',
                      height: isExtraSmall ? 'auto' : 'calc(100% - 60px)',
                      paddingBottom: isExtraSmall ? 0.5 : 1,
                      '& > .MuiBox-root': {
                        height: 'auto !important', // Override fixed height
                        minHeight: { xs: isExtraSmall ? '40px' : '70px', sm: '80px' }
                      }
                    }}
                  >
                    <Box sx={{ 
                      height: isExtraSmall ? 'auto' : '100%', 
                      minHeight: { 
                        xs: isExtraSmall ? '40px' : '70px', 
                        sm: '80px' 
                      } 
                    }}>
                      <StatCard 
                        title="Average Score" 
                        value={stats.averageScore}
                        color="#1056F5"
                        subtitle="Comprehensive rating of all factors"
                      />
                    </Box>
                    <Box sx={{ 
                      height: isExtraSmall ? 'auto' : '100%', 
                      minHeight: { 
                        xs: isExtraSmall ? '40px' : '70px', 
                        sm: '80px' 
                      } 
                    }}>
                      <StatCard 
                        title="Avg Productivity" 
                        value={stats.avgProductivity}
                        color="#071C73"
                        subtitle="Based on productivity ratings only"
                      />
                    </Box>
                    <Box sx={{ 
                      height: isExtraSmall ? 'auto' : '100%', 
                      minHeight: { 
                        xs: isExtraSmall ? '40px' : '70px', 
                        sm: '80px' 
                      } 
                    }}>
                      <StatCard 
                        title="Avg Meeting Score" 
                        value={stats.avgMeetingScore}
                        color="#016C9E"
                        subtitle="Average meeting effectiveness"
                      />
                    </Box>
                    <Box sx={{ 
                      height: isExtraSmall ? 'auto' : '100%', 
                      minHeight: { 
                        xs: isExtraSmall ? '40px' : '70px', 
                        sm: '80px' 
                      } 
                    }}>
                      <StatCard 
                        title="Break Rate" 
                        value={stats.breakRate}
                        color="#F29702"
                        subtitle="How often you took breaks"
                      />
                    </Box>
                    <Box sx={{ 
                      height: isExtraSmall ? 'auto' : '100%', 
                      minHeight: { 
                        xs: isExtraSmall ? '40px' : '70px', 
                        sm: '80px' 
                      } 
                    }}>
                      <StatCard 
                        title="Focus Success" 
                        value={stats.focusSuccess}
                        color="#49C1E3"
                        subtitle="Focus time achievement rate"
                      />
                    </Box>
                    <Box sx={{ 
                      height: isExtraSmall ? 'auto' : '100%', 
                      minHeight: { 
                        xs: isExtraSmall ? '40px' : '70px', 
                        sm: '80px' 
                      }
                    }}>
                      <StatCard 
                        title="Journal Streak" 
                        value={stats.journalStreak}
                        color="#E04330"
                        subtitle="Consecutive days with entries"
                      />
                    </Box>
                  </Box>
                </Paper>
              </div>

              {/* Calendar Section */}
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

              {/* Progress Graph Section */}
              <div key="progress" className="dashboard-widget">
                <Paper sx={{ 
                  p: isMobile ? 1.5 : 4, 
                  height: '100%',
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'auto',
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
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3,
                    pt: isEditMode ? 4 : 0 
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
                    >
                      Your Progress
                    </Typography>
                    <Button 
                      startIcon={isRefreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />} 
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none',
                        color: '#1056F5',
                        fontWeight: 'medium'
                      }}
                    >
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </Box>
                  
                  <Box sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: 'calc(100% - 80px)', // Adjust for header
                    mb: isMobile ? 1 : 2,
                    minHeight: '200px',
                    overflow: 'auto'
                  }}>
                    {isRefreshing && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 10,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          borderRadius: 2,
                          p: 3,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          boxShadow: 3
                        }}
                      >
                        <Typography variant="body1" sx={{ fontFamily: 'Poppins', fontWeight: 'medium', mb: 1 }}>
                          Refreshing data...
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'Poppins', color: 'text.secondary' }}>
                          Dashboard is updating with latest reflections.
                        </Typography>
                      </Box>
                    )}
                    {hasData && chartData.length > 0 ? (
                      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{
                              top: 20,
                              right: isMobile ? 10 : 30,
                              left: isMobile ? 0 : 10,
                              bottom: isMobile ? 60 : 80, // Adjusted bottom margin for mobile
                            }}
                            onMouseUp={(data) => {
                              if (data && data.activePayload && data.activePayload.length > 0) {
                                // Only for mobile devices
                                if (isMobile) {
                                  setActiveDataPoint(data.activePayload[0].payload);
                                  
                                  if (data.chartX !== undefined && data.chartY !== undefined) {
                                    // Simple positioning - always position tooltips with fixed offsets
                                    // that ensure they're fully visible
                                    setTooltipPosition({
                                      x: data.chartX,
                                      y: data.chartY
                                    });
                                  }
                                }
                              }
                            }}
                            onClick={() => {
                              if (!isMobile) {
                                setActiveDataPoint(null);
                                setTooltipPosition(null);
                              }
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={true} stroke="#e0e0e0" />
                            <XAxis 
                              dataKey={isMobile ? "mobileName" : "name"}
                              angle={isMobile ? -35 : -45}
                              textAnchor="end"
                              tick={{ 
                                fontSize: isMobile ? 10 : 12, 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium' 
                              }}
                              height={isMobile ? 60 : 90}
                              tickMargin={isMobile ? 10 : 20}
                              axisLine={{ stroke: '#e0e0e0' }}
                              tickLine={{ stroke: '#e0e0e0' }}
                              interval={isMobile ? 1 : 0} // Skip some labels on mobile
                              tickFormatter={(value, index) => {
                                if (isMobile) {
                                  return index % 2 === 0 ? value : '';
                                }
                                return value;
                              }}
                            />
                            <YAxis 
                              domain={[0, 100]} 
                              tick={{ 
                                fontSize: isMobile ? 10 : 12, 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium' 
                              }}
                              tickCount={isMobile ? 4 : 6}
                              axisLine={{ stroke: '#e0e0e0' }}
                              tickLine={{ stroke: '#e0e0e0' }}
                              width={isMobile ? 30 : 40}
                            />
                            <Tooltip 
                              content={<CustomTooltip />} 
                              // Use default positioning behavior for desktop
                              // On mobile, we'll show our custom fixed tooltip instead
                              cursor={{ strokeDasharray: '3 3' }}
                              // Use standard hover behavior - our fixed tooltip handles the mobile case
                              trigger="hover"
                            />
                          
                            <ReferenceArea y1={0} y2={50} fill="#ffebee" fillOpacity={0.7} />
                            <ReferenceArea y1={50} y2={70} fill="#fff8e1" fillOpacity={0.7} />
                            <ReferenceArea y1={70} y2={100} fill="#e8f5e9" fillOpacity={0.7} />
                          
                            <ReferenceLine y={70} stroke="#e0e0e0" strokeDasharray="3 3" />
                            <ReferenceLine y={50} stroke="#e0e0e0" strokeDasharray="3 3" />
                          
                            <Line 
                              type="monotone" 
                              dataKey="comprehensive" 
                              stroke="#1056F5" 
                              strokeWidth={2}
                              dot={{ 
                                fill: '#1056F5', 
                                r: isMobile ? 5 : 5
                              }} 
                              activeDot={{ 
                                r: isMobile ? 8 : 7,
                                strokeWidth: 1, 
                                stroke: '#fff',
                                fill: '#1056F5',
                                strokeOpacity: isMobile ? 0.8 : 1,
                                className: isMobile ? 'pulsing-dot' : ''
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        
                        {/* Place the mobile tooltip directly on top of the chart */}
                        {isMobile && activeDataPoint && tooltipPosition && (
                          <MobileFixedTooltip />
                        )}
                      </Box>
                    ) : (
                      <Box sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        flexDirection: 'column',
                        p: 2
                      }}>
                        <Typography variant="body1" sx={{ mb: 1, fontFamily: 'Poppins', textAlign: 'center' }}>
                          No progress data yet.
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', textAlign: 'center' }}>
                          Create entries to track your productivity journey.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </div>

              {/* Recent Entries Section */}
              <div key="recentEntries" className="dashboard-widget">
                <Paper sx={{ 
                  p: isMobile ? 1.5 : 4, 
                  height: '100%', 
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'auto',
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
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    mb: 3,
                    pt: isEditMode ? 4 : 0 
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
                    >
                      Recent Entries
                    </Typography>
                    <Button 
                      onClick={() => navigate('/all-entries')}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        textTransform: 'none',
                        color: '#1056F5',
                        fontWeight: 'medium'
                      }}
                    >
                      View all
                    </Button>
                  </Box>
                  
                  {entries && entries.length > 0 ? (
                    <Box sx={{ overflow: 'auto', height: 'calc(100% - 70px)' }}>
                      <TableContainer sx={{ 
                        overflowX: 'auto',
                        '&::-webkit-scrollbar': {
                          height: '6px'
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: 'rgba(0,0,0,0.2)',
                          borderRadius: '4px'
                        }
                      }}>
                        <Table size="small" sx={{ tableLayout: 'fixed' }}>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666',
                                width: { xs: '80px', sm: '100px' }
                              }}>DATE</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666',
                                width: { xs: '80px', sm: '100px' }
                              }}>SCORE</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666', 
                                display: { xs: 'none', sm: 'table-cell' },
                                width: { sm: '120px' }
                              }}>PRODUCTIVITY</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666', 
                                display: { xs: 'none', md: 'table-cell' },
                                width: { md: '100px' }
                              }}>MEETINGS</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666', 
                                display: { xs: 'none', md: 'table-cell' },
                                width: { md: '100px' }
                              }}>FOCUS TIME</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666', 
                                display: { xs: 'none', sm: 'table-cell' },
                                width: { sm: '120px' }
                              }}>BREAKS</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666', 
                                display: { xs: 'none', lg: 'table-cell' }
                              }}>SUPPORT</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666', 
                                display: { xs: 'none', lg: 'table-cell' }
                              }}>PLAN</TableCell>
                              <TableCell sx={{ 
                                fontFamily: 'Poppins', 
                                fontWeight: 'medium', 
                                color: '#666',
                                width: { xs: '60px', sm: '80px' }
                              }}></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {entries.slice(0, 6).map((entry, index) => (
                              <TableRow key={entry.id || index} hover>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {new Date(entry.date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric'
                                  })}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle',
                                  padding: { xs: '6px 2px', md: '8px 16px' }
                                }}>
                                  <Box sx={{ 
                                    backgroundColor: '#1056F5', 
                                    display: 'inline-block', 
                                    px: { xs: 1, sm: 1.5 },
                                    py: 0.5, 
                                    borderRadius: 16,
                                    fontWeight: 'medium',
                                    color: 'white',
                                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {calculateEntryScore(entry)}%
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  display: { xs: 'none', sm: 'table-cell' },
                                  padding: { xs: '6px 2px', md: '8px 16px' }
                                }}>
                                  <Box sx={{ 
                                    backgroundColor: '#1056F5', 
                                    display: 'inline-block',
                                    px: { xs: 1, sm: 1.5 },
                                    py: 0.5, 
                                    borderRadius: 16,
                                    fontWeight: 'medium',
                                    color: 'white',
                                    fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {Math.round(entry.productivityScore * 10)}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  display: { xs: 'none', md: 'table-cell' },
                                  padding: { xs: '6px 2px', md: '8px 16px' },
                                  whiteSpace: 'nowrap'
                                }}>
                                  {entry.hadNoMeetings ? (
                                    <Box sx={{ fontFamily: 'Poppins', color: '#666' }}>
                                      -
                                    </Box>
                                  ) : (
                                    <Box sx={{ 
                                      backgroundColor: '#1056F5', 
                                      display: 'inline-block', 
                                      px: { xs: 1, sm: 1.5 },
                                      py: 0.5, 
                                      borderRadius: 16,
                                      fontWeight: 'medium',
                                      color: 'white',
                                      fontSize: { xs: '0.65rem', sm: '0.75rem' },
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {entry.meetingScore}
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  display: { xs: 'none', md: 'table-cell' },
                                  padding: { xs: '6px 2px', md: '8px 16px' },
                                  whiteSpace: 'nowrap'
                                }}>
                                  {entry.focusTime === 'Yes' || entry.focusTime === 'yes' ? (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                                      <CheckCircleIcon sx={{ mr: 0.5, fontSize: '0.875rem' }} /> 
                                      <Box component="span" sx={{ display: { md: 'inline', lg: 'inline' } }}>Yes</Box>
                                    </Box>
                                  ) : entry.focusTime === 'Partially' || entry.focusTime === 'partially' ? (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F29D38' }}>
                                      <CoffeeIcon sx={{ mr: 0.5, fontSize: '0.875rem' }} /> 
                                      <Box component="span" sx={{ display: { md: 'none', lg: 'inline' } }}>Partial</Box>
                                    </Box>
                                  ) : (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                                      <CloseIcon sx={{ mr: 0.5, fontSize: '0.875rem' }} /> 
                                      <Box component="span" sx={{ display: { md: 'none', lg: 'inline' } }}>No</Box>
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  display: { xs: 'none', md: 'table-cell' },
                                  padding: { xs: '6px 2px', md: '8px 16px' },
                                  whiteSpace: 'nowrap'
                                }}>
                                  {entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes' ? (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                                      <CheckCircleIcon sx={{ mr: 0.5, fontSize: '0.875rem' }} /> 
                                      <Box component="span" sx={{ display: { md: 'none', lg: 'inline' } }}>Yes</Box>
                                    </Box>
                                  ) : (
                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                                      <CloseIcon sx={{ mr: 0.5, fontSize: '0.875rem' }} /> 
                                      <Box component="span" sx={{ display: { md: 'none', lg: 'inline' } }}>No</Box>
                                    </Box>
                                  )}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  display: { xs: 'none', lg: 'table-cell' },
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '150px'
                                }}>
                                  {entry.supportNeeded || '-'}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  display: { xs: 'none', lg: 'table-cell' },
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '150px'
                                }}>
                                  {entry.improvementPlans || '-'}
                                </TableCell>
                                <TableCell sx={{ 
                                  fontFamily: 'Poppins', 
                                  verticalAlign: 'middle', 
                                  padding: { xs: '8px 2px', sm: '16px' },
                                  textAlign: 'center'
                                }}>
                                  <Button
                                    onClick={() => handleViewEntry(index)}
                                    size="small"
                                    sx={{ 
                                      fontFamily: 'Poppins', 
                                      textTransform: 'none', 
                                      color: '#1056F5',
                                      fontWeight: 'medium',
                                      minWidth: { xs: '40px', sm: '64px' },
                                      px: { xs: 0.5, sm: 1 }
                                    }}
                                  >
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Box>
                  ) : (
                    <Box sx={{ 
                      height: 'calc(100% - 70px)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                        No entries yet. Start your reflection journey today!
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </div>

              {/* Top Distractions Section */}
              <div key="topDistractions" className="dashboard-widget">
                <Paper sx={{ 
                  p: isMobile ? (isExtraSmall ? 0.6 : 0.8) : { xs: 2, sm: 3, md: 4 }, 
                  height: '100%',
                  borderRadius: 2,
                  position: 'relative',
                  overflow: 'auto',
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
                  
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      mb: { xs: isExtraSmall ? 0.2 : 0.3, sm: 1.5 }, 
                      fontWeight: 'bold', 
                      fontFamily: 'Poppins',
                      pt: isEditMode ? 4 : 0,
                      fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
                      textAlign: 'center'
                    }}
                  >
                    Top Distractions
                  </Typography>
                  
                  {entries && entries.length > 0 ? (
                    <Box sx={{ 
                      height: `calc(100% - ${isEditMode ? '75px' : '35px'})`, 
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      {/* Chart container */}
                      <Box 
                        sx={{ 
                          flex: isMobile ? '0 0 auto' : '1 1 auto', 
                          minHeight: { xs: isExtraSmall ? '130px' : '150px', sm: '140px' },
                          maxHeight: { xs: isExtraSmall ? '180px' : '220px', sm: '280px' },
                          height: { xs: '75%', sm: '70%' }, // Increased height ratio for chart
                          position: 'relative',
                          mx: 'auto', // Center the chart horizontally
                          width: '96%', // Use slightly less than full width for better centering
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <Pie
                              data={distractionData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={isMobile ? (isExtraSmall ? "85%" : "90%") : "90%"}
                              innerRadius="0%"
                              paddingAngle={2}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {distractionData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]} 
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<DistractionTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                      
                      {/* Legend */}
                      <Box sx={{ 
                        mt: { xs: isExtraSmall ? 0.1 : 0.3, sm: 1.5 }, 
                        flex: '1 1 auto',
                        overflow: 'auto',
                        maxHeight: { xs: '25%', sm: '30%' }, // Further reduced max height for legend
                        fontSize: '0.7rem',
                        mx: 'auto', // Center the legend horizontally
                        width: '98%',
                        pb: 0,
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <Box sx={{ 
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'center',
                          gap: { xs: isExtraSmall ? 0.5 : 0.8, sm: 1.5 },
                          px: { xs: 0, sm: 1 },
                          alignItems: 'center'
                        }}>
                          {distractionData.map((entry, index) => (
                            <Box 
                              key={`legend-${index}`}
                              sx={{ 
                                display: 'flex',
                                alignItems: 'center',
                                mb: { xs: isExtraSmall ? 0.1 : 0.2, sm: 0.5 },
                                mr: { xs: isExtraSmall ? 0.2 : 0.3, sm: 0.5 },
                                flexBasis: { xs: '45%', sm: 'auto' },
                                flexGrow: { xs: 0, sm: 1 },
                                flexShrink: 0,
                                minWidth: { xs: isExtraSmall ? '90px' : '100px', sm: '140px' }
                              }}
                            >
                              <Box 
                                sx={{ 
                                  width: { xs: isExtraSmall ? 8 : 10, sm: 14, md: 16 }, 
                                  height: { xs: isExtraSmall ? 8 : 10, sm: 14, md: 16 }, 
                                  backgroundColor: COLORS[index % COLORS.length],
                                  borderRadius: '2px',
                                  mr: { xs: isExtraSmall ? 0.5 : 0.6, sm: 1 },
                                  flexShrink: 0
                                }}
                              />
                              <Typography 
                                sx={{ 
                                  fontSize: { xs: isExtraSmall ? '0.65rem' : '0.75rem', sm: '0.85rem', md: '0.9rem' },
                                  fontWeight: 'medium',
                                  fontFamily: 'Poppins',
                                  color: 'text.primary',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {entry.name}: {entry.percentage}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    // No changes to the empty state
                    <Box sx={{ 
                      height: 'calc(100% - 70px)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                        No distraction data available yet.
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </div>
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
          bottom: 0;
          right: 0;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2IDYiIHN0eWxlPSJiYWNrZ3JvdW5kLWNvbG9yOiNmZmZmZmYwMCIgeD0iMHB4IiB5PSIwcHgiIHdpZHRoPSI2cHgiIGhlaWdodD0iNnB4Ij48ZyBvcGFjaXR5PSIwLjMwMiI+PHBhdGggZD0iTSA2IDYgTCAwIDYgTCAwIDQuMiBMIDQgNC4yIEwgNC4yIDQuMiBMIDQuMiAwIEwgNiAwIEwgNiA2IEwgNiA2IFoiIGZpbGw9IiMwMDAwMDAiLz48L2c+PC9zdmc+');
          background-position: bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
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
    </Container>
  );
};

export default Dashboard; 