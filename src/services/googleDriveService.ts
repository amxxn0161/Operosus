import { apiRequest } from './apiUtils';

// Define interfaces for Google Drive files
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  modifiedTime?: string;
  createdTime?: string;
}

export interface GoogleDriveResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export interface TaskAttachment {
  id: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  iconLink?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  taskId: string;
  taskListId: string;
}

// List files from Google Drive
export const listDriveFiles = async (
  pageToken?: string, 
  query?: string, 
  pageSize: number = 20
): Promise<GoogleDriveResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (pageToken) queryParams.append('pageToken', pageToken);
    if (query) queryParams.append('q', query);
    queryParams.append('pageSize', pageSize.toString());
    
    const response = await apiRequest<GoogleDriveResponse>(
      `/api/google/drive/files?${queryParams.toString()}`,
      { method: 'GET' }
    );
    
    return response;
  } catch (error) {
    console.error('Failed to list Google Drive files:', error);
    throw error;
  }
};

// Create a new Google document
export const createGoogleDocument = async (
  type: 'document' | 'spreadsheet' | 'presentation', 
  name: string
): Promise<GoogleDriveFile> => {
  try {
    const response = await apiRequest<GoogleDriveFile>(
      '/api/google/drive/docs',
      {
        method: 'POST',
        body: JSON.stringify({ type, name })
      }
    );
    
    return response;
  } catch (error) {
    console.error(`Failed to create new Google ${type}:`, error);
    throw error;
  }
};

// Attach a file to a task
export const attachFileToTask = async (
  taskListId: string,
  taskId: string,
  fileId: string
): Promise<TaskAttachment> => {
  try {
    const response = await apiRequest<TaskAttachment>(
      `/api/google/tasks/${taskListId}/${taskId}/attachments`,
      {
        method: 'POST',
        body: JSON.stringify({ fileId })
      }
    );
    
    return response;
  } catch (error) {
    console.error('Failed to attach file to task:', error);
    throw error;
  }
};

// Get all attachments for a task
export const getTaskAttachments = async (
  taskListId: string,
  taskId: string
): Promise<TaskAttachment[]> => {
  try {
    const response = await apiRequest<TaskAttachment[]>(
      `/api/google/tasks/${taskListId}/${taskId}/attachments`,
      { method: 'GET' }
    );
    
    return response;
  } catch (error) {
    console.error('Failed to get task attachments:', error);
    throw error;
  }
};

// Remove an attachment from a task
export const removeTaskAttachment = async (
  taskListId: string,
  taskId: string,
  attachmentId: string
): Promise<boolean> => {
  try {
    await apiRequest<{ success: boolean }>(
      `/api/google/tasks/${taskListId}/${taskId}/attachments/${attachmentId}`,
      { method: 'DELETE' }
    );
    
    return true;
  } catch (error) {
    console.error('Failed to remove task attachment:', error);
    throw error;
  }
}; 