"use client"
import React, { useRef, useEffect, useState } from "react";
import styles from "@/styles/page.module.css";
import { useParams } from "next/navigation";
import { useLobbySocket } from "@/hooks/useLobbySocket";

interface PlayerData {
  [username: string]: number[];
}

const GamePage: React.FC = () => {
  // Grid dimensions
  const COLS = 30;
  const ROWS = 25;
  
  // Game state
  const [gameLive, setGameLive] = useState(false);
  const [isAlive, setIsAlive] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [players, setPlayers] = useState<PlayerData>({});
  const [cookies, setCookies] = useState<number[]>([]);
  const [timestamp, setTimestamp] = useState<number>(0);
  
  // Get lobby code from URL parameters
  const params = useParams();
  const lobbyCode = params.code as string;
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, disconnect } = useLobbySocket();
  
  // Reference to store all grid cells for direct access
  const gridCellsRef = useRef<HTMLDivElement[]>([]);
  
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
              
              // Handle game-specific messages here
              if (data.type === 'preGame') {
                setGameLive(false);
                setCountdown(data.countdown);
                setPlayers(data.players || {});
                setCookies(data.cookies || []);
                
                // Render all elements
                renderGameElements(data.players || {}, data.cookies || []);
              }
              
              // Handle gameState updates
              if (data.type === 'gameState') {
                setGameLive(true);
                setCountdown(null);
                setPlayers(data.players || {});
                setCookies(data.cookies || []);
                
                // Render all elements with updated positions
                renderGameElements(data.players || {}, data.cookies || []);
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
  }, [connect, disconnect, lobbyCode]);

  // Simulate countdown messages
  useEffect(() => {
    // Create an array of countdown states
    const countdownStates = [
      {
        type: 'preGame',
        countdown: 5,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      },
      {
        type: 'preGame',
        countdown: 4,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      },
      {
        type: 'preGame',
        countdown: 3,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      },
      {
        type: 'preGame',
        countdown: 2,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      },
      {
        type: 'preGame',
        countdown: 1,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      },
      {
        type: 'preGame',
        countdown: 0,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      }
    ];

    // Create an array of game states for player movement simulation
    const gameStates = [
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(4,5), posToIndex(4,4), posToIndex(4,3)],
          'player2': [posToIndex(5,25), posToIndex(4,25), posToIndex(3,25)],
          'player3': [posToIndex(20,24), posToIndex(20,25), posToIndex(20,26)],
          'player4': [posToIndex(19, 4), posToIndex(20, 4), posToIndex(21, 4)]
        },
        cookies: [75, 120, 210, 350],
        timestamp: 1
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(4,6), posToIndex(4,5), posToIndex(4,4)],
          'player2': [posToIndex(6,25), posToIndex(5,25), posToIndex(4,25)],
          'player3': [posToIndex(20,23), posToIndex(20,24), posToIndex(20,25)],
          'player4': [posToIndex(18, 4), posToIndex(19, 4), posToIndex(20, 4)]
        },
        cookies: [75, 120, 210, 350],
        timestamp: 2
      },
      // Add 10 more game states with random turns
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(4,7), posToIndex(4,6), posToIndex(4,5)],
          'player2': [posToIndex(7,25), posToIndex(6,25), posToIndex(5,25)],
          'player3': [posToIndex(20,22), posToIndex(20,23), posToIndex(20,24)],
          'player4': [posToIndex(17, 4), posToIndex(18, 4), posToIndex(19, 4)]
        },
        cookies: [75, 120, 210, 350],
        timestamp: 3
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(5,7), posToIndex(4,7), posToIndex(4,6)], // Turn right
          'player2': [posToIndex(7,24), posToIndex(7,25), posToIndex(6,25)], // Turn left
          'player3': [posToIndex(20,21), posToIndex(20,22), posToIndex(20,23)], // Continue straight
          'player4': [posToIndex(16, 4), posToIndex(17, 4), posToIndex(18, 4)] // Continue straight
        },
        cookies: [75, 120, 210, 350],
        timestamp: 4
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(6,7), posToIndex(5,7), posToIndex(4,7)], // Continue right
          'player2': [posToIndex(7,23), posToIndex(7,24), posToIndex(7,25)], // Continue left
          'player3': [posToIndex(19,21), posToIndex(20,21), posToIndex(20,22)], // Turn left
          'player4': [posToIndex(16, 3), posToIndex(16, 4), posToIndex(17, 4)] // Turn up
        },
        cookies: [75, 120, 210, 350],
        timestamp: 5
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(7,7), posToIndex(6,7), posToIndex(5,7)], // Continue right
          'player2': [posToIndex(7,22), posToIndex(7,23), posToIndex(7,24)], // Continue left
          'player3': [posToIndex(18,21), posToIndex(19,21), posToIndex(20,21)], // Continue left
          'player4': [posToIndex(16, 2), posToIndex(16, 3), posToIndex(16, 4)] // Continue up
        },
        cookies: [75, 120, 210, 350],
        timestamp: 6
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(7,8), posToIndex(7,7), posToIndex(6,7)], // Turn right (down)
          'player2': [posToIndex(7,21), posToIndex(7,22), posToIndex(7,23)], // Continue left
          'player3': [posToIndex(17,21), posToIndex(18,21), posToIndex(19,21)], // Continue left
          'player4': [posToIndex(15, 2), posToIndex(16, 2), posToIndex(16, 3)] // Turn left
        },
        cookies: [75, 120, 210, 350],
        timestamp: 7
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(7,9), posToIndex(7,8), posToIndex(7,7)], // Continue down
          'player2': [posToIndex(6,21), posToIndex(7,21), posToIndex(7,22)], // Turn up
          'player3': [posToIndex(17,20), posToIndex(17,21), posToIndex(18,21)], // Turn up
          'player4': [posToIndex(14, 2), posToIndex(15, 2), posToIndex(16, 2)] // Continue left
        },
        cookies: [75, 120, 210, 350],
        timestamp: 8
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(7,10), posToIndex(7,9), posToIndex(7,8)], // Continue down
          'player2': [posToIndex(5,21), posToIndex(6,21), posToIndex(7,21)], // Continue up
          'player3': [posToIndex(17,19), posToIndex(17,20), posToIndex(17,21)], // Continue up
          'player4': [posToIndex(13, 2), posToIndex(14, 2), posToIndex(15, 2)] // Continue left
        },
        cookies: [75, 120, 210, 350],
        timestamp: 9
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(8,10), posToIndex(7,10), posToIndex(7,9)], // Turn right (continue down)
          'player2': [posToIndex(5,20), posToIndex(5,21), posToIndex(6,21)], // Turn left
          'player3': [posToIndex(17,18), posToIndex(17,19), posToIndex(17,20)], // Continue up
          'player4': [posToIndex(13, 3), posToIndex(13, 2), posToIndex(14, 2)] // Turn down
        },
        cookies: [75, 120, 210, 350],
        timestamp: 10
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(9,10), posToIndex(8,10), posToIndex(7,10)], // Continue down
          'player2': [posToIndex(5,19), posToIndex(5,20), posToIndex(5,21)], // Continue left
          'player3': [posToIndex(16,18), posToIndex(17,18), posToIndex(17,19)], // Turn left
          'player4': [posToIndex(13, 4), posToIndex(13, 3), posToIndex(13, 2)] // Continue down
        },
        cookies: [75, 120, 210, 350],
        timestamp: 11
      },
      {
        type: 'gameState',
        players: {
          'player1': [posToIndex(10,10), posToIndex(9,10), posToIndex(8,10)], // Continue down
          'player2': [posToIndex(4,19), posToIndex(5,19), posToIndex(5,20)], // Turn up
          'player3': [posToIndex(15,18), posToIndex(16,18), posToIndex(17,18)], // Continue left
          'player4': [posToIndex(14, 4), posToIndex(13, 4), posToIndex(13, 3)] // Turn right
        },
        cookies: [75, 120, 210, 350],
        timestamp: 12
      }
    ];

    // Process countdown states sequentially
    const processCountdownStates = () => {
      countdownStates.forEach((state, index) => {
        setTimeout(() => {
          console.log(`Simulating countdown: ${state.countdown}`);
          
          // Update state
          setGameLive(false);
          setCountdown(state.countdown);
          setPlayers(state.players);
          setCookies(state.cookies);
          
          // Render game elements
          renderGameElements(state.players, state.cookies);
          
          // After the last countdown state, start the game
          if (index === countdownStates.length - 1) {
            setTimeout(() => {
              // Initial game state
              const initialGameState = {
                type: 'gameState',
                players: state.players,
                cookies: state.cookies,
                timestamp: 0
              };
              
              console.log("Starting game after countdown");
              
              // Set game live state
              setGameLive(true);
              setCountdown(null);
              setTimestamp(0);
              setPlayers(initialGameState.players);
              setCookies(initialGameState.cookies);
              
              // Render initial game state
              renderGameElements(initialGameState.players, initialGameState.cookies);
              
              // Start processing game states
              gameStates.forEach((gameState, gameIndex) => {
                setTimeout(() => {
                  console.log(`Processing game state with timestamp: ${gameState.timestamp}`);
                  
                  // Update game state
                  setTimestamp(gameState.timestamp);
                  setPlayers(gameState.players);
                  setCookies(gameState.cookies);
                  
                  // Render updated game elements
                  renderGameElements(gameState.players, gameState.cookies);
                }, (gameIndex + 1) * 500); // Start 1 second after game starts, then 0.5 seconds apart
              });
              
              // Continue incrementing timestamp after the predefined states
              const startTime = Date.now();
              const lastDefinedTimestamp = gameStates.length > 0 ? 
                gameStates[gameStates.length - 1].timestamp : 0;
              
              const timerInterval = setInterval(() => {
                const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
                const newTimestamp = lastDefinedTimestamp + elapsedSeconds - gameStates.length;
                
                if (newTimestamp > lastDefinedTimestamp) {
                  setTimestamp(newTimestamp);
                }
              }, 1000);
              
              return () => clearInterval(timerInterval);
            }, 1000); // Start game 1 second after countdown reaches 0
          }
        }, index * 1000); // Process each state 1 second apart
      });
    };

    // Start the countdown sequence after a short delay
    const initialDelay = setTimeout(() => {
      processCountdownStates();
    }, 1000);

    return () => {
      clearTimeout(initialDelay);
    };
  }, []);

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

  // Function to render all game elements (players and cookies)
  const renderGameElements = (players: PlayerData, cookies: number[]) => {
    // Clear all cells first
    clearAllCells();
    
    // Render each player's snake
    Object.entries(players).forEach(([username, positions]) => {
      renderPlayerSnake(username, positions);
    });
    
    // Render cookies
    renderCookies(cookies);
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
  
  // Function to render a player's snake
  const renderPlayerSnake = (username: string, positions: number[]) => {
    if (!positions || positions.length === 0) return;
    
    // Assign fixed colors based on player username
    let playerColor: string;
    
    switch (username) {
      case 'player1':
        playerColor = '#FF0000'; // Red
        break;
      case 'player2':
        playerColor = '#0000FF'; // Blue
        break;
      case 'player3':
        playerColor = '#FFFF00'; // Yellow
        break;
      case 'player4':
        playerColor = '#8A2BE2'; // Violet (BlueViolet)
        break;
      default:
        // Fallback to using the hash function for any other usernames
        playerColor = stringToColor(username);
    }
    
    positions.forEach((index, i) => {
      const cell = getCell(index);
      if (cell) {
        cell.classList.add(styles.playerCell);
        
        // Set custom color for this player
        cell.style.setProperty('--player-color', playerColor);
        
        // Highlight the snake head
        if (i === 0) {
          cell.classList.add(styles.firstSquare);
        }
      }
    });
  };
  
  // Function to render cookies
  const renderCookies = (positions: number[]) => {
    if (!positions || positions.length === 0) return;
    
    positions.forEach(index => {
      const cell = getCell(index);
      if (cell) {
        cell.classList.add(styles.cookieCell);
      }
    });
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

  // Function to convert row,col to index
  const posToIndex = (row: number, col: number): number => {
    return row * COLS + col;
  };

  // Function to convert index to row,col
  const indexToPos = (index: number): {row: number, col: number} => {
    return {
      row: Math.floor(index / COLS),
      col: index % COLS
    };
  };

  return (
    <div className={styles.mainPage}>
      
      {/* Timer display */}
      {gameLive && (
        <div className={styles.timer}>
          Time: {formatTime(timestamp)}
        </div>
      )}
      
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
