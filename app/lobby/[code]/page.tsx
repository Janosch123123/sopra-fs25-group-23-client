"use client"
import React, { useState, useEffect, use } from "react";
import { useRouter, useParams } from "next/navigation";
import { useApi } from "@/hooks/useApi";
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

//    const players = [
  //      { username: "Snake123", level: 5 },
    //    { username: "Jarno", level: 10 },
      //  { username: "MarMahl", level: 7 },
        //{ username: "Joello33", level: 3 }
//    ]; // Example player list

  //const topPlayer = players.reduce((prev, current) => (prev.level > current.level) ? prev : current);

//  const [spawnRate, setSpawnRate] = useState("Medium");
  //const [includePowerUps, setIncludePowerUps] = useState(false);

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

    await fetchLobbyData();

      } catch (error) {
        console.error('Error verifying user token:', error);
        router.push("/login");
      }
    };

    checkToken();
}, [apiService, router]);

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
    const topPlayer = lobbyData?.players.reduce((prev, current) => (prev.level > current.level ? prev : current), lobbyData?.players[0]);

  return (
    <div className={styles.mainPage}>
      <div className={styles.lobbyContainer}>
        <h1>Lobby</h1>
        <h3>({lobbyData?.code})</h3>
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
                  {player.username} {player.username === topPlayer.username && "👑"}
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
        <button className={styles.startGameButton}>Start Game</button>
        <button className={styles.leaveLobbyButton}>Leave Lobby</button>
      </div>
    </div>
  );
};

export default MainPage;