import axios from 'axios';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

export interface Match {
  id: number;
  timestamp: string;
  playerAId: string;
  playerBId: string;
  eloGain: number;
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

    // Make API call to record the match using the configured API URL
    const response = await axios.post(getApiUrl(API_ENDPOINTS.MATCHES.CREATE), {
      playerAId: winnerId,
      playerBId: winnerId == player2Id ? player1Id : player2Id, // loser
      winnerId
    });

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
