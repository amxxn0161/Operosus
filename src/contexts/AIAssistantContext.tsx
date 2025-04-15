import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
// Remove useLocation import
// import { useLocation } from 'react-router-dom';
import { Message, sendAssistantMessage } from '../services/assistantService';

interface ScreenContext {
  currentPath: string;
  currentComponent: string;
  currentData?: any;
  journalEntries?: any[]; // Store journal entries
  journalStats?: {
    totalEntries: number;
    latestEntry: any;
    avgProductivity: number;
    distractionCounts: Record<string, number>;
    mostProductiveEntry?: any;
  };
}

interface AIAssistantContextType {
  isOpen: boolean;
  messages: Message[];
  isLoading: boolean;
  screenContext: ScreenContext;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  updateScreenContext: (context: Partial<ScreenContext>) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};

interface AIAssistantProviderProps {
  children: ReactNode;
}

// Comprehensive system prompt with app knowledge
const APP_KNOWLEDGE = `
You are Pulse Assistant, an AI helper embedded in the Productivity Pulse app. The app helps users track productivity, manage tasks, and maintain a work journal.

## App Structure:
- Dashboard: Overview of productivity metrics, journal streak, and charts
- Journal: For creating daily journal entries about productivity
- Tasks: Task management with priorities and due dates
- All Entries: View all previous journal entries

## How to Use Features:

### Journal Entries:
To create a new journal entry:
1. Navigate to the Journal page from the Dashboard
2. Fill in the date (defaults to today)
3. Rate your productivity on a scale of 1-10
4. Answer questions about meetings, breaks, and focus time
5. Select any distractions you experienced
6. Add notes about improvements and support needed
7. Submit the entry

### Tasks:
To add a new task:
1. Go to the Tasks page
2. Click the "Add Task" button
3. Enter task title, description, priority, and due date
4. Save the task

### Viewing Past Entries:
1. Go to "All Entries" from the Dashboard
2. Browse through your past journal entries
3. Click on any entry to view details

### AI Assistant (that's me!):
- I'm available throughout the app via the button in the bottom-right corner
- I can answer questions about productivity and app usage
- I adapt my responses based on your current location in the app

## Tips:
- Maintain a daily journaling habit for the most accurate productivity insights
- Use the focus timer feature to improve concentration
- Review your productivity charts weekly to identify patterns
`;

// Helper function to format date for display
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

