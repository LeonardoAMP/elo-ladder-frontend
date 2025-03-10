// Default fallback data when API fails
const defaultPlayers = [
  { id: 1, name: 'Franco', elo: 1501, matchesPlayed: 0, wins: 0, losses: 0 },
  { id: 2, name: 'Jak', elo: 1500, matchesPlayed: 0, wins: 0, losses: 0 },
  { id: 3, name: 'Fred', elo: 1500, matchesPlayed: 0, wins: 0, losses: 0 },
  { id: 4, name: 'DarkR', elo: 1500, matchesPlayed: 0, wins: 0, losses: 0 }
];

export interface Player {
  id: number;
  name: string;
  elo: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
}

export const fetchPlayers = async (): Promise<{ data: Player[], error: string | null }> => {
  try {
    // Replace this URL with your actual API endpoint
    const response = await fetch('/api/players');
    
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
