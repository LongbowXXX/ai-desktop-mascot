import axios from 'axios';

const VOICEVOX_API_BASE = import.meta.env.VITE_VOICEVOX_API_BASE;
const TTS_ENABLED = import.meta.env.VITE_TTS_ENABLED !== 'false'; // デフォルト有効、'false'で無効

/**
 * 文末記号（。？！）で分割し、10文字以下の短文は次の文と結合する
 */
export function splitAndMergeSentences(input: string): string[] {
  // 「。」「？」「！」で分割し、区切り記号も残す
  const regex = /([^。？！]*[。？！]?)/g;
  const rawBlocks = input.match(regex)?.filter(Boolean) ?? [];
  // 空白や改行だけの要素を除外
  const blocks = rawBlocks.map(s => s.trim()).filter(s => s.length > 0);

  // 10文字以下の短文を次の文と結合
  const merged: string[] = [];
  let buffer = '';
  for (let i = 0; i < blocks.length; i++) {
    const current = blocks[i];
    if ((buffer + current).length <= 10 && i < blocks.length - 1) {
      buffer += current;
      continue;
    }
    if (buffer) {
      merged.push(buffer + current);
      buffer = '';
    } else {
      merged.push(current);
    }
  }
  // 最後にbufferが残っていれば追加
  if (buffer) merged.push(buffer);
  return merged;
}

export async function playVoice(characterId: string, text: string, onPlay?: () => void): Promise<void> {
  // avatar1 の場合は 3
  // avatar2 の場合は 2
  const speakerId = characterId === 'avatar1' ? 3 : 2;

  const sentences = splitAndMergeSentences(text);

  for (let i = 0; i < sentences.length; i++) {
    try {
      // 最初のブロックのみonPlayを渡す
      await playVoiceVoxTTS(sentences[i], speakerId, i === 0 ? onPlay : undefined);
    } catch (e) {
      console.error('TTS再生中にエラーが発生しました:', e);
      // エラー時も処理継続
    }
  }
}

/**
 * VOICEVOX WebAPI を使ってテキストを音声合成し、再生する関数
 * @param text 合成するテキスト
 * @param speakerId VOICEVOXの話者ID
 * @param onPlay 音声再生直前に呼ばれるコールバック
 */
export async function playVoiceVoxTTS(text: string, speakerId: number, onPlay?: () => void): Promise<void> {
  if (!TTS_ENABLED) {
    // TTS無効時は8秒待つダミー挙動
    if (onPlay) onPlay();
    await new Promise(resolve => setTimeout(resolve, 8000));
    return;
  }
  if (!VOICEVOX_API_BASE) {
    // 環境変数が未設定の場合も8秒待つダミー挙動
    if (onPlay) onPlay();
    await new Promise(resolve => setTimeout(resolve, 8000));
    return;
  }

  try {
    // 1. クエリ作成
    const queryRes = await axios.post(`${VOICEVOX_API_BASE}/audio_query`, null, {
      params: { text, speaker: speakerId },
      timeout: 10000, // タイムアウト10秒
    });
    const audioQuery = queryRes.data;

    // 2. 音声合成
    const synthRes = await axios.post(`${VOICEVOX_API_BASE}/synthesis`, audioQuery, {
      params: { speaker: speakerId },
      responseType: 'arraybuffer',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000, // タイムアウト10秒
    });
    const audioData = synthRes.data;

    // 3. 再生
    const audioBlob = new Blob([audioData], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    try {
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        audio.onerror = e => {
          URL.revokeObjectURL(audioUrl);
          reject(e);
        };
        if (onPlay) onPlay(); // 再生直前にコールバック
        audio.play();
      });
    } catch (e) {
      // エラー時もURLを解放
      URL.revokeObjectURL(audioUrl);
      throw e;
    }
  } catch (err) {
    console.error('VOICEVOX TTSリクエストでエラー:', err);
    throw err;
  }
}
