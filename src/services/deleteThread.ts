import { apiRequest } from './apiUtils';

/**
 * Delete a conversation thread
 * @param threadId The ID of the thread to delete
 * @returns A boolean indicating success or failure
 */
export const deleteThread = async (threadId: string): Promise<boolean> => {
  try {
    const response = await apiRequest<{ success: boolean }>(`/api/assistant/thread/${threadId}`, {
      method: 'DELETE'
    });
    
    return response.success;
  } catch (error) {
    console.error('Error deleting thread:', error);
    return false;
  }
};

export default deleteThread; 