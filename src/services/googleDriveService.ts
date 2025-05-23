import { apiRequest } from './apiUtils';
import { GoogleDriveFile, TaskFileAttachment, TaskUrlAttachment, TaskAllAttachments } from '../types/commonTypes';

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
    
    // Add cache-busting parameters including from_cache=false
    const cacheBuster = `from_cache=false&_t=${Date.now()}&_r=${Math.random()}`;
    
    const response = await apiRequest<{ 
      status: string; 
      data: { attachments: any[] };
      from_cache?: boolean;
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/attachments?${cacheBuster}`, {
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
    'application/vnd.google-apps.document': '📘',
    'application/vnd.google-apps.spreadsheet': '📗',
    'application/vnd.google-apps.presentation': '📙',
    'application/vnd.google-apps.folder': '📁',
    'application/pdf': '📄',
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

// Create a new Google Drive file
export const createGoogleDriveFile = async (
  name: string,
  type: 'document' | 'spreadsheet' | 'presentation',
  taskListId?: string,
  taskId?: string,
  autoAttach: boolean = false
): Promise<GoogleDriveFile | null> => {
  try {
    const response = await apiRequest<{
      status: string;
      data?: { file: any; attachment?: any };
    }>('/api/google/drive/create', {
      method: 'POST',
      body: {
        name,
        type,
        task_list_id: taskListId,
        task_id: taskId,
        auto_attach: autoAttach
      }
    });

    if (response.status === 'success' && response.data?.file) {
      // Transform the response to match our GoogleDriveFile interface
      const file = response.data.file;
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mime_type || file.mimeType,
        webViewLink: file.web_view_link || file.webViewLink,
        iconLink: file.icon_link || file.iconLink,
        size: file.size,
        createdTime: file.created_time || file.createdTime,
        modifiedTime: file.modified_time || file.modifiedTime,
        owners: file.owners,
        permissions: file.permissions
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error creating Google Drive file:', error);
    throw error;
  }
};

// Create a new Google Doc
export const createGoogleDoc = async (
  name: string,
  taskListId?: string,
  taskId?: string,
  autoAttach: boolean = false
): Promise<GoogleDriveFile | null> => {
  return createGoogleDriveFile(name, 'document', taskListId, taskId, autoAttach);
};

// Create a new Google Sheet
export const createGoogleSheet = async (
  name: string,
  taskListId?: string,
  taskId?: string,
  autoAttach: boolean = false
): Promise<GoogleDriveFile | null> => {
  return createGoogleDriveFile(name, 'spreadsheet', taskListId, taskId, autoAttach);
};

// Create a new Google Slide
export const createGoogleSlide = async (
  name: string,
  taskListId?: string,
  taskId?: string,
  autoAttach: boolean = false
): Promise<GoogleDriveFile | null> => {
  return createGoogleDriveFile(name, 'presentation', taskListId, taskId, autoAttach);
};

// Helper function to get Material-UI icon component name for file types
export const getFileTypeIconName = (mimeType?: string): string => {
  // Handle null, undefined, or empty mimeType
  if (!mimeType) {
    return 'AttachFile'; // Default icon for unknown/undefined mime types
  }

  const iconMap: { [key: string]: string } = {
    'application/vnd.google-apps.document': 'Description',
    'application/vnd.google-apps.spreadsheet': 'TableChart', 
    'application/vnd.google-apps.presentation': 'Slideshow',
    'application/vnd.google-apps.folder': 'Folder',
    'application/pdf': 'PictureAsPdf',
    'image/': 'Image',
    'video/': 'VideoFile',
    'audio/': 'AudioFile',
    'text/': 'TextSnippet',
  };
  
  // Check for exact match first
  if (iconMap[mimeType]) {
    return iconMap[mimeType];
  }
  
  // Check for partial matches (like image/*, video/*, etc.)
  for (const [pattern, iconName] of Object.entries(iconMap)) {
    if (mimeType.startsWith(pattern)) {
      return iconName;
    }
  }
  
  // Default icon
  return 'AttachFile';
};

// ===== URL ATTACHMENT FUNCTIONS =====

// Attach a URL to a task
export const attachUrlToTask = async (
  taskListId: string,
  taskId: string,
  url: string,
  title?: string,
  description?: string
): Promise<TaskUrlAttachment | null> => {
  console.log('=== attachUrlToTask function called ===');
  console.log('Parameters:', { taskListId, taskId, url, title, description });
  
  try {
    console.log(`Making POST request to attach URL ${url} to task ${taskId}`);
    
    const endpoint = `/api/google/tasklists/${taskListId}/tasks/${taskId}/url-attachments`;
    const requestBody: any = { url };
    
    // Only include title and description if they are provided
    if (title && title.trim()) {
      requestBody.title = title.trim();
    }
    if (description && description.trim()) {
      requestBody.description = description.trim();
    }
    
    console.log('Request details:', {
      method: 'POST',
      endpoint,
      body: requestBody
    });
    
    const response = await apiRequest<{ 
      status: string; 
      message?: string;
      attachment?: any;
    }>(endpoint, {
      method: 'POST',
      body: requestBody
    });
    
    console.log('Raw API response:', response);
    
    if (response.status === 'success' && response.attachment) {
      // Transform snake_case to camelCase
      const rawAttachment = response.attachment;
      const transformedAttachment: TaskUrlAttachment = {
        id: rawAttachment.id,
        url: rawAttachment.url,
        title: rawAttachment.title,
        description: rawAttachment.description,
        faviconUrl: rawAttachment.favicon_url || rawAttachment.faviconUrl,
        domain: rawAttachment.domain,
        attachedAt: rawAttachment.created_at || rawAttachment.attachedAt || new Date().toISOString(),
        taskId: rawAttachment.task_id || rawAttachment.taskId || taskId,
        taskListId: rawAttachment.task_list_id || rawAttachment.taskListId || taskListId,
      };
      
      console.log('URL attached successfully:', transformedAttachment);
      return transformedAttachment;
    }
    
    console.warn('URL attachment failed - unexpected response format:', response);
    return null;
  } catch (error) {
    console.error('Failed to attach URL to task:', error);
    throw error;
  }
};

// Get URL attachments for a task
export const getTaskUrlAttachments = async (
  taskListId: string,
  taskId: string
): Promise<TaskUrlAttachment[]> => {
  try {
    console.log(`Fetching URL attachments for task ${taskId}`);
    
    // Add cache-busting parameters including from_cache=false
    const cacheBuster = `from_cache=false&_t=${Date.now()}&_r=${Math.random()}`;
    
    const response = await apiRequest<{ 
      status: string; 
      data?: any;
      url_attachments?: any[];
      from_cache?: boolean;
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/url-attachments?${cacheBuster}`, {
      method: 'GET'
    });
    
    console.log('Raw URL attachments response:', response);
    
    if (response.status === 'success') {
      // Handle different response formats
      const urlAttachments = response.url_attachments || response.data?.url_attachments || [];
      
      // Transform snake_case API response to camelCase
      const transformedAttachments: TaskUrlAttachment[] = urlAttachments.map((attachment: any) => ({
        id: attachment.id,
        url: attachment.url,
        title: attachment.title,
        description: attachment.description,
        faviconUrl: attachment.favicon_url || attachment.faviconUrl,
        domain: attachment.domain,
        attachedAt: attachment.created_at || attachment.attachedAt || attachment.attached_at,
        taskId: attachment.task_id || attachment.taskId,
        taskListId: attachment.task_list_id || attachment.taskListId,
        // Rich preview metadata
        previewImage: attachment.preview_image || attachment.previewImage,
        displaySiteName: attachment.display_site_name || attachment.displaySiteName,
        previewTitle: attachment.preview_title || attachment.previewTitle,
        previewDescription: attachment.preview_description || attachment.previewDescription,
        bestIcon: attachment.best_icon || attachment.bestIcon,
        isMetadataStale: attachment.is_metadata_stale || attachment.isMetadataStale || false,
        lastMetadataRefresh: attachment.last_metadata_refresh || attachment.lastMetadataRefresh
      }));
      
      console.log(`Found ${transformedAttachments.length} URL attachments for task`);
      return transformedAttachments;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch task URL attachments:', error);
    throw error;
  }
};

