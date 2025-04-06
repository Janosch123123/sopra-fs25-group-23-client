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

  // Pseudo example of preGame state for testing rendering
  useEffect(() => {
    // This simulates receiving a preGame message from the server
    // In a real scenario, this would come from the WebSocket
    const simulatePreGameState = () => {
      const pseudoGameData = {
        type: 'preGame',
        countdown: 5,
        players: {
          'player1': [posToIndex(4,4), posToIndex(4,3), posToIndex(4,2)],
          'player2': [posToIndex(4,25), posToIndex(3,25), posToIndex(2,25)],
          'player3': [posToIndex(20,25), posToIndex(20,26), posToIndex(20,27)],
          'player4': [posToIndex(20, 4), posToIndex(21,4), posToIndex(22, 4)]
        },
        cookies: [75, 120, 210, 350]
      };

      console.log("Simulating preGame state:", pseudoGameData);
      
      // Set state with pseudo data
      setGameLive(false);
      setCountdown(pseudoGameData.countdown);
      setPlayers(pseudoGameData.players);
      setCookies(pseudoGameData.cookies);
      
      // Render game elements
      renderGameElements(pseudoGameData.players, pseudoGameData.cookies);
      
      // Simulate countdown

      return;
    };

    // Wait a bit before simulating the preGame state
    const timer = setTimeout(simulatePreGameState, 1500);
    
    return () => clearTimeout(timer);
  }, []);

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
    
    // Generate a distinct color for each player based on username hash
    const playerColor = stringToColor(username);
    
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
