// src/components/VRMAvatar.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { SpeechBubble } from './SpeechBubble'; // Import the SpeechBubble component
import { playVoice } from '../services/tts_service';
import { useVrmModel } from '../hooks/useVrmModel';
import { SpeakMessage } from '../types/avatar_types';
import { useFacialExpression } from '../hooks/useFacialExpression';

// --- Constants ---
const ANIMATION_FADE_DURATION = 0.3;

export interface VRMAvatarProps {
  id: string;
  vrmUrl: string;
  animationUrls: Record<string, string>;
  currentEmotion: string;
  currentAnimationName: string | null;
  speechText: SpeakMessage | null;
  position?: [number, number, number];
  onLoad?: (vrm: VRM) => void;
  onTTSComplete?: (speakId: string) => void;
  onAnimationEnd?: (animationName: string) => void;
  onPointerOverAvatar?: () => void;
  onPointerOutAvatar?: () => void;
}

export const VRMAvatar: React.FC<VRMAvatarProps> = ({
  id,
  vrmUrl,
  animationUrls,
  currentEmotion: current_emotion,
  currentAnimationName,
  speechText,
  position = [0, 0, 0],
  onLoad,
  onTTSComplete,
  onAnimationEnd,
  onPointerOverAvatar,
  onPointerOutAvatar,
}) => {
  const { gltf, vrmRef, mixer, isLoaded, loadedAnimationNames, createAnimationClipFromVRMA } = useVrmModel(
    vrmUrl,
    animationUrls,
    onLoad
  );
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const [bubbleText, setBubbleText] = useState<SpeakMessage | null>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isTtsSpeaking, setIsTtsSpeaking] = useState(false);

  // --- Animation Switching ---
  useEffect(() => {
    const vrm = vrmRef.current;
    const currentMixer = mixer.current;
    // Ensure VRM, Mixer exist and the target animation is loaded
    if (!vrm || !currentMixer || !currentAnimationName || !loadedAnimationNames.has(currentAnimationName)) {
      return;
    }

    // アニメーション強制終了用タイマーをクリア
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }

    const clip = createAnimationClipFromVRMA(currentAnimationName);

    if (clip) {
      const newAction = currentMixer.clipAction(clip);

      if (currentAction.current?.getClip() !== clip) {
        if (currentAction.current) {
          currentAction.current.fadeOut(ANIMATION_FADE_DURATION);
        }

        const newAnimationName = currentAnimationName;
        // If the animation is not idle, set it to return to idle after finishing
        if (currentAnimationName !== 'idle') {
          newAction.clampWhenFinished = true;
          newAction.setLoop(THREE.LoopOnce, 1);
          const onFinished = (event: THREE.Event & { action?: THREE.AnimationAction }) => {
            console.log(`Avatar ${vrmUrl}: onFinished ${currentAnimationName}`);
            if (event?.action === newAction) {
              currentMixer.removeEventListener('finished', onFinished); // Remove listener
              if (currentAction.current) {
                currentAction.current.fadeOut(ANIMATION_FADE_DURATION);
              }
              const idleClip = createAnimationClipFromVRMA('idle');
              if (idleClip) {
                const idleAction = currentMixer.clipAction(idleClip);
                idleAction
                  .reset()
                  .setEffectiveTimeScale(1)
                  .setEffectiveWeight(1)
                  .fadeIn(ANIMATION_FADE_DURATION)
                  .play();
                currentAction.current = idleAction;
                console.log(`Avatar ${vrmUrl}: onFinished changed to idle`);
                if (onAnimationEnd) {
                  onAnimationEnd(newAnimationName); // アニメーション終了を通知
                }
              }
              // タイマーもクリア
              if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
                animationTimeoutRef.current = null;
              }
            }
          };
          newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(ANIMATION_FADE_DURATION).play();
          currentAction.current = newAction;
          currentMixer.addEventListener('finished', onFinished);

          // 3秒後にidleへ強制遷移
          animationTimeoutRef.current = setTimeout(() => {
            if (currentAction.current === newAction && currentAnimationName !== 'idle') {
              if (currentAction.current) {
                currentAction.current.fadeOut(ANIMATION_FADE_DURATION);
              }
              const idleClip = createAnimationClipFromVRMA('idle');
              if (idleClip) {
                const idleAction = currentMixer.clipAction(idleClip);
                idleAction
                  .reset()
                  .setEffectiveTimeScale(1)
                  .setEffectiveWeight(1)
                  .fadeIn(ANIMATION_FADE_DURATION)
                  .play();
                currentAction.current = idleAction;
                console.log(`Avatar ${vrmUrl}: forcibly changed to idle after 3s`);
                if (onAnimationEnd) {
                  onAnimationEnd(newAnimationName); // アニメーション終了を通知
                }
              }
              // イベントリスナーも外す
              currentMixer.removeEventListener('finished', onFinished);
            }
            animationTimeoutRef.current = null;
          }, 3000);
        } else {
          newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(ANIMATION_FADE_DURATION).play();
          currentAction.current = newAction;
        }

        console.log(`Avatar ${vrmUrl}: Switched animation to ${currentAnimationName}`);
      } else if (!currentAction.current) {
        // Initial play or restart after stop
        newAction.reset().play();
        currentAction.current = newAction;
        console.log(`Avatar ${vrmUrl}: Started animation ${currentAnimationName}`);
      }
    } else {
      console.warn(`Avatar ${vrmUrl}: Failed to create clip for ${currentAnimationName}`);
      if (currentAction.current) {
        currentAction.current.stop();
        currentAction.current = null;
      }
      // タイマーもクリア
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAnimationName, loadedAnimationNames, id, onAnimationEnd, createAnimationClipFromVRMA]);

  const { updateExpressions } = useFacialExpression(isLoaded ? vrmRef.current : null, current_emotion, isTtsSpeaking);

  // --- Frame Update ---
  useFrame((_state, delta) => {
    const vrm = vrmRef.current;
    if (vrm) {
      updateExpressions();
      mixer.current?.update(delta); // Update animation mixer
      vrm.update(delta); // Update VRM internal state (expressions, lookAt, physics)
    } // <-- Added missing closing brace
  });

  // TTS再生関数（onPlayコールバック対応）
  const playTTS = useCallback(
    async (text: string, onPlay?: () => void) => {
      console.log('[TTS] playTTS called with text:', text);
      await playVoice(id, text, onPlay); // onPlayを渡す
    },
    [id]
  );

  // speechTextが変化したらTTS再生→終了後に吹き出しを閉じる
  useEffect(() => {
    if (speechText && speechText.text !== '') {
      setBubbleText(speechText);
      // setIsLipSync(true); // ここでは開始しない
      playTTS(speechText.text, () => setIsTtsSpeaking(true)).then(() => {
        setBubbleText(null);
        setIsTtsSpeaking(false); // 再生終了でLipSync終了
        if (onTTSComplete && speechText.id) {
          onTTSComplete(speechText.id);
        }
      });
    }
    // クリーンアップ
    return () => {
      setIsTtsSpeaking(false);
    };
  }, [speechText, playTTS, onTTSComplete, id]);

  // Render only when VRM is loaded, applying the position
  const handlePointerOver = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onPointerOverAvatar?.();
    },
    [onPointerOverAvatar]
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      onPointerOutAvatar?.();
    },
    [onPointerOutAvatar]
  );

  const hitboxPosition = useMemo<[number, number, number]>(() => [0, 0.9, 0], []);
  const hitboxScale = useMemo<[number, number, number]>(() => [0.7, 1.8, 0.6], []);

  return isLoaded && vrmRef.current ? (
    <group position={position}>
      {/* 実際の VRM モデル。ヒットテストは行わず描画専用にする */}
      <primitive object={gltf.scene} dispose={null} />
      <mesh
        position={hitboxPosition}
        scale={hitboxScale}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* 透明な直方体でシンプルな当たり判定を代用し、ゴチャゴチャしたメッシュへの raycast を避ける */}
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
      {/* Add SpeechBubble as a child, positioned relative to the avatar */}
      {bubbleText && <SpeechBubble message={bubbleText} />}
    </group>
  ) : null;
};
