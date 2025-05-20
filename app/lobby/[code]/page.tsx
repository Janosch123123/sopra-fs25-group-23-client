"use client"
import React, {useState, useEffect, useRef} from "react";
import {useRouter, useParams} from "next/navigation";
import {useApi} from "@/hooks/useApi";
import styles from "@/styles/page.module.css";
import stylesSpecific from "@/lobby/lobby.module.css";
import {useLobbySocket} from '@/hooks/useLobbySocket';
import useLocalStorage from '@/hooks/useLocalStorage';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faAngleLeft} from '@fortawesome/free-solid-svg-icons';
import {faAngleRight} from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';

interface Player {
    id?: number;
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
    const {set: setAdminStorage} = useLocalStorage<boolean>("isAdmin", false);
    const {set: setLobbySettingsStorage} = useLocalStorage<string>("lobbySettings", "medium");
    const {set: setSugarRushStorage} = useLocalStorage<boolean>("sugarRush", false);
    const {set: setIncludePowerUpsStorage} = useLocalStorage<boolean>("includePowerUps", false);

    const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false); // Track if current user is admin

    const [spawnRate, setSpawnRate] = useState("Medium");
    const [includePowerUps, setIncludePowerUps] = useState(false);
    const [sugarRush, setSugarRush] = useState(false);
    const [gameMode, setGameMode] = useState("Classic"); // Track the selected game mode

    // Initialize WebSocket connection
    const {isConnected, connect, send, getSocket, disconnect} = useLobbySocket();
    const intentionalDisconnect = useRef(false);

    const [isSinglePlayer, setIsSinglePlayer] = useState(false);

    useEffect(() => {
        // Retrieve isSinglePlayer from localStorage
        const singlePlayerValue = localStorage.getItem("isSinglePlayer") === "true";
        setIsSinglePlayer(singlePlayerValue);
        send({
            type: "requestSettings"
        });
        console.log("Requesting settings from server");
    }, []);

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
    const updatedSettings: Record<string, string | boolean> = {};
    if (customSpawnRate !== undefined) {
      updatedSettings.spawnRate = customSpawnRate;
    }
    if (customPowerupsWanted !== undefined){
      updatedSettings.powerupsWanted = customPowerupsWanted;
    }
     if (customSugarRush !== undefined){
    updatedSettings.sugarRush = customSugarRush;
    }

    // If nothing changed, do not send
    if (Object.keys(updatedSettings).length === 0) {
      console.log("No settings changed, not sending update.");
      return;
    }

    const settingsMessage = {
      type: "lobbySettings",
      settings: updatedSettings
    };

    console.log("%c OUTGOING SETTINGS 📤", "background: #007700; color: white; font-size: 12px; padding: 2px 5px; border-radius: 2px;", { 
      message: settingsMessage,
      currentState: {
        spawnRate,
        sugarRush,
        includePowerUps,
        gameMode
      }
    });
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
        console.log("111 Lobby settings changed:", {
          spawnRate,
          sugarRush: newSugarRush,
          powerupsWanted: newPowerupsWanted
        });
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


        } else {
            console.log("No adminId in lobbyData, cannot determine admin status");
        }
    }, [lobbyData, setAdminStorage]);

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
                    console.log("%c INITIAL SETTINGS LOAD 🔄", "background: #aa5500; color: white; font-size: 12px; padding: 2px 5px; border-radius: 2px;", {
                      settings: data.lobby.settings,
                      previousState: {
                        spawnRate,
                        includePowerUps,
                        sugarRush,
                        gameMode
                      }
                    });
                    
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
                console.log("%c INCOMING SETTINGS 📥", "background: #0077cc; color: white; font-size: 12px; padding: 2px 5px; border-radius: 2px;", {
                  rawData: data,
                  currentState: {
                    spawnRate,
                    sugarRush,
                    includePowerUps,
                    gameMode
                  }
                });
                
                // Accept both 'Settings' and 'settings' for compatibility
                const settings = data.Settings || data.settings;
                if (settings) {
                 // Track if any settings are actually going to change
                  let hasChanges = false;
                  let newSpawnRateValue = spawnRate;
                  let newSugarRushValue = sugarRush;
                  let newPowerupsWantedValue = includePowerUps;
                  
                  // Check each setting individually and only update if it exists in the message
                  if (settings.spawnRate !== undefined && settings.spawnRate !== spawnRate) {
                    newSpawnRateValue = settings.spawnRate;
                    hasChanges = true;
                  }
                  
                  if (settings.sugarRush !== undefined && settings.sugarRush !== sugarRush) {
                    newSugarRushValue = settings.sugarRush;
                    hasChanges = true;
                  }
                  
                  if (settings.powerupsWanted !== undefined && settings.powerupsWanted !== includePowerUps) {
                    newPowerupsWantedValue = settings.powerupsWanted;
                    hasChanges = true;
                  }
                  
                  if (hasChanges) {
                    // Apply all the changes atomically
                    setSpawnRate(newSpawnRateValue);
                    setSugarRush(newSugarRushValue);
                    setIncludePowerUps(newPowerupsWantedValue);
                    
                    // Update localStorage with new values
                    setLobbySettingsStorage(newSpawnRateValue);
                    setSugarRushStorage(newSugarRushValue);
                    setIncludePowerUpsStorage(newPowerupsWantedValue);
                    
                    // Set game mode based on updated booleans
                    if (newSugarRushValue) {
                      setGameModeAndBooleans("Sugar Rush");
                    } else if (newPowerupsWantedValue) {
                      setGameModeAndBooleans("Power-Ups");
                    } else {
                      setGameModeAndBooleans("Classic");
                    }
                    
                    console.log("Updated settings from server:", {
                      spawnRate: newSpawnRateValue,
                      sugarRush: newSugarRushValue,
                      powerupsWanted: newPowerupsWantedValue,
                      gameMode: newSugarRushValue ? "Sugar Rush" : newPowerupsWantedValue ? "Power-Ups" : "Classic"
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
  
  }, [connect, lobbyCode, isConnected, send, getSocket, router, lobbyData, includePowerUps, spawnRate, disconnect, setGameModeAndBooleans, setIncludePowerUpsStorage, setLobbySettingsStorage, setSugarRushStorage, sugarRush]); // Added missing dependencies

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
                    {formatedToken}
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
        // Send updated settings to all users
        console.log("222 Lobby settings changed:", {
            spawnRate: newSpawnRate,
            sugarRush,
            includePowerUps
        });
      sendUpdatedSettings(newSpawnRate as "Slow" | "Medium" | "Fast", sugarRush, includePowerUps );
    }, 0);
  };


    if (loading) {
        return <div>Loading lobby data... {connectionError ? "(WebSocket connection issue)" : ""}</div>;
    }

    return (
        <div className={styles.mainPage}>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                <div className={stylesSpecific.snakeLobbyImage1}>
                {/* css handles image */}
                </div>
                <div className={stylesSpecific.lobbyContainer}>
                    <Image
                        src="/assets/lobby_font.png"
                        alt="Lobby Logo"
                        className={stylesSpecific.lobbyHeaderLogo}
                        width={600}
                        height={600}
                        quality={100}
                        priority

                    />
                    <>
                        <h1 className={stylesSpecific.lobbyCode}>Code: {lobbyData?.code}</h1>
                    </>
                    {connectionError &&
                        <div className={styles.connectionError}>WebSocket connection issue. Some real-time updates may
                            not
                            work.</div>}
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
                                    {player.username} {lobbyData?.adminId && (player.id === lobbyData.adminId) && "👑"}
                                </td>
                                <td>{Math.floor(player.level)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>

                    
                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                      {isAdmin && (
                        <>
                          {isSinglePlayer || (lobbyData?.players && lobbyData.players.length > 1) ? (
                            // Green clickable button for singleplayer or more than 1 player
                            <button
                              className={styles.startGameButton}
                              onClick={() => {
                                handleStartGame();
                              }}
                            >
                              Start Game
                            </button>
                          ) : (
                            // Greyed-out button for only 1 player in non-singleplayer mode
                            <button
                              className={`${styles.startGameButton} ${styles.disabledButton}`}
                              disabled
                            >
                              Start Game
                            </button>
                          )}
                        </>
                      )}
                      {!isAdmin && null /* No button for non-admin users */}
                      <button
                        className={styles.leaveLobbyButton}
                        onClick={handleLeaveLobby}
                      >
                        Leave Lobby
                      </button>
                    </div>
                </div>
                <div className={`${stylesSpecific.settingsContainer} ${!isAdmin ? stylesSpecific.disabledSettingContainer : ''}`}>
                        <Image
                        src="/assets/settings.png"
                        alt="Settings Logo"
                        className={stylesSpecific.settingsLogo}
                        width={250}
                        height={250}


                    />

                        <div className={stylesSpecific.sliderContainer}>
                            <label htmlFor="spawnRateSlider" className={stylesSpecific.optionTitle}>Cookies Spawn-Rate</label>
                            <input
                                type="range"
                                id="spawnRateSlider"
                                min="0"
                                max="2"
                                step="1"
                                value={spawnRate === "Slow" ? "0" : spawnRate === "Medium" ? "1" : "2"}
                                onChange={handleSpawnRateChange}
                                className={`${stylesSpecific.spawnRateSlider} ${!isAdmin ? stylesSpecific.disabledControl : ''}`}
                                disabled={!isAdmin} // Disable the slider for non-admin users
                            />
                            <div className={stylesSpecific.sliderLabels}>
                                <span>Slow</span>
                                <span>Medium</span>
                                <span>Fast</span>
                            </div>
                        </div>

                        <div className={stylesSpecific.gameModeContainer}>
                            {isAdmin && (
                                <button
                                    className={stylesSpecific.arrowButton}
                                    onClick={() => handleGameModeChange("left")}
                                >
                                    <FontAwesomeIcon icon={faAngleLeft}/>
                                </button>
                            )}
                            <div className={stylesSpecific.gameModeTextWrapper}>
              <span
                  className={`${stylesSpecific.gameModeText} ${
                      isAnimating && animationPhase === "out"
                          ? (slideDirection === "left" ? stylesSpecific.slideOutRight : stylesSpecific.slideOutLeft)
                          : isAnimating && animationPhase === "in"
                              ? (slideDirection === "left" ? stylesSpecific.slideInRight : stylesSpecific.slideInLeft)
                              : ''
                  }`}
              >
                {gameMode}
              </span>
                            </div>
                            {isAdmin && (
                                <button
                                    className={stylesSpecific.arrowButton}
                                    onClick={() => handleGameModeChange("right")}
                                >
                                    <FontAwesomeIcon icon={faAngleRight}/>
                                </button>
                            )}
                        </div>
                    </div>
            </div>
        </div>
    );
};

export default LobbyPage;