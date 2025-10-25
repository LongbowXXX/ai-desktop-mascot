import React from 'react';
import { Canvas } from '@react-three/fiber';
import { VRMController } from '../components/VRMController';
import { SceneContent } from '../components/SceneContent';
import { Typography, Chip } from '@mui/material';
import styled from 'styled-components';
import { AnimatedCamera } from '../components/AnimatedCamera';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { AvatarState } from '../types/avatar_types';
import { StageState } from '../types/scene_types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ElectronWindow } from '../types/electron';

interface StagePageProps {
  avatars: AvatarState[];
  setAvatars: React.Dispatch<React.SetStateAction<AvatarState[]>>;
  stage: StageState;
  lastMessage: unknown;
  isConnected: boolean;
}

// styled-components でスタイル定義
const Root = styled.div`
  display: flex;
  height: 100vh;
  background: transparent;
`;

const CanvasArea = styled.div`
  flex-grow: 1;
  position: relative;
  background: transparent;
`;

const Sidebar = styled.div`
  width: 350px;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #fff;
  box-shadow: 0px 3px 6px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
`;

const StatusBox = styled.div``;

const LastMessageBox = styled.div``;

const LastMessagePaper = styled.div`
  padding: 8px;
  max-height: 150px;
  overflow-y: auto;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
  font-size: 2rem;
  font-weight: bold;
  color: #333;
`;

const MarkdownOverlay = styled.div`
  position: absolute;
  bottom: 2%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 80, 0, 0.7);
  color: white;
  a:link { color: white; }
  a:visited { color: white; }
  a:hover { color: white; }
  a:active { color: white; }
  padding: 8px;
  border-radius: 8px;
  max-width: 80%;
  max-height: 80%;
  text-align: left;
  font-size: 1.0rem;
  line-height: 1.1;
  overflow-y: auto;
`;

const CameraInit: React.FC = () => {
  const { camera } = useThree();
  useEffect(() => {
    let frame = 0;
    let raf: number | undefined;
    const setCamera = () => {
      camera.position.set(0, 5, 10);
      camera.lookAt(0, 1, 0);
      frame++;
      if (frame < 10) {
        raf = requestAnimationFrame(setCamera);
      }
    };
    setCamera();
    return () => {
      if (raf !== undefined) {
        cancelAnimationFrame(raf);
      }
    };
  }, [camera]);
  return null;
};

