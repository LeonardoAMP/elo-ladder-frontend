import { getApiUrl, API_ENDPOINTS } from '../config/api';

export interface Character {
  id: number;
  name: string;
  icon_name: string;
}

export const fetchCharacters = async (): Promise<{ data: Character[], error: string | null }> => {
  try {
    const response = await fetch(getApiUrl(API_ENDPOINTS.CHARACTERS.LIST));
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    console.error("Failed to fetch characters:", err);
    
    // Fallback to default characters if API fails
    const defaultCharacters: Character[] = [
      { id: 1, name: 'Mario', icon_name: 'mario' },
      { id: 2, name: 'Luigi', icon_name: 'luigi' },
      { id: 3, name: 'Peach', icon_name: 'peach' },
      { id: 4, name: 'Bowser', icon_name: 'bowser' },
      { id: 5, name: 'Yoshi', icon_name: 'yoshi' },
      { id: 6, name: 'Toad', icon_name: 'toad' },
    ];
    
    return { 
      data: defaultCharacters, 
      error: "Failed to load characters. Using default data."
    };
  }
};
