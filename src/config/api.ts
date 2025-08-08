// Get the base API URL from environment variables
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// API endpoints
export const API_ENDPOINTS = {
  MATCHES: {
    CREATE: '/api/matches',
    RECENT: '/api/matches/recent',
    FILTER: '/api/matches/filter',
    ANNUL: '/api/matches',
  },
  PLAYERS: {
    LIST: '/api/players',
    CREATE: '/api/players',
  },
  CHARACTERS: {
    LIST: '/api/characters',
  },
  AUTH: {
    LOGIN: '/api/auth/login',
  }
};

// Helper function to create full API URLs
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

// Helper function to get auth headers
export const getAuthHeaders = (token?: string | null): HeadersInit => {
  const authToken = token || localStorage.getItem('auth_token');
  
  return authToken
    ? {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      }
    : {
        'Content-Type': 'application/json',
      };
};
