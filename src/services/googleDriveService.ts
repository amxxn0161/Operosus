import { apiRequest } from './apiUtils';
import { GoogleDriveFile, TaskFileAttachment } from '../types/commonTypes';

// Fetch available Google Drive files
export const fetchGoogleDriveFiles = async (options?: { 
  signal?: AbortSignal;
  pageSize?: number;
  mimeTypes?: string[];
}): Promise<GoogleDriveFile[]> => {
  try {
    console.log('Fetching Google Drive files from API...');
    
    // Build query parameters
    const params = new URLSearchParams();
    if (options?.pageSize) {
      params.append('pageSize', options.pageSize.toString());
    }
    if (options?.mimeTypes && options.mimeTypes.length > 0) {
      params.append('mimeTypes', options.mimeTypes.join(','));
    }
    
    const endpoint = `/api/google/drive/files${params.toString() ? `?${params.toString()}` : ''}`;
    
    const response = await apiRequest<{ 
      status: string; 
      data: { files: any[] } // Use any[] since API response has different property names
    }>(endpoint, { 
      method: 'GET',
      signal: options?.signal 
    });
    
    if (response.status === 'success' && response.data && response.data.files) {
      // Transform API response from snake_case to camelCase and validate
      const transformedFiles: GoogleDriveFile[] = response.data.files
        .filter(file => file && file.id && file.name && file.web_view_link)
        .map(file => ({
          id: file.id,
          name: file.name,
          mimeType: file.mime_type,
          webViewLink: file.web_view_link,
          webContentLink: file.web_content_link,
          iconLink: file.icon_link,
          size: file.size,
          createdTime: file.created_time,
          modifiedTime: file.modified_time,
          owners: file.owners,
          permissions: file.permissions,
        }));
      
      console.log(`Fetched ${transformedFiles.length} valid Google Drive files out of ${response.data.files.length} total`);
      return transformedFiles;
    }
    
    console.warn('Unexpected API response format:', response);
    return [];
  } catch (error) {
    console.error('Failed to fetch Google Drive files:', error);
    throw error;
  }
};

// Attach a file to a task
export const attachFileToTask = async (
  taskListId: string,
  taskId: string,
  fileId: string
): Promise<TaskFileAttachment | null> => {
  console.log('=== attachFileToTask function called ===');
  console.log('Parameters:', { taskListId, taskId, fileId });
  
  try {
    console.log(`Making POST request to attach file ${fileId} to task ${taskId}`);
    
    const endpoint = `/api/google/tasklists/${taskListId}/tasks/${taskId}/attachments`;
    const requestBody = { file_id: fileId };
    
    console.log('Request details:', {
      method: 'POST',
      endpoint,
      body: requestBody
    });
    
    const response = await apiRequest<{ 
      status: string; 
      data?: { attachment: any };
      attachment?: any;
    }>(endpoint, {
      method: 'POST',
      body: requestBody
    });
    
    console.log('Raw API response:', response);
    
    if (response.status === 'success') {
      // Handle both response formats and transform snake_case to camelCase
      const rawAttachment = response.attachment || response.data?.attachment;
      if (rawAttachment) {
        const transformedAttachment: TaskFileAttachment = {
          id: rawAttachment.id,
          fileId: rawAttachment.file_id || rawAttachment.fileId,
          fileName: rawAttachment.file_name || rawAttachment.fileName,
          mimeType: rawAttachment.mime_type || rawAttachment.mimeType,
          webViewLink: rawAttachment.web_view_link || rawAttachment.webViewLink,
          iconLink: rawAttachment.icon_link || rawAttachment.iconLink,
          size: rawAttachment.size,
          attachedAt: rawAttachment.attached_at || rawAttachment.attachedAt,
          taskId: rawAttachment.task_id || rawAttachment.taskId,
          taskListId: rawAttachment.task_list_id || rawAttachment.taskListId,
        };
        
        console.log('File attached successfully:', transformedAttachment);
        return transformedAttachment;
      }
    }
    
    console.warn('File attachment failed - unexpected response format:', response);
    return null;
  } catch (error) {
    console.error('Failed to attach file to task:', error);
    throw error;
  }
};

// Get files attached to a task
export const getTaskAttachments = async (
  taskListId: string,
  taskId: string
): Promise<TaskFileAttachment[]> => {
  try {
    console.log(`Fetching attachments for task ${taskId}`);
    
    const response = await apiRequest<{ 
      status: string; 
      data: { attachments: any[] } 
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/attachments`, {
      method: 'GET'
    });
    
    if (response.status === 'success' && response.data && response.data.attachments) {
      // Transform snake_case API response to camelCase
      const transformedAttachments: TaskFileAttachment[] = response.data.attachments.map(attachment => ({
        id: attachment.id,
        fileId: attachment.file_id || attachment.fileId,
        fileName: attachment.file_name || attachment.fileName,
        mimeType: attachment.mime_type || attachment.mimeType,
        webViewLink: attachment.web_view_link || attachment.webViewLink,
        iconLink: attachment.icon_link || attachment.iconLink,
        size: attachment.size,
        attachedAt: attachment.attached_at || attachment.attachedAt,
        taskId: attachment.task_id || attachment.taskId,
        taskListId: attachment.task_list_id || attachment.taskListId,
      }));
      
      console.log(`Found ${transformedAttachments.length} attachments for task`);
      return transformedAttachments;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch task attachments:', error);
    throw error;
  }
};

// Remove a file attachment from a task
export const removeFileFromTask = async (
  taskListId: string,
  taskId: string,
  fileId: string
): Promise<boolean> => {
  try {
    console.log(`Removing file ${fileId} from task ${taskId}`);
    
    const response = await apiRequest<{ status: string }>(
      `/api/google/tasklists/${taskListId}/tasks/${taskId}/attachments/${fileId}`,
      { method: 'DELETE' }
    );
    
    if (response.status === 'success') {
      console.log('File removed successfully');
      return true;
    }
    
    console.warn('File removal failed:', response);
    return false;
  } catch (error) {
    console.error('Failed to remove file from task:', error);
    throw error;
  }
};

// Helper function to get file type icon
export const getFileTypeIcon = (mimeType?: string): string => {
  // Handle null, undefined, or empty mimeType
  if (!mimeType) {
    return '📎'; // Default icon for unknown/undefined mime types
  }

  const iconMap: { [key: string]: string } = {
    'application/vnd.google-apps.document': '📄',
    'application/vnd.google-apps.spreadsheet': '📊',
    'application/vnd.google-apps.presentation': '📽️',
    'application/vnd.google-apps.folder': '📁',
    'application/pdf': '📕',
    'image/': '🖼️',
    'video/': '🎥',
    'audio/': '🎵',
    'text/': '📝',
  };
  
  // Check for exact match first
  if (iconMap[mimeType]) {
    return iconMap[mimeType];
  }
  
  // Check for partial matches (like image/*, video/*, etc.)
  for (const [pattern, icon] of Object.entries(iconMap)) {
    if (mimeType.startsWith(pattern)) {
      return icon;
    }
  }
  
  // Default icon
  return '📎';
};

// Helper function to format file size
export const formatFileSize = (bytes?: string): string => {
  if (!bytes || bytes === '') return '';
  
  const size = parseInt(bytes, 10);
  if (isNaN(size) || size < 0) return '';
  
  if (size === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let fileSize = size;
  
  while (fileSize >= 1024 && unitIndex < units.length - 1) {
    fileSize /= 1024;
    unitIndex++;
  }
  
  return `${Math.round(fileSize * 10) / 10} ${units[unitIndex]}`;
}; 