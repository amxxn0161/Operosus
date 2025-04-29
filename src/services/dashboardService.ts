import { apiRequest } from './apiUtils';

/**
 * Dashboard layout service for saving, retrieving, and resetting layouts
 */
const dashboardService = {
  /**
   * Get the user's saved dashboard layout
   * @returns The saved layout data or null if no custom layout exists
   */
  getLayout: async () => {
    try {
      const response = await apiRequest('/api/dashboard/layout', {
        method: 'GET'
      });
      return response;
    } catch (error) {
      console.error('Error fetching dashboard layout:', error);
      throw error;
    }
  },

  /**
   * Save the user's dashboard layout
   * @param layoutData The layout data to save
   * @returns The response from the API
   */
  saveLayout: async (layoutData: any) => {
    try {
      const response = await apiRequest('/api/dashboard/layout', {
        method: 'POST',
        body: {
          layout_data: layoutData
        }
      });
      return response;
    } catch (error) {
      console.error('Error saving dashboard layout:', error);
      throw error;
    }
  },

  /**
   * Reset the user's dashboard layout to the default
   * @returns The response from the API
   */
  resetLayout: async () => {
    try {
      const response = await apiRequest('/api/dashboard/layout', {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('Error resetting dashboard layout:', error);
      throw error;
    }
  }
};

export default dashboardService; 