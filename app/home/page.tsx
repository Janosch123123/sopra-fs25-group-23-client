"use client";

import React, {useEffect, useState, useRef} from "react";
import { Button} from "antd";
import styles from "@/styles/page.module.css";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useLobbySocket } from '@/hooks/useLobbySocket';
import { WebSocketService } from '@/api/websocketService';

interface UserStats {
  username: string;
  level: number;
  wins: number;
  kills: number;
}

const MainPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { connect, send, isConnected} = useLobbySocket();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  

  useEffect(() => {

    const userId = localStorage.getItem("userId");

    const fetchUserStats = async () => {
      try {
        setLoading(true);
        
        if (!userId) {
          console.error('User ID not available');
          setLoading(false);
          return;
        }
      
        const response = await apiService.get<UserStats>(`/users/${userId}`);
        setUserStats(response);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };


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

        await fetchUserStats();

      } catch (error) {
        console.error('Error verifying user token:', error);
        router.push("/login");
      }
    };

    checkToken();
    
    // Add cleanup for WebSocket
    return () => {
    };
  }, [apiService, router]);

  const handleCreateLobby = async () => {
    try {
      const socket = await connect();
      
      socket.onmessage = (event) => {
        try {
          console.log("Raw message:", event.data);
          const data = JSON.parse(event.data);
          console.log('Parsed JSON message:', data);
          
          if (data.type === 'lobby_created' && data.lobbyId) {
            router.push(`/lobby/${data.lobbyId}`);
          }
        } catch (error) {
          console.error('Error handling message:', error);
        }
      };
      
      send({ type: 'create_lobby' });
      
    } catch (error) {
      console.error('Error creating lobby:', error);
    }
  };

  return (
    <div className={styles.mainPage}>
      <div className={styles.dashboardContainer}>
        <h2>User Statistics</h2>
        {loading ? (
          <p>Loading statistics...</p>
        ) : userStats ? (
        <table className={styles.statisticsTable}>
          <tbody>
            <tr>
              <td>Username:</td>
              <td>{userStats.username}</td>
            </tr>
            <tr>
              <td>Level:</td>
              <td>{userStats.level}</td>
            </tr>
            <tr>
              <td>#Wins:</td>
              <td>{userStats.wins}</td>
            </tr>
            <tr>
              <td>#Kills:</td>
              <td>{userStats.kills}</td>
            </tr>
          </tbody>
        </table>
        ) : (
          <p>No statistics available</p>
        )}
      </div>
      <div className={styles.playButtonContainer} style={{ fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', alignItems: 'flex-start' }}>
          <Button
              type="primary"
              variant="solid"
              color="volcano"
              className={styles.lobbyButtons}
              style={{ border: '6px solid #ffffff', borderRadius: '20px' }}
              onClick={handleCreateLobby}
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