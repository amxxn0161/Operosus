import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Container,
  Button,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  Chip,
  Avatar,
  useMediaQuery,
  useTheme,
  Tooltip,
  IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeIcon from '@mui/icons-material/Coffee';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// Type for the admin journal entry based on the API response
interface AdminJournalEntry {
  id: number;
  user_id: number;
  date: string;
  productivityScore: number;
  meetingScore: number | null;
  hadNoMeetings: number;
  breaksTaken: string;
  focusTime: string;
  supportNeeded: string | null;
  improvementPlans: string | null;
  distractions: string[];
  timestamp: string;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

const AdminJournal: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [entries, setEntries] = useState<AdminJournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isExtraSmall = useMediaQuery('(max-width:400px)');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Check if user is admin - only allow specific email addresses
    const userEmail = localStorage.getItem('userEmail');
    const isAdminUser = Boolean(userEmail && (
      userEmail === 'dc@operosus.com' || 
      userEmail === 'as@operosus.com'
    ));
    
    // Redirect to dashboard if not an admin
    if (!isAdminUser) {
      navigate('/dashboard');
      return;
    }
    
    // Fetch admin journal entries
    const fetchAdminEntries = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://app2.operosus.com/api/productivity/admin', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch admin entries: ${response.status}`);
        }
        
        const data = await response.json();
        setEntries(data);
      } catch (err) {
        console.error('Error fetching admin journal entries:', err);
        setError('Failed to load admin journal entries. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAdminEntries();
  }, [isAuthenticated, navigate]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const formatDate = (dateString: string) => {
    // Remove the "2025-" prefix if it exists (placeholder future dates)
    const cleanDate = dateString.replace('2025-', '');
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Create a color from a string (user ID)
  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
  };

  // Add function to view entry details
  const handleViewEntry = (entry: AdminJournalEntry) => {
    // Store entry in localStorage so EntryDetail can access it immediately
    try {
      console.log('Storing admin entry in localStorage:', entry);
      localStorage.setItem('currentAdminEntry', JSON.stringify(entry));
      
      // Navigate to the entry detail page using the entry's ID
      navigate(`/entry/${entry.id}`);
    } catch (err) {
      console.error('Error storing admin entry:', err);
      // Still try to navigate even if localStorage fails
      navigate(`/entry/${entry.id}`);
    }
  };

  // Reset page when entries change
  useEffect(() => {
    setPage(0);
  }, [entries.length]);

  // Function to sort entries by date
  const getSortedEntries = () => {
    return [...entries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' }, 
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: 4,
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold', 
            fontFamily: 'Poppins',
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' }
          }}
        >
          Admin Journal Entries
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            startIcon={<ArrowBackIcon />}
            sx={{ 
              fontFamily: 'Poppins', 
              textTransform: 'none',
              whiteSpace: 'nowrap'
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
              Loading entries...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Typography variant="body1" color="error" sx={{ fontFamily: 'Poppins' }}>
              {error}
            </Typography>
          </Box>
        ) : entries.length > 0 ? (
          <>
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
              <Table size={isMobile ? "small" : "medium"}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>USER</TableCell>
                    <TableCell 
                      onClick={toggleSortOrder}
                      sx={{ 
                        fontFamily: 'Poppins', 
                        fontWeight: 'medium', 
                        color: '#666',
                        cursor: 'pointer',
                        userSelect: 'none',
                        '&:hover': {
                          color: '#1056F5'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        DATE
                        {sortOrder === 'newest' ? 
                          <ArrowDownwardIcon fontSize="small" sx={{ fontSize: '1rem' }} /> : 
                          <ArrowUpwardIcon fontSize="small" sx={{ fontSize: '1rem' }} />
                        }
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>SCORE</TableCell>
                    <TableCell align="center" sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666', display: { xs: 'none', md: 'table-cell' } }}>MEETINGS</TableCell>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666', display: { xs: 'none', md: 'table-cell' } }}>FOCUS</TableCell>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666', display: { xs: 'none', md: 'table-cell' } }}>BREAKS</TableCell>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666', display: { xs: 'none', lg: 'table-cell' } }}>DISTRACTIONS</TableCell>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getSortedEntries()
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((entry, index) => (
                    <TableRow 
                      key={entry.id || index} 
                      hover
                      sx={{ 
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar 
                            sx={{ 
                              bgcolor: stringToColor(entry.user.id.toString()),
                              width: 36,
                              height: 36,
                              mr: 1.5,
                              fontSize: '0.9rem'
                            }}
                          >
                            {getInitials(entry.user.name)}
                          </Avatar>
                          <Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'medium',
                                display: { xs: 'none', sm: 'block' }
                              }}
                            >
                              {entry.user.name}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ 
                                display: { xs: 'none', md: 'block' },
                                fontSize: '0.75rem'
                              }}
                            >
                              {entry.user.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {formatDate(entry.date)}
                      </TableCell>

                      <TableCell align="center" sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                        <Chip
                          label={`${entry.productivityScore}/10`}
                          size="small"
                          sx={{ 
                            fontWeight: 'medium',
                            backgroundColor: '#1056F5',
                            color: 'white'
                          }}
                        />
                      </TableCell>

                      <TableCell align="center" sx={{ fontFamily: 'Poppins', verticalAlign: 'middle', display: { xs: 'none', md: 'table-cell' } }}>
                        {entry.hadNoMeetings ? (
                          <Typography variant="body2" color="text.secondary">
                            No meetings
                          </Typography>
                        ) : (
                          <Chip
                            label={`${entry.meetingScore}/10`}
                            size="small"
                            sx={{ 
                              fontWeight: 'medium', 
                              backgroundColor: '#1056F5',
                              color: 'white'
                            }}
                          />
                        )}
                      </TableCell>

                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle', display: { xs: 'none', md: 'table-cell' } }}>
                        {entry.focusTime === 'Yes' ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                            <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Yes
                          </Box>
                        ) : entry.focusTime === 'Partially' ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F29D38' }}>
                            <CoffeeIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Partial
                          </Box>
                        ) : (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                            <CloseIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> No
                          </Box>
                        )}
                      </TableCell>

                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle', display: { xs: 'none', md: 'table-cell' } }}>
                        {entry.breaksTaken === 'Yes' ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#4CAF50' }}>
                            <CheckCircleIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> Yes
                          </Box>
                        ) : (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', color: '#F44336' }}>
                            <CloseIcon sx={{ mr: 0.5, fontSize: '1rem' }} /> No
                          </Box>
                        )}
                      </TableCell>

                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle', display: { xs: 'none', lg: 'table-cell' } }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {entry.distractions && entry.distractions.length > 0 ? (
                            entry.distractions.map((distraction, i) => (
                              <Chip
                                key={i}
                                label={distraction}
                                size="small"
                                sx={{ 
                                  fontSize: '0.7rem',
                                  height: '24px',
                                  backgroundColor: 'rgba(0, 0, 0, 0.08)'
                                }}
                              />
                            ))
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              None reported
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      
                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle', padding: { xs: '8px 4px', sm: '16px' } }}>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewEntry(entry);
                          }}
                          size="small"
                          sx={{ 
                            fontFamily: 'Poppins', 
                            textTransform: 'none', 
                            color: '#1056F5',
                            fontWeight: 'medium',
                            minWidth: { xs: '40px', sm: '64px' },
                            px: { xs: 1, sm: 2 }
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
            <TablePagination
              component="div"
              count={entries.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
              sx={{ fontFamily: 'Poppins' }}
            />
          </>
        ) : (
          <Box sx={{ 
            height: 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}>
            <Typography variant="body1" color="text.secondary" sx={{ fontFamily: 'Poppins' }}>
              No journal entries found
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AdminJournal; 