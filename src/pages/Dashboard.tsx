import React, { useState, useEffect } from 'react';
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
  ListItemText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import { useTask } from '../contexts/TaskContext';
import { JournalEntry } from '../services/journalService';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CoffeeIcon from '@mui/icons-material/Coffee';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssignmentIcon from '@mui/icons-material/Assignment';
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

const Dashboard: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { entries, refreshEntries, loading: journalLoading, error: journalError } = useJournal();
  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks } = useTask();
  const navigate = useNavigate();
  const [stats, setStats] = useState(initialStats);
  const [hasData, setHasData] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [distractionData, setDistractionData] = useState<DistractionData[]>([]);

  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          elevation={3}
          sx={{
            backgroundColor: 'white',
            padding: '10px 15px',
            border: '1px solid #f5f5f5',
            fontFamily: 'Poppins',
            minWidth: '200px'
          }}
        >
          <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', mb: 1 }}>
            {label}
          </Typography>
          <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: '#1056F5', fontWeight: 'medium', mb: 0.5 }}>
            Overall Score: {payload[0].value}%
          </Typography>
          <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: '#666' }}>
            Productivity: {payload[0].payload.productivity}%
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  // Custom tooltip for pie chart
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
            minWidth: '180px'
          }}
        >
          <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', fontWeight: 'medium', mb: 0.5 }}>
            {payload[0].name}
          </Typography>
          <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: '#666' }}>
            Frequency: {payload[0].value} {payload[0].value === 1 ? 'occurrence' : 'occurrences'}
          </Typography>
          {payload[0].payload && payload[0].payload.percentage && (
            <Typography sx={{ fontFamily: 'Poppins', fontSize: '0.9rem', color: '#666' }}>
              {payload[0].payload.percentage} of total
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
    }
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
      
      const journalStreakCount = calculateStreak();
      
      // Calculate comprehensive scores using the new scoring system
      const comprehensiveScores = entries.map(entry => calculateEntryScore(entry));
      const avgComprehensiveScore = Math.round(
        comprehensiveScores.reduce((sum, score) => sum + score, 0) / entries.length
      );
      
      setStats({
        averageScore: `${avgComprehensiveScore}%`,
        avgProductivity: Math.round(totalProductivity / entries.length),
        avgMeetingScore: meetingsEntries.length ? Math.round(totalMeetingScore / meetingsEntries.length) : 0,
        breakRate: `${Math.round((breakRateCount / entries.length) * 100)}%`,
        focusSuccess: `${Math.round((focusSuccessCount / entries.length) * 100)}%`,
        journalStreak: `${journalStreakCount} day${journalStreakCount !== 1 ? 's' : ''}`
      });

      // Process data for chart
      prepareChartData(entries);
      
      // Process distraction data
      processDistractionData(entries);
    }
  }, [entries]);

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
      const date = new Date(entry.date);
      
      // Format date to match "Mar 25, 9:02 AM" style
      const formattedDate = `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric'
      })}, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
      
      return {
        name: formattedDate,
        productivity: Math.round(entry.productivityScore * 10),
        comprehensive: calculateEntryScore(entry),
        date: date // Keep the Date object for sorting
      };
    });
    
    // Sort by date (newest first for the chart)
    processedData.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    setChartData(processedData);
  };

  const handleNewEntry = () => {
    navigate('/journal');
  };

  const handleRefresh = async () => {
    // Show refreshing state
    setIsRefreshing(true);
    
    try {
      // Use refreshEntries from JournalContext and refreshTasks from TaskContext
      await Promise.all([refreshEntries(), refreshTasks()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      // Hide refreshing state
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

  return (
    <Container sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
        >
          Your Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Worksheet button hidden for now 
          <Button 
            variant="outlined"
            onClick={() => navigate('/worksheet')}
            sx={{
              borderColor: '#1056F5',
              color: '#1056F5',
              fontFamily: 'Poppins',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#0D47D9',
                backgroundColor: '#f5f9ff',
              },
            }}
          >
            Worksheet
          </Button>
          */}
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

      {/* Show loading spinner while entries are loading */}
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
          {/* Quick Stats Section */}
          <Paper sx={{ p: 4, mb: 5, borderRadius: 2 }}>
            <Typography 
              variant="h6" 
              sx={{ mb: 3, fontWeight: 'bold', fontFamily: 'Poppins' }}
            >
              Quick Stats
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={6} sm={4} md={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Average Score
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                    {stats.averageScore}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Avg Productivity
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                    {stats.avgProductivity}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Avg Meeting Score
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                    {stats.avgMeetingScore}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Break Rate
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                    {stats.breakRate}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Focus Success
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                    {stats.focusSuccess}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 1 }}>
                    Journal Streak
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                    {stats.journalStreak}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Progress Graph Section */}
          <Paper sx={{ p: 4, mb: 5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
            <Box sx={{ height: 400, width: '100%', position: 'relative' }}>
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
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 10,
                      bottom: 80, // Increased bottom margin for labels
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} horizontal={true} stroke="#e0e0e0" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      tick={{ fontSize: 12, fontFamily: 'Poppins', fontWeight: 'medium' }}
                      height={90}
                      tickMargin={20}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickLine={{ stroke: '#e0e0e0' }}
                      interval={0} // Show all tick marks
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12, fontFamily: 'Poppins', fontWeight: 'medium' }}
                      tickCount={6}
                      axisLine={{ stroke: '#e0e0e0' }}
                      tickLine={{ stroke: '#e0e0e0' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                
                    {/* Color zones with increased opacity for better visibility */}
                    <ReferenceArea y1={0} y2={50} fill="#ffebee" fillOpacity={0.7} />
                    <ReferenceArea y1={50} y2={70} fill="#fff8e1" fillOpacity={0.7} />
                    <ReferenceArea y1={70} y2={100} fill="#e8f5e9" fillOpacity={0.7} />
                
                    {/* Horizontal reference lines */}
                    <ReferenceLine y={70} stroke="#e0e0e0" strokeDasharray="3 3" />
                    <ReferenceLine y={50} stroke="#e0e0e0" strokeDasharray="3 3" />
                
                    <Line 
                      type="monotone" 
                      dataKey="comprehensive" 
                      stroke="#1056F5" 
                      strokeWidth={2}
                      dot={{ 
                        fill: '#1056F5', 
                        r: 5 
                      }} 
                      activeDot={{ 
                        r: 7, 
                        strokeWidth: 1, 
                        stroke: '#fff' 
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                    No data available yet. Please create a journal entry.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Recent Entries Section */}
          <Grid container spacing={5}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 4, height: '100%', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}
                  >
                    Recent Entries
                  </Typography>
                  <Button 
                    onClick={() => navigate('/entries')}
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
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>DATE</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>Score</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>PRODUCTIVITY</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>MEETINGS</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>FOCUS TIME</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>BREAKS</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>SUPPORT</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>PLAN</TableCell>
                          <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {entries.slice(0, 6).map((entry, index) => (
                          <TableRow key={entry.id || index}>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              {new Date(entry.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric'
                              })}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              <Box sx={{ 
                                backgroundColor: '#1056F5', 
                                display: 'inline-block', 
                                px: 2,
                                py: 0.5, 
                                borderRadius: 16,
                                fontWeight: 'medium',
                                color: 'white'
                              }}>
                                {calculateEntryScore(entry)}%
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              <Box sx={{ 
                                backgroundColor: '#1056F5', 
                                display: 'inline-block',
                                px: 2,
                                py: 0.5,
                                borderRadius: 16,
                                fontWeight: 'medium',
                                color: 'white'
                              }}>
                                {entry.productivityScore}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              {entry.hadNoMeetings ? (
                                <Box sx={{ fontFamily: 'Poppins', color: '#666' }}>
                                  -
                                </Box>
                              ) : (
                                <Box sx={{ 
                                  backgroundColor: '#1056F5', 
                                  display: 'inline-block', 
                                  px: 2,
                                  py: 0.5, 
                                  borderRadius: 16,
                                  fontWeight: 'medium',
                                  color: 'white'
                                }}>
                                  {entry.meetingScore}
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              {entry.focusTime === 'Yes' || entry.focusTime === 'yes' ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                                  <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Yes
                                </Box>
                              ) : entry.focusTime === 'Partially' || entry.focusTime === 'partially' ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F29D38' }}>
                                  <CoffeeIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Partial
                                </Box>
                              ) : (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                                  <CloseIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> No
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              {entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes' ? (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                                  <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Yes
                                </Box>
                              ) : (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                                  <CloseIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> No
                                </Box>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              {entry.supportNeeded ? entry.supportNeeded.substring(0, 10) + (entry.supportNeeded.length > 10 ? '...' : '') : '-'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              {entry.improvementPlans ? entry.improvementPlans.substring(0, 10) + (entry.improvementPlans.length > 10 ? '...' : '') : '-'}
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                              <Button
                                onClick={() => handleViewEntry(index)}
                                sx={{ 
                                  fontFamily: 'Poppins', 
                                  textTransform: 'none', 
                                  color: '#1056F5',
                                  fontWeight: 'medium'
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
                ) : (
                  <Box sx={{ 
                    height: 150, 
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
            </Grid>
            <Grid item xs={12} md={5}>
              <Grid container direction="column" spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ 
                    p: 4, 
                    borderRadius: 2,
                    width: '100%',
                    height: '100%'  // Changed to 100% height to fill the space
                  }}>
                    <Typography 
                      variant="h6" 
                      sx={{ mb: 3, fontWeight: 'bold', fontFamily: 'Poppins' }}
                    >
                      Top Distractions
                    </Typography>
                    
                    {entries && entries.length > 0 ? (
                      <Box sx={{ height: 350, width: '100%' }}>  {/* Increased height for better visualization */}
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={distractionData}
                              cx="50%"
                              cy="45%"
                              labelLine={false}
                              outerRadius={90}  // Increased outer radius for better visualization
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
                            <Legend 
                              formatter={(value, entry) => {
                                const payload = entry && entry.payload;
                                if (payload && 'percentage' in payload) {
                                  return `${value}: ${payload.percentage}`;
                                }
                                return value;
                              }}
                              wrapperStyle={{
                                fontSize: '0.9rem',  // Increased font size
                                lineHeight: '1.5',   // Increased line height
                                paddingTop: '20px'   // Increased padding
                              }}
                              layout="horizontal"
                              align="center"
                              verticalAlign="bottom"
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    ) : (
                      <Box sx={{ 
                        height: 350,  // Increased height to match the chart height
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
 
                {/* Task Progress section hidden for now 
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      p: 4,
                      display: 'flex',
                      flexDirection: 'column',
                      height: 'fit-content',
                      bgcolor: 'white',
                      borderRadius: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <AssignmentIcon sx={{ mr: 1.5, color: 'primary.main', fontSize: 28 }} />
                      <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                        Task Progress
                      </Typography>
                    </Box>
                    {tasksLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : tasksError ? (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        py: 2 
                      }}>
                        <Typography variant="body1" color="error" sx={{ mb: 1 }}>
                          Error loading tasks
                        </Typography>
                        <Button 
                          onClick={refreshTasks}
                          variant="outlined"
                          size="small"
                        >
                          Retry
                        </Button>
                      </Box>
                    ) : tasks.length > 0 ? (
                      <>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <Box sx={{ position: 'relative', display: 'inline-flex', mr: 3 }}>
                            <CircularProgress
                              variant="determinate"
                              value={tasks.length > 0 ? (tasks.filter(t => t.completed === 1).length / tasks.length) * 100 : 0}
                              size={110}
                              thickness={4}
                              sx={{ color: 'primary.main' }}
                            />
                            <Box
                              sx={{
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Typography 
                                variant="h5" 
                                component="div" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontFamily: 'Poppins',
                                  color: 'primary.main'
                                }}
                              >
                                {tasks.length > 0 ? Math.round((tasks.filter(t => t.completed === 1).length / tasks.length) * 100) : 0}%
                              </Typography>
                            </Box>
                          </Box>
                          <Box>
                            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins', mb: 0.5 }}>
                              Completed Tasks
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
                              {tasks.filter(t => t.completed === 1).length}/{tasks.length}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ flexGrow: 1, mt: 1, mb: 1 }}>
                          <List sx={{ py: 1 }}>
                            {tasks.slice(0, 3).map((task) => (
                              <ListItem key={task.id} sx={{ px: 0, py: 1.5 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  <CheckCircleOutlineIcon
                                    sx={{
                                      color: task.completed === 1 ? 'primary.main' : 'text.disabled',
                                      fontSize: 24,
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText 
                                  primary={
                                    <Typography
                                      variant="body1"
                                      sx={{ 
                                        fontFamily: 'Poppins',
                                        fontSize: '1rem',
                                        textDecoration: task.completed === 1 ? 'line-through' : 'none',
                                        color: task.completed === 1 ? 'text.secondary' : 'text.primary',
                                      }}
                                    >
                                      {task.title}
                                    </Typography>
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                          {tasks.length > 3 && (
                            <Button
                              onClick={() => navigate('/tasks')}
                              sx={{ 
                                mt: 1,
                                color: 'primary.main',
                                fontFamily: 'Poppins',
                                textTransform: 'none',
                                fontWeight: 'medium'
                              }}
                            >
                              View all tasks
                            </Button>
                          )}
                        </Box>
                      </>
                    ) :
                      <>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'center',
                          mb: 4,
                          mt: 2
                        }}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            mr: 5
                          }}>
                            <Typography 
                              variant="h4" 
                              sx={{ 
                                fontWeight: 'bold',
                                fontFamily: 'Poppins',
                                color: 'primary.main',
                                textAlign: 'center'
                              }}
                            >
                              0%
                            </Typography>
                            <Typography 
                              variant="body1" 
                              color="text.secondary" 
                              sx={{ 
                                fontFamily: 'Poppins', 
                                textAlign: 'center',
                                mt: 0.5
                              }}
                            >
                              Progress
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center'
                          }}>
                            <Typography 
                              variant="h4" 
                              sx={{ 
                                fontWeight: 'bold',
                                fontFamily: 'Poppins',
                                color: 'text.primary',
                                textAlign: 'center'
                              }}
                            >
                              0/0
                            </Typography>
                            <Typography 
                              variant="body1" 
                              color="text.secondary" 
                              sx={{ 
                                fontFamily: 'Poppins', 
                                textAlign: 'center',
                                mt: 0.5
                              }}
                            >
                              Completed Tasks
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center', 
                          justifyContent: 'center',
                          pt: 1,
                          pb: 3
                        }}>
                          <Box sx={{ 
                            color: '#1056F5', 
                            opacity: 0.7, 
                            mb: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <AssignmentIcon sx={{ fontSize: 48 }} />
                          </Box>
                          <Typography 
                            color="text.secondary" 
                            sx={{ 
                              textAlign: 'center',
                              fontFamily: 'Poppins',
                              mb: 2
                            }}
                          >
                            No tasks added yet
                          </Typography>
                          <Button 
                            variant="outlined"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => navigate('/tasks')}
                            sx={{ 
                              color: '#1056F5',
                              borderColor: '#1056F5',
                              fontFamily: 'Poppins',
                              textTransform: 'none'
                            }}
                          >
                            Add a Task
                          </Button>
                        </Box>
                      </>
                    )}
                  </Paper>
                </Grid>
                */}
              </Grid>
            </Grid>
          </Grid>

          {/* All Reflections Section */}
          <Box sx={{ mt: 5 }}>
            <Typography 
              variant="h6" 
              sx={{ mb: 3, fontWeight: 'bold', fontFamily: 'Poppins' }}
            >
              All Reflections
            </Typography>
            
            {entries && entries.length > 0 ? (
              <TableContainer component={Paper} sx={{ borderRadius: 2, p: 1 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Date</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Score</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Meeting Score</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Focus Time</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Breaks Taken</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Support Needed</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}>Improvement Plan</TableCell>
                      <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium' }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {entries.map((entry, index) => (
                      <TableRow key={entry.id || index}>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          {new Date(entry.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          <Box sx={{ 
                            backgroundColor: '#1056F5', 
                            display: 'inline-block', 
                            px: 2,
                            py: 0.5, 
                            borderRadius: 16,
                            fontWeight: 'medium',
                            color: 'white'
                          }}>
                            {calculateEntryScore(entry)}%
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          {entry.hadNoMeetings ? (
                            <Box sx={{ fontFamily: 'Poppins', color: '#666' }}>
                              -
                            </Box>
                          ) : (
                            <Box sx={{ 
                              backgroundColor: '#1056F5', 
                              display: 'inline-block', 
                              px: 2,
                              py: 0.5, 
                              borderRadius: 16,
                              fontWeight: 'medium',
                              color: 'white'
                            }}>
                              {entry.meetingScore}
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          {entry.focusTime === 'Yes' || entry.focusTime === 'yes' ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                              <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Yes
                            </Box>
                          ) : entry.focusTime === 'Partially' || entry.focusTime === 'partially' ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F29D38' }}>
                              <CoffeeIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Partial
                            </Box>
                          ) : (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                              <CloseIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> No
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          {entry.breaksTaken === 'Yes' || entry.breaksTaken === 'yes' ? (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                              <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Yes
                            </Box>
                          ) : (
                            <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                              <CloseIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> No
                            </Box>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          {entry.supportNeeded || '-'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          {entry.improvementPlans || '-'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                          <Button
                            onClick={() => handleViewEntry(index)}
                            sx={{ 
                              fontFamily: 'Poppins', 
                              textTransform: 'none', 
                              color: '#1056F5',
                              fontWeight: 'medium'
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
            ) : (
              <Paper sx={{ p: 4, borderRadius: 2 }}>
                <Box sx={{ 
                  height: 100, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center'
                }}>
                  <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
                    No reflections data to display.
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        </>
      )}
    </Container>
  );
};

export default Dashboard; 