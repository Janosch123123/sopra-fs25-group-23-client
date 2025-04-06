"use client"
import React, { useRef, useEffect, useState } from "react";
import styles from "@/styles/page.module.css";
import { useParams } from "next/navigation";
import { useLobbySocket } from "@/hooks/useLobbySocket";

const GamePage: React.FC = () => {
  // Grid dimensions
  const COLS = 30;
  const ROWS = 25;
  
  // Get lobby code from URL parameters
  const params = useParams();
  const lobbyCode = params.code as string;
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, disconnect } = useLobbySocket();
  
  // Reference to store all grid cells for direct access
  const gridCellsRef = useRef<HTMLDivElement[]>([]);
  // State to track which cells have circles
  const [circleIndices, setCircleIndices] = useState<number[]>([]);

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
        default:
          return; // Ignore other keys
      }
      
      // Send movement direction to the server
      if (direction) {
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
  }, [send]);

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
      </div>
    </div>
  );
};

export default GamePage;
