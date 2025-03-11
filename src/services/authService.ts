import { getApiUrl } from '../config/api';

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role?: string;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export const login = async (credentials: LoginCredentials): Promise<AuthResponse | string> => {
  try {
    const response = await fetch(`${getApiUrl('/api/auth/login')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const data = await response.json();
    
    // Calculate expiration time (1 hour from now)
    const expirationTime = new Date().getTime() + (60 * 60 * 1000); // 1 hour in milliseconds
    
    // Store token and its expiration time in localStorage
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('token_expiration', expirationTime.toString());
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    return error instanceof Error ? error.message : 'An unknown error occurred';
  }
};

export const logout = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('token_expiration');
};

export const getToken = (): string | null => {
  // First check if token has expired
  if (isTokenExpired()) {
    // If expired, clear token and return null
    logout();
    return null;
  }
  return localStorage.getItem('auth_token');
};

export const isAuthenticated = (): boolean => {
  const token = getToken(); // This will handle token expiration check
  return !!token; // Return true if token exists and is not expired
};

// Helper function to check if token is expired
export const isTokenExpired = (): boolean => {
  const expiration = localStorage.getItem('token_expiration');
  if (!expiration) return true;
  
  const expirationTime = parseInt(expiration, 10);
  const currentTime = new Date().getTime();
  
  return currentTime > expirationTime;
};

// Get remaining token validity in seconds
export const getTokenRemainingTime = (): number => {
  const expiration = localStorage.getItem('token_expiration');
  if (!expiration) return 0;
  
  const expirationTime = parseInt(expiration, 10);
  const currentTime = new Date().getTime();
  
  return Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
};