const StagePage: React.FC<StagePageProps> = ({ avatars, setAvatars, stage, lastMessage, isConnected }) => {
  // OrbitControls有効化のためのフラグ
  const [cameraAnimated, setCameraAnimated] = React.useState(false);
  // カメラアニメーション開始トリガー
  const [startCameraAnimation, setStartCameraAnimation] = React.useState(false);
  // カメラアニメーション開始済みかどうか
  const [hasStarted, setHasStarted] = React.useState(false);
  // 各アバターのロード完了IDを管理
  const [loadedAvatarIds, setLoadedAvatarIds] = React.useState<string[]>([]);
  // ホバー中のアバターIDを管理
  const [hoveredAvatarIds, setHoveredAvatarIds] = React.useState<string[]>([]);
  const startDelayRef = React.useRef<number | null>(null);

  // アバターのonLoadコールバック
  const handleAvatarLoad = React.useCallback((id: string) => {
    setLoadedAvatarIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  // アバターのホバー状態変更
  const handleAvatarPointerOver = React.useCallback((id: string) => {
    // ホバー中のIDを追加。既に追加済みなら何もしない
    setHoveredAvatarIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const handleAvatarPointerOut = React.useCallback((id: string) => {
    // ホバーが抜けたIDを除去
    setHoveredAvatarIds(prev => prev.filter(existingId => existingId !== id));
  }, []);

  // 全員ロード完了でカメラアニメーション開始
  const allLoaded = avatars.length > 0 && loadedAvatarIds.length === avatars.length;
  const isAvatarHovered = hoveredAvatarIds.length > 0;
  const showLoadingOverlay = !allLoaded || !hasStarted || !startCameraAnimation;

  const setWindowClickThrough = React.useCallback((ignore: boolean) => {
    if (typeof window === 'undefined') {
      return;
    }
    const electronAPI = (window as ElectronWindow).electron;
    if (electronAPI?.setWindowIgnoreMouseEvents) {
      // ignore = true のとき forward を付けて hover 測位は維持する
      if (ignore) {
        electronAPI.setWindowIgnoreMouseEvents(true, { forward: true });
      } else {
        electronAPI.setWindowIgnoreMouseEvents(false);
      }
    }
  }, []);

  // ロード完了後に自動でステージ開始
  React.useEffect(() => {
    if (!allLoaded) {
      if (startDelayRef.current !== null) {
        clearTimeout(startDelayRef.current);
        startDelayRef.current = null;
      }
      setHasStarted(false);
      return;
    }

    if (hasStarted || startDelayRef.current !== null) {
      return;
    }

    startDelayRef.current = window.setTimeout(() => {
      setHasStarted(true);
      startDelayRef.current = null;
    }, 1000);

    return () => {
      if (startDelayRef.current !== null) {
        clearTimeout(startDelayRef.current);
        startDelayRef.current = null;
      }
    };
  }, [allLoaded, hasStarted]);

  // 全員ロード完了でカメラアニメーション開始（ディレイ付き）
  React.useEffect(() => {
    if (allLoaded && hasStarted && !startCameraAnimation && !cameraAnimated) {
      setStartCameraAnimation(true);
    }
    // allLoadedやhasStartedがfalseになったらリセット
    if (!allLoaded || !hasStarted) {
      setStartCameraAnimation(false);
    }
  }, [allLoaded, hasStarted, startCameraAnimation, cameraAnimated]);

  // キャラクタ以外は透過クリックにする
  React.useEffect(() => {
    // Start 前はウィンドウ操作できるよう必ず解除
    if (!hasStarted) {
      setWindowClickThrough(false);
      return;
    }
    // ホバー中が無いときのみ透過にする
    setWindowClickThrough(!isAvatarHovered);
  }, [isAvatarHovered, setWindowClickThrough, hasStarted]);

  React.useEffect(() => {
    // アンマウント時は常に通常状態へ戻す
    return () => {
      setWindowClickThrough(false);
    };
  }, [setWindowClickThrough]);

  return (
    <Root>
      {/* Canvas Area */}
      <CanvasArea>
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }} shadows>
          {/* CameraInitコンポーネントを追加 */}
          <CameraInit />
          {/* AnimatedCameraは常にマウントし、内部でアニメーション状態を管理 */}
          <AnimatedCamera
            active={allLoaded && startCameraAnimation && !cameraAnimated}
            onFinish={() => setCameraAnimated(true)}
          />
          <SceneContent
            avatars={avatars}
            controlsEnabled={cameraAnimated}
            onAvatarLoad={handleAvatarLoad}
            onAvatarPointerOver={handleAvatarPointerOver}
            onAvatarPointerOut={handleAvatarPointerOut}
          />
        </Canvas>
        {/* Markdown Overlay */}
        {stage.currentMarkdownText && (
          <MarkdownOverlay>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stage.currentMarkdownText}</ReactMarkdown>
          </MarkdownOverlay>
        )}
        {/* ローディングオーバーレイ or Startボタン */}
        {showLoadingOverlay && <LoadingOverlay>Loading...</LoadingOverlay>}
      </CanvasArea>
      {/* Controller/Sidebar Area */}
      {import.meta.env.VITE_DEBUG_SIDEBAR === 'true' && (
        <Sidebar>
          <Typography variant="h6" component="h3">
            Stage Controls & Status
          </Typography>

          {/* Connection Status */}
          <StatusBox>
            <Typography component="span" variant="body1" sx={{ fontWeight: 'bold' }}>
              Connection Status:{' '}
            </Typography>
            <Chip
              label={isConnected ? 'Connected' : 'Disconnected'}
              color={isConnected ? 'success' : 'error'}
              size="small"
            />
          </StatusBox>

          {/* Last Received Message */}
          <LastMessageBox>
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
              Last Command from Server:
            </Typography>
            <LastMessagePaper>
              <Typography component="pre" sx={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                {lastMessage ? JSON.stringify(lastMessage, null, 2) : 'N/A'}
              </Typography>
            </LastMessagePaper>
          </LastMessageBox>

          {/* VRM Controllers */}
          {avatars.map(avatar => (
            <VRMController
              key={avatar.id}
              title={`Avatar ${avatar.id.replace('avatar', '')} Controls`}
              onEmotionChange={name => {
                setAvatars(prevAvatars =>
                  prevAvatars.map(a =>
                    a.id === avatar.id
                      ? {
                          ...a,
                          currentEmotion: name,
                        }
                      : a
                  )
                );
              }}
              onAnimationChange={animationName => {
                setAvatars(prevAvatars =>
                  prevAvatars.map(a => (a.id === avatar.id ? { ...a, currentAnimationName: animationName } : a))
                );
              }}
              availableAnimations={Object.keys(avatar.animationUrls)}
              currentEmotion={avatar.currentEmotion}
            />
          ))}
        </Sidebar>
      )}
    </Root>
  );
};

export default StagePage;
