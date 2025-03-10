// Get the base API URL from environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// API endpoints
export const API_ENDPOINTS = {
  MATCHES: {
    CREATE: '/api/matches',
    RECENT: '/api/matches/recent',
  },
  PLAYERS: {
    LIST: '/api/players',
  },
};

// Helper function to create full API URLs
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};