// Helper function to calculate a score for an entry
const calculateEntryScore = (entry: any): number => {
  if (!entry) return 0;
  
  let totalPoints = 0;
  let maxPossiblePoints = 40; // Default maximum
  
  // Productivity score (1-10 points)
  totalPoints += entry.productivityScore || 0;
  
  // Meeting score (0-10 points)
  if (entry.hadNoMeetings) {
    maxPossiblePoints = 30; // Reduce maximum if no meetings
  } else if (entry.meetingScore !== null) {
    totalPoints += entry.meetingScore || 0;
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

// Helper function to determine if a query should bypass local processing and go straight to OpenAI
const shouldUseOpenAI = (query: string): boolean => {
  // Normalize query
  const normalizedQuery = query.toLowerCase().trim();
  console.log('Checking if query should use OpenAI:', normalizedQuery);
  
  // Check for direct phrases that almost certainly need AI
  if (
    normalizedQuery.includes('can you suggest') || 
    normalizedQuery.includes('what are some strategies') || 
    normalizedQuery.includes('how can i improve') ||
    normalizedQuery.includes('what techniques')
  ) {
    console.log('Direct match for AI query detected');
    return true;
  }
  
  // Keywords that suggest we need analysis, suggestions, or advice (better suited for OpenAI)
  const complexQueryIndicators = [
    'suggest', 'recommend', 'advice', 'help me', 'how can i', 'how should i',
    'what are some', 'strategies', 'techniques', 'improve', 'optimize',
    'explain why', 'analyze', 'evaluate', 'compare', 'difference between',
    'best way to', 'most effective', 'plan for', 'approach to', 'ways to'
  ];
  
  // Check if query contains any complex indicators
  const containsComplexIndicator = complexQueryIndicators.some(indicator => {
    const hasIndicator = normalizedQuery.includes(indicator);
    if (hasIndicator) {
      console.log('Complex indicator found:', indicator);
    }
    return hasIndicator;
  });
  
  // Also check if it's a question that requires reasoning
  const isReasoningQuestion = 
    (normalizedQuery.includes('why') && !normalizedQuery.includes('why did i')) || 
    normalizedQuery.includes('how come') || 
    normalizedQuery.includes('what if');
    
  if (isReasoningQuestion) {
    console.log('Reasoning question detected');
  }
  
  return containsComplexIndicator || isReasoningQuestion;
};

// Function to generate local responses based on screen context
const generateLocalResponse = (query: string, context: ScreenContext): string | null => {
  // Check if this is a complex query that should be handled by OpenAI
  if (shouldUseOpenAI(query)) {
    console.log('Query identified as complex in generateLocalResponse - returning null to use OpenAI');
    return null;
  }

  // Normalize the query to lowercase for easier matching
  const normalizedQuery = query.toLowerCase().trim();
  
  // Extract relevant data from context
  const { currentComponent, currentData, journalEntries, journalStats } = context;
  
  // Handle direct journal-related questions regardless of current component
  if (journalEntries && journalEntries.length > 0) {
    // First, determine the current user's ID dynamically
    let currentUserId: number | null = null;
    
    // Try to get current user ID from context data
    if (currentData?.user?.id) {
      currentUserId = currentData.user.id;
      console.log(`Found user ID ${currentUserId} from currentData.user`);
    } 
    // Try from latest entry if available
    else if (journalEntries[0]?.user?.id) {
      currentUserId = journalEntries[0].user.id;
      console.log(`Found user ID ${currentUserId} from latest journal entry`);
    }
    // Try from any of the entries (assuming user has at least one entry)
    else {
      // Find any entry with user information
      for (const entry of journalEntries) {
        if (entry.user && entry.user.id) {
          currentUserId = entry.user.id;
          console.log(`Found user ID ${currentUserId} from journal entries`);
          break;
        }
      }
    }
    
    console.log(`Current user ID determined to be: ${currentUserId || 'unknown'}`);
    
    // Filter entries to only include the current user's entries, if we know who the user is
    const userEntries = currentUserId 
      ? journalEntries.filter(entry => entry.user_id === currentUserId)
      : journalEntries;
      
    console.log(`Filtered to ${userEntries.length} entries ${currentUserId ? `for user ID ${currentUserId}` : '(no user filtering applied)'}`);
    
    // Use filtered entries if available, otherwise fall back to all entries
    const entriesForUser = userEntries.length > 0 ? userEntries : journalEntries;
    
    // Questions about the last/latest journal entry
    if (normalizedQuery.includes('last journal entry') || 
        normalizedQuery.includes('latest entry') || 
        normalizedQuery.includes('most recent entry') ||
        normalizedQuery.match(/what was my (last|latest|recent|previous) (journal )?(entry|reflection)/i)) {
      
      // Sort by created_at timestamp to ensure most recent first
      const sortedEntries = [...entriesForUser].sort((a, b) => {
        // Try created_at first (most reliable server timestamp)
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // Fall back to timestamp if created_at not available
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        // Last resort, use date field
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      console.log('Sorted entries by timestamp (newest first):', sortedEntries.map((e: any) => 
        `ID: ${e.id}, Date: ${e.date}, Created: ${e.created_at?.substring(0, 10)}`).slice(0, 3));
      
      const latestEntry = sortedEntries[0]; // First entry should be the latest after sorting
      console.log('Latest entry:', latestEntry ? 
        `ID: ${latestEntry.id}, Date: ${latestEntry.date}, Created: ${latestEntry.created_at?.substring(0, 10)}` : 
        'No entry found');
        
      const score = calculateEntryScore(latestEntry);
      
      // Format the response
      const breakStatus = latestEntry.breaksTaken === 'Yes' ? 'You took breaks' : 
                          (latestEntry.breaksTaken === 'No' ? 'You didn\'t take breaks' : 'Break status not recorded');
      const focusStatus = latestEntry.focusTime === 'Yes' ? 'successfully completed' : 
                         (latestEntry.focusTime === 'Partially' ? 'partially completed' : 
                         (latestEntry.focusTime === 'No' ? 'didn\'t complete' : 'focus time not recorded'));
      
      // Enhance the response with support and improvement plans if available
      const supportInfo = latestEntry.supportNeeded ? `\nSupport needed: "${latestEntry.supportNeeded}"` : '';
      const improvementInfo = latestEntry.improvementPlans ? `\nImprovement plans: "${latestEntry.improvementPlans}"` : '';
      
      return `Your most recent journal entry was on ${formatDate(latestEntry.date)}. 
You rated your productivity as ${latestEntry.productivityScore}/10, and your overall score was ${score}%. 
${breakStatus} and ${focusStatus} your focus time.
${latestEntry.distractions && latestEntry.distractions.length > 0 ? `Distractions: ${latestEntry.distractions.join(', ')}` : 'You didn\'t report any distractions.'}${supportInfo}${improvementInfo}`;
    }
    
    // Questions about average productivity score
    if (normalizedQuery.includes('average productivity') || 
        normalizedQuery.match(/what('s| is) my (average|overall) productivity/)) {
      
      const avgProd = journalStats?.avgProductivity || 
                     (entriesForUser.reduce((sum, entry) => sum + entry.productivityScore, 0) / entriesForUser.length).toFixed(1);
      
      return `Your average productivity score is ${avgProd} out of 10, based on ${entriesForUser.length} journal entries.`;
    }
    
    // Questions about number of journal entries
    if (normalizedQuery.includes('how many journal entries') || 
        normalizedQuery.includes('number of entries') || 
        normalizedQuery.includes('entry count')) {
      
      return `You have recorded ${entriesForUser.length} journal entries so far. Your most recent entry was on ${formatDate(entriesForUser[0].date)}.`;
    }
    
    // Questions about common distractions
    if (normalizedQuery.includes('common distraction') || 
        normalizedQuery.includes('what distract') || 
        normalizedQuery.includes('my distraction')) {
      
      // Count occurrences of each distraction if not already counted
      const distractionCounts = journalStats?.distractionCounts || {};
      if (Object.keys(distractionCounts).length === 0 && entriesForUser.length > 0) {
        entriesForUser.forEach(entry => {
          if (entry.distractions && entry.distractions.length) {
            entry.distractions.forEach((d: string) => {
              const cleanDistraction = d.replace(/\\\//g, '/');
              distractionCounts[cleanDistraction] = (distractionCounts[cleanDistraction] || 0) + 1;
            });
          }
        });
      }
      
      // Sort distractions by frequency
      const sortedDistractions = Object.entries(distractionCounts)
        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
        .map(([name, count]) => ({ name, count }));
      
      if (sortedDistractions.length > 0) {
        const topDistractions = sortedDistractions.slice(0, 3);
        return `Based on your journal entries, your most common distractions are: ${topDistractions.map(d => `${d.name} (${d.count} occurrences)`).join(', ')}. These distractions tend to reduce your productivity score.`;
      } else {
        return `You haven't recorded any specific distractions in your journal entries yet.`;
      }
    }
    
    // Questions about most productive day
    if (normalizedQuery.includes('most productive') || 
        normalizedQuery.includes('highest productivity') ||
        normalizedQuery.includes('best productivity')) {
      
      // Find the entry with the highest productivity score if not already found
      const mostProductiveEntry = journalStats?.mostProductiveEntry ||
        entriesForUser.reduce((mostProd, entry) => 
          entry.productivityScore > (mostProd?.productivityScore || 0) ? entry : mostProd, null);
      
      if (mostProductiveEntry) {
        return `Your most productive day was ${formatDate(mostProductiveEntry.date)} with a productivity score of ${mostProductiveEntry.productivityScore}/10. ${mostProductiveEntry.breaksTaken === 'Yes' ? 'You took breaks' : 'You didn\'t take breaks'} and ${mostProductiveEntry.focusTime === 'Yes' ? 'successfully completed' : mostProductiveEntry.focusTime === 'Partially' ? 'partially completed' : 'didn\'t complete'} your focus time.`;
      } else {
        return `I couldn't determine your most productive day from your journal entries.`;
      }
    }
  }
  
  // Handle Dashboard-specific questions
  if (currentComponent === 'Dashboard') {
    // Check if we have metrics data
    if (currentData?.metricsOverview) {
      const metrics = currentData.metricsOverview;
      
      // Debug: Log the metrics data to see its structure
      console.log('Metrics data structure:', JSON.stringify(metrics));
      
      // Questions about average score
      if (normalizedQuery.includes('average score') || normalizedQuery.match(/what('s| is) my (average|overall) score/)) {
        // Try different possible property names but with NO hardcoded fallbacks
        const averageScoreValue = metrics.averageScore || metrics.avgScore || metrics.avgComprehensiveScore;
        
        // If no value was found, tell the user we couldn't find the data
        if (averageScoreValue === undefined) {
          return `I can see your dashboard, but I couldn't find your average score in the data. The value shown on screen should be accurate, but I can't access it programmatically at the moment.`;
        }
        
        return `Your average comprehensive score is ${averageScoreValue}, which is calculated based on all factors including productivity, meetings, breaks, and focus time.`;
      }
      
      // Questions about productivity
      if (normalizedQuery.includes('productivity') || normalizedQuery.includes('productive')) {
        // Try different property names without hardcoded fallbacks
        const prodValue = metrics.avgProductivity || metrics.productivityAvg;
        
        if (prodValue === undefined) {
          return `I can see you have productivity data on your dashboard, but I couldn't access the exact value programmatically. Please refer to the value shown on your screen.`;
        }
        
        return `Your average productivity rating is ${prodValue} out of 10. This is based solely on your self-reported productivity ratings.`;
      }
      
      // Questions about meetings
      if (normalizedQuery.includes('meeting')) {
        const meetingValue = metrics.avgMeetingScore || metrics.meetingScoreAvg;
        
        if (meetingValue === undefined) {
          return `I can see you have meeting score data on your dashboard, but I couldn't access the exact value programmatically. Please refer to the value shown on your screen.`;
        }
        
        return `Your average meeting effectiveness score is ${meetingValue} out of 10. This reflects how effective you rated your meetings.`;
      }
      
      // Questions about breaks
      if (normalizedQuery.includes('break')) {
        const breakValue = metrics.breakRate || metrics.breakPercentage;
        
        if (breakValue === undefined) {
          return `I can see you have break rate data on your dashboard, but I couldn't access the exact value programmatically. Please refer to the value shown on your screen.`;
        }
        
        return `Your break rate is ${breakValue}%, which means you took breaks ${breakValue}% of the time. Taking regular breaks is important for maintaining productivity.`;
      }
      
      // Questions about focus
      if (normalizedQuery.includes('focus')) {
        const focusValue = metrics.focusSuccess || metrics.focusRate;
        
        if (focusValue === undefined) {
          return `I can see you have focus success data on your dashboard, but I couldn't access the exact value programmatically. Please refer to the value shown on your screen.`;
        }
        
        return `Your focus success rate is ${focusValue}%, which means you successfully completed your planned focus time ${focusValue}% of the time.`;
      }
      
      // Questions about streak
      if (normalizedQuery.includes('streak') || normalizedQuery.includes('consecutive')) {
        const streakValue = metrics.journalStreak || metrics.streak;
        
        if (streakValue === undefined) {
          return `I can see you have streak data on your dashboard, but I couldn't access the exact value programmatically. Please refer to the value shown on your screen.`;
        }
        
        return `Your current journal streak is ${streakValue} consecutive day${streakValue !== 1 ? 's' : ''} with entries. Keep it up!`;
      }
      
      // Questions about the overall metrics or dashboard
      if (normalizedQuery.includes('stats') || normalizedQuery.includes('dashboard') || normalizedQuery.includes('metrics')) {
        // Only include metrics that actually exist in the data
        let response = `Here's an overview of your productivity metrics:\n`;
        
        // Try different property names with no hardcoded fallbacks
        const avgScore = metrics.averageScore || metrics.avgScore || metrics.avgComprehensiveScore;
        const prodValue = metrics.avgProductivity || metrics.productivityAvg;
        const meetingValue = metrics.avgMeetingScore || metrics.meetingScoreAvg;
        const breakValue = metrics.breakRate || metrics.breakPercentage;
        const focusValue = metrics.focusSuccess || metrics.focusRate;
        const streakValue = metrics.journalStreak || metrics.streak;
        
        // Only add lines for metrics we can access
        if (avgScore !== undefined) response += `- Average Score: ${avgScore}\n`;
        if (prodValue !== undefined) response += `- Productivity: ${prodValue}/10\n`;
        if (meetingValue !== undefined) response += `- Meeting Score: ${meetingValue}/10\n`;
        if (breakValue !== undefined) response += `- Break Rate: ${breakValue}%\n`;
        if (focusValue !== undefined) response += `- Focus Success: ${focusValue}%\n`;
        if (streakValue !== undefined) response += `- Journal Streak: ${streakValue} day${streakValue !== 1 ? 's' : ''}\n`;
        
        // If we couldn't access any metrics
        if (response === `Here's an overview of your productivity metrics:\n`) {
          return `I can see your dashboard with metrics, but I couldn't access the specific values programmatically. Please refer to the values shown on your screen.`;
        }
        
        return response;
      }
      
      // Questions about pending tasks
      if (normalizedQuery.includes('task') || normalizedQuery.includes('todo') || normalizedQuery.includes('to do')) {
        const pendingTasks = currentData.pendingTasks;
        
        if (pendingTasks === undefined) {
          return `I couldn't access your pending tasks count programmatically. You can check your tasks on the Tasks page.`;
        }
        
        return `You currently have ${pendingTasks} pending tasks. You can manage them on the Tasks page.`;
      }
    } else {
      // No change to this part - keep the message for when metrics data isn't available
      if (normalizedQuery.includes('score') || 
          normalizedQuery.includes('productivity') || 
          normalizedQuery.includes('meeting') || 
          normalizedQuery.includes('break') || 
          normalizedQuery.includes('focus') || 
          normalizedQuery.includes('streak') || 
          normalizedQuery.includes('stats') || 
          normalizedQuery.includes('dashboard') || 
          normalizedQuery.includes('metrics')) {
        
        return `I'm sorry, but I can't access your current metrics data at the moment. Please refresh the dashboard to load your latest productivity data, and I'll be able to provide you with accurate information.`;
      }
    }
  }
  
  // Handle Journal-specific questions
  if (currentComponent === 'Journal') {
    if (normalizedQuery.includes('how to') || normalizedQuery.includes('create') || normalizedQuery.includes('new entry') || normalizedQuery.match(/how (do|can) i (make|add|create)/)) {
      return `To create a new journal entry:
1. Fill in the date (defaults to today)
2. Rate your productivity on a scale of 1-10
3. Indicate if you had meetings and rate their effectiveness
4. Specify whether you took breaks
5. Rate if you completed your planned focus time
6. Select any distractions you experienced
7. Add notes about support needed and improvement plans
8. Click "Save Reflection" to submit your entry`;
    }
    
    if (currentData?.formType === 'journalEntry' && currentData?.formData) {
      const formData = currentData.formData;
      if (normalizedQuery.includes('current entry') || normalizedQuery.includes('what did i enter')) {
        return `For your current journal entry, you've entered:
- Productivity score: ${formData.productivityScore}/10
- Meeting score: ${formData.hadNoMeetings ? 'No meetings today' : formData.meetingScore + '/10'}
- Breaks: ${formData.breaksTaken}
- Focus time: ${formData.focusTime}
- Distractions: ${formData.distractions?.length ? formData.distractions.join(', ') : 'None selected'}`;
      }
    }
  }
  
  // Questions about journal entries across any page
  if (journalEntries && journalEntries.length > 0) {
    // Sort entries by date and timestamp (most recent first)
    const sortedEntries = [...journalEntries].sort((a, b) => {
      // Check created_at first (server timestamp)
      if (a.created_at && b.created_at) {
        const createdAtA = new Date(a.created_at);
        const createdAtB = new Date(b.created_at);
        if (createdAtA > createdAtB) return -1;
        if (createdAtA < createdAtB) return 1;
      }
      
      // Then check timestamp
      if (a.timestamp && b.timestamp) {
        const timestampA = new Date(a.timestamp);
        const timestampB = new Date(b.timestamp);
        if (timestampA > timestampB) return -1;
        if (timestampA < timestampB) return 1;
      }
      
      // Finally check date
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA > dateB) return -1;
      if (dateA < dateB) return 1;
      
      // If all dates are equal, use ID (higher ID is newer)
      return b.id - a.id;
    });
    
    // Add debug logs to see what entries we have
    console.log('All journal entries:', journalEntries);
    console.log('Sorted entries:', sortedEntries);
    if (sortedEntries.length > 0) {
      console.log('Latest entry:', sortedEntries[0]);
    }
    
    // Questions about recent entries
    if (normalizedQuery.includes('recent entries') || 
        normalizedQuery.includes('last entry') || 
        normalizedQuery.includes('latest entry') ||
        normalizedQuery.includes('last journal entry') ||
        normalizedQuery.match(/what was my (last|latest|recent|previous) (journal )?(entry|reflection)/i) ||
        normalizedQuery.match(/show me my (last|latest|recent|previous) (journal )?(entry|reflection)/i) ||
        normalizedQuery.match(/tell me about my (last|latest|recent|previous) (journal )?(entry|reflection)/i)) {
      const latestEntry = sortedEntries[0]; // Get the most recent entry after sorting
      if (!latestEntry) {
        return "I couldn't find any journal entries in your history.";
      }
      
      const score = calculateEntryScore(latestEntry);
      
      // Handle potential undefined fields safely
      const prodScore = latestEntry.productivityScore !== undefined ? latestEntry.productivityScore : 'not rated';
      const breakStatus = latestEntry.breaksTaken === 'Yes' ? 'You took breaks' : 
                         (latestEntry.breaksTaken === 'No' ? 'You didn\'t take breaks' : 'Break status not recorded');
      const focusStatus = latestEntry.focusTime === 'Yes' ? 'successfully completed' : 
                         (latestEntry.focusTime === 'Partially' ? 'partially completed' : 
                         (latestEntry.focusTime === 'No' ? 'didn\'t complete' : 'focus time not recorded'));
      
      // Enhance the response with support and improvement plans if available
      const supportInfo = latestEntry.supportNeeded ? `\nSupport needed: "${latestEntry.supportNeeded}"` : '';
      const improvementInfo = latestEntry.improvementPlans ? `\nImprovement plans: "${latestEntry.improvementPlans}"` : '';
      
      return `Your most recent journal entry was on ${formatDate(latestEntry.date)}. 
You rated your productivity as ${prodScore}/10, and your overall score was ${score}%. 
${breakStatus} and ${focusStatus} your focus time.
${latestEntry.distractions && latestEntry.distractions.length > 0 ? `Distractions: ${latestEntry.distractions.join(', ')}` : 'You didn\'t report any distractions.'}${supportInfo}${improvementInfo}`;
    }
    
    // Questions about specific dates
    const dateMatch = normalizedQuery.match(/entry (on|for|from) ([a-z]+ \d+|\d+\/\d+|\d+-\d+)/i);
    if (dateMatch) {
      const dateQuery = dateMatch[2].toLowerCase();
      // Find entries with dates matching the query
      const matchingEntries = sortedEntries.filter(entry => {
        const entryDate = formatDate(entry.date).toLowerCase();
        return entryDate.includes(dateQuery);
      });
      
      if (matchingEntries.length > 0) {
        const entry = matchingEntries[0];
        const score = calculateEntryScore(entry);
        
        return `On ${formatDate(entry.date)}, your productivity score was ${entry.productivityScore}/10 and your overall score was ${score}%. 
${entry.breaksTaken === 'Yes' ? 'You took breaks' : 'You didn\'t take breaks'} and ${entry.focusTime === 'Yes' ? 'successfully completed' : entry.focusTime === 'Partially' ? 'partially completed' : 'didn\'t complete'} your focus time.
${entry.distractions && entry.distractions.length > 0 ? `Your main distractions were: ${entry.distractions.join(', ')}.` : 'You didn\'t report any distractions.'}`;
      }
    }
    
    // Questions about productivity trends
    if (normalizedQuery.includes('trend') || normalizedQuery.includes('pattern') || 
        normalizedQuery.includes('over time') || normalizedQuery.includes('improving')) {
      
      // Get scores for last 5 entries
      const recentEntries = sortedEntries.slice(0, Math.min(5, sortedEntries.length));
      const scores = recentEntries.map(entry => entry.productivityScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Determine trend
      let trend = 'stable';
      if (scores[0] > avgScore) trend = 'improving';
      else if (scores[0] < avgScore) trend = 'declining';
      
      return `Based on your last ${recentEntries.length} entries, your productivity is ${trend}. Your recent productivity scores are: ${scores.join(', ')} (from newest to oldest). Your average productivity rating over this period is ${avgScore.toFixed(1)}/10.`;
    }
    
    // Questions about most/least productive days
    if (normalizedQuery.includes('most productive') || normalizedQuery.includes('highest score')) {
      // Sort entries by productivity score (highest first)
      const productivitySortedEntries = [...sortedEntries].sort((a, b) => b.productivityScore - a.productivityScore);
      const bestEntry = productivitySortedEntries[0];
      
      return `Your most productive day was ${formatDate(bestEntry.date)} with a productivity score of ${bestEntry.productivityScore}/10. ${bestEntry.breaksTaken === 'Yes' ? 'You took breaks' : 'You didn\'t take breaks'} and ${bestEntry.focusTime === 'Yes' ? 'successfully completed' : bestEntry.focusTime === 'Partially' ? 'partially completed' : 'didn\'t complete'} your focus time.`;
    }
    
    if (normalizedQuery.includes('least productive') || normalizedQuery.includes('lowest score')) {
      // Sort entries by productivity score (lowest first)
      const lowestSortedEntries = [...sortedEntries].sort((a, b) => a.productivityScore - b.productivityScore);
      const worstEntry = lowestSortedEntries[0];
      
      return `Your least productive day was ${formatDate(worstEntry.date)} with a productivity score of ${worstEntry.productivityScore}/10. ${worstEntry.distractions && worstEntry.distractions.length > 0 ? `Your main distractions were: ${worstEntry.distractions.join(', ')}.` : 'You didn\'t report any distractions.'}`;
    }
    
    // Questions about common distractions
    if (normalizedQuery.includes('distraction') || normalizedQuery.includes('what affects') || 
        normalizedQuery.includes('gets in the way')) {
      
      // Count occurrences of each distraction
      const distractionCounts: {[key: string]: number} = {};
      sortedEntries.forEach(entry => {
        if (entry.distractions && entry.distractions.length) {
          entry.distractions.forEach((d: string) => {
            distractionCounts[d] = (distractionCounts[d] || 0) + 1;
          });
        }
      });
      
      // Sort distractions by frequency
      const sortedDistractions = Object.entries(distractionCounts)
        .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
        .map(([name, count]) => ({ name, count }));
      
      if (sortedDistractions.length > 0) {
        const topDistractions = sortedDistractions.slice(0, 3);
        return `Based on your journal entries, your most common distractions are: ${topDistractions.map(d => `${d.name} (${d.count} occurrences)`).join(', ')}. These distractions tend to reduce your productivity score.`;
      } else {
        return `You haven't recorded any specific distractions in your journal entries yet.`;
      }
    }
    
    // Questions about entry count
    if (normalizedQuery.includes('how many entries') || normalizedQuery.includes('number of entries') || 
        normalizedQuery.includes('entry count')) {
      return `You have recorded ${sortedEntries.length} journal entries so far. Your most recent entry was on ${formatDate(sortedEntries[0].date)}.`;
    }
  }
  
  // General help about using the assistant
  if (normalizedQuery.includes('help') || normalizedQuery.includes('what can you do')) {
    return `I'm Pulse Assistant, and I can help you with:

1. Understanding your productivity metrics and trends
2. Creating and managing journal entries
3. Task management tips
4. Explaining features of the Productivity Pulse app
5. Providing productivity and time management advice
6. Analyzing your journal history and identifying patterns

Ask me questions like "What's my productivity score?", "How do I create a journal entry?", or "What was my most productive day?"`;
  }
  
  // If we get here, we couldn't generate a local response
  return null;
};

// The provider implementation
export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: APP_KNOWLEDGE
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize screen context without relying on router's location
  const [screenContext, setScreenContext] = useState<ScreenContext>({
    currentPath: '',
    currentComponent: 'Dashboard' // Default to Dashboard when no specific context is available
  });
  
  // State to track the current conversation thread ID
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  
  // We don't need the useEffect that was using location.pathname anymore
  
  const updateScreenContext = (context: Partial<ScreenContext>) => {
    console.log('Updating screen context:', context);
    
    // If metrics data is present, log it to see its structure
    if (context.currentData?.metricsOverview) {
      console.log('Received metrics data:', JSON.stringify(context.currentData.metricsOverview));
    }
    
    setScreenContext(prev => {
      // Store the updated context with metrics and entries
      const updatedContext = { ...prev, ...context };
      
      // If we're directly updating journal entries
      if (context.journalEntries && context.journalEntries.length > 0) {
        console.log('Directly updating journal entries:', context.journalEntries.length);
        // No change needed here, just return the updated context
      }
      
      // If updating entries via currentData
      if (context.currentData?.entries && Array.isArray(context.currentData.entries)) {
        console.log('Found entries in currentData:', context.currentData.entries.length);
        
        // Make sure entries are in the expected format
        const entries = context.currentData.entries.map((entry: any) => {
          // Ensure distractions is always an array
          if (!entry.distractions) {
            entry.distractions = [];
          }
          return entry;
        });
        
        // Sort entries by created_at date to ensure newest first
        entries.sort((a: any, b: any) => {
          // Try created_at first (most reliable server timestamp)
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          // Try timestamp next
          if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          }
          // Finally use date field as fallback
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        
        console.log('Sorted entries by created_at, latest entries:', 
          entries.slice(0, 3).map((e: any) => `ID: ${e.id}, Date: ${e.date}, Created: ${e.created_at?.substring(0, 10)}`));
        
        // Update with sorted entries
        updatedContext.journalEntries = entries;
      }
      
      // Log the metrics when they're updated
      if (context.currentData?.metricsOverview) {
        console.log('Updated metrics:', context.currentData.metricsOverview);
      }
      
      return updatedContext;
    });
  };

  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);
  
  const sendMessage = async (content: string) => {
    try {
      // Add user message to the conversation immediately for UI
      const userMessage: Message = { role: 'user', content };
      setMessages(prev => [...prev, userMessage]);
      
      setIsLoading(true);
      
      // Call the backend API with the message and thread ID
      const response = await sendAssistantMessage(content, threadId);
      
      if (response) {
        // Store the thread ID for future messages
        setThreadId(response.thread_id);
        
        // Add the assistant's response to the conversation
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.reply
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Handle error case
        const errorMessage: Message = {
          role: 'assistant',
          content: `I apologize, but I encountered an error while processing your request. Please try again later.`
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message to assistant:', error);
      
      // Add error message to the conversation
      const errorMessage: Message = {
        role: 'assistant',
        content: `I apologize, but I encountered an error while processing your request. Please try again later.`
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const clearMessages = () => {
    setMessages([
      {
        role: 'system',
        content: APP_KNOWLEDGE
      }
    ]);
    // Reset thread ID when clearing messages
    setThreadId(undefined);
  };
  
  return (
    <AIAssistantContext.Provider
      value={{
        isOpen,
        messages,
        isLoading,
        screenContext,
        openAssistant,
        closeAssistant,
        sendMessage,
        clearMessages,
        updateScreenContext,
      }}
    >
      {children}
    </AIAssistantContext.Provider>
  );
};

// Helper function remains unchanged but may not be needed anymore
function getComponentNameFromPath(path: string): string {
  // Remove leading slash and query parameters
  const cleanPath = path.replace(/^\//, '').split('?')[0];
  
  if (!cleanPath || cleanPath === '') return 'Dashboard';
  
  // Convert kebab-case to PascalCase and capitalize first letter
  return cleanPath
    .split('/')
    .pop()!
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
} 