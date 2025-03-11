import React, { useState, useEffect } from 'react';
import { fetchPlayers, Player, addPlayer as apiAddPlayer } from './services/playerService';
import { recordMatch, Match, getRecentMatches } from './services/matchService';
import { login, logout, isAuthenticated, LoginCredentials, getTokenRemainingTime, isTokenExpired } from './services/authService';

const App = () => {
  // Auth States
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  // States
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [matchResult, setMatchResult] = useState('');
  const [sortBy, setSortBy] = useState('elo');
  const [sortDirection, setSortDirection] = useState('desc');
  const [matchHistory, setMatchHistory] = useState<Match[]>([]);
  const [view, setView] = useState('ladder');

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
      const { data, error } = await fetchPlayers();
      setPlayers(data);
      setError(error);
      
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
    
    setPlayer1('');
    setPlayer2('');
    setMatchResult('');
  };

  // Add a new player
  const addPlayer = async () => {
    if (!newPlayerName.trim()) return;
    
    const result = await apiAddPlayer(newPlayerName);
    
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
    
    setNewPlayerName('');
  };

  // Handle sorting
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Sort players
  const sortedPlayers = [...players].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a[sortBy] - b[sortBy];
    } else {
      return b[sortBy] - a[sortBy];
    }
  });

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
        />
        <input
          type="password"
          className="px-3 py-2 border rounded"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
  const renderMatchHistory = () => (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Match History</h2>
      {matchHistory.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 text-left">Date (GMT-4)</th>
                <th className="px-4 py-2 text-left">Winner</th>
                <th className="px-4 py-2 text-left">Loser</th>
                <th className="px-4 py-2 text-left">ELO Change</th>
              </tr>
            </thead>
            <tbody>
              {matchHistory.map((match) => {
                // Find player names based on IDs
                const winner = players.find(p => p.id === parseInt(match.winnerId))?.name || match.winnerId;
                const loser = players.find(p => p.id === parseInt(match.loserId))?.name || match.loserId;
                
                // Format timestamp to GMT-4 timezone
                const formattedTime = formatTimestampGMT4(match.timestamp);
                
                return (
                  <tr key={match.id} className="border-b">
                    <td className="px-4 py-2">{formattedTime}</td>
                    <td className="px-4 py-2 font-medium text-green-600">
                      {winner} <span className="text-gray-600">({match.winnerCurrentElo})</span>
                    </td>
                    <td className="px-4 py-2 text-red-600">
                      {loser} <span className="text-gray-600">({match.loserCurrentElo})</span>
                    </td>
                    <td className="px-4 py-2">±{match.eloChange}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No matches recorded yet.</p>
      )}
    </div>
  );

  // Recent Matches section (in the ladder view's left column)
  const renderRecentMatches = () => (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Recent Matches</h2>
      {matchHistory.length > 0 ? (
        <div className="overflow-y-auto max-h-64">
          {matchHistory.slice(0, 5).map((match) => {
            // Find player names based on IDs
            const winner = players.find(p => p.id === parseInt(match.winnerId))?.name || match.winnerId;
            const loser = players.find(p => p.id === parseInt(match.loserId))?.name || match.loserId;
            
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
                <div>
                  <span className="font-medium text-green-600">{winner} <span className="text-gray-600">({match.winnerCurrentElo})</span></span> defeated 
                  <span className="text-red-600"> {loser} <span className="text-gray-600">({match.loserCurrentElo})</span></span>
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
                  <div className="flex">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border rounded-l"
                      placeholder="Player Name"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                    />
                    <button 
                      className="bg-green-600 text-white px-4 py-2 rounded-r"
                      onClick={addPlayer}>
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
                      onChange={(e) => setMatchResult(e.target.value)}>
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
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Name</th>
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
                  {sortedPlayers.map((player, index) => (
                    <tr key={player.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{player.name}</td>
                      <td className="px-4 py-2">{player.elo}</td>
                      <td className="px-4 py-2">{player.matchesPlayed}</td>
                      <td className="px-4 py-2">{player.wins}</td>
                      <td className="px-4 py-2">{player.losses}</td>
                    </tr>
                  ))}
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