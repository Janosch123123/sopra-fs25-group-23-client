# 🐍 Snake With Friends

Snake With Friends is a modern multiplayer twist on the classic Snake game, with a focus on fun, multiplayer interaction, and personalization. Whether alone, with friends, or strangers: there's something for everyone, even your favorite background music!

## Technologies Used

The technologies we used for this project are:

* Java
* Spring Boot (Backend)
* WebSockets (Real-time Communication)
* TypeScript & React (Frontend)
* Google App Engine (Deployment)
* Docker (Containerization)

## High-Level Components

Our project is structured into several main components that work together to create the Snake With Friends experience:

### 1. Authentication System
The [login](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/login/page.tsx) and [register](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/register/page.tsx) pages handle user authentication. These components use the [apiService.ts](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/api/apiService.ts) for backend communication and store authentication tokens in local storage for persistent sessions.

### 2. Home (Lobby Overview)
The [Home page](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/home/page.tsx) is our main hub after login. Here, users can view their statistics, access the global leaderboard, and choose different game options (QuickPlay, Single Player, Create/Join Lobby). This component integrates multiple services including our WebSocket service for real-time lobby creation and validation.

### 3. Lobby System
The [Lobby component](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/lobby/%5Bcode%5D/page.tsx) manages game setup and player connections. It uses our [WebSocket service](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/api/websocketService.ts) to maintain real-time connections between players, allowing game mode selection and configuration before starting a game.

### 4. Game Engine
The [Game component](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/app/game/%5Bcode%5D/page.tsx) is responsible for rendering the game grid, handling player input, and communicating game state via WebSockets. It manages all player interactions, power-ups, collision detection visualization, and game-end scenarios.

### 5. Music Integration
The [MusicContext](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/contexts/MusicContext.tsx) and [GlobalMusicPlayer](https://github.com/Janosch123123/sopra-fs25-group-23-client/blob/main/components/GlobalMusicPlayer.tsx) components provide a unique feature for streaming music while playing, enhancing the overall user experience with personalized background music.

These components are interconnected through a shared WebSocket connection for real-time communication and utilize React Context for state management across the application.

## Illustrations

The interaction flow is based on the components mentioned above in the components section. We'll start off with the interaction from a user perspective.

#### Home (Lobby Overview)

The Home page is the central hub of our client after registration/login. From here users can:
- View their player statistics
- Check the global leaderboard showing the top players
- Create a new lobby as the host
- Join an existing lobby using a lobby code
- Enter Quickplay mode to instantly join available games
- Play in single player mode
- Choose background music from worldwide radio stations

#### Lobby

When a user decides to create a lobby, they are assigned the Owner role (indicated by a crown), which allows them to configure the game:
- Select from three game modes (Classic, Sugar Rush, Power-Ups)
- Set the cookie spawn rate (Slow, Medium, Fast)
- Start the game when ready

The lobby page displays all currently connected players and their levels. Non-admin players can see the settings but can't modify them.

#### Game & Result

Once the game starts, all players control their snakes using arrow keys or WASD. Depending on the selected game mode, players will encounter:

- **Classic**: Traditional snake gameplay with cookies randomly appearing
- **Sugar Rush**: Map filled with cookies for fast-paced action
- **Power-Ups**: Special items that provide unique effects:
  - 2x Multiplier: Double growth when collecting cookies
  - Reverse Controls: Temporarily reverses your own controls
  - Divider: Splits your own Snake's length in half
  - Golden Cookie: Makes the Snake longer by 5 units

A leaderboard shows real-time rankings of all players based on snake length. When a player is eliminated, they enter spectator mode to watch the remaining players.

When the game ends, a podium displays the final rankings with players shown in their respective snake colors. The winner is featured prominently in the center position. From here, the admin can choose to restart the game with all players that are currently in the lobby.

## 🎶Built-in Radio

A unique feature of Snake With Friends is its integrated web radio player. Users can:
- Search for worldwide stations, genres, songs, or artists
- Create a cozy, personalized music atmosphere while they play
- Control playback directly from the interface on the home screen

## 📊 Stats & Leaderboard

Progress and performance are tracked for all game modes except Single Player:
- A global leaderboard showcases top players worldwide
- Individual statistics track wins, kills, games played, and personal records
- Win rates are calculated to show player effectiveness

## Launch & Deployment

### Local Development Setup

To set up the project locally, follow these steps:

1. **Clone the repository**
   ```
   git clone https://github.com/Janosch123123/sopra-fs25-group-23-client.git
   cd sopra-fs25-group-23-client
   ```

2. **Install Node.js**
   - Required version: v20.11.0
   - This comes with the npm package manager

3. **Update npm package manager**
   ```
   npm install -g npm@10.4.0
   ```

4. **Verify versions**
   ```
   node -v
   npm --version
   ```

5. **Install dependencies**
   ```
   npm install
   ```
   If some dependencies fail to install, add them individually:
   ```
   npm install <dependency-name>
   ```

6. **Run the development server**
   ```
   npm run dev
   ```

7. **Access the application**
   - Open http://localhost:3000/ in your browser
   - The page will automatically reload when you make code changes


### External Dependencies

- **Backend Server**: This frontend application requires the backend server to be running. Refer to the [server repository](https://github.com/Janosch123123/sopra-fs25-group-23-server) for setup instructions.

### Deployment

We use Vercel for continuous deployment. The application is automatically deployed when changes are pushed to the main branch.

To manually deploy:

1. **Install Vercel CLI**
   ```
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```
   vercel login
   ```

3. **Deploy**
   ```
   vercel
   ```

For production deployment:
   ```
   vercel --prod
   ```

---

## 👥 Team

- [Marc Mahler](https://github.com/MarcMahler)
- [Janosch Beck](https://github.com/Janosch123123)
- [Jarno Bucher](https://github.com/StalyTV)
- [Joel Schmidt](https://github.com/jojo2-8902)
- [Luke Fohringer](https://github.com/LuckyLuke637)

---

## 🙏 Acknowledgments

- SOPRA team at UZH
- Inspired by classic Snake games
- Feedback from testers during development

---

## 📋 Roadmap

For developers interested in contributing to Snake With Friends, here are the top features we'd like to see implemented:

1. **Mobile Support**: Adapt the user interface for mobile devices and implement touch controls for the snake.

2. **Custom Snake Customization**: Allow users to customize their snake's appearance with different skins, patterns, or accessories that can be unlocked through gameplay.

3. **Tournament Mode**: Implement a structured tournament system where players can compete in brackets to determine an ultimate winner across multiple games.

---

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT).
