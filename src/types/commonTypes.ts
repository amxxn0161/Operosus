// Task-related types
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  createdAt: string;
  completedAt?: string;
  deadline?: string;
}

// Journal-related types
export interface JournalEntry {
  id: string;
  date: string;
  productivityScore: number;
  meetingScore: number;
  focusTime: string;
  breaksTaken: string;
  supportNeeded?: string;
  improvementPlans?: string;
  timestamp: string;
  distractions?: string[];
}

// Chart-related types
export interface ChartDataPoint {
  date: string;
  value: number;
  [key: string]: any;
}

export interface DistractionData {
  name: string;
  value: number;
  percentage: string;
}

// Worksheet-related types
export interface Achievement {
  id: number;
  description: string;
  howAchieved: string;
}

export interface Value {
  id: number;
  description: string;
}

export interface Goal {
  id: number;
  description: string;
  deadline: string;
  keyResults: string[];
}

export interface Action {
  id: number;
  description: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
}

export interface CoachingSession {
  id: string;
  name: string;
  achievements: Achievement[];
  personalValues: Value[];
  coreValues: string;
  goals: Goal[];
  actions: Action[];
  alignment: string;
  reflections: string;
}

// Google Tasks API types
export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
}

export interface GoogleTaskList {
  id: string;
  title: string;
  selfLink: string;
  updated: string;
} 