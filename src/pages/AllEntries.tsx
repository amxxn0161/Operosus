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
  TablePagination
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import CoffeeIcon from '@mui/icons-material/Coffee';

const AllEntries: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { entries, loading, error, refreshEntries } = useJournal();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    // Refresh entries from API when component mounts
    // Using refreshEntries only on mount and not in the dependency array
    // to prevent infinite refreshing
    refreshEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]); // Removed refreshEntries from dependencies

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewEntry = (entry: any) => {
    // Navigate to the entry detail page using the entry's ID
    navigate(`/entry/${entry.id}`);
  };

  // Reset page when entries change
  useEffect(() => {
    setPage(0);
  }, [entries.length]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontFamily: 'Poppins' }}>
          All Journal Entries
        </Typography>
        <Button 
          variant="outlined"
          onClick={() => navigate('/dashboard')}
          sx={{ fontFamily: 'Poppins', textTransform: 'none' }}
        >
          Back to Dashboard
        </Button>
      </Box>

      <Paper sx={{ p: 4, borderRadius: 2 }}>
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
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>DATE</TableCell>
                    <TableCell sx={{ fontFamily: 'Poppins', fontWeight: 'medium', color: '#666' }}>SCORE</TableCell>
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
                  {entries
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((entry, index) => (
                    <TableRow key={entry.id || index}>
                      <TableCell sx={{ fontFamily: 'Poppins', verticalAlign: 'middle' }}>
                        {entry.date}
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
                          {Math.round(entry.productivityScore * 10)}%
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
                          onClick={() => handleViewEntry(entry)}
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
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={entries.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ fontFamily: 'Poppins' }}
            />
          </>
        ) : (
          <Box sx={{ 
            height: 200, 
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
    </Container>
  );
};

export default AllEntries; 