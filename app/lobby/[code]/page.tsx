"use client"
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import styles from "@/styles/page.module.css";
import { useLobbySocket } from '@/hooks/useLobbySocket';
import useLocalStorage from '@/hooks/useLocalStorage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';
import { faAngleRight } from '@fortawesome/free-solid-svg-icons';

interface Player {
  username: string;
  level: number;
}

interface LobbyData {
  code: string;
  players: Player[];
  settings: {
    spawnRate: "Slow" | "Medium" | "Fast";
    powerupsWanted: boolean;
    sugarRush: boolean;
  };
  adminId?: number | string;
}

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const lobbyCode = params?.code as string;
  const apiService = useApi();
  
  // Add isAdmin localStorage hook
  const { set: setAdminStorage } = useLocalStorage<boolean>("isAdmin", false);
  const { set: setLobbySettingsStorage } = useLocalStorage<string>("lobbySettings", "medium");
  const { set: setSugarRushStorage } = useLocalStorage<boolean>("sugarRush", false);
  const { set: setIncludePowerUpsStorage } = useLocalStorage<boolean>("includePowerUps", false);
  
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false); // Track if current user is admin
  const [adminUsername, setAdminUsername] = useState(""); // Track admin's username

  const [spawnRate, setSpawnRate] = useState("Medium");
  const [includePowerUps, setIncludePowerUps] = useState(false);
  const [sugarRush, setSugarRush] = useState(false);
  const [gameMode, setGameMode] = useState("Classic"); // Track the selected game mode
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, getSocket, disconnect} = useLobbySocket();
  const intentionalDisconnect = useRef(false);

  // Function to handle start game
  const handleStartGame = () => {
    if (!isAdmin) return; // Only admin can start the game
    
    console.log("handleStartGame function called");
    
    // Save spawnRate to localStorage
    setLobbySettingsStorage(spawnRate);
    setSugarRushStorage(sugarRush); // Save sugarRush to localStorage
    setIncludePowerUpsStorage(includePowerUps); // Save powerUps to localStorage
    
    // Send start game message
    send({
      type: "startGame",
      lobbyId: lobbyCode,
      settings: {
        spawnRate: spawnRate,
        sugarRush: sugarRush,
        powerupsWanted: includePowerUps
      }
    });
    console.log("Start game message sent:", {
      type: "startGame",
      lobbyId: lobbyCode,
      settings: {
        spawnRate: spawnRate,
        sugarRush: sugarRush,
        powerupsWanted: includePowerUps

      }
    });
  };

  // Function to handle leave lobby
  const handleLeaveLobby = () => {
    disconnect();
    intentionalDisconnect.current = true; // Set flag to indicate intentional disconnect
    console.log("Disconnected from WebSocket");
    router.push("/home");
  };

  // Function to send updated settings to all users via WebSocket
  const sendUpdatedSettings = (
    customSpawnRate?: "Slow" | "Medium" | "Fast",
    customSugarRush?: boolean,
    customPowerupsWanted?: boolean
  ) => {
    if (!isAdmin) return;

    // Build settings object with only changed keys
    const settings: Record<string, any> = {};
    if (customSpawnRate !== undefined && customSpawnRate !== spawnRate) {
      settings.spawnRate = customSpawnRate;
    }
    if (customPowerupsWanted !== undefined && customPowerupsWanted !== includePowerUps) {
      settings.powerupsWanted = customPowerupsWanted;
    }
    if (customSugarRush !== undefined && customSugarRush !== sugarRush) {
      settings.sugarRush = customSugarRush;
    }

    // If nothing changed, do not send
    if (Object.keys(settings).length === 0) {
      console.log("No settings changed, not sending update.");
      return;
    }

    const settingsMessage = {
      type: "lobbySettings",
      settings
    };

    console.log("Sending updated settings:", settingsMessage);
    send(settingsMessage);
  };

  const [isAnimating, setIsAnimating] = useState(false); // Track animation state
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [animationPhase, setAnimationPhase] = useState<"out" | "in" | null>(null);

  // Helper to set game mode and booleans in sync
  const setGameModeAndBooleans = (mode: "Classic" | "Sugar Rush" | "Power-Ups") => {
    setGameMode(mode);
    if (mode === "Classic") {
      setSugarRush(false);
      setIncludePowerUps(false);
      setSugarRushStorage(false);
      setIncludePowerUpsStorage(false);
    } else if (mode === "Sugar Rush") {
      setSugarRush(true);
      setIncludePowerUps(false);
      setSugarRushStorage(true);
      setIncludePowerUpsStorage(false);
    } else if (mode === "Power-Ups") {
      setSugarRush(false);
      setIncludePowerUps(true);
      setSugarRushStorage(false);
      setIncludePowerUpsStorage(true);
    }
  };

  const handleGameModeChange = (direction: "left" | "right") => {
    if (!isAdmin || isAnimating) return; // Only allow admin to change game mode and prevent rapid clicking

    setIsAnimating(true);
    setSlideDirection(direction);
    setAnimationPhase("out");

    const modes = ["Classic", "Sugar Rush", "Power-Ups"];
    const currentIndex = modes.indexOf(gameMode);
    const newIndex =
      direction === "left"
        ? (currentIndex - 1 + modes.length) % modes.length
        : (currentIndex + 1) % modes.length;

    const newGameMode = modes[newIndex] as "Classic" | "Sugar Rush" | "Power-Ups";

    // Compute the new booleans for the selected mode
    let newSugarRush = false;
    let newPowerupsWanted = false;
    if (newGameMode === "Sugar Rush") {
      newSugarRush = true;
    } else if (newGameMode === "Power-Ups") {
      newPowerupsWanted = true;
    }

    setTimeout(() => {
      setGameModeAndBooleans(newGameMode);
      setTimeout(() => {
        sendUpdatedSettings(spawnRate as "Slow" | "Medium" | "Fast", newSugarRush, newPowerupsWanted);
      }, 0);
      setAnimationPhase("in");
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationPhase(null);
      }, 150);
    }, 100);
  };

  // Check localStorage for debugging
  useEffect(() => {
    try {
      console.log("Checking localStorage contents:");
      Object.keys(localStorage).forEach(key => {
        console.log(`${key}: ${localStorage.getItem(key)}`);
      });
    } catch (error) {
      console.error("Error accessing localStorage:", error);
    }
  }, []);

  // Admin check effect - runs when lobbyData changes
  useEffect(() => {
    if (!lobbyData) {
      console.log("No lobby data available yet");
      return;
    }
    
    console.log("Checking admin status with lobbyData:", JSON.stringify(lobbyData, null, 2));
    
    // Extract all possible user identifiers
    const userId = localStorage.getItem("userId");
    const username = localStorage.getItem("username");
    
    // Try to match with adminId
    if (lobbyData.adminId !== undefined) {
      // Clean all values aggressively
      const cleanUserId = userId ? userId.replace(/"/g, '') : '';
      const cleanUsername = username ? username.replace(/"/g, '') : '';
      const adminIdStr = String(lobbyData.adminId);
      
      console.log("Admin ID comparison:", {
        userId, 
        username,
        cleanUserId,
        cleanUsername, 
        adminId: lobbyData.adminId,
        adminIdStr
      });
      
      // Also try to match with the user's ID in the participants array
      const isUserInParticipants = lobbyData.players.some(player => {
        const playerName = player.username.replace(/"/g, '');
        console.log(`Comparing player: ${playerName} with username: ${cleanUsername}`);
        return playerName === cleanUsername;
      });
      
      // Try multiple approaches to determine admin status
      const isAdminById = cleanUserId === adminIdStr;
      const isAdminByUsername = cleanUsername === adminIdStr;
      
      console.log("Admin check results:", {
        isAdminById,
        isAdminByUsername,
        isUserInParticipants
      });
      
      // Set as admin if any check passes
      setIsAdmin(isAdminById || isAdminByUsername);
      setAdminStorage(isAdminById || isAdminByUsername); // Update localStorage
      
      // Find the admin username from the players list
      if (lobbyData.players && lobbyData.players.length > 0) {
        // Try to find the admin by matching adminId with username
        const adminPlayer = lobbyData.players.find(player => 
          player.username.replace(/"/g, '') === adminIdStr
        );
        
        if (adminPlayer) {
          setAdminUsername(adminPlayer.username);
        } else {
          // If we can't find by direct match, use the current user's username if they're admin
          if (isAdminById || isAdminByUsername) {
            setAdminUsername(cleanUsername);
          }
        }
      }
    } else {
      console.log("No adminId in lobbyData, cannot determine admin status");
    }
  }, [lobbyData]);

  // Initialize connection and set up message handlers
  useEffect(() => {
    
    const setupWebSocket = async () => {
      try {
        // Connect if not already connected
        let socket;
        if (!isConnected) {
          const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
          socket = await connect({ token });
        }
        
        // Always set up the message handler regardless of connection status
        // This ensures we handle messages even after reconnection
        const currentSocket = socket || (isConnected ? getSocket() : null);
        if (currentSocket) {
          currentSocket.onmessage = (event: MessageEvent) => {
            try {
              console.log("Received WebSocket message:", event.data);
              const data = JSON.parse(event.data);
              
              // Log the entire data structure
              console.log("FULL DATA STRUCTURE:", JSON.stringify(data, null, 2));
              
              // Handle all possible lobby update message types
              if (data.type === 'lobby_data' || data.type === 'lobby_update' || data.type === 'lobby_state') {
                if (data.lobby) {
                  // Try to get adminId from multiple places
                  const adminId = data.adminId || (data.lobby && data.lobby.adminId);
                  console.log("Extracted adminId:", adminId);
                  
                  const completeData = {
                    ...data.lobby,
                    adminId: adminId // Set the adminId explicitly
                  };
                  
                  console.log("Final lobbyData object:", completeData);
                  setLobbyData(completeData);
                  
                  // Only update settings if they exist in the data
                  if (data.lobby.settings) {
                    setSpawnRate(data.lobby.settings.spawnRate);
                    setIncludePowerUps(data.lobby.settings.powerupsWanted);
                    setSugarRush(data.lobby.settings.sugarRush);
                  }
                  setLoading(false);
                  setConnectionError(false);

                } else if (data.adminId) {
                  // If there's no lobby property but there is an adminId,
                  // create a simplified structure with the available data
                  console.log("No lobby property but found adminId:", data.adminId);
                  
                  // If participants exist at the top level
                  const players = data.participants || [];
                  
                  const completeData = {
                    code: data.lobbyId || lobbyCode,
                    players: players,
                    settings: {
                      spawnRate: spawnRate as "Slow" | "Medium" | "Fast",
                      powerupsWanted: includePowerUps,
                      sugarRush: sugarRush
                    },
                    adminId: data.adminId
                  };
                  
                  console.log("Constructed lobbyData from top-level data:", completeData);
                  setLobbyData(completeData);
                }
              } 
              // Handle lobbySettings response from server
              else if (data.type === 'lobbySettings') {
                console.log("Received lobbySettings update:", data);
                // Accept both 'Settings' and 'settings' for compatibility
                const settings = data.Settings || data.settings;
                if (settings) {
                  // Only update if the received settings are different from the current state
                  const isDifferent =
                    settings.spawnRate !== spawnRate ||
                    settings.powerupsWanted !== includePowerUps ||
                    settings.sugarRush !== sugarRush;
                  if (isDifferent) {
                    setSpawnRate(settings.spawnRate);
                    setIncludePowerUps(settings.powerupsWanted);
                    setSugarRush(settings.sugarRush);
                    // Set game mode based on booleans
                    if (settings.sugarRush) {
                      setGameModeAndBooleans("Sugar Rush");
                    } else if (settings.powerupsWanted) {
                      setGameModeAndBooleans("Power-Ups");
                    } else {
                      setGameModeAndBooleans("Classic");
                    }
                    setLobbySettingsStorage(settings.spawnRate);
                    setIncludePowerUpsStorage(settings.powerupsWanted);
                    setSugarRushStorage(settings.sugarRush);
                    console.log("Updated settings from server:", {
                      spawnRate: settings.spawnRate,
                      includePowerUps: settings.powerupsWanted,
                      sugarRush: settings.sugarRush,
                      gameMode: settings.sugarRush ? "Sugar Rush" : settings.powerupsWanted ? "Power-Ups" : "Classic"
                    });
                  } else {
                    console.log("Received settings are the same as local state, skipping UI update.");
                  }
                }
              }
              else if (data.type === "gameStarted") {
                console.log("Game started! Redirecting to game page...");
                // Redirect to the game page with the same lobby code
                router.push(`/game/${lobbyCode}`);
              }

              else if (data.type === 'connection_success') {
                console.log("WebSocket connection established successfully");
                setConnectionError(false);
                
                // No need to request lobby data as server will push updates automatically
              }
              else if (data.type === 'error') {
                console.error("WebSocket error:", data.message);
                setConnectionError(true);
              }
              else if (data.type === 'lobby_joined') {
                console.log("Successfully joined lobby:", data);
                if (data.lobby) {
                  // Try to get adminId from multiple places
                  const adminId = data.adminId || (data.lobby && data.lobby.adminId);
                  console.log("Extracted adminId (lobby_joined):", adminId);
                  
                  const completeData = {
                    ...data.lobby,
                    adminId: adminId // Set the adminId explicitly
                  };
                  
                  console.log("Final lobbyData object (lobby_joined):", completeData);
                  setLobbyData(completeData);
                  
                  if (data.lobby.settings) {
                    setSpawnRate(data.lobby.settings.spawnRate);
                    setIncludePowerUps(data.lobby.settings.powerupsWanted);
                    setSugarRush(data.lobby.settings.sugarRush);
                  }
                  
                  setLoading(false);
                } else if (data.adminId) {
                  // If there's no lobby property but there is an adminId,
                  // create a simplified structure with the available data
                  console.log("No lobby property in lobby_joined but found adminId:", data.adminId);
                  
                  // If participants exist at the top level
                  const players = data.participants || [];
                  
                  const completeData = {
                    code: data.lobbyId || lobbyCode,
                    players: players,
                    settings: {
                      spawnRate: spawnRate as "Slow" | "Medium" | "Fast",
                      powerupsWanted: includePowerUps,
                      sugarRush: sugarRush
                    },
                    adminId: data.adminId
                  };
                  
                  console.log("Constructed lobbyData from top-level data (lobby_joined):", completeData);
                  setLobbyData(completeData);
                }
              }
              
            } catch (error) {
              console.error('Error handling WebSocket message:', error);
            }
          };
        }
        
        // Create some placeholder data for the UI in case of connection error
        if (!lobbyData) {
          setLobbyData({
            code: lobbyCode,
            players: [
              { username: localStorage.getItem("username") || "You", level: 1 }
            ],
            settings: {
              spawnRate: "Medium",
              sugarRush: false,
              powerupsWanted: false
            }
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('WebSocket setup error:', error);
        setConnectionError(true);
        setLoading(false);
      }
    };
    
    setupWebSocket();
    
    // At the end of your setupWebSocket useEffect, add this return statement:
    return () => {
      if (intentionalDisconnect.current) {
        console.log("Disconnecting WebSocket on unmount");
        disconnect();
      } else {
        console.log("Not disconnecting WebSocket on unmount");
      }
    };
  
  }, [connect, lobbyCode, isConnected, send, getSocket, router, lobbyData, includePowerUps, spawnRate, disconnect]); // Added missing dependencies

  // Request lobby state when component mounts
  // This is to ensure we have the latest data when the component loads
  useEffect(() => {
    send({
      type: "lobbystate",
    });
  }
   // eslint-disable-next-line react-hooks/exhaustive-deps
  , []); 


  useEffect(() => {
    const checkToken = async () => {
      // Check if token exists in localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        // If no token, redirect to login page
        router.push("/login");
        return;
      }

      try {
        // If token exists, verify it's still valid with the backend
        const formatedToken = token.replace(/"/g, '');
        const response = await apiService.post<{ authorized: boolean }>(
          "/auth/verify",
          { formatedToken }
        );

        // If token is not authorized, redirect to login
        if (!response.authorized) {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error('Error verifying user token:', error);
        router.push("/login");
      }
    };

    checkToken();
  }, [apiService, router]);

  const handleSpawnRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return; // Only allow admin to change spawn rate

    const value = event.target.value;
    const newSpawnRate = value === "0" ? "Slow" : value === "1" ? "Medium" : "Fast";
    setSpawnRate(newSpawnRate);

    // Send updated settings to all users after spawn rate change
    setTimeout(() => {
      sendUpdatedSettings(newSpawnRate as "Slow" | "Medium" | "Fast");
    }, 0);
  };

  
  if (loading) {
    return <div>Loading lobby data... {connectionError ? "(WebSocket connection issue)" : ""}</div>;
  }

  return (
    <div className={styles.mainPage}>
      <div className={styles.lobbyContainer}>
        <h1>Lobby</h1>
        <h3>({lobbyData?.code})</h3>
        {connectionError && <div className={styles.connectionError}>WebSocket connection issue. Some real-time updates may not work.</div>}
        <br></br>
        <table className={styles.lobbyTable}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {lobbyData?.players.map((player, index) => (
              <tr key={index}>
                <td>
                  {player.username} {lobbyData?.adminId && player.username === adminUsername && "👑"}
                </td>
                <td>{Math.floor(player.level)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className={styles.settingsContainer}>
          <h2>Game Settings</h2>
          <br></br>
          <div className={styles.sliderContainer}>
            <label htmlFor="spawnRateSlider" className={styles.optionTitle}>Cookies Spawn-Rate</label>
            <input
              type="range"
              id="spawnRateSlider"
              min="0"
              max="2"
              step="1"
              value={spawnRate === "Slow" ? "0" : spawnRate === "Medium" ? "1" : "2"}
              onChange={handleSpawnRateChange}
              className={`${styles.spawnRateSlider} ${!isAdmin ? styles.disabledControl : ''}`}
              disabled={!isAdmin} // Disable the slider for non-admin users
            />
            <div className={styles.sliderLabels}>
              <span>Slow</span>
              <span>Medium</span>
              <span>Fast</span>
            </div>
          </div>
          
          <div className={styles.gameModeContainer}>
            {isAdmin && (
              <button
                className={styles.arrowButton}
                onClick={() => handleGameModeChange("left")}
              >
                <FontAwesomeIcon icon={faAngleLeft} />
              </button>
            )}
            <div className={styles.gameModeTextWrapper}>
              <span 
                className={`${styles.gameModeText} ${
                  isAnimating && animationPhase === "out" 
                    ? (slideDirection === "left" ? styles.slideOutRight : styles.slideOutLeft) 
                    : isAnimating && animationPhase === "in"
                    ? (slideDirection === "left" ? styles.slideInRight : styles.slideInLeft)
                    : ''
                }`}
              >
                {gameMode}
              </span>
            </div>
            {isAdmin && (
              <button
                className={styles.arrowButton}
                onClick={() => handleGameModeChange("right")}
              >
                <FontAwesomeIcon icon={faAngleRight} />
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center"}}>
          {isAdmin && (
            <button 
              className={styles.startGameButton}
              onClick={() => {
                console.log("Start Game button clicked");
                handleStartGame();
              }}
            >
              Start Game
            </button>
          )}
          <button 
            className={styles.leaveLobbyButton} 
            onClick={handleLeaveLobby}
          >
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;