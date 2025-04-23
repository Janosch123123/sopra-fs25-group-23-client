"use client";

import React, {useEffect, useState} from "react";
import { Button, Input, message } from "antd";
import styles from "@/styles/page.module.css";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useLobbySocket } from '@/hooks/useLobbySocket';

interface UserStats {
  username: string;
  level: number;
  wins: number;
  kills: number;
  playedGames: number;
  lengthPR: number;
}

const MainPage: React.FC = () => {
  const router = useRouter();
  const apiService = useApi();
  const { connect, send} = useLobbySocket();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [validatingLobby, setValidatingLobby] = useState(false);
  const [showButtons, setShowButtons] = useState(true);
  const [lobbyCode, setLobbyCode] = useState('');
  const [lobbyCodeError, setLobbyCodeError] = useState<string | null>(null);

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
    
    // Disconnect WebSocket when component unmounts
    return () => {
    };
  }, [apiService, router]);

  const handleCreateLobby = async () => {
    try {
      // Get token from localStorage for authentication
      const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
      
      // Connect to WebSocket server if not already connected
      // if (!isConnected) {
        const socket = await connect({ token });
        
        // Set up message handler for WebSocket events
        socket.onmessage = (event) => {
          try {
            console.log("Raw message:", event.data);
            
            // Parse the message data
            const data = JSON.parse(event.data);
            console.log('Parsed JSON message:', data);
            
            // Handle lobby creation response
            if (data.type === 'lobby_created' && data.lobbyId) {
              router.push(`/lobby/${data.lobbyId}`);
            }
          } catch (error) {
            console.error('Error handling message:', error);
          }
        };
      // }
      
      // Send the create lobby request
      send({
        type: 'create_lobby'
      });
      
    } catch (error) {
      console.error('Error creating lobby:', error);
      // Show error to user
    }
  };

  const handleJoinLobbyClick = () => {
    setShowButtons(false);
  };

  const handleBackClick = () => {
    setShowButtons(true);
    setLobbyCode('');
    setLobbyCodeError(null);
  };

  const handleJoinWithCode = async () => {
    if (!lobbyCode.trim()) {
      message.error('Please enter a lobby code');
      return;
    }

    // Validate that the input is a valid integer
    if (!/^\d+$/.test(lobbyCode)) {
      message.error('Lobby code must be a valid integer number');
      return;
    }

    setValidatingLobby(true);
    setLobbyCodeError(null); // Reset error state
    
    try {
      // Get token from localStorage for authentication
      const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
      
      // Connect to WebSocket server if not already connected
      
        const socket = await connect({ token });
      
      // Set up a one-time message handler for lobby validation response
      const messageHandler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received validation response:', data);
          
          if (data.type === 'validateLobbyResponse') {
            // Clean up event listener
            socket.removeEventListener('message', messageHandler);
            
            if (data.valid === true) {
              // Keep validating state active until navigation completes
              // and navigate to the lobby if it exists
              router.push(`/lobby/${lobbyCode}`);
            } else {
              // Only set validatingLobby to false if lobby doesn't exist
              setValidatingLobby(false);
              
              // Check if the reason is "full"
              if (data.reason === 'full') {
                setLobbyCodeError('The lobby is full');
              } else {
                // Show default error if lobby doesn't exist or other reason
                setLobbyCodeError('The lobby does not exist');
              }
            }
          }
        } catch (error) {
          console.error('Error handling message:', error);
          setValidatingLobby(false);
        }
      };
    
      // Add the message event listener
      socket.addEventListener('message', messageHandler);
      
      // Send the validate lobby request
      send({
        type: 'validateLobby',
        lobbyCode: lobbyCode
      });
      
      // Set a timeout to prevent infinite waiting
      setTimeout(() => {
        if (validatingLobby) {
          socket.removeEventListener('message', messageHandler);
          setValidatingLobby(false);
          message.error('Server did not respond. Please try again.');
        }
      }, 5000);

    } catch (error) {
      console.error('Error validating lobby:', error);
      setValidatingLobby(false);
      message.error('Failed to validate lobby code');
    }
  };

  const handleLobbyCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits (integers)
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setLobbyCode(value);
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
            <tr>
              <td>#Games:</td>
              <td>{userStats.playedGames}</td>
            </tr>
            <tr>
              <td>Length-PR:</td>
              <td>{userStats.lengthPR}</td>
            </tr>
          </tbody>
        </table>
        ) : (
          <p>No statistics available</p>
        )}
      </div>
      <div className={styles.playButtonContainer} style={{ fontSize: '10px', fontWeight: 'bold', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px', alignItems: 'flex-start' }}>
          {showButtons ? (
            <>
              <Button
                type="primary"
                variant="solid"
                className={styles.lobbyButtons}
                style={{ border: '6px solid #ffffff', borderRadius: '20px' }}
                onClick={handleCreateLobby}
              >
                Create Lobby
              </Button>
              <Button
                type="primary"
                variant="solid"
                className={styles.lobbyButtons}
                style={{ border: '6px solid #ffffff', borderRadius: '20px' }}
                onClick={handleJoinLobbyClick}
              >
                Join Lobby
              </Button>
            </>
          ) : (
            <div className={styles.joinButtonContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                <div className={styles.inputContainer}>
                  <Input
                    placeholder="Enter Lobby Code"
                    value={lobbyCode}
                    onChange={handleLobbyCodeChange}
                    className={styles.stretchedInput}
                    style={{ 
                      flex: '1',
                      borderColor: lobbyCodeError ? '#ff4d4f' : '#ffffff'
                    }}
                    disabled={validatingLobby}
                    type="number" // Set input type to number
                    min={0} // Only positive integers
                    status={lobbyCodeError ? "error" : ""}
                  />
                  {lobbyCodeError && (
                    <div className={styles.errorMessage}>{lobbyCodeError}</div>
                  )}
                </div>
                <Button
                  type="primary"
                  variant="solid"
                  className={styles.joinButton}
                  onClick={handleJoinWithCode}
                  loading={validatingLobby}
                  disabled={validatingLobby}
                >
                  {validatingLobby ? 'Validating...' : 'Join'}
                </Button>
              </div>
              <Button
                type="primary"
                variant="solid"
                className={styles.backButton}
                onClick={handleBackClick}
                style={{ marginTop: '15px', justifyContent: 'center'}}
              >
                Back
              </Button>
            </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MainPage;