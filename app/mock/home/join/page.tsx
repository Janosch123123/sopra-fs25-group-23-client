import React from "react";
import styles from "@/styles/page.module.css"; // Import styles

const MainPage: React.FC = () => {
  return (
    <div className={styles.mainPage}>
      <div className={styles.dashboardContainer}>
        <h2>User Statistics</h2>
        <table className={styles.statisticsTable}>
          <tbody>
            <tr>
              <td>Username:</td>
              <td>Snake123</td>
            </tr>
            <tr>
              <td>Level:</td>
              <td>10</td>
            </tr>
            <tr>
              <td>#Wins:</td>
              <td>25</td>
            </tr>
            <tr>
              <td>#Kills:</td>
              <td>150</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={styles.playButtonContainer}>
        <div className={styles.lobbyCodeContainer}>
          <h3 className={styles.lobbyCodeTitle}>Enter Lobby Code</h3> {/* Add title */}
          <input
            type="text"
            placeholder="Enter Lobby Code"
            className={styles.lobbyCodeInput}
          />
          <button className={styles.volcanoBackButton}>Back</button> {/* Add volcano Back button */}
        </div>
      </div>
    </div>
  );
};

export default MainPage;
