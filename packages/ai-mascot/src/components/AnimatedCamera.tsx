import { useThree, useFrame } from '@react-three/fiber';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// カメラアニメーションの所要時間（秒）
const ANIMATION_DURATION = 2.5;
// 開始位置（キャラクタ上空遠方）
const START_POS = new THREE.Vector3(0, 5, 10);
// 終了位置（通常のカメラ位置）
const END_POS = new THREE.Vector3(0, 1.2, 3);

export const AnimatedCamera: React.FC<{ active: boolean; onFinish?: () => void }> = ({ active, onFinish }) => {
  const { camera } = useThree();
  const [animating, setAnimating] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (active) {
      camera.position.copy(START_POS);
      camera.lookAt(0, 1, 0);
      setAnimating(true);
      startTimeRef.current = null;
    } else {
      setAnimating(false);
    }
  }, [active, camera]);

  useFrame(() => {
    if (!animating) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
      camera.position.copy(START_POS);
      camera.lookAt(0, 1, 0);
      return;
    }
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const t = Math.min(elapsed / ANIMATION_DURATION, 1);
    camera.position.lerpVectors(START_POS, END_POS, t);
    camera.lookAt(0, 1, 0);
    if (t >= 1) {
      setAnimating(false);
      if (onFinish) onFinish();
    }
  });

  // 念のため、アニメーション終了時にカメラ位置を補正
  useEffect(() => {
    if (!animating && !active) {
      camera.position.copy(END_POS);
      camera.lookAt(0, 1, 0);
    }
  }, [animating, active, camera]);

  return null;
};
