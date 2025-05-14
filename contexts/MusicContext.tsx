"use client";
// contexts/MusicContext.tsx
import React, { createContext, useContext, useRef, useState, ReactNode } from 'react';
import { message } from 'antd';

interface MusicContextType {
  isPlaying: boolean;
  currentStation: string | null;
  playMusic: () => Promise<void>;
  playGenre: (genre: string) => Promise<void>;
  stopMusic: () => void;
}

interface Station {
  name: string;
  url_resolved: string;
  tags?: string;
  codec?: string;
  bitrate?: number;
  stationuuid?: string;
  votes?: number;
}

const MusicContext = createContext<MusicContextType | null>(null);

export const MusicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playStation = (station: Station) => {
    try {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Create new audio element
      const audio = new Audio();
      audioRef.current = audio;
      
      // Set up event listeners
      audio.addEventListener('playing', () => {
        setIsPlaying(true);
        setCurrentStation(station.name);
        message.success({ 
          content: `Now playing: ${station.name}${station.tags ? ` (${station.tags})` : ''}`, 
          key: 'musicLoader',
          duration: 5 
        });
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        message.warning('Playback failed. Trying another station...');
        playFallbackStation();
      });
      
      // Try to play with crossOrigin setting for CORS
      audio.crossOrigin = "anonymous";
      audio.src = station.url_resolved;
      
      const playPromise = audio.play();
      
      // Handle autoplay restrictions
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error('Autoplay prevented:', error);
          message.info({ 
            content: 'Click Play Music again to start audio (browser autoplay restriction)', 
            key: 'musicLoader' 
          });
          setIsPlaying(false);
        });
      }
    } catch (error) {
      console.error('Error playing station:', error);
      message.error({ content: 'Failed to play station.', key: 'musicLoader' });
      playFallbackStation();
    }
  };

  const playFallbackStation = () => {
    try {
      const reliableStreams: Station[] = [
        {
          name: "NPR News",
          url_resolved: "https://npr-ice.streamguys1.com/live.mp3",
          tags: "news, talk"
        },
        {
          name: "Classic Rock",
          url_resolved: "https://streaming.live365.com/a31769",
          tags: "rock, classic"
        },
        {
          name: "Smooth Jazz",
          url_resolved: "https://streaming.live365.com/a18690",
          tags: "jazz, smooth"
        },
        {
          name: "Classical Music",
          url_resolved: "https://stream.wqxr.org/wqxr-web",
          tags: "classical"
        },
        {
          name: "Hip Hop",
          url_resolved: "https://streaming.live365.com/a45469",
          tags: "hiphop, rap"
        }
      ];
      
      // Pick a random reliable stream
      const fallbackStation = reliableStreams[Math.floor(Math.random() * reliableStreams.length)];
      playStation(fallbackStation);
    } catch (error) {
      console.error('Error with fallback playback:', error);
      message.error('All playback attempts failed. Please try again later.');
      setIsPlaying(false);
      setCurrentStation(null);
    }
  };

  const playMusic = async () => {
    // If music is already playing, stop it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentStation(null);
      message.info('Music stopped');
      return;
    }

    try {
      message.loading({ content: 'Finding radio stations...', key: 'musicLoader' });
      
      const response = await fetch('https://de1.api.radio-browser.info/json/stations/topvote?limit=30&hidebroken=true', {
        headers: {
          'User-Agent': 'GameMusicPlayer/1.0.0',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const stations = await response.json() as Station[];
      
      if (!stations || stations.length === 0) {
        message.error({ content: 'No stations found. Try again later.', key: 'musicLoader' });
        return playFallbackStation();
      }
      
      const viableStations = stations.filter((station: Station) => 
        station.url_resolved && 
        station.codec && 
        station.bitrate && station.bitrate > 0 && 
        !station.url_resolved.includes('.m3u')
      );
      
      const stationToPlay = viableStations.length > 0 
        ? viableStations[Math.floor(Math.random() * Math.min(viableStations.length, 5))] 
        : stations[0];
      
      playStation(stationToPlay);
    } catch (error) {
      console.error('Error fetching radio stations:', error);
      message.error({ content: 'Failed to fetch stations. Trying backup source...', key: 'musicLoader' });
      playFallbackStation();
    }
  };

  const playGenre = async (genre: string) => {
    if (!genre.trim()) {
      message.warning('Please enter a genre to search');
      return;
    }
    
    // Stop any currently playing music
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
    
    try {
      message.loading({ content: `Finding ${genre} stations...`, key: 'musicLoader' });
      const searchTerm = encodeURIComponent(genre.trim().toLowerCase());
    
      // Try searching by name first
      let response = await fetch(`https://de1.api.radio-browser.info/json/stations/byname/${searchTerm}?limit=15&hidebroken=true`, {
        headers: {
          'User-Agent': 'GameMusicPlayer/1.0.0',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      let stations = await response.json() as Station[];
      
      if (stations.length < 3) {
        response = await fetch(`https://de1.api.radio-browser.info/json/stations/bytag/${searchTerm}?limit=15&hidebroken=true`, {
          headers: {
            'User-Agent': 'GameMusicPlayer/1.0.0',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const tagStations = await response.json() as Station[];
          const existingIds = new Set(stations.map((s: Station) => s.stationuuid));
          const uniqueTagStations = tagStations.filter((s: Station) => !existingIds.has(s.stationuuid));
          stations = [...stations, ...uniqueTagStations];
        }
      }
      
      // Also try searching by genre as a fallback
      response = await fetch(`https://de1.api.radio-browser.info/json/stations/bytagexact/genre:${searchTerm}?limit=10&hidebroken=true`, {
        headers: {
          'User-Agent': 'GameMusicPlayer/1.0.0',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const genreStations = await response.json() as Station[];
        const existingIds = new Set(stations.map((s: Station) => s.stationuuid));
        const uniqueGenreStations = genreStations.filter((s: Station) => !existingIds.has(s.stationuuid));
        stations = [...stations, ...uniqueGenreStations];
      }

      if (!stations || stations.length === 0) {
        message.error({ content: `No stations found for "${genre}". Trying general stations...`, key: 'musicLoader' });
        return playMusic();
      }
      
      let stationsToConsider = stations.filter((station: Station) => 
        station.url_resolved && 
        station.codec && 
        !station.url_resolved.includes('.m3u') &&
        station.votes !== undefined && station.votes > 0
      );
      
      if (stationsToConsider.length < 3) {
        const additionalStations = stations.filter((station: Station) => 
          station.url_resolved && 
          station.codec && 
          !station.url_resolved.includes('.m3u')
        ).slice(0, 5);
        
        const existingIds = new Set(stationsToConsider.map((s: Station) => s.stationuuid as string));
        const uniqueAdditionalStations = additionalStations.filter((s: Station) => !existingIds.has(s.stationuuid as string));
        stationsToConsider = [...stationsToConsider, ...uniqueAdditionalStations];
      }
      
      stationsToConsider.sort((a: Station, b: Station) => (b.votes || 0) - (a.votes || 0));

      const stationToPlay = stationsToConsider.length > 0 
        ? stationsToConsider[Math.floor(Math.random() * Math.min(stationsToConsider.length, 5))] 
        : stations[0];
      
      playStation(stationToPlay);
      
    } catch (error) {
      console.error('Error fetching genre stations:', error);
      message.error({ content: 'Failed to find genre. Trying general stations...', key: 'musicLoader' });
      playMusic();
    }
  };

  const stopMusic = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStation(null);
    message.info('Music stopped');
  };

  return (
    <MusicContext.Provider value={{ isPlaying, currentStation, playMusic, playGenre, stopMusic }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};