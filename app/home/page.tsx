"use client";

import React, {useEffect} from "react";
import { Button } from "antd";
import styles from "@/styles/page.module.css"; // Import styles
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";


const MainPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();

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