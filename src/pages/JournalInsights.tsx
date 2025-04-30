import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Typography, 
  Paper,
  Grid,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import { JournalEntry, DistractionData, ChartDataPoint } from '../types/commonTypes';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CoffeeIcon from '@mui/icons-material/Coffee';
import CloseIcon from '@mui/icons-material/Close';
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
  Cell
} from 'recharts';
import StatCard from '../components/StatCard';

// Color palette for pie chart
const COLORS = ['#1056F5', '#071C73', '#016C9E', '#C6E8F2', '#F29702', '#E04330', '#49C1E3'];

// Initial stats
const initialStats = {
  averageScore: '0%',
  avgProductivity: 0,
  avgMeetingScore: 0,
  breakRate: '0%',
  focusSuccess: '0%',
  journalStreak: '0 days'
};

const JournalInsights: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { entries } = useJournal();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isExtraSmall = useMediaQuery('(max-width:375px)');
  
  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(initialStats);
  const [distractionData, setDistractionData] = useState<DistractionData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [hasData, setHasData] = useState<boolean>(false);
  const [activeDataPoint, setActiveDataPoint] = useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{x: number, y: number} | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);

  // Listen for window resize events
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate optimal chart height based on window width
  const getOptimalChartHeight = (): number => {
    if (isMobile) return 280;
    if (windowWidth < 1000) return 320;
    if (windowWidth < 1400) return 350;
    return 380; // For very large screens
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Load initial data when component mounts
    if (entries && entries.length > 0) {
      setLoading(false);
      processEntries(entries);
      setHasData(true);
    } else {
      setLoading(false);
      setHasData(false);
    }
  }, [isAuthenticated, navigate, entries]);

  // Process journal entries
  const processEntries = (journalEntries: JournalEntry[]) => {
    if (!journalEntries || journalEntries.length === 0) {
      setHasData(false);
      return;
    }
    
    // Process chart data - must be done before the others to ensure the chart renders
    prepareChartData(journalEntries);
    
    // Process distraction data
    processDistractionData(journalEntries);
    
    // Calculate stats
    calculateStats(journalEntries);
    
    // Set has data flag
    setHasData(true);
  };

  // Calculate statistics from journal entries
  const calculateStats = (journalEntries: JournalEntry[]) => {
    if (!journalEntries || journalEntries.length === 0) return;
    
    // Calculate stats based on entries
    const totalProductivity = journalEntries.reduce((sum, entry) => sum + entry.productivityScore, 0);
    const meetingsEntries = journalEntries.filter(entry => entry.meetingScore !== null);
    const totalMeetingScore = meetingsEntries.reduce((sum, entry) => sum + (entry.meetingScore || 0), 0);
    const breakRateCount = journalEntries.filter(entry => entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes').length;
    const focusSuccessCount = journalEntries.filter(entry => entry.focusTime === 'Yes' || entry.focusTime === 'yes').length;
    
    // Calculate journal streak
    const calculateStreak = (): number => {
      // Extract dates and convert to standard format (YYYY-MM-DD)
      const entryDates = journalEntries.map(entry => {
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
    
    // Calculate average comprehensive score
    const comprehensiveScores = journalEntries.map(entry => calculateEntryScore(entry));
    const avgComprehensiveScore = Math.round(comprehensiveScores.reduce((sum, score) => sum + score, 0) / journalEntries.length);
    
    // Set calculated stats to state
    setStats({
      averageScore: `${avgComprehensiveScore}%`,
      avgProductivity: +(totalProductivity / journalEntries.length).toFixed(1),
      avgMeetingScore: meetingsEntries.length > 0 ? 
        +(totalMeetingScore / meetingsEntries.length).toFixed(1) : 0,
      breakRate: `${Math.round((breakRateCount / journalEntries.length) * 100)}%`,
      focusSuccess: `${Math.round((focusSuccessCount / journalEntries.length) * 100)}%`,
      journalStreak: `${streak} day${streak !== 1 ? 's' : ''}`
    });
  };

  // Process distraction data from journal entries
  const processDistractionData = (journalEntries: JournalEntry[]) => {
    if (!journalEntries || journalEntries.length === 0) return;
    
    // Count occurrences of each distraction type
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
    if (!journalEntries || journalEntries.length === 0) {
      return;
    }
    
    const processedData = journalEntries.map(entry => {
      // Format date/time for display
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
      
      // Create a different format for mobile based on whether it's current year or not
      const currentYear = new Date().getFullYear();
      const entryYear = date.getFullYear();
      
      // For mobile view, add year only if it's not the current year
      let mobileDate;
      if (entryYear !== currentYear) {
        // Include the 2-digit year for entries not from current year
        mobileDate = `${date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        })}`;
      } else {
        // Just month/day for current year
        mobileDate = `${date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric'
        })}`;
      }
      
      // Calculate comprehensive score
      const scorePercentage = calculateEntryScore(entry);
      
      return {
        name: formattedDate,
        mobileName: mobileDate,
        productivity: Math.round(entry.productivityScore * 10),
        comprehensive: scorePercentage,
        date: date.toISOString(),
        value: scorePercentage,
        dateObj: date
      };
    });
    
    // Sort by date (oldest to newest) for the chart
    processedData.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    // Set the chart data
    setChartData(processedData);
    
    // Ensure hasData is set
    if (processedData.length > 0) {
      setHasData(true);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Re-process entries
      if (entries && entries.length > 0) {
        processEntries(entries);
      } else {
        setHasData(false);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate entry score
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

  // Tooltip component for progress chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    // Only show tooltip when active and payload exists
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      
      // Format the date to include the year
      let tooltipLabel;
      if (isMobile) {
        tooltipLabel = dataPoint.mobileName;
      } else {
        // For the tooltip, we want to ensure the year is always visible
        const date = new Date(dataPoint.date);
        tooltipLabel = `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      }
      
      const scoreValue = dataPoint.comprehensive;
      
      // Determine color and status based on score value
      let color = '#4CAF50'; // Green for good
      let status = 'Good';
      
      if (scoreValue < 50) {
        color = '#F44336'; // Red for needs improvement
        status = 'Needs improvement';
      } else if (scoreValue < 70) {
        color = '#FF9800'; // Orange for moderate
        status = 'Moderate';
      }
      
      return (
        <Paper
          elevation={3}
          sx={{
            backgroundColor: 'white',
            padding: '12px 16px',
            border: '1px solid #f5f5f5',
            fontFamily: 'Poppins',
            minWidth: isMobile ? '180px' : '220px',
            maxWidth: isMobile ? '240px' : '320px',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            position: 'relative'
          }}
        >
          <Typography sx={{ 
            fontFamily: 'Poppins', 
            fontSize: '0.9rem', 
            mb: 1.5,
            fontWeight: 'bold',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            color: '#333'
          }}>
            {tooltipLabel}
          </Typography>
          
          <Box sx={{ 
            borderRadius: 1,
            bgcolor: 'rgba(0, 0, 0, 0.03)',
            p: 1.5,
            mb: 1.5
          }}>
            <Typography sx={{ 
              fontFamily: 'Poppins', 
              fontSize: '1.1rem', 
              color: color, 
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              {scoreValue}%
              <Box component="span" sx={{ 
                fontSize: '0.75rem',
                color: 'white',
                bgcolor: color,
                py: 0.5,
                px: 1,
                borderRadius: '12px',
                ml: 1
              }}>
                {status}
              </Box>
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ 
              fontFamily: 'Poppins', 
              fontSize: '0.85rem', 
              color: '#666',
              fontWeight: 'medium'
            }}>
              Productivity:
            </Typography>
            <Typography sx={{ 
              fontFamily: 'Poppins', 
              fontSize: '0.85rem', 
              color: '#333',
              fontWeight: 'bold'
            }}>
              {dataPoint.productivity}%
            </Typography>
          </Box>
        </Paper>
      );
    }
    return null;
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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
          Journal Insights
        </Typography>
        <Button 
          variant="outlined"
          onClick={() => navigate('/journal')}
          sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
        >
          Back to Journal
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Quick Stats Section */}
          <Grid item xs={12}>
            <Paper 
              sx={{ 
                p: isMobile ? isExtraSmall ? 1 : 1.5 : 4, 
                borderRadius: 2,
                overflow: 'auto',
                boxShadow: isMobile ? 1 : 3
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: isExtraSmall ? 0.5 : 2
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
          </Grid>
          
          {/* Progress Graph Section */}
          <Grid item xs={12}>
            <Paper sx={{ 
              p: isMobile ? 1.5 : { xs: 2, sm: 3, md: 4 }, 
              borderRadius: 2,
              position: 'relative',
              boxShadow: isMobile ? 1 : 2,
              overflow: 'hidden',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                boxShadow: 3
              },
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: isMobile ? 1.5 : 2,
                flexShrink: 0
              }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold', 
                    fontFamily: 'Poppins',
                    fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' }
                  }}
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
                    fontWeight: 'medium',
                    fontSize: { xs: '0.8rem', sm: '0.875rem' }
                  }}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Box>
                  
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                height: 'auto',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                mb: isMobile ? 1 : 2,
                minHeight: isMobile ? '280px' : '350px'
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
                      Insights are updating with latest reflections.
                    </Typography>
                  </Box>
                )}
                
                {chartData && chartData.length > 0 ? (
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      '& .recharts-wrapper': {
                        borderRadius: '12px',
                        overflow: 'hidden'
                      }
                    }}
                  >
                    <ResponsiveContainer 
                      width="100%" 
                      height={getOptimalChartHeight()} 
                      debounce={50}
                    >
                      <LineChart
                        data={chartData}
                        margin={{
                          top: 20,
                          right: isMobile ? 10 : 30,
                          left: isMobile ? 0 : 20,
                          bottom: isMobile ? 60 : 40
                        }}
                      >
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          vertical={false} 
                          horizontal={true} 
                          stroke="#e0e0e0" 
                          strokeOpacity={0.6}
                        />
                        <XAxis 
                          dataKey={isMobile ? "mobileName" : "name"}
                          angle={isMobile ? -35 : -40}
                          textAnchor="end"
                          tick={{ 
                            fontSize: isMobile ? 10 : 11, 
                            fontFamily: 'Poppins', 
                            fontWeight: 'medium' 
                          }}
                          height={isMobile ? 60 : 70}
                          tickMargin={isMobile ? 10 : 15}
                          axisLine={{ stroke: '#e0e0e0' }}
                          tickLine={{ stroke: '#e0e0e0' }}
                          interval="preserveStartEnd"
                          minTickGap={15}
                          tickFormatter={(value, index) => {
                            // For mobile devices
                            if (isMobile) {
                              // Show only every Nth label when there are many entries
                              return chartData.length > 10 ? 
                                (index % 3 === 0 ? value : '') : 
                                (index % 2 === 0 ? value : '');
                            }
                            
                            // For desktop with many entries
                            if (chartData.length > 15) {
                              // Show just month and day
                              const date = new Date(chartData[index].date);
                              return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            } else if (chartData.length > 8) {
                              // Show simplified version
                              const parts = value.split(',');
                              return parts[0]; // Just the date part
                            } else {
                              // For fewer entries, ensure year is visible for entries from different years
                              const date = new Date(chartData[index].date);
                              const currentYear = new Date().getFullYear();
                              
                              // If entry is not from current year, show the year
                              if (date.getFullYear() !== currentYear) {
                                return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}`;
                              }
                            }
                            
                            // Default case for fewer entries from current year
                            return value;
                          }}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          tick={{ 
                            fontSize: isMobile ? 10 : 11, 
                            fontFamily: 'Poppins', 
                            fontWeight: 'medium' 
                          }}
                          tickCount={6}
                          axisLine={{ stroke: '#e0e0e0' }}
                          tickLine={{ stroke: '#e0e0e0' }}
                          width={isMobile ? 30 : 35}
                        />
                        <Tooltip content={<CustomTooltip />} />
                      
                        {/* Score ranges with gradient effect */}
                        <ReferenceArea y1={0} y2={50} fill="#ffcdd2" fillOpacity={0.5} />
                        <ReferenceArea y1={50} y2={70} fill="#fff9c4" fillOpacity={0.5} />
                        <ReferenceArea y1={70} y2={100} fill="#c8e6c9" fillOpacity={0.5} />
                      
                        {/* Division lines with subtle appearance */}
                        <ReferenceLine y={70} stroke="#9e9e9e" strokeDasharray="3 3" strokeOpacity={0.5} />
                        <ReferenceLine y={50} stroke="#9e9e9e" strokeDasharray="3 3" strokeOpacity={0.5} />
                      
                        <Line 
                          type="monotone" 
                          dataKey="comprehensive" 
                          stroke="#1056F5" 
                          strokeWidth={2.5}
                          dot={chartData.length > 20 ? false : { 
                            fill: '#1056F5', 
                            r: chartData.length > 12 ? 3 : 4,
                            strokeWidth: 0
                          }}
                          activeDot={{ 
                            r: 8,
                            strokeWidth: 2, 
                            stroke: '#fff',
                            fill: '#1056F5',
                            strokeOpacity: 0.8
                          }}
                          connectNulls={true}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Box sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'column',
                    p: 3,
                    backgroundColor: 'rgba(0, 0, 0, 0.01)',
                    borderRadius: 2
                  }}>
                    <Box 
                      component="img"
                      src="/images/no-data.svg"
                      alt="No data"
                      sx={{ 
                        width: { xs: 120, sm: 150 },
                        height: 'auto',
                        mb: 2,
                        opacity: 0.7
                      }}
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        // Fallback if image doesn't exist
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <Typography 
                      variant="h6" 
                      color="text.secondary" 
                      sx={{ 
                        fontFamily: 'Poppins', 
                        mb: 1,
                        textAlign: 'center',
                        fontWeight: 'medium'
                      }}
                    >
                      No progress data yet
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        fontFamily: 'Poppins',
                        textAlign: 'center',
                        maxWidth: '80%'
                      }}
                    >
                      Start creating journal entries to track your productivity progress over time.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => navigate('/journal')}
                      sx={{ 
                        mt: 3, 
                        fontFamily: 'Poppins',
                        textTransform: 'none'
                      }}
                    >
                      Create Journal Entry
                    </Button>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Recent Entries Section */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: isMobile ? 1.5 : 4, 
              height: '100%', 
              borderRadius: 2,
              position: 'relative',
              overflow: 'auto',
              boxShadow: isMobile ? 1 : 3
            }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3
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
                            <TableCell align="right" sx={{ 
                              fontFamily: 'Poppins', 
                              verticalAlign: 'middle',
                              padding: '8px 16px'
                            }}>
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => navigate(`/entry/${entry.id}`)}
                                sx={{
                                  minWidth: 'auto',
                                  p: { xs: '4px', sm: '4px 8px' },
                                  color: '#1056F5',
                                  '&:hover': {
                                    backgroundColor: 'rgba(16, 86, 245, 0.08)'
                                  }
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
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                    No entries available yet.
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ 
              p: isMobile ? (isExtraSmall ? 0.6 : 0.8) : { xs: 2, sm: 3, md: 4 }, 
              height: '100%',
              borderRadius: 2,
              position: 'relative',
              overflow: 'auto',
              boxShadow: isMobile ? 1 : 3
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  mb: { xs: isExtraSmall ? 0.2 : 0.3, sm: 1.5 }, 
                  fontWeight: 'bold', 
                  fontFamily: 'Poppins',
                  fontSize: { xs: '0.95rem', sm: '1.1rem', md: '1.25rem' },
                  textAlign: 'center'
                }}
              >
                Top Distractions
              </Typography>
              
              {entries && entries.length > 0 && distractionData.length > 0 ? (
                <Box sx={{ 
                  height: `calc(100% - 35px)`, 
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
                      height: { xs: '75%', sm: '70%' },
                      position: 'relative',
                      mx: 'auto',
                      width: '96%',
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
                    maxHeight: { xs: '25%', sm: '30%' },
                    fontSize: '0.7rem',
                    mx: 'auto',
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
          </Grid>
        </Grid>
      )}

      {/* Mobile fixed tooltip */}
      {isMobile && activeDataPoint && tooltipPosition && (
        <Box
          sx={{
            position: 'absolute',
            bottom: `calc(100% - ${tooltipPosition.y}px + 10px)`,
            left: tooltipPosition.x,
            transform: 'translateX(-50%)',
            zIndex: 100,
            maxWidth: '280px',
            width: '85%'
          }}
        >
          <Paper
            elevation={4}
            sx={{
              backgroundColor: 'white',
              padding: '10px 14px',
              border: '1px solid #f5f5f5',
              fontFamily: 'Poppins',
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
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
        </Box>
      )}
    </Container>
  );
};

export default JournalInsights;
