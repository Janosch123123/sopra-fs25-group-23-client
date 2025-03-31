"use client"
import React, { useState } from "react";
import styles from "@/styles/page.module.css"; // Import styles

const MainPage: React.FC = () => {
  const players = [
    { username: "Snake123", level: 5 },
    { username: "Jarno", level: 10 },
    { username: "MarMahl", level: 7 },
    { username: "Joello33", level: 3 }
  ]; // Example player list

  const topPlayer = players.reduce((prev, current) => (prev.level > current.level) ? prev : current);

  const [spawnRate, setSpawnRate] = useState("Medium");
  const [includePowerUps, setIncludePowerUps] = useState(false);

  const handleSpawnRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value === "0") setSpawnRate("Slow");
    else if (value === "1") setSpawnRate("Medium");
    else if (value === "2") setSpawnRate("Fast");
  };

  const handleIncludePowerUpsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludePowerUps(event.target.checked);
  };

  return (
    <div className={styles.mainPage}>
      <div className={styles.lobbyContainer}>
        <h1>Lobby</h1>
        <h3>(5HK7UZH)</h3>
        <br></br>
        <table className={styles.lobbyTable}>
          <thead>
            <tr>
              <th>Username</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => (
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
