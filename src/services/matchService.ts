import axios from 'axios';
import { getApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';

export interface Match {
  id: number;
  timestamp: string;
  winnerId: string;
  loserId: string;
  eloChange: number;
  winnerCurrentElo: number;
  loserCurrentElo: number;
}

export interface MatchFilter {
  playerId?: string;
  winnerId?: string;
  loserId?: string;
  startDate?: string;
  endDate?: string;
  minEloChange?: number;
  maxEloChange?: number;
  limit?: number;
  offset?: number;
}

export const recordMatch = async (
  player1Id: string,
  player2Id: string,
  winnerId: string
): Promise<string | null> => {
  try {
    if (!player1Id || !player2Id || !winnerId) {
      return 'Invalid match data';
    }

    // Make API call to record the match using the configured API URL with auth headers
    const response = await axios.post(
      getApiUrl(API_ENDPOINTS.MATCHES.CREATE), 
      {
        playerAId: winnerId,
        playerBId: winnerId == player2Id ? player1Id : player2Id, // loser
        winnerId
      },
      { headers: getAuthHeaders() as any }
    );

    if (response.status === 200 || response.status === 201) {
      return null;
    } else {
      throw new Error('Failed to record match');
    }
  } catch (error) {
    console.error('Error recording match:', error);
    return 'Failed to record match: ' + (error instanceof Error ? error.message : String(error));
  }
};

export const getRecentMatches = async (): Promise<Match[] | string> => {
  try {
    // Make API call to get recent matches using the configured API URL
    const response = await axios.get(getApiUrl(API_ENDPOINTS.MATCHES.RECENT));

    if (response.status === 200) {
      return response.data as Match[];
    } else {
      throw new Error('Failed to fetch recent matches');
    }
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    return 'Failed to fetch recent matches: ' + (error instanceof Error ? error.message : String(error));
  }
};

export const filterMatches = async (filters: MatchFilter): Promise<Match[] | string> => {
  try {
    // Build query parameters from filters
    const queryParams = new URLSearchParams();
    
    if (filters.playerId) queryParams.append('playerId', filters.playerId);
    if (filters.winnerId) queryParams.append('winnerId', filters.winnerId);
    if (filters.loserId) queryParams.append('loserId', filters.loserId);
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.minEloChange !== undefined) queryParams.append('minEloChange', filters.minEloChange.toString());
    if (filters.maxEloChange !== undefined) queryParams.append('maxEloChange', filters.maxEloChange.toString());
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.offset) queryParams.append('offset', filters.offset.toString());

    const url = `${getApiUrl(API_ENDPOINTS.MATCHES.FILTER)}?${queryParams.toString()}`;
    const response = await axios.get(url);

    if (response.status === 200) {
      return response.data.matches as Match[];
    } else {
      throw new Error('Failed to fetch filtered matches');
    }
  } catch (error) {
    console.error('Error fetching filtered matches:', error);
    return 'Failed to fetch filtered matches: ' + (error instanceof Error ? error.message : String(error));
  }
};

export const annulMatch = async (matchId: number): Promise<string | null> => {
  try {
    const response = await axios.delete(
      `${getApiUrl(API_ENDPOINTS.MATCHES.ANNUL)}/${matchId}`,
      { headers: getAuthHeaders() as any }
    );

    if (response.status === 200 || response.status === 204) {
      return null;
    } else {
      throw new Error('Failed to annul match');
    }
  } catch (error) {
    console.error('Error annulling match:', error);
    return 'Failed to annul match: ' + (error instanceof Error ? error.message : String(error));
  }
};
