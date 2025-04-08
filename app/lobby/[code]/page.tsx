"use client"
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import styles from "@/styles/page.module.css";
import { useLobbySocket } from '@/hooks/useLobbySocket';


interface Player {
  username: string;
  level: number;
}

interface LobbyData {
  code: string;
  players: Player[];
  settings: {
    spawnRate: "Slow" | "Medium" | "Fast";
    includePowerUps: boolean;
  };
}

const LobbyPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const lobbyCode = params?.code as string;
  const apiService = useApi();
  
  
  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const [spawnRate, setSpawnRate] = useState("Medium");
  const [includePowerUps, setIncludePowerUps] = useState(false);
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, disconnect, getSocket } = useLobbySocket();
  const [connectionEstablished, setConnectionEstablished] = useState(false);

  

    

  // Function to handle start game
  const handleStartGame = () => {
    console.log("handleStartGame function called");
    // Send start game message
    send({
      type: "startGame",
      lobbyId: lobbyCode
    });
    console.log("Sent startGame message");
  };

  // Function to handle leave lobby
  const handleLeaveLobby = () => {
    console.log("Leaving lobby");
    router.push("/home");
  };



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
              
              // Handle all possible lobby update message types
              if (data.type === 'lobby_data' || data.type === 'lobby_update' || data.type === 'lobby_state') {
                if (data.lobby) {
                  setLobbyData(data.lobby);
                  
                  // Only update settings if they exist in the data
                  if (data.lobby.settings) {
                    setSpawnRate(data.lobby.settings.spawnRate);
                    setIncludePowerUps(data.lobby.settings.includePowerUps);
                  }
                  
                  setLoading(false);
                  setConnectionError(false);
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
                  setLobbyData(data.lobby);
                  if (data.lobby.settings) {
                    setSpawnRate(data.lobby.settings.spawnRate);
                    setIncludePowerUps(data.lobby.settings.includePowerUps);
                  }
                  setLoading(false);
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
              includePowerUps: false
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
    
    // Don't disconnect on unmount, as we want to keep the connection alive
    // when navigating between pages
  }, [connect, lobbyCode, isConnected, send]);


  const updateSettings = () => {
    // Send updated settings to server
    send({
      type: 'update_lobby_settings',
      lobbyCode: lobbyCode,
      userId: localStorage.getItem("userId") || '',
      settings: {
        spawnRate: spawnRate,
        includePowerUps: includePowerUps
      }
    });
  };

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
    const value = event.target.value;
    const newSpawnRate = value === "0" ? "Slow" : value === "1" ? "Medium" : "Fast";
    setSpawnRate(newSpawnRate);
    
    // Update the setting via WebSocket after a short delay
    setTimeout(() => updateSettings(), 100);
  };

  const handleIncludePowerUpsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludePowerUps(event.target.checked);
    
    // Update the setting via WebSocket after a short delay
    setTimeout(() => updateSettings(), 100);
  };
  

  if (loading) {
    return <div>Loading lobby data... {connectionError ? "(WebSocket connection issue)" : ""}</div>;
  }
  
  // Ensure topPlayer always has a value by providing a default empty object if players array is empty
  const topPlayer = lobbyData?.players.length ? 
    lobbyData.players.reduce((prev, current) => (prev.level > current.level ? prev : current), lobbyData.players[0]) 
    : { username: "", level: 0 };

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
                  {player.username} {player.username === topPlayer?.username && "👑"}
                </td>
                <td>{player.level}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
            className={styles.spawnRateSlider}
          />
          <div className={styles.sliderLabels}>
            <span>Slow</span>
            <span>Medium</span>
            <span>Fast</span>
          </div>
        </div>
        <div className={styles.checkboxContainer}>
          <input
            type="checkbox"
            id="includePowerUps"
            checked={includePowerUps}
            onChange={handleIncludePowerUpsChange}
          />
          <label htmlFor="includePowerUps" className={styles.optionTitle}>Include Power-Ups</label>
        </div>
        <button 
          className={styles.startGameButton} 
          onClick={() => {
            console.log("Start Game button clicked");
            handleStartGame();
          }}
        >
          Start Game
        </button>
        <button 
          className={styles.leaveLobbyButton} 
          onClick={handleLeaveLobby}
        >
          Leave Lobby
        </button>
      </div>
    </div>
  );
};

export default LobbyPage;