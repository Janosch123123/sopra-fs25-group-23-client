"use client"
import React, { useRef, useEffect, useState, useCallback } from "react";
import styles from "@/styles/page.module.css";
import stylesSpecific from "@/game/game.module.css";
import { useParams, useRouter } from "next/navigation";
import { useLobbySocket } from "@/hooks/useLobbySocket";
import useLocalStorage from '@/hooks/useLocalStorage';

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

  const [timestamp, setTimestamp] = useState<number>(0);
  const [playerIsDead, setPlayerIsDead] = useState(false); // Add state for tracking player death
  const [showDeathScreen, setShowDeathScreen] = useState(false); // Add state for showing the death screen
  const [showSpectatorOverlay, setShowSpectatorOverlay] = useState(false); // Add state for spectator overlay
  
  // State for tracking active effects and their durations
  type Effect = { type: string; baseType: string; duration: number; maxDuration: number; };
  const [activeEffects, setActiveEffects] = useState<Effect[]>([]);
  
  // State for handling the red screen flash for the Divider effect
  const [showDividerFlash, setShowDividerFlash] = useState(false);
  
  // State for handling the drunk effect for the ReverseControls effect
  const [showReverseControlsEffect, setShowReverseControlsEffect] = useState(false);
  
  // Game end states
  const [gameEnded, setGameEnded] = useState(false);
  const [finalRankings, setFinalRankings] = useState<string[]>([]); // Store player rankings
  
  // Track player colors for consistent display between game and podium
  const [playerColorMapping, setPlayerColorMapping] = useState<Record<string, string>>({});
  
  // Add new state variables for collision animation
  const [collisionPoint, setCollisionPoint] = useState<[number, number] | null>(null); // Store collision coordinates
  const [collidedSnakes, setCollidedSnakes] = useState<Record<string, boolean>>({}); // Track which snakes have collided
  const [lastGameState, setLastGameState] = useState<{snakes: SnakeData, timestamp: number} | null>(null); // Store previous game state for comparison
  const [lastHeadPositions, setLastHeadPositions] = useState<Record<string, [number, number]>>({}); // Store last known head positions
  
  // Get lobby code from URL parameters
  const params = useParams();
  const lobbyCode = params.code as string;
  
  // Initialize WebSocket connection
  const { isConnected, getSocket, connect, send, disconnect } = useLobbySocket();
  
  const intentionalDisconnect = useRef(false);
  const [deathAnimationInProgress, setDeathAnimationInProgress] = useState(false);
  const { value: isAdmin } = useLocalStorage<boolean>("isAdmin", false);

  const [connectionError, setConnectionError] = useState(false);
  // Reference to store all grid cells for direct access
  const gridCellsRef = useRef<HTMLDivElement[]>([]);
  
  // Add router for navigation
  const router = useRouter();
  
  const [animationStartTime, setAnimationStartTime] = useState<number | null>(null);
  const [animatingCells, setAnimatingCells] = useState<{
    index: number;
    classes: string[];
    style: {[key: string]: string};
    timestamp: number;
  }[]>([]);

  // Get lobby settings from local storage
  const { value: lobbySettings } = useLocalStorage<string>("lobbySettings", "medium");
  const { value: sugarRush } = useLocalStorage<boolean>("sugarRush", false);
  const { value: includePowerUps} = useLocalStorage<boolean>("includePowerUps", false);

  
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
  
  // Updated function to clear all cell styles, including new classes for collision animation
  const clearAllCells = useCallback(() => {
    gridCellsRef.current.forEach(cell => {
      if (cell) {
        cell.classList.remove(
          stylesSpecific.circle,
          stylesSpecific.firstSquare,
          stylesSpecific.lastSquare,
          stylesSpecific.curveBody,
          stylesSpecific.playerCell,
          stylesSpecific.cookieCell,
          stylesSpecific.goldenCookieCell,
          stylesSpecific.multiplierCell,
          stylesSpecific.reverseControlsCell,
          stylesSpecific.dividerCell,
          stylesSpecific.currentPlayerCell,
          stylesSpecific.playerRed,
          stylesSpecific.playerBlue,
          stylesSpecific.playerGreen,
          stylesSpecific.playerPurple,
          // Add these new classes for collision animation
          stylesSpecific.collidedSnake,
          stylesSpecific.dyingSnake,
          stylesSpecific.collisionPoint,
        );
        // Remove any inline styles for player colors
        cell.style.setProperty('--player-color', '');
        cell.style.setProperty('--rotation', '0deg');
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
  
  // Updated function to render a player's snake using [col, row] coordinates with PNG images and different color classes
  // Now includes support for collision animation and improved glow effect positioning
  const renderPlayerSnake = useCallback((username: string, positions: [number, number][], playerIndex: number) => {
    if (!positions || positions.length === 0) return;
    
    // Define color classes based on player index - expanded with more color options
    const playerColorClasses = [
      stylesSpecific.playerRed,     // Red (1st player)
      stylesSpecific.playerBlue,    // Blue (2nd player) 
      stylesSpecific.playerGreen,   // Green (3rd player)
      stylesSpecific.playerPurple,  // Purple (4th player)
    ];
    
    // Get the appropriate color class for this player
    let playerColorClass = '';
    if (playerIndex < playerColorClasses.length) {
      playerColorClass = playerColorClasses[playerIndex];
    } else {
      // For any additional players beyond our predefined colors, use a color based on their username
      // This is a fallback that shouldn't normally be needed with 8 color options
      playerColorClass = stylesSpecific.playerRed; // Default to red but apply custom filter
    }
    
    // Get current username for highlighting the current player's snake
    const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';

    
    // Second pass: Add all snake elements
    positions.forEach((position, i) => {
      // Convert [col, row] to grid cell index
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(stylesSpecific.playerCell);
        
        // Add color class to apply the correct hue-rotate filter
        if (playerColorClass) {
          cell.classList.add(playerColorClass);
        }
        
        // Add collision animation class if this snake has collided
        if (collidedSnakes[username]) {
          cell.classList.add(stylesSpecific.collidedSnake);
          
          // Add dying effect to the current player's snake
          if (username === currentUsername) {
            cell.classList.add(stylesSpecific.dyingSnake);
          }
        }
        
        // Add collision point effect to the exact collision location
        if (collisionPoint && 
            position[0] === collisionPoint[0] && 
            position[1] === collisionPoint[1]) {
          cell.classList.add(stylesSpecific.collisionPoint);
        }
        
        // Mark head (first element)
        if (i === 0) {
          cell.classList.add(stylesSpecific.firstSquare);
          
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
          cell.classList.add(stylesSpecific.lastSquare);
          
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
            cell.classList.add(stylesSpecific.curveBody);
            
            // Define curve types based on movement direction
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
          cell.classList.add(stylesSpecific.currentPlayerCell);
        }
      }
    });
  }, [colRowToIndex, getCell, collidedSnakes, collisionPoint]);
  
  // Updated function to render cookies and special items using [col, row] coordinates
  const renderItems = useCallback((cookies: [number, number][] = [], 
                               goldenCookies: [number, number][] = [], 
                               multipliers: [number, number][] = [], 
                               reverseControls: [number, number][] = [],
                               dividers: [number, number][] = []) => {
    
    // Create a map of all snake cells to efficiently check for overlaps
    const snakeCells = new Map<string, boolean>();
    Object.keys(snakes).forEach(username => {
      if (snakes[username] && snakes[username].length > 0) {
        snakes[username].forEach(pos => {
          // Use a string key for the position to make lookup easy
          snakeCells.set(`${pos[0]},${pos[1]}`, true);
        });
      }
    });
    
    // Render regular cookies
    cookies.forEach(position => {
      // Skip items that are on the same position as any snake segment
      if (snakeCells.has(`${position[0]},${position[1]}`)) {
        return; // Skip this item
      }
      
      // Convert [col, row] to grid cell index
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(stylesSpecific.cookieCell);
      }
    });
    
    // Render golden cookies
    goldenCookies.forEach(position => {
      if (snakeCells.has(`${position[0]},${position[1]}`)) {
        return; 
      }
      
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(stylesSpecific.goldenCookieCell);
      }
    });
    
    // Render multipliers
    multipliers.forEach(position => {
      if (snakeCells.has(`${position[0]},${position[1]}`)) {
        return;
      }
      
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(stylesSpecific.multiplierCell);
      }
    });
    
    // Render reverse controls
    reverseControls.forEach(position => {
      if (snakeCells.has(`${position[0]},${position[1]}`)) {
        return;
      }
      
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(stylesSpecific.reverseControlsCell);
      }
    });

    // Render dividers
    dividers.forEach(position => {
      if (snakeCells.has(`${position[0]},${position[1]}`)) {
        return;
      }
      
      const index = colRowToIndex(position[0], position[1]);
      const cell = getCell(index);
      
      if (cell) {
        cell.classList.add(stylesSpecific.dividerCell);
      }
    });
  }, [colRowToIndex, getCell, snakes]);
  
  const preserveAnimationClasses = useCallback(() => {
    if (!animationStartTime) return;
    // Filter out any animations that have exceeded their duration (8 seconds)
    const currentTime = Date.now();
    const animationDuration = 1300; // 2 seconds for the animation
    if (currentTime - animationStartTime > animationDuration) {
      setAnimatingCells([]);
      setAnimationStartTime(null);
      return;
    }
    const activeAnimations = animatingCells.filter(cell => 
      currentTime - cell.timestamp < 8000
    );
    
    // Apply all active animations
    activeAnimations.forEach(cell => {
      const domCell = gridCellsRef.current[cell.index];
      if (domCell) {
        // Add all preserved classes
        cell.classes.forEach(className => {
          domCell.classList.add(className);
        });
        
        // Apply all preserved styles
        Object.entries(cell.style).forEach(([prop, value]) => {
          domCell.style.setProperty(prop, value);
        });
      }
    });
    
    // Update the state if we've removed any expired animations
    if (activeAnimations.length !== animatingCells.length) {
      setAnimatingCells(activeAnimations);
    }
  }, [animatingCells, animationStartTime]);


  // Function to render all player snakes immediately without waiting for state update
  // Updated to handle missing snakes during collision animation
  // Function to render all player snakes immediately without waiting for state update
