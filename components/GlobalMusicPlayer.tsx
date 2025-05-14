"use client";
// components/GlobalMusicPlayer.tsx
import React from 'react';
import { Button } from 'antd';
import { useMusic } from '../contexts/MusicContext';

const GlobalMusicPlayer: React.FC = () => {
  const { isPlaying, currentStation, stopMusic } = useMusic();

  if (!isPlaying || !currentStation) return null;

  return (
    <div style={{ 
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '30px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ color: '#75bd9d', fontSize: '16px' }}>♪</span>
        <span style={{ 
          maxWidth: '200px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {currentStation}
        </span>
      </div>
      <Button 
        type="text" 
        onClick={stopMusic}
        size="small"
        style={{ 
          color: 'white',
          padding: '4px 8px',
          height: '24px',
          width: '24px',
          minWidth: '24px',
          fontSize: '18px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%'
        }}
      >
        ×
      </Button>
    </div>
  );
};

export default GlobalMusicPlayer;