// Remove a URL attachment from a task
export const removeUrlFromTask = async (
  taskListId: string,
  taskId: string,
  urlAttachmentId: string
): Promise<boolean> => {
  try {
    console.log(`Removing URL attachment ${urlAttachmentId} from task ${taskId}`);
    
    const response = await apiRequest<{ status: string }>(
      `/api/google/tasklists/${taskListId}/tasks/${taskId}/url-attachments/${urlAttachmentId}`,
      { method: 'DELETE' }
    );
    
    if (response.status === 'success') {
      console.log('URL attachment removed successfully');
      return true;
    }
    
    console.warn('URL attachment removal failed:', response);
    return false;
  } catch (error) {
    console.error('Failed to remove URL attachment from task:', error);
    throw error;
  }
};

// Get all attachments (files + URLs) for a task
export const getAllTaskAttachments = async (
  taskListId: string,
  taskId: string
): Promise<TaskAllAttachments> => {
  try {
    console.log(`Fetching all attachments for task ${taskId}`);
    
    // Add cache-busting parameters including from_cache=false
    const cacheBuster = `from_cache=false&_t=${Date.now()}&_r=${Math.random()}`;
    
    const response = await apiRequest<{ 
      status: string; 
      data?: {
        file_attachments?: any[];
        url_attachments?: any[];
        total_attachments?: number;
      };
      from_cache?: boolean;
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/all-attachments?${cacheBuster}`, {
      method: 'GET'
    });
    
    console.log('Raw all attachments response:', response);
    
    if (response.status === 'success' && response.data) {
      const { file_attachments = [], url_attachments = [], total_attachments = 0 } = response.data;
      
      // Transform file attachments
      const transformedFileAttachments: TaskFileAttachment[] = file_attachments.map((attachment: any) => ({
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
      
      // Transform URL attachments
      const transformedUrlAttachments: TaskUrlAttachment[] = url_attachments.map((attachment: any) => ({
        id: attachment.id,
        url: attachment.url,
        title: attachment.title,
        description: attachment.description,
        faviconUrl: attachment.favicon_url || attachment.faviconUrl,
        domain: attachment.domain,
        attachedAt: attachment.created_at || attachment.attachedAt || attachment.attached_at,
        taskId: attachment.task_id || attachment.taskId,
        taskListId: attachment.task_list_id || attachment.taskListId,
        // Rich preview metadata
        previewImage: attachment.preview_image || attachment.previewImage,
        displaySiteName: attachment.display_site_name || attachment.displaySiteName,
        previewTitle: attachment.preview_title || attachment.previewTitle,
        previewDescription: attachment.preview_description || attachment.previewDescription,
        bestIcon: attachment.best_icon || attachment.bestIcon,
        isMetadataStale: attachment.is_metadata_stale || attachment.isMetadataStale || false,
        lastMetadataRefresh: attachment.last_metadata_refresh || attachment.lastMetadataRefresh
      }));
      
      const allAttachments: TaskAllAttachments = {
        fileAttachments: transformedFileAttachments,
        urlAttachments: transformedUrlAttachments,
        totalAttachments: total_attachments || (transformedFileAttachments.length + transformedUrlAttachments.length)
      };
      
      console.log(`Found ${allAttachments.totalAttachments} total attachments for task`);
      return allAttachments;
    }
    
    return {
      fileAttachments: [],
      urlAttachments: [],
      totalAttachments: 0
    };
  } catch (error) {
    console.error('Failed to fetch all task attachments:', error);
    throw error;
  }
};

// Utility function to validate URL format
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Utility function to extract domain from URL
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
};

// Fetch URL preview metadata
export const fetchUrlPreview = async (url: string): Promise<any | null> => {
  try {
    console.log('Fetching URL preview metadata for:', url);
    
    const response = await apiRequest<{ 
      status: string; 
      data?: any;
    }>('/api/google/url-preview', {
      method: 'POST',
      body: { url }
    });
    
    console.log('URL preview response:', response);
    
    if (response.status === 'success') {
      return response.data;
    } else {
      console.error('Preview failed:', response);
      return null;
    }
  } catch (error) {
    console.error('Error fetching preview:', error);
    return null;
  }
};

// Refresh URL attachment metadata
export const refreshUrlMetadata = async (
  taskListId: string,
  taskId: string,
  urlAttachmentId: string
): Promise<TaskUrlAttachment | null> => {
  try {
    console.log(`Refreshing metadata for URL attachment ${urlAttachmentId}`);
    
    const response = await apiRequest<{ 
      status: string; 
      attachment?: any;
    }>(`/api/google/tasklists/${taskListId}/tasks/${taskId}/url-attachments/${urlAttachmentId}/refresh`, {
      method: 'POST'
    });
    
    console.log('Refresh metadata response:', response);
    
    if (response.status === 'success' && response.attachment) {
      const rawAttachment = response.attachment;
      const transformedAttachment: TaskUrlAttachment = {
        id: rawAttachment.id,
        url: rawAttachment.url,
        title: rawAttachment.title,
        description: rawAttachment.description,
        faviconUrl: rawAttachment.favicon_url || rawAttachment.faviconUrl,
        domain: rawAttachment.domain,
        attachedAt: rawAttachment.created_at || rawAttachment.attachedAt || rawAttachment.attached_at,
        taskId: rawAttachment.task_id || rawAttachment.taskId,
        taskListId: rawAttachment.task_list_id || rawAttachment.taskListId,
        // Rich preview metadata
        previewImage: rawAttachment.preview_image || rawAttachment.previewImage,
        displaySiteName: rawAttachment.display_site_name || rawAttachment.displaySiteName,
        previewTitle: rawAttachment.preview_title || rawAttachment.previewTitle,
        previewDescription: rawAttachment.preview_description || rawAttachment.previewDescription,
        bestIcon: rawAttachment.best_icon || rawAttachment.bestIcon,
        isMetadataStale: rawAttachment.is_metadata_stale || rawAttachment.isMetadataStale || false,
        lastMetadataRefresh: rawAttachment.last_metadata_refresh || rawAttachment.lastMetadataRefresh || new Date().toISOString()
      };
      
      console.log('URL metadata refreshed successfully:', transformedAttachment);
      return transformedAttachment;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to refresh URL metadata:', error);
    throw error;
  }
}; 