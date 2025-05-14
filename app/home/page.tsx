  "use client";

import React, {useEffect, useState, useRef} from "react";
import { Button, Input, message } from "antd";
import styles from "@/styles/page.module.css";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useLobbySocket } from '@/hooks/useLobbySocket';
import stylesSpecific from "@/home/home.module.css";
import { useMusic } from "../../contexts/MusicContext";


interface UserStats {
  username: string;
  level: number;
  wins: number;
  kills: number;
  playedGames: number;
  lengthPR: number;
  winRate?: number; // Adding winRate as an optional property
}

  interface LeaderboardPlayer {
    id: number;
    username: string;
    level: number;
    wins: number;
    kills: number;
    playedGames: number;
    lengthPR: number;
    winRate: number;
  }

  const MainPage: React.FC = () => {
    const router = useRouter();
    const apiService = useApi();
    const { connect, send } = useLobbySocket();
    const [userStats, setUserStats] = useState<UserStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [validatingLobby, setValidatingLobby] = useState(false);
    const [showButtons, setShowButtons] = useState(true);
    const [lobbyCode, setLobbyCode] = useState('');
    const [lobbyCodeError, setLobbyCodeError] = useState<string | null>(null);
    const [leaderboardPlayers, setLeaderboardPlayers] = useState<LeaderboardPlayer[]>([]);
    const [leaderboardLoading, setLeaderboardLoading] = useState(true);
    // Add a state for user rank if not in top 5
    const [userRankInfo, setUserRankInfo] = useState<{ rank: number } | null>(null);
    // Add states for music player
    //const [isPlaying, setIsPlaying] = useState(false);
    //const [currentStation, setCurrentStation] = useState<string | null>(null);
    //const audioRef = useRef<HTMLAudioElement | null>(null);
    const [showGenreSearch, setShowGenreSearch] = useState(false);
    const [genreSearchTerm, setGenreSearchTerm] = useState('');
    const { isPlaying, currentStation, playMusic, playGenre, stopMusic } = useMusic();


    const handleLogout = async () => {
      try {
        // Stop any playing music before logout
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        localStorage.clear();
        router.push("/login");
      } catch (error) {
        console.error('Logout failed:', error);
      }
    };

    const handleSingleplayer = async () => {
      try {
        // Get token from localStorage for authentication
        const token = localStorage.getItem("token")?.replace(/"/g, '') || '';
        
        // Connect to WebSocket server if not already connected
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
            console.error("Error handling message:", error);
          }
        };

        send({
          type: "soloLobby",
        });
      } catch (error) {
        console.error("Error creating lobby:", error);
      }
    };

    // Toggle genre search bar
    const toggleGenreSearch = () => {
      setShowGenreSearch(!showGenreSearch);
      if (!showGenreSearch) {
        setGenreSearchTerm('');
      }
    };

    // Handle genre search term changes
    const handleGenreSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setGenreSearchTerm(e.target.value);
    };

    // Handle genre search submission
    const handleGenreSearch = async () => {
      if (!genreSearchTerm.trim()) {
        message.warning('Please enter a genre to search');
        return;
      }
      
      await playGenre(genreSearchTerm);
      setShowGenreSearch(false);
    };

    // Handle Enter key in search input
    const handleGenreSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleGenreSearch();
      }
    };

    useEffect(() => {
      const userId = localStorage.getItem("userId");

      const fetchUserStats = async () => {
        try {
          setLoading(true);

          if (!userId) {
            console.error("User ID not available");
            setLoading(false);
            return;
          }

          const response = await apiService.get<UserStats>(`/users/${userId}`);
          setUserStats(response);
        } catch (error) {
          console.error("Error fetching user stats:", error);
        } finally {
          setLoading(false);
        }
      };

      const fetchLeaderboard = async () => {
        try {
          setLeaderboardLoading(true);
          const response = await apiService.get<LeaderboardPlayer[]>("/leaderboard");
          setLeaderboardPlayers(response);
          
          // Check if the user needs to fetch their rank
          const username = localStorage.getItem("username")?.replace(/"/g, '') || '';
          const userInTop5 = response.slice(0, 5).some(player => player.username === username);
          
          if (!userInTop5 && userId) {
            try {
              // Fetch user's rank if not in top 5
              const rankResponse = await apiService.get<{ rank: number }>(`/leaderboard/${userId}`);
              setUserRankInfo(rankResponse);
            } catch (err) {
              console.error("Error fetching user rank:", err);
            }
          }
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
        } finally {
          setLeaderboardLoading(false);
        }
      };

      const checkToken = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        try {
          const formatedToken = token.replace(/"/g, "");
          const response = await apiService.post<{ authorized: boolean }>("/auth/verify", { formatedToken });

          if (!response.authorized) {
            router.push("/login");
            return;
          }

          await fetchUserStats();
        } catch (error) {
          console.error("Error verifying user token:", error);
          router.push("/login");
        }
      };

      checkToken();
      fetchLeaderboard();
    }, [apiService, router]);

    const handleCreateLobby = async () => {
      try {
        const token = localStorage.getItem("token")?.replace(/"/g, "") || "";
        const socket = await connect({ token });

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "lobby_created" && data.lobbyId) {
              router.push(`/lobby/${data.lobbyId}`);
            }
          } catch (error) {
            console.error("Error handling message:", error);
          }
        };

        send({
          type: "create_lobby",
        });
      } catch (error) {
        console.error("Error creating lobby:", error);
      }
    };

    const handleQuickPlay = async () => {
      try {
        const token = localStorage.getItem("token")?.replace(/"/g, "") || "";
        const socket = await connect({ token });

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "quickPlayResponse" && data.lobbyId) {
              router.push(`/lobby/${data.lobbyId}`);
            }
          } catch (error) {
            console.error("Error handling message:", error);
          }
        };

        send({
          type: "quickPlay",
        });
      } catch (error) {
        console.error("Error initiating quickplay:", error);
      }
    };

    const handleJoinLobbyClick = () => {
      setShowButtons(false);
    };

    const handleBackClick = () => {
      setShowButtons(true);
      setLobbyCode("");
      setLobbyCodeError(null);
    };

    const handleJoinWithCode = async () => {
      if (!lobbyCode.trim()) {
        message.error("Please enter a lobby code");
        return;
      }

      if (!/^\d+$/.test(lobbyCode)) {
        message.error("Lobby code must be a valid integer number");
        return;
      }

      setValidatingLobby(true);
      setLobbyCodeError(null);

      try {
        const token = localStorage.getItem("token")?.replace(/"/g, "") || "";
        const socket = await connect({ token });

        const messageHandler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "validateLobbyResponse") {
              socket.removeEventListener("message", messageHandler);

              if (data.valid === true) {
                router.push(`/lobby/${lobbyCode}`);
              } else {
                setValidatingLobby(false);

                if (data.reason === "full") {
                  setLobbyCodeError("The lobby is full");
                } else {
                  setLobbyCodeError("The lobby does not exist");
                }
              }
            }
          } catch (error) {
            console.error("Error handling message:", error);
            setValidatingLobby(false);
          }
        };

        socket.addEventListener("message", messageHandler);

        send({
          type: "validateLobby",
          lobbyCode: lobbyCode,
        });

        setTimeout(() => {
          if (validatingLobby) {
            socket.removeEventListener("message", messageHandler);
            setValidatingLobby(false);
            message.error("Server did not respond. Please try again.");
          }
        }, 5000);
      } catch (error) {
        console.error("Error validating lobby:", error);
        setValidatingLobby(false);
        message.error("Failed to validate lobby code");
      }
    };

    const handleLobbyCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === "" || /^\d+$/.test(value)) {
        setLobbyCode(value);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !showButtons) {
        handleJoinWithCode();
      }
    };

  return (
    <div className={styles.mainPage}>
      <div className={stylesSpecific.mainHomePage}>
        <div className={stylesSpecific.dashboardContainer}>
          <h2>User Statistics</h2>
          {loading ? (
            <p>Loading statistics...</p>
          ) : userStats ? (
          <table className={stylesSpecific.statisticsTable}>
            <tbody>
              <tr>
                <td>Username:</td>
                <td>{userStats.username.length > 9 ? `${userStats.username.slice(0, 7)}...` : userStats.username}</td>
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
                <td>Winrate:</td>
                <td>{userStats.winRate !== undefined ? `${Math.round(userStats.winRate * 100)}%` : 
                    userStats.playedGames > 0 ? `${Math.round((userStats.wins / userStats.playedGames) * 100)}%` : '0%'}</td>
              </tr>
              <tr>
                <td>Length-PR:</td>
                <td>{userStats.lengthPR}</td>
              </tr>
              <tr>
                <td style={{
                  borderBottom: 'none',
                }}>Level:</td>
                <td style={{
                  borderBottom: 'none',
                }}>{Math.floor(userStats.level)}</td>
              </tr>
              <tr>
                <td
                  colSpan={2}
                  style={{
                    padding: 0,
                    position: 'relative',
                    backgroundColor: '#345a97',
                    borderBottom: 'none',

                  }}
                  >
                  <div className={stylesSpecific.levelProgressContainer} style={{ width: '100%', }}>
                    <div
                      className={stylesSpecific.levelProgressBar}
                      style={{
                        marginLeft: '-3px',
                        
                        width: `${(userStats.level % 1) * 100}%`,
                        backgroundColor: '#4caf50',
                        height: '10px',
                        borderRadius: '10px', // Make both ends rounded
                      }}
                      ></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          ) : (
            <p>No statistics available</p>
          )}

        </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "20px",
              alignItems: "flex-start",
            }}
          >
            {showButtons ? (
              <div className={stylesSpecific.lobbyButtonsContainer} style={{ display: "flex", flexDirection: "column", gap: "30px" }}>
                <div className={stylesSpecific.logoHomeImage}>
                  {/* Logo will be displayed via CSS */}
                </div>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: "-80px"}}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Button
                      type="primary"
                      variant="solid"
                      className={styles.lobbyButtons}
                      style={{ border: "6px solid #ffffff", borderRadius: "20px" }}
                      onClick={handleCreateLobby}
                    >
                      Create Lobby
                    </Button>
                    <Button
                      type="primary"
                      variant="solid"
                      className={styles.singleButtons}
                      style={{ border: "6px solid #ffffff", borderRadius: "20px" }}
                      onClick={handleQuickPlay}
                    >
                      Quickplay
                    </Button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                  <Button
                      type="primary"
                      variant="solid"
                      className={styles.lobbyButtons}
                      style={{ border: "6px solid #ffffff", borderRadius: "20px" }}
                      onClick={handleJoinLobbyClick}
                    >
                      Join Lobby
                    </Button>
                    <Button
                      type="primary"
                      variant="solid"
                      className={styles.singleButtons}
                      style={{ border: "6px solid #ffffff", borderRadius: "20px" }}
                      onClick={handleSingleplayer}
                    >
                      Singleplay
                    </Button>
                  </div>
                </div>
                <Button
                  type="primary"
                  variant="solid"
                  className={styles.logoutButton}
                  onClick={handleLogout}
                  style={{ marginTop: "0px", justifyContent: "center" }}
                >
                  Logout
                </Button>
                <div style={{ display: "flex", flexDirection: "column", width: "100%", alignItems: "center" }}>
                  <Button
                      type="primary"
                      variant="solid"
                      className={`${styles.musicButton} ${isPlaying ? styles.musicButtonPlaying : ''}`}
                      onClick={playMusic} // Changed from handlePlayMusic to playMusic
                      style={{ 
                        marginTop: '20px', 
                        justifyContent: 'center',
                        backgroundColor: isPlaying ? '#4caf50' : undefined,
                        width: showGenreSearch ? 'auto' : undefined
                      }}
                    >
                      {isPlaying ? `Stop Music (${currentStation})` : 'Play Music'}
                    </Button>
                 
                    <Button
                      type="primary"
                      variant="solid"
                      onClick={toggleGenreSearch}
                      style={{ 
                        marginTop: '10px',
                        justifyContent: 'center',
                        fontSize: '0.9rem',
                        padding: '0 15px',
                        height: '30px'
                      }}
                    >
                      {showGenreSearch ? 'Hide Genre Search' : 'Search By Genre'}
                    </Button>
                    
                    {showGenreSearch && (
                      <div style={{ 
                        display: "flex", 
                        marginTop: '10px',
                        width: '100%', 
                        justifyContent: 'center'
                      }}>
                        <Input
                          placeholder="Enter genre (e.g. rock, jazz, pop)"
                          value={genreSearchTerm}
                          onChange={handleGenreSearchChange}
                          onKeyDown={handleGenreSearchKeyDown}
                          style={{
                            maxWidth: '200px',
                            marginRight: '5px'
                          }}
                        />
                        <Button 
                          type="primary"
                          onClick={handleGenreSearch}
                        >
                          Play
                        </Button>
                      </div>
                    )}
                  </div>
              </div>
            ) : (
              <div className={stylesSpecific.lobbyButtonsContainer} style={{ display: "flex", flexDirection: "column",  gap: "30px" }}>
                <div className={stylesSpecific.logoHomeImage}>
                  {/* Logo will be displayed via CSS */}
                </div>
                <div className={stylesSpecific.joinButtonContainer} style={{ marginTop: "-70px",  display: "flex", flexDirection: "column"}}>
                  <div style={{ display: "flex", flexDirection: "row"}}>
                    <div className={stylesSpecific.inputContainer}>
                      <Input
                        placeholder="Enter Lobby Code"
                        value={lobbyCode}
                        onChange={handleLobbyCodeChange}
                        onKeyDown={handleKeyDown}
                        className={stylesSpecific.stretchedInput}
                        style={{
                          flex: "1",
                          borderColor: lobbyCodeError ? "#ff4d4f" : "#ffffff",
                        }}
                        disabled={validatingLobby}
                        type="number"
                        min={0}
                        status={lobbyCodeError ? "error" : ""}
                      />
                      {lobbyCodeError && <div className={stylesSpecific.errorMessage}>{lobbyCodeError}</div>}
                    </div>
                    <Button
                      type="primary"
                      variant="solid"
                      className={styles.joinButton}
                      onClick={handleJoinWithCode}
                      loading={validatingLobby}
                      disabled={validatingLobby}
                    >
                      {validatingLobby ? "Validating..." : "Join"}
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
    
              </div>
            )}
          </div>
          <div className={stylesSpecific.globalLobbyContainer} style={{ marginTop: "0px", marginRight:"100px", minWidth: "400px" }}>
            <h2>Top 5 Players</h2>
              {leaderboardLoading ? (
                <p>Loading leaderboard...</p>
              ) : leaderboardPlayers.length > 0 ? (
                <table className={stylesSpecific.globalLobbyTable}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Username</th>
                      <th>Level</th>
                      <th>Winrate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardPlayers.slice(0, 5).map((player, index) => {
                      const username = localStorage.getItem("username")?.replace(/"/g, '') || '';
                      const isCurrentUser = player.username === username;
                      return (
                        <tr key={index} className={isCurrentUser ? stylesSpecific.userRank : ''}>
                          <td>{index + 1}</td>
                          <td>{player.username.length > 9 ? `${player.username.slice(0, 7)}...` : player.username}</td>
                          <td>{Math.floor(player.level)}</td>
                          <td>{Math.round(player.winRate * 100)}%</td>
                        </tr>
                      );
                    })}
                    
                    {/* Add user's own rank if not in top 5 */}
                    {userRankInfo && (
                      <>
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '5px', fontSize: '2rem' }}>
                            ...
                          </td>
                        </tr>
                        <tr className={stylesSpecific.userRank}>
                          <td>{userRankInfo.rank}</td>
                          <td>{userStats?.username} (You)</td>
                          <td>{userStats ? Math.floor(userStats.level) : '-'}</td>
                          <td>{userStats?.winRate !== undefined ? `${Math.round(userStats.winRate * 100)}%` : 
                              userStats && userStats.playedGames > 0 ? `${Math.round((userStats.wins / userStats.playedGames) * 100)}%` : '0%'}</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              ) : (
                <p>No leaderboard data available</p>
              )}
          </div>
        </div>
    </div>
  );
};

  export default MainPage;