"use client"
import React, { useRef, useEffect, useState } from "react";
import styles from "@/styles/page.module.css";
import { useParams, useRouter } from "next/navigation";

const GamePage: React.FC = () => {
  // Grid dimensions
  const COLS = 30;
  const ROWS = 25;
  
  // Get lobby code from URL parameters and initialize router
  const params = useParams();
  const router = useRouter();
  const lobbyCode = params.code as string;
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, disconnect } = useLobbySocket();
  const [connectionEstablished, setConnectionEstablished] = useState(false);
  
  // Reference to store all grid cells for direct access
  const gridCellsRef = useRef<HTMLDivElement[]>([]);
  // State to track which cells have circles
  const [circleIndices, setCircleIndices] = useState<number[]>([]);

  // Establish WebSocket connection on component mount
  useEffect(() => {
    const establishConnection = async () => {
      try {
        const socket = await connect({ lobbyCode });
        if (socket) {
          // Set up message handler
          socket.onmessage = (event: MessageEvent) => {
            try {
              const data = JSON.parse(event.data);
              console.log("Received message:", data);
              
              // Handle different message types
              if (data.type === "gameStarted") {
                // Redirect to the game page with the same lobby code
                router.push(`/game/${lobbyCode}`);
              }
              
              // Handle other message types...
              
            } catch (error) {
              console.error("Error parsing message:", error);
            }
          };
          setConnectionEstablished(true);
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
  }, [connect, disconnect, lobbyCode, router]);

  // Function to handle start game
  const handleStartGame = () => {
    if (isConnected) {
      // Send start game message
      send({
        type: "startGame"
      });
      console.log("Sent startGame message");
    } else {
      console.error("Cannot start game: WebSocket not connected");
    }
  };

  // Function to display squares on specific grid indices
  const displayCircles = (indices: number[]) => {
    // First clear any existing squares and the first square style
    gridCellsRef.current.forEach(cell => {
      if (cell) {
        cell.classList.remove(styles.circle, styles.firstSquare);
      }
    });

    // Add square class to cells at the specified indices
    indices.forEach((index, i) => {
      const cell = getCell(index);
      if (cell) {
        cell.classList.add(styles.circle);
        
        // Apply special styling to the first square
        if (i === 0 && indices.length > 0) {
          cell.classList.add(styles.firstSquare);
        }
      }
    });

    // Update state to keep track of squares
    setCircleIndices(indices);
  };

  // Example usage: Add circles when component mounts
  useEffect(() => {
    // Example: Display circles at these indices
    const sampleIndices = [45, 46, 47, 48, 49, 50];
    displayCircles(sampleIndices);
  }, []);

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

  // Example function to access a cell by index
  const getCell = (index: number): HTMLDivElement | null => {
    if (index >= 0 && index < ROWS * COLS) {
      return gridCellsRef.current[index] || null;
    }
    return null;
  };

  // Example function to convert row,col to index
  const posToIndex = (row: number, col: number): number => {
    return row * COLS + col;
  };

  // Example function to convert index to row,col
  const indexToPos = (index: number): {row: number, col: number} => {
    return {
      row: Math.floor(index / COLS),
      col: index % COLS
    };
  };

  return (
    <div className={styles.mainPage}>
      {/* This div only contains the background with the pattern */}
      <div className={styles.gameContainer}>
        <div className={styles.gameGrid}>
          {renderGrid()}
        </div>
        <div className={styles.controls}>
          <button onClick={() => displayCircles([100, 200, 300, 400])}>
            Change Circles
          </button>
          <button 
            onClick={handleStartGame}
            className={styles.startGameButton}
            disabled={!isConnected}
          >
            Start Game
          </button>
          <div className={styles.connectionStatus}>
            {isConnected ? "Connected to lobby" : "Connecting..."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;
