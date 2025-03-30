"use client";

import React, {useEffect, useState} from "react";
import { Button, Modal, Input } from "antd";
import styles from "@/styles/page.module.css"; // Import styles
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useLobbySocket } from '@/hooks/useLobbySocket';


interface UserStats {
  username: string;
  level: number;
  wins: number;
  kills: number;
}

const MainPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { connect, send, disconnect, isConnected } = useLobbySocket(); // Added this line for WebSocket
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserStats = async () => {
    try {
      setLoading(true);
  
      const response = await apiService.get<UserStats>('/users/current/stats');
       
      setUserStats(response);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
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

        await fetchUserStats();

      } catch (error) {
        console.error('Error verifying user token:', error);
        router.push("/login");
      }
    };

    checkToken();
    
    // Add cleanup for WebSocket
    return () => {
      disconnect();
    };
  }, [apiService, router, disconnect, fetchUserStats]); // Added proper dependencies


  const handleCreateLobby = async () => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
      
      // Establish WebSocket connection with the token
      const socket = connect({ token });
      
      // Add a basic message handler
      if (socket) {
        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);
            
            // If server responds with lobby code, navigate to that lobby
            if (data.type === 'lobby_created' && data.code) {
              router.push(`/lobby/${data.code}`);
            }
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
      }
      
      // Send a message to create a lobby (instead of API call)
      send({
        action: 'create_lobby',
        settings: {
          spawnRate: "Medium",
          includePowerUps: false
        }
      });
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
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