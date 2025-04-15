"use client"
import React, { useRef, useEffect, useState, useCallback } from "react";
import styles from "@/styles/page.module.css";
import { useParams, useRouter } from "next/navigation";
import { useLobbySocket } from "@/hooks/useLobbySocket";

// Update the interface to match the expected message format
interface SnakeData {
  [username: string]: [number, number][];
}

const GamePage: React.FC = () => {
  // Grid dimensions
  const COLS = 30;
  const ROWS = 25;
  
  // Game state - update to match expected message format
  const [gameLive, setGameLive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [snakes, setSnakes] = useState<SnakeData>({});
  // Store cookies locations in state but don't directly reference them
  // We'll use this state to track cookies, but we'll pass the data directly to renderCookies
  const [, setCookiesLocations] = useState<[number, number][]>([]);
  const [timestamp, setTimestamp] = useState<number>(0);
  const [playerIsDead, setPlayerIsDead] = useState(false); // Add state for tracking player death
  const [showDeathScreen, setShowDeathScreen] = useState(false); // Add state for showing the death screen
  const [showSpectatorOverlay, setShowSpectatorOverlay] = useState(false); // Add state for spectator overlay
  
  // Get lobby code from URL parameters
  const params = useParams();
  const lobbyCode = params.code as string;
  
  // Initialize WebSocket connection
  const { isConnected, getSocket, connect, send, disconnect } = useLobbySocket();
  
  const intentionalDisconnect = useRef(false);

  const [connectionError, setConnectionError] = useState(false);
  // Reference to store all grid cells for direct access
  const gridCellsRef = useRef<HTMLDivElement[]>([]);
  
  // Add router for navigation
  const router = useRouter();
  
  // Utility function to convert [col, row] to linear index
  const colRowToIndex = useCallback((col: number, row: number): number => {
    return row * COLS + col;
  }, [COLS]);
  
  // Utility function to convert linear index to [col, row]
  const indexToColRow = useCallback((index: number): [number, number] => {
    return [index % COLS, Math.floor(index / COLS)];
  }, [COLS]);
  
  // Function to access a cell by index
  const getCell = useCallback((index: number): HTMLDivElement | null => {
    if (index >= 0 && index < ROWS * COLS) {
      return gridCellsRef.current[index] || null;
    }
    return null;
  }, [ROWS, COLS]);
  
  // Updated function to clear all cell styles, including new classes
  const clearAllCells = useCallback(() => {
    gridCellsRef.current.forEach(cell => {
      if (cell) {
        cell.classList.remove(
          styles.circle,
          styles.firstSquare,
          styles.lastSquare,
          styles.curveBody,
          styles.playerCell,
          styles.cookieCell,
          styles.currentPlayerCell,
          styles.playerRed,
          styles.playerBlue,
          styles.playerGreen,
          styles.playerPurple
        );
        // Remove any inline styles for player colors
        cell.style.setProperty('--player-color', '');
      }
    });
  }, []);
  
  // Helper function to generate a color from a string
  const stringToColor = useCallback((str: string): string => {
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
  }, []);
  
  // Updated function to render a player's snake using [col, row] coordinates with PNG images
  const renderPlayerSnake = useCallback((username: string, positions: [number, number][], playerIndex: number) => {
    if (!positions || positions.length === 0) return;
    
    // Define color classes based on player index
    const playerColorClasses = [
      styles.playerRed,     // Red (1st player)
      styles.playerBlue,    // Blue (2nd player) 
      styles.playerGreen,   // Green (3rd player)
      styles.playerPurple   // Purple (4th player)
    ];
    
    // Get the appropriate color class for this player
    let playerColorClass = '';
    if (playerIndex < playerColorClasses.length) {
      playerColorClass = playerColorClasses[playerIndex];
    }
    
    // Get current username for highlighting the current player's snake
    const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';

    // Calculate rotation angles for curved segments
    const getRotationAngle = (prev: [number, number], current: [number, number], next: [number, number]): number | null => {
      // If it's a straight line (horizontally or vertically), no rotation needed
      if (
        (prev[0] === current[0] && current[0] === next[0]) || // Vertical line
        (prev[1] === current[1] && current[1] === next[1])    // Horizontal line
      ) {
        return null;
      }

      // Determine the rotation angle based on the direction change
      // From left to up or from down to right
      if ((prev[0] < current[0] && next[1] < current[1]) || (prev[1] > current[1] && next[0] > current[0])) {
        return 0; // No rotation needed for this curve orientation
      }
      // From right to up or from down to left
      else if ((prev[0] > current[0] && next[1] < current[1]) || (prev[1] > current[1] && next[0] < current[0])) {
        return 90; // 90 degrees clockwise
      }
      // From left to down or from up to right
      else if ((prev[0] < current[0] && next[1] > current[1]) || (prev[1] < current[1] && next[0] > current[0])) {
        return 270; // 90 degrees counterclockwise (or 270 clockwise)
      }
      // From right to down or from up to left
      else if ((prev[0] > current[0] && next[1] > current[1]) || (prev[1] < current[1] && next[0] < current[0])) {
        return 180; // 180 degrees
      }

      return null;
    };
    
    positions.forEach((position, i) => {
      // Convert [col, row] to grid cell index
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(styles.playerCell);
        
        // Add color class to apply the correct filter
        if (playerColorClass) {
          cell.classList.add(playerColorClass);
        }
        
        // Mark head (first element)
        if (i === 0) {
          cell.classList.add(styles.firstSquare);
          
          // Calculate head rotation based on the next segment (if it exists)
          if (positions.length > 1) {
            const head = positions[0];
            const neck = positions[1];
            
            // Determine the direction the head is facing (adjusted by -90 degrees)
            let rotationDeg = 0;
            if (neck[0] < head[0]) rotationDeg = 90;    // Head facing right
            else if (neck[0] > head[0]) rotationDeg = -90;  // Head facing left
            else if (neck[1] < head[1]) rotationDeg = 180;   // Head facing down
            else if (neck[1] > head[1]) rotationDeg = 0; // Head facing up
            
            // Apply rotation using inline style
            cell.style.setProperty('--rotation', `${rotationDeg}deg`);
          }
        }
        
        // Mark tail (last element)
        else if (i === positions.length - 1) {
          cell.classList.add(styles.lastSquare);
          
          // Calculate tail rotation based on the previous segment
          if (positions.length > 1) {
            const tail = positions[positions.length - 1];
            const beforeTail = positions[positions.length - 2];
            
            // Determine the direction the tail is facing (adjusted by -90 degrees)
            let rotationDeg = 0;
            if (beforeTail[0] > tail[0]) rotationDeg = 90;    // Tail facing left
            else if (beforeTail[0] < tail[0]) rotationDeg = -90;   // Tail facing right
            else if (beforeTail[1] > tail[1]) rotationDeg = 180;    // Tail facing up
            else if (beforeTail[1] < tail[1]) rotationDeg = 0;  // Tail facing down
            
            // Apply rotation using inline style
            cell.style.setProperty('--rotation', `${rotationDeg}deg`);
          }
        }
        
        // Handle body segments (check if curved)
        else {
          const prev = positions[i - 1];   // Previous segment
          const current = position;        // Current segment
          const next = positions[i + 1];   // Next segment
          
          // Check if this is a curve (direction changes)
          const isCurve = 
            (prev[0] !== next[0] && prev[1] !== next[1]); // Neither x nor y coordinates are the same
          
          if (isCurve) {
            // This is a curved segment
            cell.classList.add(styles.curveBody);
            
            // Define curve types based on movement direction
            // For each case, we need to know where the snake is coming from (prev)
            // and where it's going (next) relative to the current position
            
            // Bottom-Right curve (coming from down, going left OR coming from left, going down)
            if ((prev[0] < current[0] && next[1] > current[1]) || 
                (prev[1] > current[1] && next[0] < current[0])) {
              cell.style.setProperty('--rotation', '90deg');
            }
            
            // Bottom-Left curve (coming from right, going down OR coming from up, going left)
            else if ((prev[0] < current[0] && next[1] < current[1]) || 
                     (prev[1] < current[1] && next[0] < current[0])) {
              cell.style.setProperty('--rotation', '180deg');
            }
            
            // Top-Left curve (coming from right, going up OR coming from down, going left)
            else if ((prev[0] > current[0] && next[1] < current[1]) || 
                     (prev[1] < current[1] && next[0] > current[0])) {
              cell.style.setProperty('--rotation', '270deg');
            }
            
            // Top-Right curve (coming from left, going up OR coming from down, going right)
            else if ((prev[0] > current[0] && next[1] > current[1]) || 
                     (prev[1] > current[1] && next[0] > current[0])) {
              cell.style.setProperty('--rotation', '0deg');
            }
          } else {
            // This is a straight segment (adjusted by -90 degrees)
            if (prev[0] === next[0]) {
              // Vertical segment
              cell.style.setProperty('--rotation', '0deg');  // Adjusted from 90 to 0
            } else {
              // Horizontal segment
              cell.style.setProperty('--rotation', '-90deg'); // Adjusted from 0 to -90
            }
          }
        }
        
        // Add indicator if this is the current player's snake
        if (username === currentUsername) {
          cell.classList.add(styles.currentPlayerCell);
        }
      }
    });
  }, [colRowToIndex, getCell]);
  
  // Updated function to render cookies using [col, row] coordinates
  const renderCookies = useCallback((positions: [number, number][]) => {
    if (!positions || positions.length === 0) return;
    
    positions.forEach(position => {
      // Convert [col, row] to grid cell index
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(styles.cookieCell);
      }
    });
  }, [colRowToIndex, getCell]);
  
  // Function to render all player snakes immediately without waiting for state update
  const renderPlayerSnakes = useCallback((snakesData: SnakeData) => {
    // Clear all cells first to avoid overlapping renders
    clearAllCells();
    
    // Get sorted list of player usernames to ensure consistent color assignment
    const playerUsernames = Object.keys(snakesData);
    
    // Render each player's snake with colors assigned by position in the list
    playerUsernames.forEach((username, playerIndex) => {
      renderPlayerSnake(username, snakesData[username], playerIndex);
    });
  }, [clearAllCells, renderPlayerSnake]);

  useEffect(() => {
    // Handle browser close or refresh
    const handleBeforeUnload = () => {
      console.log("Browser closing, disconnecting WebSocket");
      intentionalDisconnect.current = true;
      disconnect();
    };
    
    // Handle browser back button
    const handlePopState = () => {
      console.log("Browser back button pressed, disconnecting WebSocket");
      intentionalDisconnect.current = true;
      disconnect();
    };
    
    // Add event listeners
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [disconnect]);

  // Log the current username from localStorage
  useEffect(() => {
    const currentUsername = localStorage.getItem("username");
    console.log("Current user playing the game:", currentUsername);
  }, []);
  
  // Establish WebSocket connection on component mount - now this comes after all the functions are defined
  useEffect(() => {
    const setupWebSocket = async () => {
      try {

        let socket
        if (!isConnected) {
        // Get the authentication token
          const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
        
        // Connect with both token and lobbyCode
          socket = await connect({ token, lobbyCode });
          console.log("WebSocket connection established for game page");
        }

        const currentSocket = socket || (isConnected ? getSocket() : null);
        
        if (currentSocket) {
          // Set up message handler
          currentSocket.onmessage = (event: MessageEvent) => {
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
                  // Update snake positions immediately without waiting for state update
                  renderPlayerSnakes(data.snakes);
                } else if (data.players) {
                  // Handle legacy format for compatibility
                  const convertedSnakes: SnakeData = {};
                  Object.entries(data.players as Record<string, number[]>).forEach(([username, positions]) => {
                    convertedSnakes[username] = positions.map(pos => indexToColRow(pos));
                  });
                  setSnakes(convertedSnakes);
                  // Update snake positions immediately
                  renderPlayerSnakes(convertedSnakes);
                }
                
                // Handle cookies in the new format
                let cookiePositions: [number, number][] = [];
                if (Array.isArray(data.cookies) && data.cookies.length > 0 && Array.isArray(data.cookies[0])) {
                  cookiePositions = data.cookies;
                  setCookiesLocations(data.cookies);
                } else if (Array.isArray(data.cookies)) {
                  // Convert legacy format (array of indexes) to [col, row] format
                  cookiePositions = data.cookies.map((index: number) => indexToColRow(index));
                  setCookiesLocations(cookiePositions);
                }
                
                // Render cookies immediately
                renderCookies(cookiePositions);

                // Reset player death state when game is restarting
                setPlayerIsDead(false);
                setConnectionError(false);
              }
              
              // Handle gameState updates with the new expected format
              else if (data.type === 'gameState') {
                setGameLive(true);
                setCountdown(null);
                
                // Set the snakes data from the message
                setSnakes(data.snakes || {});
                
                // Update snake positions immediately without waiting for state update
                renderPlayerSnakes(data.snakes || {});
                
                // Set cookies data
                setCookiesLocations(data.cookies || []);
                
                // Render cookies immediately
                renderCookies(data.cookies || []);
                
                // Update timestamp if available
                if (data.timestamp !== undefined) {
                  setTimestamp(data.timestamp);
                }

                // Check if current player is dead
                const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';
                const isAlive = data.snakes && 
                               data.snakes[currentUsername] && 
                               data.snakes[currentUsername].length > 0;
                
                setPlayerIsDead(gameLive && !isAlive);
              
              setConnectionError(false);
            }
            else if (data.type === "connection_success") {
              console.log("WebSocket connection established successfully");
              setConnectionError(false);
            }
            else if (data.type === 'error') {
              console.error("WebSocket error:", data.message);
              setConnectionError(true);
            } 
            }catch (error) {
              console.error("Error parsing WebSocket message:", error);
              setConnectionError(true);
            }
          };
        }
      } catch (error) { 
        console.error("Failed to connect to Websocket:", error);
        setConnectionError(true); 
      }
    };
    setupWebSocket();

    // Clean up on unmount
    return () => {
      if (intentionalDisconnect.current) {
        console.log("Disconnecting WebSocket on unmount");
        disconnect();
      }else {
        console.log("Not disconnecting WebSocket on unmount");
      }
    };
  }, [connect, disconnect, getSocket, isConnected, lobbyCode, renderPlayerSnakes, renderCookies, indexToColRow, gameLive]);

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
            direction = 'UP';
          break;
        case 'ArrowDown':
            direction = 'DOWN';
          break;
        case 'ArrowLeft':
            direction = 'LEFT';
          break;
        case 'ArrowRight':
            direction = 'RIGHT';
          break;
        case 'w':
            direction = 'UP';
          break;
        case 's':
            direction = 'DOWN';
            break;
        case 'a':
            direction = 'LEFT';
            break;
        case 'd':
            direction = 'RIGHT';
            break;

        default:
          return; // Ignore other keys
      }
      
      // Get the current username and remove quotes
      const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';
      
      // Check if the current player's snake exists and has length > 0
      const isAlive = snakes[currentUsername] && snakes[currentUsername].length > 0;
      
      // Send movement direction to the server if game is live and player is alive
      if (direction && gameLive && isAlive) {
        const allPlayerUsernames = Object.keys(snakes).join(", ");
        console.log(`Player '${currentUsername}' sending direction: ${direction}. All players: ${allPlayerUsernames}. Player alive: ${isAlive}`);
        
        send({
          type: 'playerMove',
          direction: direction
        });
      }
    };
    
    // Add event listener for key presses
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameLive, send, snakes]);

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

  // Function to handle leaving the lobby
  const handleLeaveLobby = () => {
    intentionalDisconnect.current = true;
    // Disconnect from the socket
    disconnect();
    
    // Navigate back to the main page
    router.push('/home');
  };

  // Effect to handle showing and hiding the death screen
  useEffect(() => {
    if (playerIsDead) {
      // Show only death screen first
      setShowDeathScreen(true);
      setShowSpectatorOverlay(false); // Initially hide spectator overlay
      
      // Hide only the death message after 2 seconds with fade-out animation
      const deathTimeout = setTimeout(() => {
        // Get the death overlay element and add the fade-out class
        const deathOverlay = document.querySelector(`.${styles.deathOverlay}`);
        if (deathOverlay) {
          deathOverlay.classList.add(styles.fadeOut);
          
          // Wait for the animation to complete before hiding the element
          setTimeout(() => {
            setShowDeathScreen(false);
            // Only show the spectator overlay after the death screen is gone
            setShowSpectatorOverlay(true);
          }, 800); // Match the 0.8s animation duration
        } else {
          setShowDeathScreen(false);
          setShowSpectatorOverlay(true); // Fallback if overlay element not found
        }
      }, 2000);
      
      return () => clearTimeout(deathTimeout);
    }
  }, [playerIsDead, styles.deathOverlay, styles.fadeOut]);

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
      
      {/* Final Countdown Overlay - only show when 5 seconds or less remain and game is live */}
      {gameLive && timestamp <= 5 && (
        <div className={styles.finalCountdownOverlay}>
          <span>{timestamp}</span>
        </div>
      )}
      
      {/* Big countdown circle positioned outside the blurred container */}
      {countdown !== null && !gameLive && (
        <div className={styles.countdownCircle}>
          <span>{countdown}</span>
        </div>
      )}

      {/* Death screen overlay - only show when player is dead */}
      {showDeathScreen && (
        <div className={styles.deathOverlay}>
          <div className={styles.deathMessage}>
            <h2>Eliminated</h2>
          </div>
        </div>
      )}

      {/* Spectator overlay - only show when player is dead and death screen is hidden */}
      {showSpectatorOverlay && (
        <div className={styles.spectatorOverlay}>
          <div className={styles.spectatorMessage}>
            <h2>Spectating...</h2>
          </div>
        </div>
      )}
      
      {/* Leave lobby button */}
      <button 
        className={styles.leaveLobbyButtonGame} 
        onClick={handleLeaveLobby}
      >
        Leave Lobby
      </button>
    </div>
  );
};

export default GamePage;
