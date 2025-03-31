import React from "react";
import { Button } from "antd";
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
      <div className={styles.playButtonContainer} style={{ fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', alignItems: 'flex-start' }}>
          <Button
              type="primary"
              variant="solid"
              color="volcano"
              className={styles.lobbyButtons}
              style={{ border: '6px solid #ffffff', borderRadius: '20px' }}
              >
              Create Lobby
          </Button>
          <Button
              type="primary"
              variant="solid"
              color="volcano"
              className={styles.lobbyButtons}
              style={{ border: '6px solid #ffffff', borderRadius: '20px' }}
              >
              Join Lobby
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainPage;
