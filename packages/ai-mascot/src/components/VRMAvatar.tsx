// src/components/VRMAvatar.tsx
import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { SpeechBubble } from './SpeechBubble'; // Import the SpeechBubble component
import { playVoice } from '../services/tts_service';
import { useVrmModel } from '../hooks/useVrmModel';
import { SpeakMessage } from '../types/avatar_types';
import { useFacialExpression } from '../hooks/useFacialExpression';
import { ElectronWindow } from '../types/electron';

// --- Constants ---
const ANIMATION_FADE_DURATION = 0.3;
const AVATAR_APPEAR_DELAY = 1.0;

type MaterialBaseState = {
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
};

const captureMaterialBaseState = (root: THREE.Object3D, baseStateMap: WeakMap<THREE.Material, MaterialBaseState>) => {
  root.traverse(object => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if (!material || baseStateMap.has(material)) {
          return;
        }
        baseStateMap.set(material, {
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
      });
    }
  });
};

const applySceneOpacity = (
  root: THREE.Object3D,
  opacity: number,
  baseStateMap: WeakMap<THREE.Material, MaterialBaseState>
) => {
  const clampedOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
  root.traverse(object => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if (!material) {
          return;
        }
        let baseState = baseStateMap.get(material);
        if (!baseState) {
          baseState = {
            opacity: material.opacity,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
          };
          baseStateMap.set(material, baseState);
        }

        if (clampedOpacity >= 1) {
          material.opacity = baseState.opacity;
          material.transparent = baseState.transparent;
          material.depthWrite = baseState.depthWrite;
        } else {
          material.opacity = baseState.opacity * clampedOpacity;
          material.transparent = true;
          material.depthWrite = false;
        }
      });
    }
  });
};

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
  const materialBaseStateRef = useRef<WeakMap<THREE.Material, MaterialBaseState>>(new WeakMap());
  const fadeStateRef = useRef<{ elapsed: number; active: boolean }>({
    elapsed: 0,
    active: false,
  });

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

  useLayoutEffect(() => {
    if (isLoaded && gltf?.scene) {
      materialBaseStateRef.current = new WeakMap();
      captureMaterialBaseState(gltf.scene, materialBaseStateRef.current);
      fadeStateRef.current = { elapsed: 0, active: true };
      applySceneOpacity(gltf.scene, 0, materialBaseStateRef.current);
    }
  }, [gltf, isLoaded]);

  // --- Frame Update ---
  useFrame((_state, delta) => {
    const vrm = vrmRef.current;
    if (vrm) {
      updateExpressions();
      mixer.current?.update(delta); // Update animation mixer
      vrm.update(delta); // Update VRM internal state (expressions, lookAt, physics)
    } // <-- Added missing closing brace

    const fadeState = fadeStateRef.current;
    if (fadeState.active && gltf?.scene) {
      fadeState.elapsed += delta;
      if (fadeState.elapsed >= AVATAR_APPEAR_DELAY) {
        applySceneOpacity(gltf.scene, 1, materialBaseStateRef.current);
        fadeState.active = false;
      }
    }
  });

  // TTS再生関数(onPlayコールバック対応)
  const playTTS = useCallback(
    async (text: string, onPlay?: () => void) => {
      console.log('[TTS] playTTS called with text:', text);
      await playVoice(id, text, onPlay); // onPlayを渡す
    },
    [id]
  );

  // ドラッグ開始
  const handlePointerDown = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    const windowWithDrag = window as Window & {
      __vrmDragState?: {
        isDragging: boolean;
        lastX: number;
        lastY: number;
        pendingDelta: { deltaX: number; deltaY: number } | null;
        rafId: number | null;
      };
    };

    // 既にドラッグ中なら無視
    if (windowWithDrag.__vrmDragState?.isDragging) return;

    // グローバルなドラッグ状態を初期化
    if (!windowWithDrag.__vrmDragState) {
      windowWithDrag.__vrmDragState = {
        isDragging: false,
        lastX: 0,
        lastY: 0,
        pendingDelta: null,
        rafId: null,
      };
    }

    windowWithDrag.__vrmDragState.isDragging = true;
    windowWithDrag.__vrmDragState.lastX = event.screenX;
    windowWithDrag.__vrmDragState.lastY = event.screenY;
  }, []);

  // ドラッグ中 - useEffectでグローバルイベントを監視（コンポーネントがマウントされている間だけ）
  useEffect(() => {
    // 既にイベントリスナーが登録されている場合はスキップ
    const windowWithFlag = window as Window & {
      __vrmDragHandlerInstalled?: boolean;
      __vrmDragState?: {
        isDragging: boolean;
        lastX: number;
        lastY: number;
        pendingDelta: { deltaX: number; deltaY: number } | null;
        rafId: number | null;
      };
    };

    if (windowWithFlag.__vrmDragHandlerInstalled) {
      return;
    }

    windowWithFlag.__vrmDragHandlerInstalled = true;
    const electronAPI = (window as ElectronWindow).electron;

    const applyPendingMove = () => {
      const dragState = windowWithFlag.__vrmDragState;
      if (dragState?.pendingDelta && electronAPI?.moveWindow) {
        electronAPI.moveWindow(dragState.pendingDelta.deltaX, dragState.pendingDelta.deltaY);
        dragState.pendingDelta = null;
      }
      if (dragState) {
        dragState.rafId = null;
      }
    };

    const handleGlobalPointerMove = (event: PointerEvent) => {
      const dragState = windowWithFlag.__vrmDragState;
      if (!dragState?.isDragging) return;

      const deltaX = Math.round(event.screenX - dragState.lastX);
      const deltaY = Math.round(event.screenY - dragState.lastY);

      // 移動量がある場合のみ更新
      if (deltaX !== 0 || deltaY !== 0) {
        // lastPositionも実際に使用されたdelta分だけ更新（整数化後の値で更新）
        dragState.lastX += deltaX;
        dragState.lastY += deltaY;

        // 累積デルタを保存
        if (dragState.pendingDelta) {
          dragState.pendingDelta.deltaX += deltaX;
          dragState.pendingDelta.deltaY += deltaY;
        } else {
          dragState.pendingDelta = { deltaX, deltaY };
        }

        // requestAnimationFrameでスロットリング
        if (dragState.rafId === null) {
          dragState.rafId = requestAnimationFrame(applyPendingMove);
        }
      }
    };

    const handleGlobalPointerUp = () => {
      const dragState = windowWithFlag.__vrmDragState;
      if (!dragState) return;

      dragState.isDragging = false;
      // 残りの移動を適用
      if (dragState.rafId !== null) {
        cancelAnimationFrame(dragState.rafId);
        applyPendingMove();
      }
    };

    // 常にイベントリスナーを登録
    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      const dragState = windowWithFlag.__vrmDragState;
      if (dragState?.rafId !== null && dragState?.rafId !== undefined) {
        cancelAnimationFrame(dragState.rafId);
      }
      delete windowWithFlag.__vrmDragHandlerInstalled;
    };
  }, []);

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
        onPointerDown={handlePointerDown}
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
