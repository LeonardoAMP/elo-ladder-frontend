import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';

// Default fallback data when API fails
const defaultPlayers = [
  { 
    id: 1, 
    name: 'Franco', 
    elo: 1501, 
    matchesPlayed: 0, 
    wins: 0, 
    losses: 0, 
    skin: 1,
    mainCharacter: { id: 1, name: 'Mario', icon_name: 'mario' }
  },
  { 
    id: 2, 
    name: 'Jak', 
    elo: 1500, 
    matchesPlayed: 0, 
    wins: 0, 
    losses: 0, 
    skin: 1,
    mainCharacter: { id: 2, name: 'Luigi', icon_name: 'luigi' }
  },
  { 
    id: 3, 
    name: 'Fred', 
    elo: 1500, 
    matchesPlayed: 0, 
    wins: 0, 
    losses: 0, 
    skin: 1,
    mainCharacter: { id: 3, name: 'Peach', icon_name: 'peach' }
  },
  { 
    id: 4, 
    name: 'DarkR', 
    elo: 1500, 
    matchesPlayed: 0, 
    wins: 0, 
    losses: 0, 
    skin: 1,
    mainCharacter: { id: 4, name: 'Bowser', icon_name: 'bowser' }
  }
];

export interface Player {
  id: number;
  name: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  skin: number;
  mainCharacter: {
    id: number;
    name: string;
    icon_name: string;
  };
}

export const fetchPlayers = async (): Promise<{ data: Player[], error: string | null }> => {
  try {
    // Use the configured API URL for player endpoint
    const response = await fetch(getApiUrl(API_ENDPOINTS.PLAYERS.LIST));
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    console.error("Failed to fetch players:", err);
    // Fallback to default data if API fails
    return { 
      data: defaultPlayers, 
      error: "Failed to load players. Using default data."
    };
  }
};

export const addPlayer = async (playerName: string): Promise<Player | string> => {
  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.PLAYERS.CREATE), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name: playerName })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error("Failed to add player:", err);
    return err instanceof Error ? err.message : 'An unknown error occurred';
  }
};
