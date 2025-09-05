// 発話内容とIDをセットで扱うデータ型
export interface SpeakMessage {
  id: string;
  text: string;
  caption: string;
}

// AvatarState インターフェースの定義
export interface AvatarState {
  id: string;
  vrmUrl: string;
  animationUrls: { [key: string]: string };
  currentEmotion: string;
  speechText: SpeakMessage | null;
  currentAnimationName: string | null;
  position: [number, number, number];
  onTTSComplete?: (speakId: string) => void;
  onAnimationEnd?: (animationName: string) => void;
}
