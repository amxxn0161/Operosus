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

// Google Drive file types
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink: string;
  webContentLink?: string;
  iconLink?: string;
  size?: string;
  createdTime: string;
  modifiedTime: string;
  owners?: Array<{
    displayName: string;
    emailAddress: string;
  }>;
  permissions?: Array<{
    id: string;
    type: string;
    role: string;
  }>;
}

// File attachment for tasks
export interface TaskFileAttachment {
  id: string;
  fileId: string;
  fileName: string;
  mimeType?: string;
  webViewLink: string;
  iconLink?: string;
  size?: string;
  attachedAt: string;
  taskId: string;
  taskListId: string;
}

// Journal-related types
export interface JournalEntry {
  id: number;
  date: string;
  productivityScore: number;
  meetingScore: number | null;
  hadNoMeetings?: number;
  focusTime: string;
  breaksTaken: string;
  supportNeeded?: string;
  improvementPlans?: string;
  timestamp: string;
  distractions?: string[];
  user_id?: number;
  created_at?: string;
  updated_at?: string;
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
  attachments?: TaskFileAttachment[];
}

export interface GoogleTaskList {
  id: string;
  title: string;
  selfLink: string;
  updated: string;
} 