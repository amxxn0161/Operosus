// statsService.ts
// Service for handling productivity stats data

export interface QuickStats {
  focusTime: number;
  productivity: number;
  tasksDone: number;
  distractions: number;
}

/**
 * Service for retrieving statistics data
 */
class StatsService {
  /**
   * Get quick stats data for the dashboard
   */
  async getQuickStats(): Promise<QuickStats> {
    // In a real app, this would fetch data from an API
    // For now, returning mock data
    return {
      focusTime: 6,
      productivity: 78,
      tasksDone: 12,
      distractions: 5
    };
  }
}

export const statsService = new StatsService(); 