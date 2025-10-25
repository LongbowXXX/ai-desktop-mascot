import { VRM, VRMExpressionPresetName } from '@pixiv/three-vrm';
import { useCallback, useEffect, useRef, useState } from 'react';

const LIPSYNC_MOUTH_LIST: VRMExpressionPresetName[] = ['aa', 'ih', 'ou', 'ee', 'oh'];

export function useFacialExpression(vrm: VRM | null, currentEmotion: string, isVoiceActive: boolean) {
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idxRef = useRef(0);
  const [expressionWeights, setExpressionWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    setExpressionWeights(prevExpressionWeights => {
      const lipsyncMouthList = ['aa', 'ih', 'ou', 'ee', 'oh'];
      const newExpressionWeights: { [key: string]: number } = { ...prevExpressionWeights };
      // 口パク用は除外
      Object.keys(newExpressionWeights).forEach(key => {
        if (!lipsyncMouthList.includes(key)) {
          newExpressionWeights[key] = 0;
        }
      });
      newExpressionWeights[currentEmotion] = 1.0;

      return newExpressionWeights;
    });
  }, [currentEmotion]);

  useEffect(() => {
    if (!vrm || !isVoiceActive) {
      // OFF時は全ての口形状を0に
      LIPSYNC_MOUTH_LIST.forEach(name => {
        vrm?.expressionManager?.setValue(name, 0);
      });
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    // ON時: 一定間隔で口形状を切り替え
    idxRef.current = 0;
    vrm.expressionManager?.setValue(LIPSYNC_MOUTH_LIST[0], 0.8);
    intervalRef.current = setInterval(() => {
      // 全て0に
      LIPSYNC_MOUTH_LIST.forEach(name => {
        vrm.expressionManager?.setValue(name, 0);
      });
      // 次の口形状だけ1.0
      idxRef.current = (idxRef.current + 1) % LIPSYNC_MOUTH_LIST.length;
      vrm.expressionManager?.setValue(LIPSYNC_MOUTH_LIST[idxRef.current], 0.8);
    }, 120);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      // OFF時は全ての口形状を0に
      LIPSYNC_MOUTH_LIST.forEach(name => {
        vrm?.expressionManager?.setValue(name, 0);
      });
    };
  }, [vrm, isVoiceActive]);

  // --- Expression Update ---
  const updateExpressions = useCallback(() => {
    if (!vrm) return;
    if (!vrm?.expressionManager) return;
    Object.entries(expressionWeights).forEach(([name, weight]) => {
      try {
        if (vrm.expressionManager?.getExpression(name as VRMExpressionPresetName)) {
          vrm.expressionManager.setValue(name as VRMExpressionPresetName, weight);
        }
      } catch (error) {
        console.warn(`Failed to set expression ${name}`, error);
      }
    });
  }, [vrm, expressionWeights]);
  return { updateExpressions };
}
