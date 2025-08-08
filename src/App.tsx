import { useState, useEffect } from 'react';
import { fetchPlayers, Player, addPlayer as apiAddPlayer, CreatePlayerRequest } from './services/playerService';
import { recordMatch, Match, getRecentMatches, filterMatches, MatchFilter, annulMatch } from './services/matchService';
import { login, logout, isAuthenticated, LoginCredentials, getTokenRemainingTime, isTokenExpired } from './services/authService';
import { fetchCharacters, Character } from './services/characterService';
import PlayerIcon from './components/common/PlayerIcon';

const App = () => {
  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  // States
  const [players, setPlayers] = useState<Player[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [selectedSkin, setSelectedSkin] = useState<number>(1);
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const [sortBy, setSortBy] = useState('elo');
  const [sortDirection, setSortDirection] = useState('desc');
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [view, setView] = useState('ladder');

  // Filter states for match history
  const [filters, setFilters] = useState<MatchFilter>({
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [hasAppliedFilters, setHasAppliedFilters] = useState(false);

  // Check authentication status on mount and set up auto-logout
  useEffect(() => {
    // Initial authentication check
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      
      // If authenticated, set up auto-logout timer
      if (authenticated) {
        const remainingTime = getTokenRemainingTime();
        
        // Only set timer if there's remaining time
        if (remainingTime > 0) {
          const timer = setTimeout(() => {
            logout();
            setIsLoggedIn(false);
            // Optional: Show notification to user about session expiration
            setAuthError('Your session has expired. Please login again.');
          }, remainingTime * 1000);
          
          // Clear the timer on component unmount
          return () => clearTimeout(timer);
        } else if (isTokenExpired()) {
          // If token is already expired on mount, logout immediately
          logout();
          setIsLoggedIn(false);
        }
      }
    };
    
    checkAuth();
    
    // Periodic check every minute to ensure token validity
    const intervalId = setInterval(() => {
      if (isTokenExpired()) {
        logout();
        if(isLoggedIn)
        {
          setAuthError('Your session has expired. Please login again.');
        }
        setIsLoggedIn(false);
        clearInterval(intervalId);
      }
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch players data from API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Load players
      const { data: playersData, error: playersError } = await fetchPlayers();
      setPlayers(playersData);
      if (playersError) setError(playersError);
      
      // Load characters
      const { data: charactersData, error: charactersError } = await fetchCharacters();
      setCharacters(charactersData);
      if (charactersError && !playersError) setError(charactersError);
      
      // Load recent matches
      const recentMatches = await getRecentMatches();
      if (typeof recentMatches !== 'string') {
        setMatchHistory(recentMatches);
      } else {
        setError(recentMatches);
      }
      
      setLoading(false);
    };

    loadData();
  }, []);

  // Handle login
  const handleLogin = async () => {
    setAuthError(null);
    
    if (!username.trim() || !password.trim()) {
      setAuthError('Username and password are required');
      return;
    }
    
    const credentials: LoginCredentials = {
      username: username.trim(),
      password: password.trim()
    };
    
    const result = await login(credentials);
    
    if (typeof result === 'string') {
      setAuthError(result);
    } else {
      setIsLoggedIn(true);
      setUsername('');
      setPassword('');
      
      // Set up auto-logout timer after successful login
      const remainingTime = getTokenRemainingTime();
      if (remainingTime > 0) {
        setTimeout(() => {
          logout();
          setIsLoggedIn(false);
          setAuthError('Your session has expired. Please login again.');
        }, remainingTime * 1000);
      }
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
  };

  // Helper function for handling Enter key press
  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  // Handle form submissions with validation
  const handleLoginSubmit = () => {
    if (username.trim() && password.trim()) {
      handleLogin();
    }
  };

  const handleAddPlayerSubmit = () => {
    if (newPlayerName.trim()) {
      addPlayer();
    }
  };

  const handleRecordMatchSubmit = () => {
    if (player1 && player2 && matchResult) {
      handleRecordMatch();
    }
  };

  // Record a match using the match service
  const handleRecordMatch = async () => {
    if (!player1 || !player2 || !matchResult) return;
    
    const result = await recordMatch(
      player1,
      player2,
      matchResult,
    );
    
    if (result) {
      setError(result);
      return;
    }
    
    // Refresh match history after recording a match
    const recentMatches = await getRecentMatches();
    if (typeof recentMatches !== 'string') {
      setMatchHistory(recentMatches);
    }
    
    // Refresh player rankings after recording a match
    const { data, error: playersError } = await fetchPlayers();
    if (data) {
      setPlayers(data);
    }
    if (playersError) {
      setError(playersError);
    }
    
    // Keep player selections, only clear the winner selection for next match
    setMatchResult('');
  };

  // Add a new player
  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;
    
    const playerData: CreatePlayerRequest = {
      name: newPlayerName.trim(),
      main: selectedCharacter || undefined,
      skin: selectedSkin
    };
    
    const result = await apiAddPlayer(playerData);
    
    if (typeof result === 'string') {
      setError(result);
      return;
    }
    
    // Refresh player list after adding a new player
    const { data, error: playersError } = await fetchPlayers();
    if (data) {
      setPlayers(data);
    }
    if (playersError) {
      setError(playersError);
    }
    
    // Reset form
    setNewPlayerName('');
    setSelectedCharacter(null);
    setSelectedSkin(1);
  };

  // Handle sorting
  const handleSort = (column: keyof Player) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Sort players
  const sortedPlayers = [...players].sort((a, b) => {
    const aValue = a[sortBy as keyof Player] as number;
    const bValue = b[sortBy as keyof Player] as number;
    
    if (sortDirection === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Filter functions
  const handleApplyFilters = async () => {
    setIsFiltering(true);
    const result = await filterMatches(filters);
    
    if (typeof result === 'string') {
      setError(result);
    } else {
      setFilteredMatches(result);
      setHasAppliedFilters(true);
    }
    setIsFiltering(false);
  };

  const handleClearFilters = () => {
    setFilters({ limit: 50, offset: 0 });
    setFilteredMatches([]);
    setHasAppliedFilters(false);
    setIsFiltering(false);
  };

  const updateFilter = (key: keyof MatchFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  // Annul match function
  const handleAnnulMatch = async (matchId: number) => {
    if (!window.confirm('Are you sure you want to annul this match? This action cannot be undone.')) {
      return;
    }
    
    const result = await annulMatch(matchId);
    
    if (result) {
      setError(result);
      return;
    }
    
    // Refresh both match history and filtered matches after annulling
    const recentMatches = await getRecentMatches();
    if (typeof recentMatches !== 'string') {
      setMatchHistory(recentMatches);
    }
    
    // If filters are applied, refresh filtered results
    if (hasAppliedFilters) {
      const filteredResult = await filterMatches(filters);
      if (typeof filteredResult !== 'string') {
        setFilteredMatches(filteredResult);
      }
    }
    
    // Refresh player rankings after annulling a match
    const { data, error: playersError } = await fetchPlayers();
    if (data) {
      setPlayers(data);
    }
    if (playersError) {
      setError(playersError);
    }
  };

  // Helper function to format timestamp in GMT-4 timezone without DST adjustments
  const formatTimestampGMT4 = (timestamp: string) => {
    const date = new Date(timestamp);
    
    // Create UTC date then apply fixed GMT-4 offset (subtract 4 hours in milliseconds)
    const utcDate = new Date(date.getTime());
    const gmt4Date = new Date(utcDate.getTime() - (4 * 60 * 60 * 1000));
    
    return gmt4Date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Render login form
  const renderLoginForm = () => (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Admin Login</h2>
      {authError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4" role="alert">
          <p>{authError}</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3">
        <input
          type="text"
          className="px-3 py-2 border rounded"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, handleLoginSubmit)}
        />
        <input
          type="password"
          className="px-3 py-2 border rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, handleLoginSubmit)}
        />
        <button 
          className="w-full bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleLogin}>
          Login
        </button>
      </div>
    </div>
  );

  // Render match history component
  const renderMatchHistory = () => {
    const displayMatches = hasAppliedFilters ? filteredMatches : matchHistory;
    
    return (
      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Match History</h2>
            {hasAppliedFilters && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Filtered ({displayMatches.length} results)
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded mb-4 border">
            <h3 className="text-lg font-medium mb-3">Filter Matches</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Player Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Player (Winner or Loser)</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={filters.playerId || ''}
                  onChange={(e) => updateFilter('playerId', e.target.value)}
                >
                  <option value="">Any Player</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Winner Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Winner</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={filters.winnerId || ''}
                  onChange={(e) => updateFilter('winnerId', e.target.value)}
                >
                  <option value="">Any Winner</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Loser Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">Loser</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={filters.loserId || ''}
                  onChange={(e) => updateFilter('loserId', e.target.value)}
                >
                  <option value="">Any Loser</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded"
                  value={filters.startDate || ''}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </div>
              
              {/* End Date */}
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded"
                  value={filters.endDate || ''}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </div>
              
              {/* Min ELO Change */}
              <div>
                <label className="block text-sm font-medium mb-1">Min ELO Change</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="0"
                  value={filters.minEloChange || ''}
                  onChange={(e) => updateFilter('minEloChange', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              
              {/* Max ELO Change */}
              <div>
                <label className="block text-sm font-medium mb-1">Max ELO Change</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="100"
                  value={filters.maxEloChange || ''}
                  onChange={(e) => updateFilter('maxEloChange', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
              
              {/* Limit */}
              <div>
                <label className="block text-sm font-medium mb-1">Results Limit</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded"
                  placeholder="50"
                  value={filters.limit || ''}
                  onChange={(e) => updateFilter('limit', e.target.value ? parseInt(e.target.value) : 50)}
                />
              </div>
            </div>
            
            {/* Filter Action Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleApplyFilters}
                disabled={isFiltering}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {isFiltering ? 'Filtering...' : 'Apply Filters'}
              </button>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
        
        {displayMatches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 text-left">Date (GMT-4)</th>
                  <th className="px-4 py-2 text-left">Winner</th>
                  <th className="px-4 py-2 text-left">Loser</th>
                  <th className="px-4 py-2 text-left">ELO Change</th>
                  {isLoggedIn && <th className="px-4 py-2 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {displayMatches.map((match) => {
                  // Find player objects based on IDs
                  const winnerPlayer = players.find(p => p.id === parseInt(match.winnerId));
                  const loserPlayer = players.find(p => p.id === parseInt(match.loserId));
                  const winnerName = winnerPlayer?.name || match.winnerId;
                  const loserName = loserPlayer?.name || match.loserId;
                  
                  // Format timestamp to GMT-4 timezone
                  const formattedTime = formatTimestampGMT4(match.timestamp);
                  
                  return (
                    <tr key={match.id} className="border-b">
                      <td className="px-4 py-2">{formattedTime}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {winnerPlayer && <PlayerIcon player={winnerPlayer} size="small" />}
                          <span className="font-medium text-green-600">
                            {winnerName} <span className="text-gray-600">({match.winnerCurrentElo})</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {loserPlayer && <PlayerIcon player={loserPlayer} size="small" />}
                          <span className="text-red-600">
                            {loserName} <span className="text-gray-600">({match.loserCurrentElo})</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 font-bold text-green-600">±{match.eloChange}</td>
                      {isLoggedIn && (
                        <td className="px-4 py-2">
                          <button
                            onClick={() => handleAnnulMatch(match.id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            Annul
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            {isFiltering ? 'Loading...' : hasAppliedFilters ? 'No matches found matching the current filters.' : 'No matches recorded yet.'}
          </p>
        )}
      </div>
    );
  };

  // Recent Matches section (in the ladder view's left column)
  const renderRecentMatches = () => (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Recent Matches</h2>
      {matchHistory.length > 0 ? (
        <div className="overflow-y-auto max-h-64">
          {matchHistory.slice(0, 5).map((match) => {
            // Find player objects based on IDs
            const winnerPlayer = players.find(p => p.id === parseInt(match.winnerId));
            const loserPlayer = players.find(p => p.id === parseInt(match.loserId));
            const winnerName = winnerPlayer?.name || match.winnerId;
            const loserName = loserPlayer?.name || match.loserId;
            
            // Format timestamp to GMT-4 timezone
            const formattedTime = formatTimestampGMT4(match.timestamp);
            
            return (
              <div key={match.id} className="border-b py-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{formattedTime}</span>
                  <span className="font-bold text-base">
                    <span className="text-green-600">
                      ±{match.eloChange}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {winnerPlayer && <PlayerIcon player={winnerPlayer} size="small" />}
                    <span className="font-medium text-green-600">{winnerName} <span className="text-gray-600">({match.winnerCurrentElo})</span></span>
                  </div>
                  <span className="text-gray-500">defeated</span>
                  <div className="flex items-center gap-1">
                    {loserPlayer && <PlayerIcon player={loserPlayer} size="small" />}
                    <span className="text-red-600">{loserName} <span className="text-gray-600">({match.loserCurrentElo})</span></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No matches recorded yet.</p>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 bg-gray-50 rounded-lg shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-800">ELO Ladder Management</h1>
        {isLoggedIn && (
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
          >
            Logout
          </button>
        )}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-center mb-6">
        <button 
          className={`px-4 py-2 mx-2 rounded ${view === 'ladder' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('ladder')}>
          Ladder
        </button>
        <button 
          className={`px-4 py-2 mx-2 rounded ${view === 'matches' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setView('matches')}>
          Match History
        </button>
      </div>
      
      {/* Display loading state */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-xl text-gray-600">Loading players data...</p>
        </div>
      )}
      
      {/* Display error message if any */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Ladder View with 2-column layout */}
      {!loading && view === 'ladder' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Left Column - Forms */}
          <div className="col-span-2 space-y-6">
            {/* Login Form or Add Player & Record Match Forms */}
            {!isLoggedIn ? (
              renderLoginForm()
            ) : (
              <>
                {/* Add Player Form */}
                <div className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-4">Add New Player</h2>
                  <div className="flex gap-3" style={{ flexDirection: 'column' }}>
                    <input 
                      type="text" 
                      className="flex-1 px-3 py-2 border rounded" 
                      placeholder="Player Name" 
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleAddPlayerSubmit)}
                    />
                    
                    <div className="flex gap-2" style={{ justifyContent: 'space-between' }}>
                      <select 
                        className="p-2 border flex-1 rounded"
                        value={selectedCharacter || ''}
                        onChange={(e) => setSelectedCharacter(e.target.value ? parseInt(e.target.value) : null)}
                      >
                        <option value="">Select Character</option>
                        {characters.map(character => (
                          <option key={character.id} value={character.id}>
                            {character.name}
                          </option>
                        ))}
                      </select>
                      
                      {selectedCharacter && (
                        <div className="flex">
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((skinNumber) => {
                            const selectedChar = characters.find(c => c.id === selectedCharacter);
                            const iconSrc = selectedChar ? `/icons/stock/${selectedChar.icon_name}${skinNumber}.png` : '/icons/stock/default1.png';
                            
                            return (
                              <button
                                key={skinNumber}
                                type="button"
                                className={`p-1 border ${skinNumber === 1 ? 'rounded-l' : ''} ${skinNumber === 8 ? 'rounded-r' : ''} ${selectedSkin === skinNumber ? 'bg-blue-100 border-blue-500' : 'bg-white'}`}
                                onClick={() => setSelectedSkin(skinNumber)}
                              >
                                <img 
                                  src={iconSrc}
                                  alt={`${selectedChar?.name || 'Character'} Skin ${skinNumber}`} 
                                  className="w-8 h-8 rounded-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/icons/stock/default1.png';
                                  }}
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <button 
                      className="bg-green-600 text-white px-4 py-2 rounded"
                      onClick={addPlayer}
                    >
                      Add Player
                    </button>
                  </div>
                </div>

                {/* Record Match Form */}
                <div className="bg-white p-4 rounded shadow">
                  <h2 className="text-xl font-semibold mb-4">Record Match</h2>
                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <select 
                      className="p-2 border rounded"
                      value={player1}
                      onChange={(e) => setPlayer1(e.target.value)}>
                      <option value="">Select Player 1</option>
                      {players.map(player => (
                        <option key={`p1-${player.id}`} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                    <select 
                      className="p-2 border rounded"
                      value={player2}
                      onChange={(e) => setPlayer2(e.target.value)}>
                      <option value="">Select Player 2</option>
                      {players.map(player => (
                        <option key={`p2-${player.id}`} value={player.id} disabled={player.id.toString() === player1}>
                          {player.name}
                        </option>
                      ))}
                    </select>
                    <select 
                      className="p-2 border rounded"
                      value={matchResult}
                      onChange={(e) => setMatchResult(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, handleRecordMatchSubmit)}>
                      <option value="">Select Winner</option>
                      {player1 && <option value={player1}>{players.find(p => p.id === parseInt(player1))?.name}</option>}
                      {player2 && <option value={player2}>{players.find(p => p.id === parseInt(player2))?.name}</option>}
                    </select>
                  </div>
                  <button 
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={handleRecordMatch}
                    disabled={!player1 || !player2 || !matchResult}>
                    Record Match
                  </button>
                </div>
              </>
            )}
            
            {/* Recent Matches (shown only in ladder view's left column) */}
            {renderRecentMatches()}
          </div>
          
          {/* Right Column - Rankings */}
          <div className="col-span-3 bg-white p-4 rounded shadow">
            <h2 className="text-xl font-semibold mb-4">Player Rankings</h2>
            
            {/* Winners Podium */}
            {sortedPlayers.length >= 3 && (
              <div className="mb-6">
                <div className="flex justify-center items-end gap-4 mb-4">
                  {/* 2nd Place */}
                  <div className="text-center">
                    <div className="bg-gradient-to-t from-gray-300 to-gray-400 rounded-lg p-4 mb-2 h-24 flex flex-col justify-end shadow-md">
                      <div className="flex flex-col items-center">
                        <PlayerIcon player={sortedPlayers[1]} size="medium" />
                        <div className="text-white font-bold text-sm mt-1">{sortedPlayers[1].name}</div>
                      </div>
                    </div>
                    <div className="bg-gray-400 text-white text-xs font-bold py-1 px-2 rounded">
                      2nd - {sortedPlayers[1].elo} ELO
                    </div>
                  </div>
                  
                  {/* 1st Place */}
                  <div className="text-center">
                    <div className="bg-gradient-to-t from-yellow-400 to-yellow-500 rounded-lg p-4 mb-2 h-32 flex flex-col justify-end shadow-lg border-2 border-yellow-300">
                      <div className="flex flex-col items-center">
                        <div className="text-2xl mb-1">👑</div>
                        <PlayerIcon player={sortedPlayers[0]} size="medium" />
                        <div className="text-white font-bold text-sm mt-1">{sortedPlayers[0].name}</div>
                      </div>
                    </div>
                    <div className="bg-yellow-500 text-white text-xs font-bold py-1 px-2 rounded">
                      1st - {sortedPlayers[0].elo} ELO
                    </div>
                  </div>
                  
                  {/* 3rd Place */}
                  <div className="text-center">
                    <div className="bg-gradient-to-t from-orange-400 to-orange-500 rounded-lg p-4 mb-2 h-20 flex flex-col justify-end shadow-md">
                      <div className="flex flex-col items-center">
                        <PlayerIcon player={sortedPlayers[2]} size="medium" />
                        <div className="text-white font-bold text-sm mt-1">{sortedPlayers[2].name}</div>
                      </div>
                    </div>
                    <div className="bg-orange-500 text-white text-xs font-bold py-1 px-2 rounded">
                      3rd - {sortedPlayers[2].elo} ELO
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Player</th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleSort('elo')}>
                      ELO {sortBy === 'elo' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleSort('matchesPlayed')}>
                      MP {sortBy === 'matchesPlayed' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleSort('wins')}>
                      W {sortBy === 'wins' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-4 py-2 text-left cursor-pointer"
                      onClick={() => handleSort('losses')}>
                      L {sortBy === 'losses' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlayers.slice(sortedPlayers.length >= 3 ? 3 : 0).map((player, index) => {
                    const actualRank = sortedPlayers.length >= 3 ? index + 4 : index + 1;
                    return (
                      <tr key={player.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-2">{actualRank}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <PlayerIcon player={player} size="medium" />
                            <span className="font-medium">{player.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">{player.elo}</td>
                        <td className="px-4 py-2">{player.matchesPlayed}</td>
                        <td className="px-4 py-2">{player.wins}</td>
                        <td className="px-4 py-2">{player.losses}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Match History View */}
      {view === 'matches' && renderMatchHistory()}
    </div>
  );
};

export default App;