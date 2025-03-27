import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  fetchJournalEntries, 
  saveJournalEntry, 
  deleteJournalEntry, 
  JournalEntry 
} from '../services/journalService';
import { useAuth } from './AuthContext';

interface JournalContextType {
  entries: JournalEntry[];
  loading: boolean;
  error: string | null;
  refreshEntries: () => Promise<void>;
  saveEntry: (entry: Partial<JournalEntry>) => Promise<JournalEntry | null>;
  deleteEntry: (entryId: number) => Promise<boolean>;
}

const JournalContext = createContext<JournalContextType | undefined>(undefined);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (context === undefined) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
};

interface JournalProviderProps {
  children: ReactNode;
}

export const JournalProvider: React.FC<JournalProviderProps> = ({ children }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const refreshEntries = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      setError(null);
      const journalEntries = await fetchJournalEntries();
      setEntries(journalEntries);
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      setError('Failed to load journal entries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (entry: Partial<JournalEntry>) => {
    try {
      const savedEntry = await saveJournalEntry(entry);
      if (savedEntry) {
        // If it's an update, replace the old entry
        if (entry.id) {
          setEntries(prevEntries => 
            prevEntries.map(e => e.id === entry.id ? savedEntry : e)
          );
        } 
        // If it's a new entry, add it to the list
        else {
          setEntries(prevEntries => [...prevEntries, savedEntry]);
        }
      }
      return savedEntry;
    } catch (err) {
      console.error('Error saving journal entry:', err);
      setError('Failed to save journal entry. Please try again.');
      return null;
    }
  };

  const deleteEntry = async (entryId: number) => {
    try {
      setError(null);
      const success = await deleteJournalEntry(entryId);
      
      if (success) {
        // Remove the deleted entry from state
        setEntries(prevEntries => prevEntries.filter(entry => entry.id !== entryId));
        return true;
      } else {
        setError('Failed to delete journal entry. Please try again.');
        return false;
      }
    } catch (err) {
      console.error('Error deleting journal entry:', err);
      setError('Failed to delete journal entry. Please try again.');
      return false;
    }
  };

  // Load entries when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshEntries();
    }
  }, [isAuthenticated]);

  const value = {
    entries,
    loading,
    error,
    refreshEntries,
    saveEntry,
    deleteEntry
  };

  return (
    <JournalContext.Provider value={value}>
      {children}
    </JournalContext.Provider>
  );
};

export default JournalContext; 