// Updated to handle missing snakes during collision animation
const renderPlayerSnakes = useCallback((snakesData: SnakeData) => {
  // Always clear all cells first to ensure a clean state
  clearAllCells();
  
  // Get list of player usernames
  const playerUsernames = Object.keys(snakesData);
  
  // First, render ALL snakes from the current state
  // This ensures all living snakes remain visible
  playerUsernames.forEach((username, playerIndex) => {
    // Only render if the snake exists and has segments
    if (snakesData[username] && snakesData[username].length > 0) {
      renderPlayerSnake(username, snakesData[username], playerIndex);
    }
  });
  
  // If we're in collision state, also render any dead snakes from lastGameState
  // that aren't in the current state
  if (Object.keys(collidedSnakes).length > 0 && lastGameState) {
    Object.keys(collidedSnakes).forEach(username => {
      // Check if this snake is missing or empty in the current state but exists in last state
      const isEmptyOrMissingInCurrent = !snakesData[username] || 
                                        (snakesData[username] && snakesData[username].length === 0);
                                        
      const existsInLastState = lastGameState.snakes[username] && 
                              lastGameState.snakes[username].length > 0;
                              
      if (isEmptyOrMissingInCurrent && existsInLastState) {
        // console.log(`Adding collided snake ${username} from last state`);
        
        // Find original player index
        const originalIndex = Object.keys(lastGameState.snakes).indexOf(username);
        
        // Render the snake using last known positions
        renderPlayerSnake(username, lastGameState.snakes[username], originalIndex);
      }
    });
  }
  setTimeout(() => {
    preserveAnimationClasses();
  }, 0);
}, [clearAllCells, renderPlayerSnake, collidedSnakes, lastGameState, preserveAnimationClasses]);
  // Update lastHeadPositions whenever snakes change
  useEffect(() => {
    // Update the last known head positions for all snakes
    const newPositions: Record<string, [number, number]> = {};
    Object.keys(snakes).forEach(username => {
      if (snakes[username] && snakes[username].length > 0) {
        newPositions[username] = snakes[username][0];
      }
    });
    setLastHeadPositions(prevPositions => ({
      ...prevPositions,
      ...newPositions
    }));
  }, [snakes]);

  // Enhanced collision detection - detect when snakes disappear or become empty arrays
