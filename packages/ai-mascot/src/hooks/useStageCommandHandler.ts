import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { validateStageCommand } from '../utils/command_validator';
import { AvatarState } from '../types/avatar_types';
import { StageCommand } from '../types/command';
import { StageState } from '../types/scene_types';

export function useStageCommandHandler() {
  const [lastMessage, setLastMessage] = useState<StageCommand | object | null>(null);
  const [avatars, setAvatars] = useState<AvatarState[]>([]); // 初期値を空配列に
  const [stage, setStage] = useState<StageState>({
    // currentMarkdownText:
    //   '### Grounding Web Sites\n- sourceA\n  - url\n### Grounding Web Search Queries\n- hoge\n- fuga',
    currentMarkdownText: null,
  });

  const handleWebSocketMessage = useCallback(async (data: unknown) => {
    const validationResult = await validateStageCommand(data);

    if (validationResult.errors.length === 0 && validationResult.command) {
      const command = validationResult.command;
      setLastMessage(command);

      switch (command.command) {
        case 'logMessage':
          console.log(`Server log: ${command.payload.message}`);
          break;
        case 'speak': {
          const { characterId, message, caption, emotion, speakId } = command.payload;
          console.log(`Received speak: Character=${characterId}, SpeakId=${speakId}, Message=${message}`);
          setAvatars(prevAvatars =>
            prevAvatars.map(a => {
              if (a.id === characterId) {
                return {
                  ...a,
                  speechText: { id: speakId, text: message, caption: caption },
                  currentEmotion: emotion,
                };
              }
              return a;
            })
          );
          break;
        }
        case 'triggerAnimation':
          console.log(
            `Received triggerAnimation: Character=${command.payload.characterId}, Animation=${command.payload.animationName}`
          );
          setAvatars(prevAvatars =>
            prevAvatars.map(a => {
              if (a.id === command.payload.characterId) {
                return {
                  ...a,
                  currentAnimationName: command.payload.animationName,
                };
              }
              return a;
            })
          );
          break;
        case 'displayMarkdown':
          console.log(`Received displayMarkdown: ${command.payload.text}`);
          setStage(prevScene => ({
            ...prevScene,
            currentMarkdownText: command.payload.text,
          }));
          break;
        default: {
          const unknownCommand = command as StageCommand;
          console.warn(`Received unknown or unhandled command type after validation: ${unknownCommand.command}`);
        }
      }
    } else {
      console.warn('Received data failed validation:', validationResult.errors);
      setLastMessage({ error: 'Validation failed', errors: validationResult.errors, data });
    }
  }, []);

  const { isConnected, sendMessage } = useWebSocket<unknown>({
    onMessage: handleWebSocketMessage,
  });

  // TTS完了時のハンドラ
  const handleTTSComplete = useCallback(
    (avatarId: string, speakId: string) => {
      console.log(`TTS complete for Avatar: ${avatarId}, SpeakId: ${speakId}`);
      setAvatars(prevAvatars =>
        prevAvatars.map(a => {
          if (a.id === avatarId) {
            return {
              ...a,
              currentEmotion: 'neutral',
            };
          }
          return a;
        })
      );
      if (sendMessage && speakId) {
        sendMessage({
          command: 'speakEnd',
          payload: { speakId },
        });
      }
    },
    [sendMessage]
  );

  // アニメーション終了時のハンドラ
  const handleAnimationEnd = useCallback((avatarId: string, animationName: string) => {
    console.log(`Animation ended for Avatar: ${avatarId}, Animation: ${animationName}`);
    setAvatars(prevAvatars =>
      prevAvatars.map(a => {
        if (a.id === avatarId) {
          return {
            ...a,
            currentAnimationName: null, // アニメーション名をリセット
          };
        }
        return a;
      })
    );
  }, []);

  useEffect(() => {
    fetch('/avatars.json')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch avatars.json');
        return res.json();
      })
      .then(data => {
        for (const avarar of data) {
          avarar.onTTSComplete = (speakId: string) => handleTTSComplete(avarar.id, speakId);
          avarar.onAnimationEnd = (animationName: string) => handleAnimationEnd(avarar.id, animationName);
        }

        setAvatars(data);
      })
      .catch(err => {
        console.error('Error loading avatars.json:', err);
      });
  }, [handleAnimationEnd, handleTTSComplete]);

  return {
    avatars,
    setAvatars,
    stage,
    lastMessage,
    isConnected,
  };
}
