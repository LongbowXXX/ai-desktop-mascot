// src/components/SceneContent.tsx
import React from 'react';
import { OrbitControls } from '@react-three/drei'; // Import Environment
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
  onAvatarPointerOver?: (id: string) => void;
  onAvatarPointerOut?: (id: string) => void;
}

export const SceneContent: React.FC<SceneContentProps> = ({
  avatars,
  controlsEnabled = true,
  onAvatarLoad,
  onAvatarPointerOver,
  onAvatarPointerOut,
}) => {
  // --- Scene elements rendering ---
  return (
    <>
      {/* Environment and Background */}
      {/* <Environment files="/background.jpg" background /> */}

      {/* Environment Light */}
      <ambientLight intensity={0.5} />
      {/* Directional Light */}
      <directionalLight position={[3, 5, 2]} intensity={1.2} />

      {/* Render each VRM Avatar based on the avatars prop */}
      {avatars.map(avatar => (
        <VRMAvatar
          key={avatar.id} // Use unique ID as key
          {...avatar}
          onLoad={onAvatarLoad ? () => onAvatarLoad(avatar.id) : undefined}
          onPointerOverAvatar={onAvatarPointerOver ? () => onAvatarPointerOver(avatar.id) : undefined}
          onPointerOutAvatar={onAvatarPointerOut ? () => onAvatarPointerOut(avatar.id) : undefined}
        />
      ))}

      {/* Camera Controls */}
      {controlsEnabled && <OrbitControls target={[0, 1, 0]} />}
    </>
  );
};
