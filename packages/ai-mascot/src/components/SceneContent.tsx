// src/components/SceneContent.tsx
import React from 'react';
import { OrbitControls, Environment } from '@react-three/drei'; // Import Environment
import { VRMAvatar } from './VRMAvatar';
import { VRM } from '@pixiv/three-vrm'; // Keep VRM type for AvatarData
import { AvatarState } from '../types/avatar_types';

// Define a type for the data needed for each avatar
interface AvatarData extends AvatarState {
  onLoad?: (vrm: VRM) => void; // Optional onLoad callback per avatar
}

interface SceneContentProps {
  avatars: AvatarData[]; // Array of avatar data objects
  controlsEnabled?: boolean; // OrbitControls有効化フラグ追加
  onAvatarLoad?: (id: string) => void; // 追加
}

export const SceneContent: React.FC<SceneContentProps> = ({ avatars, controlsEnabled = true, onAvatarLoad }) => {
  // --- Scene elements rendering ---
  return (
    <>
      {/* Environment and Background */}
      <Environment files="/background.jpg" background />

      {/* Environment Light */}
      <ambientLight intensity={0.8} />
      {/* Directional Light */}
      <directionalLight
        position={[3, 5, 2]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="grey" />
      </mesh>

      {/* Render each VRM Avatar based on the avatars prop */}
      {avatars.map(avatar => (
        <VRMAvatar
          key={avatar.id} // Use unique ID as key
          {...avatar}
          onLoad={onAvatarLoad ? () => onAvatarLoad(avatar.id) : undefined}
        />
      ))}

      {/* Camera Controls */}
      {controlsEnabled && <OrbitControls target={[0, 1, 0]} />}
    </>
  );
};
