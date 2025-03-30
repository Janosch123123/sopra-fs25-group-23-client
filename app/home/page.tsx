"use client";

import React, {useEffect, useState} from "react";
import { Button, Modal, Input } from "antd";
import styles from "@/styles/page.module.css"; // Import styles
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useLobbySocket } from '@/hooks/useLobbySocket';


const MainPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { connect, send, disconnect, isConnected } = useLobbySocket();


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

  return () => {
    disconnect(); // Clean up WebSocket when component unmounts
  };

}, [apiService, router, disconnect]); // Add disconnect to dependencies

const handleCreateLobby = () => {
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