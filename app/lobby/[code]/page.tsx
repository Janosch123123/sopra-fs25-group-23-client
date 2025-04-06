"use client"
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useLobbySocket } from "@/hooks/useLobbySocket";
import styles from "@/styles/page.module.css"; // Import styles

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

const MainPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const lobbyCode = params?.code as string;
  const apiService = useApi();

  const [lobbyData, setLobbyData] = useState<LobbyData | null>(null);
  const [loading, setLoading] = useState(true);

  const [spawnRate, setSpawnRate] = useState("Medium");
  const [includePowerUps, setIncludePowerUps] = useState(false);
  
  // Initialize WebSocket connection
  const { isConnected, connect, send, disconnect } = useLobbySocket();
  const [connectionEstablished, setConnectionEstablished] = useState(false);

  // Establish WebSocket connection on component mount
  useEffect(() => {
    const establishConnection = async () => {
      try {
        console.log("Attempting to connect to WebSocket with lobby code:", lobbyCode);
        const socket = await connect({ 
          lobbyCode,
          token: localStorage.getItem("token")?.replace(/"/g, '') || ''
        });
        
        if (socket) {
          console.log("WebSocket connection successful!");
          
          // Set up message handler
          socket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log("Received WebSocket message:", data);
              
              // Handle different message types
              if (data.type === "gameStarted") {
                console.log("Game started! Redirecting to game page...");
                // Redirect to the game page with the same lobby code
                router.push(`/game/${lobbyCode}`);
              }
              
              // Handle other message types...
              
            } catch (error) {
              console.error("Error parsing WebSocket message:", error);
            }
          };
          setConnectionEstablished(true);
        }
      } catch (error) {
        console.error("Failed to connect to WebSocket:", error);
      }
    };

    if (lobbyCode) {
      establishConnection();
    } else {
      console.error("No lobby code available for WebSocket connection");
    }

    // Clean up on unmount
    return () => {
      console.log("Disconnecting WebSocket");
      disconnect();
    };
  }, [connect, disconnect, lobbyCode, router]);

  // Function to handle start game
  const handleStartGame = () => {
    console.log("handleStartGame function called");
    // Send start game message
    send({
      type: "startGame",
      lobbyId: lobbyCode
    });
    console.log("Sent startGame message");
    
    // You could add a visual feedback here
    alert("Starting game...");
  };

  // Function to handle leave lobby
  const handleLeaveLobby = () => {
    console.log("Leaving lobby");
    router.push("/home");
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

        const fetchLobbyData = async () => {
          try {
            setLoading(true);
            const response = await apiService.get<LobbyData>(`/lobby/${lobbyCode}`);
            setLobbyData(response);
            setSpawnRate(response.settings.spawnRate);
            setIncludePowerUps(response.settings.includePowerUps);
          } catch (error) {
            console.error('Error fetching lobby data:', error);

            setLobbyData({
              code: lobbyCode || "5HK7UZH",
              players: [
                { username: "Snake123", level: 5 },
                { username: "Jarno", level: 10 },
                { username: "MarMahl", level: 7 },
                { username: "Joello33", level: 3 }
              ],
              settings: {
                spawnRate: "Medium",
                includePowerUps: false
              }
            });
          } finally {
            setLoading(false);
          }
        };

        await fetchLobbyData();

      } catch (error) {
        console.error('Error verifying user token:', error);
        router.push("/login");
      }
    };

    checkToken();

    return () => {
      // Cleanup code if necessary
    };
  }, [apiService, router, lobbyCode]);

  const handleSpawnRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "0") setSpawnRate("Slow");
    else if (value === "1") setSpawnRate("Medium");
    else if (value === "2") setSpawnRate("Fast");
  };

  const handleIncludePowerUpsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludePowerUps(event.target.checked);
  };

  if (loading) {
    return <div>Loading lobby data...</div>;
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
        <div className={styles.connectionStatus}>
          {isConnected ? "Connected to lobby" : "Connecting..."}
        </div>
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

export default MainPage;