useEffect(() => {
  if (!lastGameState || !gameLive) return;
  
  // Get current username
  const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';
  
  // Check for any snake that existed in the previous state but is either:
  // 1. Missing completely in the current state, or
  // 2. Has an empty array (zero length) in the current state
  const deadSnakes: {username: string, lastPosition: [number, number]}[] = [];
  
  // Find snakes that died in this update
  Object.keys(lastGameState.snakes).forEach(username => {
    const wasAlive = lastGameState.snakes[username] && 
                    lastGameState.snakes[username].length > 0;
    
    // Check if snake is now missing or empty
    const isNowMissing = !snakes[username];
    const isNowEmpty = snakes[username] && snakes[username].length === 0;
    
    if (wasAlive && (isNowMissing || isNowEmpty)) {
      // console.log(`⚠️Snake died: ${username}`);
      deadSnakes.push({
        username,
        lastPosition: lastGameState.snakes[username][0] // The head position from last state
      });
    }
  });
  
  // If we found any dead snakes, trigger the collision animation
  if (deadSnakes.length > 0 && !deathAnimationInProgress && timestamp == 5000) {
    // console.log("⚠️ Dead snakes detected:", deadSnakes);
    
    // Handle only the first dead snake if multiple died in the same frame
    // (prioritize the current player if they died)
    const deadSnake = deadSnakes.find(snake => snake.username === currentUsername) || deadSnakes[0];
    
    if (deadSnake && deadSnake.lastPosition) {
      setAnimationStartTime(Date.now());
      // console.log("⚠️Collision detected at:", deadSnake.lastPosition);
      if (deadSnake.username === currentUsername) {
        setDeathAnimationInProgress(true);
        // console.log(`⚠️ Death animation started for player ${currentUsername}`);
      }
      const lastStateSnakes = JSON.parse(JSON.stringify(lastGameState.snakes));
      // Set collision point for explosion effect
      setCollisionPoint(deadSnake.lastPosition);
      
      // IMPORTANT: Only mark the dead snake as collided - this is the key fix!
      const newCollidedSnakes: Record<string, boolean> = {};
      newCollidedSnakes[deadSnake.username] = true; // Only mark the dead snake
      
      // Apply the collision animation
      setCollidedSnakes(newCollidedSnakes);
      
      const combinedState: SnakeData = {...(snakes || {})};
      if (lastStateSnakes[deadSnake.username] && lastStateSnakes[deadSnake.username].length > 0) {
        combinedState[deadSnake.username] = lastStateSnakes[deadSnake.username];
      }
      // console.log(`⚠️ Rendering combined state for animation:`, combinedState);
      // Force render the current state with the dead snake added back in
      // This is key: we render the current snakes plus the dead snake
      renderPlayerSnakes(combinedState);
      

      const cellsToAnimate: {
        index: number;
        classes: string[];
        style: {[key: string]: string};
        timestamp: number;
      }[] = [];
      
      // Save the collision point cell
      const collisionPointIdx = colRowToIndex(deadSnake.lastPosition[0], deadSnake.lastPosition[1]);
      const collisionCell = gridCellsRef.current[collisionPointIdx];
      if (collisionCell) {
        cellsToAnimate.push({
          index: collisionPointIdx,
          classes: [stylesSpecific.collisionPoint],
          style: {},
          timestamp: Date.now()
        });
      }
      
      // Save all cells from the dead snake
      if (lastStateSnakes[deadSnake.username]) {
        lastStateSnakes[deadSnake.username].forEach((pos: [number, number]) => {
          const idx = colRowToIndex(pos[0], pos[1]);
          const cell = gridCellsRef.current[idx];
          if (cell) {
            const classes = [stylesSpecific.playerCell, stylesSpecific.collidedSnake];
            
            // Add special class for the current player's snake
            if (deadSnake.username === currentUsername) {
              classes.push(stylesSpecific.dyingSnake);
            }
            
            // Get the current styles
            const cellStyles: {[key: string]: string} = {};
            const computedStyle = window.getComputedStyle(cell);
            ['--rotation'].forEach(prop => {
              cellStyles[prop] = computedStyle.getPropertyValue(prop);
            });
            
            cellsToAnimate.push({
              index: idx,
              classes,
              style: cellStyles,
              timestamp: Date.now()
            });
          }
        });
      }
      
      // Update the animating cells state
      setAnimatingCells(cellsToAnimate);

      // Use longer timeouts to match the enhanced animations
      setTimeout(() => {
        // Clear collision point after explosion animation finishes
        setCollisionPoint(null);
        
        // Wait for fadeaway animation to complete before clearing collision state
        setTimeout(() => {
          // console.log(`⚠️ Animation completed, cleaning up`);
          // Update to current state
          
          setCollidedSnakes({}); // Clear collision state
          renderPlayerSnakes(snakes);
          setDeathAnimationInProgress(false); // Reset death animation state
        }, 1300); // Slightly longer than the fadeAway animation (2s)
      }, 900); // Slightly longer than the explosion animation (1.2s)
    }
  }
}, [snakes, gameLive, lastGameState, renderPlayerSnakes, colRowToIndex, deathAnimationInProgress]);
  // Update lastGameState when game state changes
  useEffect(() => {
    if (gameLive && Object.keys(snakes).length > 0) {
      setLastGameState({
        snakes: JSON.parse(JSON.stringify(snakes)), // Deep clone to avoid reference issues
        timestamp
      });
    }
  }, [snakes, timestamp, gameLive]);
  

  useEffect(() => {
    preserveAnimationClasses();
  }, [preserveAnimationClasses, snakes]);

  useEffect(() => {
    // Handle browser close or refresh
    const handleBeforeUnload = () => {
      // console.log("Browser closing, disconnecting WebSocket");
      intentionalDisconnect.current = true;
      disconnect();
    };
    
    // Handle browser back button
    const handlePopState = () => {
      // console.log("Browser back button pressed, disconnecting WebSocket");
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
                setShowSpectatorOverlay(false);
                setGameLive(false);
                setCountdown(data.countdown);
                
                // Clear all cells before rendering anything
                clearAllCells();
                
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
                } else if (Array.isArray(data.cookies)) {
                  // Convert legacy format (array of indexes) to [col, row] format
                  cookiePositions = data.cookies.map((index: number) => indexToColRow(index));
                }
                
                // Render all item types immediately
                renderItems(
                  cookiePositions, 
                  data.goldenCookies || [], 
                  data.multipliers || [], 
                  data.reverseControls || [],
                  data.dividers || []
                );

                // Reset player death state when game is restarting
                setPlayerIsDead(false);
                setConnectionError(false);
                
                // Reset collision state when game is restarting
                setCollisionPoint(null);
                setCollidedSnakes({});
                setAnimatingCells([]);
                setAnimationStartTime(null);
                
                // Clear any active effects
                setActiveEffects([]);
                setShowReverseControlsEffect(false);
              }
              
              // Handle gameState updates with the new expected format
              else if (data.type === 'gameState') {
                setGameLive(true);
                setCountdown(null);
                
                // Set the snakes data from the message
                setSnakes(data.snakes || {});
                
                // Update snake positions immediately without waiting for state update
                renderPlayerSnakes(data.snakes || {});
                
                
                // Render all items immediately
                renderItems(
                  data.cookies || [], 
                  data.goldenCookies || [], 
                  data.multipliers || [], 
                  data.reverseControls || [],
                  data.dividers || [] // Pass dividers to renderItems
                );
                
                // Parse and update active effects
                if (data.effects) {
                  const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';
                  const userEffects = data.effects[currentUsername] || [];
                  
                  // Check for Divider effect first (special case)
                  if (userEffects.includes("Divider")) {
                    // Trigger the red flash effect
                    setShowDividerFlash(true);
                    
                    // Remove flash after a short period (300ms)
                    setTimeout(() => {
                      setShowDividerFlash(false);
                    }, 300);
                  }
                  
                  // Transform the effects into a more usable format
                  const parsedEffects: Effect[] = userEffects.map((effectString: string) => {
                    // Skip the Divider effect as it's handled separately
                    if (effectString === "Divider") {
                      return null;
                    }
                    
                    // Parse the effect string to extract type and duration
                    const effectMatch = effectString.match(/^([a-zA-Z]+)([0-9.]+)$/);
                    if (effectMatch) {
                      const effectType = effectMatch[1];
                      const duration = parseFloat(effectMatch[2]);
                      
                      // Set max duration based on effect type
                      let maxDuration = 10; // Default
                      if (effectType.includes('Multiplier')) {
                        maxDuration = 10;
                      } else if (effectType.includes('ReverseControl')) {
                        maxDuration = 4;
                      }
                      
                      return {
                        type: effectString, // Store full effect string to preserve the numeric part
                        baseType: effectType, // Store the base type without numbers
                        duration: duration,
                        maxDuration: maxDuration
                      };
                    }
                    return null;
                  }).filter((effect: unknown): effect is Effect => effect !== null);
                  
                  // Check if ReverseControls effect is active to show the drunk overlay
                  const hasReverseControlEffect = parsedEffects.some(effect => 
                    effect.baseType.includes('ReverseControl')
                  );
                  setShowReverseControlsEffect(hasReverseControlEffect);
                  
                  setActiveEffects(parsedEffects);
                } else {
                  // Clear effects if none are provided
                  setActiveEffects([]);
                  setShowReverseControlsEffect(false);
                }
                
                // Update timestamp if available
                if (data.timestamp !== undefined) {
                  setTimestamp(data.timestamp);
                }

                // Check if current player is dead
                const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';
                const isAlive = data.snakes && 
                               data.snakes[currentUsername] && 
                               data.snakes[currentUsername].length > 0;
                
                if (gameLive && !isAlive && !deathAnimationInProgress) {              
                  setPlayerIsDead(true);
                }
                setConnectionError(false);
              }
              
              // Handle game end message
              else if (data.type === 'gameEnd') {
                // console.log("Game ended, winner:", data.winner);
                
                // Set game end state and save the rankings
                setGameEnded(true);
                if (data.rank && Array.isArray(data.rank)) {
                  setFinalRankings(data.rank);
                } else {
                  // Fallback if rank array isn't provided
                  // console.log("No rank array provided, using winner as fallback");
                  setFinalRankings(data.winner ? [data.winner] : []);
                }
                
                // If there's a collision reason, use that for collision animation
                if (data.reason && (data.reason.includes('collision') || data.reason.includes('hit'))) {
                  // Get the current username
                  const currentUsername = localStorage.getItem("username")?.replace(/"/g, '') || '';
                  
                  // If current player lost, animate their last position
                  if (currentUsername !== data.winner && lastHeadPositions[currentUsername]) {
                    // console.log(`⚠️ Current player ${currentUsername} died in gameEnd`);
                    setDeathAnimationInProgress(true);
                    // Set collision point
                    setCollisionPoint(lastHeadPositions[currentUsername]);
                    
                    // Only mark the dead snake as collided
                    const newCollidedSnakes: Record<string, boolean> = {};
                    newCollidedSnakes[currentUsername] = true; // Only the current player's snake
                    
                    // Apply the collision animation
                    setCollidedSnakes(newCollidedSnakes);
                    
                    // Get the snakes that were present in the last state
                    if (lastGameState && lastGameState.snakes) {
                      // Create a mixed state with primarily current snakes
                      const combinedState: SnakeData = {...(data.snakes || {})};
                      
                      // Add the current player's snake from last state
                      if (lastGameState.snakes[currentUsername] && 
                          lastGameState.snakes[currentUsername].length > 0) {
                        combinedState[currentUsername] = lastGameState.snakes[currentUsername];
                      }
                      
                      // console.log(`⚠️ Rendering combined state for gameEnd animation:`, combinedState);

                      // Force render with this mixed state
                      renderPlayerSnakes(combinedState);
                      
                      // Use matching timeouts to what we changed above
                      setTimeout(() => {
                        setCollisionPoint(null);
                        
                        setTimeout(() => {
                          // console.log(`⚠️ gameEnd animation completed, cleaning up`);
                          renderPlayerSnakes(data.snakes || {});
                          setCollidedSnakes({}); // Clear collision state
                          setDeathAnimationInProgress(false); // Reset death animation state
                          // Hide spectator overlay if active
                          setShowSpectatorOverlay(false);
                        }, 1300); // Slightly longer than the fadeAway animation (2s)
                      }, 900); // Slightly longer than the explosion animation (1.2s)
                    }
                  }
                }
              }

              else if (data.type === "connection_success") {
                console.log("WebSocket connection established successfully");
                setConnectionError(false);
              }
              else if (data.type === 'gameStarted') {
                // Reset game state when a new game starts
                setGameEnded(false);
                setShowSpectatorOverlay(false);
                setShowDeathScreen(false);
              }
              
              else if (data.type === 'error') {
                console.error("WebSocket error:", data.message);
                setConnectionError(true);
              } 
            } catch (error) {
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
      }
    };
  }, [connect, disconnect, getSocket, isConnected, lobbyCode, renderPlayerSnakes, renderItems, indexToColRow, gameLive, lastHeadPositions, deathAnimationInProgress, lastGameState]);

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
        // const allPlayerUsernames = Object.keys(snakes).join(", ");
        // console.log(`Player '${currentUsername}' sending direction: ${direction}. All players: ${allPlayerUsernames}. Player alive: ${isAlive}`);
        
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
            className={stylesSpecific.gridCell}
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
  
  // Function to handle restarting the game
  const handleRestartGame = () => {
    setGameEnded(false);
    setShowSpectatorOverlay(false);
    setShowDeathScreen(false);
    send({
      type: "startGame",
      lobbyId: lobbyCode,
      settings: {
        spawnRate: lobbySettings,
        sugarRush: sugarRush,
        powerupsWanted: includePowerUps
      }
    });
  };

  // Function to render progress bars for active effects
  const renderEffectsProgressBars = () => {
    if (!activeEffects || activeEffects.length === 0) return null;

    // Filter effects to only include multiplier and reverse control effects
    const filteredEffects = activeEffects.filter(effect => 
      effect.baseType.includes('Multiplier') || effect.baseType.includes('ReverseControl')
    );
    
    if (filteredEffects.length === 0) return null;

    // Group effects by base type and find the highest duration for each type
    const effectsMap = new Map<string, Effect>();
    
    filteredEffects.forEach(effect => {
      // Check if we already have this effect type, and if so, keep the one with higher duration
      if (!effectsMap.has(effect.baseType) || effect.duration > effectsMap.get(effect.baseType)!.duration) {
        effectsMap.set(effect.baseType, effect);
      }
    });

    return (
      <div className={stylesSpecific.effectsContainer}>
        <h3 className={stylesSpecific.effectsTitle}>Active Effects</h3>
        {Array.from(effectsMap.values()).map((effect, index) => {
          // Determine effect name and color based on effect type
          const isMultiplier = effect.baseType.includes('Multiplier');
          const effectName = isMultiplier ? 'Multiplier' : 'Reverse Controls';
          const backgroundColor = isMultiplier ? '#ffd700' : '#ff00ff'; // Gold for multiplier, Purple for reverse
          
          return (
            <div 
              key={`${effect.baseType}-${index}`} 
              className={stylesSpecific.ProgressWrapper}
            >
              <div className={stylesSpecific.effectLabel}>
                <img 
                  src={isMultiplier ? '/assets/2x.png' : '/assets/bottle.png'} 
                  alt={effectName}
                  className={stylesSpecific.effectIcon}
                />
                {isMultiplier 
                  ? `${effectName}: ${Math.ceil(effect.duration)}s` 
                  : `${effectName}: ${Math.ceil(effect.duration)} moves`}
              </div>
              
              {isMultiplier ? (
                // For multiplier, show progress bar
                <div className={stylesSpecific.progressBarContainer}>
                  <div 
                    className={stylesSpecific.progressBar}
                    style={{
                      marginLeft: '-3px',
                      width: `${(effect.duration / effect.maxDuration) * 100}%`,
                      backgroundColor: backgroundColor,
                      height: '10px',
                      borderRadius: '10px',
                    }}
                  ></div>
                </div>
              ) : (
                // For reverse controls, show blocks representing moves
                <div className={stylesSpecific.movesBlockContainer}>
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={stylesSpecific.moveBlock}
                      style={{
                        backgroundColor: i < Math.ceil(effect.duration) ? backgroundColor : 'rgba(0, 0, 0, 0.2)',
                        opacity: i < Math.ceil(effect.duration) ? 1 : 0.5
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Effect to handle showing and hiding the death screen
  useEffect(() => {
    if (playerIsDead && !deathAnimationInProgress) {
      // Show only death screen first
      setShowDeathScreen(true);
      setShowSpectatorOverlay(false); // Initially hide spectator overlay
      
      // Hide only the death message after 2 seconds with fade-out animation
      const deathTimeout = setTimeout(() => {
        // Get the death overlay element and add the fade-out class
        const deathOverlay = document.querySelector(`.${stylesSpecific.deathOverlay}`);
        if (deathOverlay) {
          deathOverlay.classList.add(stylesSpecific.fadeOut);
          
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
  }, [playerIsDead, deathAnimationInProgress]); // Removed unnecessary style dependencies

  // Update the podium display code to include snake heads - only assign colors during countdown
  useEffect(() => {
    // Initialize player color mapping ONLY during the countdown phase
    // This ensures colors are assigned based on initial game state and not changed after
    if (countdown !== null && Object.keys(snakes).length > 0 && Object.keys(playerColorMapping).length === 0) {
      // Map each username to their player index (which determines their color)
      const newColorMapping: Record<string, string> = {};
      Object.keys(snakes).forEach((username, index) => {
        // Use the same color class mapping logic as in renderPlayerSnake
        const playerColorClasses = [
          stylesSpecific.playerRed,     // Red (1st player)
          stylesSpecific.playerBlue,    // Blue (2nd player) 
          stylesSpecific.playerGreen,   // Green (3rd player)
          stylesSpecific.playerPurple,  // Purple (4th player)
        ];
        
        if (index < playerColorClasses.length) {
          newColorMapping[username] = playerColorClasses[index];
        } else {
          newColorMapping[username] = stylesSpecific.playerRed; // Fallback
        }
      });
      
      setPlayerColorMapping(newColorMapping);
      // console.log("Set player color mapping during countdown phase:", newColorMapping);
    }
  }, [snakes, playerColorMapping, countdown]);

  return (
    <div className={styles.mainPage}>
      {/* Divider effect red flash overlay */}
      {showDividerFlash && (
        <div className={stylesSpecific.dividerFlash}></div>
      )}
      
      {/* Timer display */}
      {gameLive && (
        <div className={stylesSpecific.timer}>
          Time: {formatTime(timestamp)}
        </div>
      )}
      
      {/* Final Countdown Overlay when time is ≤ 5 seconds and game is not ended */}
      {gameLive && timestamp <= 5 && !gameEnded && (
        <div className={stylesSpecific.finalCountdownOverlay}>
          <span>{timestamp}</span>
        </div>
      )}
      
      {/* Leaderboard */}
      <div className={stylesSpecific.leaderboard}>
        <h3>Leaderboard</h3>
        <table className={stylesSpecific.leaderboardTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            {getSortedPlayers().map((player, index) => {
              // Get the player color for the rank
              const playerColors = ['#ff2a2aff', '#0000ffff', '#FFFF00', '#ff00ffff']; // Purple (4th player)
              const playerColor = player.index < playerColors.length ? 
                playerColors[player.index] : stringToColor(player.username);
              
              // Check if this is the current player
              const currentUsername = localStorage.getItem("username");
              const isCurrentPlayer = player.username === currentUsername;
              
              return (
                <tr 
                  key={player.username} 
                  className={isCurrentPlayer ? styles.currentPlayerRow : ''}
                  style={{'--player-row-color': playerColor} as React.CSSProperties}
                >
                  <td>{index + 1}</td>
                  <td>{player.username.length > 9 ? `${player.username.slice(0, 7)}...` : player.username}</td>
                  <td>{player.length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Return to home button */}
        <div className={styles.controls}>
          <button 
            className={styles.leaveLobbyButtonGame}
            onClick={handleLeaveLobby}
          >
            Exit Game
          </button>
        </div>
        
        {/* Connection error message */}
        {connectionError && (
          <div className={styles.connectionError}>
            Connection lost! Trying to reconnect...
          </div>
        )}
      </div>
      
      {/* Main game grid */}
      <div className={stylesSpecific.gameContainer}>
        <div className={stylesSpecific.gameGrid}>
          {renderGrid()}
        </div>
        
        {/* Active effects progress bars - only show when game is live and there are active effects */}
        {gameLive && activeEffects.length > 0 && renderEffectsProgressBars()}
        
        {/* Countdown display - only show during pregame phase (when gameLive is false) */}
        {countdown !== null && countdown > 0 && !gameLive && (
          <div className={stylesSpecific.countdownCircle}>
            <span>{countdown}</span>
          </div>
        )}
        
        {/* Death overlay */}
        {showDeathScreen && (
          <div className={stylesSpecific.deathOverlay}>
            <div className={stylesSpecific.deathMessage}>
              <h2>You were eliminated!</h2>
              <h3>Spectating the rest of the match...</h3>
            </div>
          </div>
        )}
        
        {/* Spectator overlay */}
        {showSpectatorOverlay && gameLive &&(
          <div className={stylesSpecific.spectatorOverlay}>
            <div className={stylesSpecific.spectatorMessage}>
              <h2>SPECTATING</h2>
            </div>
          </div>
        )}
        
        {/* Drunk effect overlay when Reverse Controls effect is active */}
        {showReverseControlsEffect && gameLive && (
          <div className={stylesSpecific.reverseControlsOverlay}>
            {/* SVG filters for the drunk effect */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
              <defs>
                <filter id="reverseControlsFilter">
                  {/* Add a slight color shift/chromatic aberration */}
                  <feColorMatrix
                    type="matrix"
                    values="1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 1 0"
                    result="original"
                  />
                  <feOffset in="original" dx="2" dy="0" result="redOffset" />
                  <feColorMatrix
                    in="redOffset"
                    type="matrix"
                    values="1 0 0 0 0
                            0 0 0 0 0
                            0 0 0 0 0
                            0 0 0 0.5 0"
                    result="colorRed"
                  />
                  <feOffset in="original" dx="-2" dy="0" result="blueOffset" />
                  <feColorMatrix
                    in="blueOffset"
                    type="matrix"
                    values="0 0 0 0 0
                            0 0 0 0 0
                            0 0 1 0 0
                            0 0 0 0.5 0"
                    result="colorBlue"
                  />
                  <feBlend mode="screen" in="colorRed" in2="colorBlue" result="colorDistortion" />
                  
                  {/* Add a subtle turbulence/distortion effect */}
                  <feTurbulence baseFrequency="0.01 0.01" numOctaves="2" seed="1" result="turbulence" />
                  <feDisplacementMap in="original" in2="turbulence" scale="10" result="displaced" />
                  
                  {/* Combine the effects */}
                  <feBlend mode="screen" in="colorDistortion" in2="displaced" />
                </filter>
              </defs>
            </svg>
          </div>
        )}
      </div>
      
      {/* Podium display for game end */}
      {gameEnded && finalRankings.length > 0 && (
        <div className={stylesSpecific.podiumContainer}>
          <div className={stylesSpecific.podiumLayout}>
            {/* 2nd place - left position */}
            {finalRankings.length > 1 && (
              <div className={`${stylesSpecific.podiumPlayer} ${stylesSpecific.podiumSecond}`}>
                <div className={stylesSpecific.podiumUsername}>{finalRankings[1]}</div>
                <div className={`${stylesSpecific.podiumBase} ${playerColorMapping[finalRankings[1]] || ''}`}></div>
                <div className={stylesSpecific.podiumRank}>2nd</div>
              </div>
            )}
            
            {/* 1st place - center position */}
            {finalRankings.length > 0 && (
              <div className={`${stylesSpecific.podiumPlayer} ${stylesSpecific.podiumFirst}`}>
                <div className={stylesSpecific.podiumUsername}>{finalRankings[0]}</div>
                <div className={`${stylesSpecific.podiumBase} ${playerColorMapping[finalRankings[0]] || ''}`}></div>
                <div className={stylesSpecific.podiumRank}>1st</div>
              </div>
            )}
            
            {/* 3rd place - right position */}
            {finalRankings.length > 2 && (
              <div className={`${stylesSpecific.podiumPlayer} ${stylesSpecific.podiumThird}`}>
                <div className={stylesSpecific.podiumUsername}>{finalRankings[2]}</div>
                <div className={`${stylesSpecific.podiumBase} ${playerColorMapping[finalRankings[2]] || ''}`}></div>
                <div className={stylesSpecific.podiumRank}>3rd</div>
              </div>             )}
          </div>
          <div className={stylesSpecific.endGameContainer}>
            {isAdmin && (
              <button 
                className={styles.restartGameButton}
                onClick={handleRestartGame}
              >
                Restart Game
              </button>
            )}
            <button 
              className={styles.returnToHomeButton}
              onClick={handleLeaveLobby}
            >
              Return to Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;