"use client"
import React, { useRef, useEffect, useState } from "react";
import styles from "@/styles/page.module.css";
import { useParams } from "next/navigation";
import { useLobbySocket } from "@/hooks/useLobbySocket";

// Update the interface to match the expected message format
interface SnakeData {
  [username: string]: [number, number][];
}

interface GameStateMessage {
  type: string;
  snakes: SnakeData;
  cookies: [number, number][];
  timestamp?: number;
}

const GamePage: React.FC = () => {
  // Grid dimensions
  const COLS = 30;
  const ROWS = 25;
  
  // Game state - update to match expected message format
  const [gameLive, setGameLive] = useState(false);
  const [isAlive, setIsAlive] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [snakes, setSnakes] = useState<SnakeData>({});
  const [cookiesLocations, setCookiesLocations] = useState<[number, number][]>([]);
  const [timestamp, setTimestamp] = useState<number>(0);
  
  // Get lobby code from URL parameters
  const params = useParams();
  const lobbyCode = params.code as string;
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, disconnect } = useLobbySocket();
  
  // Reference to store all grid cells for direct access
  const gridCellsRef = useRef<HTMLDivElement[]>([]);
  
  // Log the current username from localStorage
  useEffect(() => {
    const currentUsername = localStorage.getItem("username");
    console.log("Current user playing the game:", currentUsername);
  }, []);
  
  // Establish WebSocket connection on component mount
  useEffect(() => {
    const establishConnection = async () => {
      try {
        // Get the authentication token
        const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
        
        // Connect with both token and lobbyCode
        const socket = await connect({ token, lobbyCode });
        
        if (socket) {
          // Set up message handler
          socket.onmessage = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              console.log("Received message:", data);
              
              // Handle pre-game countdown messages
              if (data.type === 'preGame') {
                setGameLive(false);
                setCountdown(data.countdown);
                
                // Convert data to our internal format if needed
                if (data.snakes) {
                  setSnakes(data.snakes);
                } else if (data.players) {
                  // Handle legacy format for compatibility
                  const convertedSnakes: SnakeData = {};
                  Object.entries(data.players as Record<string, number[]>).forEach(([username, positions]) => {
                    convertedSnakes[username] = positions.map(pos => indexToColRow(pos));
                  });
                  setSnakes(convertedSnakes);
                }
                
                // Handle cookies in the new format
                if (Array.isArray(data.cookies) && data.cookies.length > 0 && Array.isArray(data.cookies[0])) {
                  setCookiesLocations(data.cookies);
                } else if (Array.isArray(data.cookies)) {
                  // Convert legacy format (array of indexes) to [col, row] format
                  setCookiesLocations(data.cookies.map((index: number) => indexToColRow(index)));
                }
                
                // Render all elements with the newly set state
                renderGameElements();
              }
              
              // Handle gameState updates with the new expected format
              if (data.type === 'gamestate') {
                setGameLive(true);
                setCountdown(null);
                
                // Set the snakes data from the message
                setSnakes(data.snakes || {});
                
                // Set cookies data
                setCookiesLocations(data.cookies || []);
                
                // Update timestamp if available
                if (data.timestamp !== undefined) {
                  setTimestamp(data.timestamp);
                }

                // Check if the current player is alive
                const currentUsername = localStorage.getItem("username");
                if (currentUsername && data.snakes) {
                  // If the player's position array is empty or doesn't exist, they're dead
                  const playerSnake = data.snakes[currentUsername];
                  const playerIsAlive = playerSnake && playerSnake.length > 0;
                  setIsAlive(playerIsAlive);
                  
                  if (!playerIsAlive && isAlive) {
                    console.log("Player has died!");
                  }
                }
                
                // Render all elements with updated positions
                renderGameElements();
              }
              
            } catch (error) {
              console.error("Error parsing message:", error);
            }
          };
        }
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
      }
    };

    establishConnection();

    // Clean up on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect, lobbyCode, isAlive]);

  // Function to format timestamp in MM:SS format
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle keyboard input for snake movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      let direction: string | null = null;
      
      // Map arrow keys to directions
      switch (event.key) {
        case 'ArrowUp':
            direction = 'up';
          break;
        case 'ArrowDown':
            direction = 'down';
          break;
        case 'ArrowLeft':
            direction = 'left';
          break;
        case 'ArrowRight':
            direction = 'right';
          break;
        case 'w':
            direction = 'up';
          break;
        case 's':
            direction = 'down';
            break;
        case 'a':
            direction = 'left';
            break;
        case 'd':
            direction = 'right';
            break;

        default:
          return; // Ignore other keys
      }
      
      // Send movement direction to the server
      if (direction && gameLive && isAlive) {
        send({
          type: 'player_move',
          direction: direction
        });
        console.log(`Sent direction: ${direction}`);
      }
    };
    
    // Add event listener for key presses
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameLive, isAlive, send]);

  // Function to render all game elements (snakes and cookies)
  const renderGameElements = () => {
    // Clear all cells first
    clearAllCells();
    
    // Get sorted list of player usernames to ensure consistent color assignment
    const playerUsernames = Object.keys(snakes);
    
    // Render each player's snake with colors assigned by position in the list
    playerUsernames.forEach((username, playerIndex) => {
      renderPlayerSnake(username, snakes[username], playerIndex);
    });
    
    // Render cookies
    renderCookies(cookiesLocations);
  };
  
  // Function to get sorted players for the leaderboard
  const getSortedPlayers = (): { username: string; length: number; index: number }[] => {
    // Map players to include username, length and index
    const playerArray = Object.entries(snakes).map(([username, positions], index) => ({
      username,
      length: positions ? positions.length : 0,
      index
    }));
    
    // Sort by length in descending order
    return playerArray.sort((a, b) => b.length - a.length);
  };
  
  // Function to clear all cell styles
  const clearAllCells = () => {
    gridCellsRef.current.forEach(cell => {
      if (cell) {
        cell.classList.remove(
          styles.circle, 
          styles.firstSquare, 
          styles.playerCell, 
          styles.cookieCell
        );
        // Remove any inline styles for player colors
        cell.style.setProperty('--player-color', '');
      }
    });
  };
  
  // Updated function to render a player's snake using [col, row] coordinates
  const renderPlayerSnake = (username: string, positions: [number, number][], playerIndex: number) => {
    if (!positions || positions.length === 0) return;
    
    // Assign colors based on player order rather than specific usernames
    const playerColors = [
      '#FF0000', // Red (1st player)
      '#0000FF', // Blue (2nd player)
      '#FFFF00', // Yellow (3rd player)
      '#8A2BE2'  // Violet (4th player)
    ];
    
    // Get color from player index, fallback to hash color if more than 4 players
    let playerColor: string;
    if (playerIndex < playerColors.length) {
      playerColor = playerColors[playerIndex];
    } else {
      playerColor = stringToColor(username); // Fallback for extra players
    }
    
    // Get current username
    const currentUsername = localStorage.getItem("username");
    
    positions.forEach((position, i) => {
      // Convert [col, row] to grid cell index
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(styles.playerCell);
        
        // Set custom color for this player
        cell.style.setProperty('--player-color', playerColor);
        
        // Highlight the snake head
        if (i === 0) {
          cell.classList.add(styles.firstSquare);
        }
        
        // Add indicator if this is the current player's snake
        if (username === currentUsername) {
          cell.classList.add(styles.currentPlayerCell);
        }
      }
    });
  };
  
  // Updated function to render cookies using [col, row] coordinates
  const renderCookies = (positions: [number, number][]) => {
    if (!positions || positions.length === 0) return;
    
    positions.forEach(position => {
      // Convert [col, row] to grid cell index
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(styles.cookieCell);
      }
    });
  };
  
  // Utility function to convert [col, row] to linear index
  const colRowToIndex = (col: number, row: number): number => {
    return row * COLS + col;
  };
  
  // Utility function to convert linear index to [col, row]
  const indexToColRow = (index: number): [number, number] => {
    return [index % COLS, Math.floor(index / COLS)];
  };

  // Helper function to generate a color from a string
  const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    return color;
  };

  // Create a 30x25 grid
  const renderGrid = () => {
    const grid = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Calculate the linear index
        const index = row * COLS + col;
        grid.push(
          <div 
            key={`${row}-${col}`} 
            className={styles.gridCell}
            data-row={row}
            data-col={col}
            data-index={index}
            ref={el => {
              if (el) gridCellsRef.current[index] = el;
            }}
          />
        );
      }
    }
    return grid;
  };

  // Function to access a cell by index
  const getCell = (index: number): HTMLDivElement | null => {
    if (index >= 0 && index < ROWS * COLS) {
      return gridCellsRef.current[index] || null;
    }
    return null;
  };

  return (
    <div className={styles.mainPage}>
      
      {/* Timer display */}
      {gameLive && (
        <div className={styles.timer}>
          Time: {formatTime(timestamp)}
        </div>
      )}
      
      {/* Statistics Leaderboard */}
      <div className={styles.leaderboard}>
        <h3>Leaderboard</h3>
        <table className={styles.leaderboardTable}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Length</th>
            </tr>
          </thead>
          <tbody>
            {getSortedPlayers().map((player, index) => {
              // Get the player color for the rank
              const playerColors = [
                '#FF0000', // Red (1st player)
                '#0000FF', // Blue (2nd player)
                '#FFFF00', // Yellow (3rd player)
                '#8A2BE2'  // Violet (4th player)
              ];
              
              const playerColor = player.index < playerColors.length 
                ? playerColors[player.index] 
                : stringToColor(player.username);
              
              // Check if this is the current player
              const currentUsername = localStorage.getItem("username");
              const isCurrentPlayer = player.username === currentUsername;
              
              return (
                <tr 
                  key={index} 
                  className={isCurrentPlayer ? styles.currentPlayerRow : ''}
                  style={{ '--player-row-color': playerColor } as React.CSSProperties}
                >
                  <td>{index + 1}</td>
                  <td>{player.username}</td>
                  <td>{player.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Overlay for when game is not live */}
      {!gameLive && (
        <div className={styles.gameOverlay}></div>
      )}
      
      {/* Game grid */}
      <div className={`${styles.gameContainer} ${!gameLive ? styles.blurred : ''}`}>
        <div className={styles.gameGrid}>
          {renderGrid()}
        </div>
      </div>
      
      {/* Big countdown circle positioned outside the blurred container */}
      {countdown !== null && !gameLive && (
        <div className={styles.countdownCircle}>
          <span>{countdown}</span>
        </div>
      )}
    </div>
  );
};

export default GamePage;
