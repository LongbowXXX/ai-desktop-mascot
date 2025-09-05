import React, { useEffect } from 'react';
import { Html } from '@react-three/drei';
import './SpeechBubble.css'; // CSS for styling
import { SpeakMessage } from '../types/avatar_types';

interface SpeechBubbleProps {
  message: SpeakMessage | null;
  position?: [number, number, number]; // Position relative to the parent object
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message, position = [0, 1.8, 0] }) => {
  useEffect(() => {
    if (message) {
      console.log(`[SpeechBubble] show: id=${message.id}, text=${message.caption}`);
    }
    return () => {
      if (message) {
        console.log(`[SpeechBubble] hide: id=${message.id}, text=${message.caption}`);
      }
    };
  }, [message]);

  if (!message) {
    return null; // Don't render if there's no text
  }

  return (
    <Html position={position} center distanceFactor={10} zIndexRange={[100, 0]}>
      <div className="speech-bubble-container">
        <div className="speech-bubble">{message.caption}</div>
      </div>
    </Html>
  );
};
