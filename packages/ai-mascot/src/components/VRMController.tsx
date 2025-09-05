// src/components/VRMController.tsx
import React from 'react';
import './VRMController.css'; // スタイル用CSS

interface VRMControllerProps {
  title?: string; // Optional title prop
  // 表情のウェイトを更新するコールバック
  onEmotionChange: (emotion: string) => void;
  onAnimationChange: (animationName: string) => void;
  availableAnimations: string[];
  currentEmotion: string;
}

// 制御する表情のリスト（モデルに合わせて変更）
const emotionNames = ['neutral', 'happy', 'sad', 'angry', 'relaxed', 'Surprised', 'blink', 'blinkLeft', 'blinkRight'];

export const VRMController: React.FC<VRMControllerProps> = ({
  title, // Destructure title
  onEmotionChange,
  onAnimationChange,
  availableAnimations,
  currentEmotion,
}) => {
  const handleEmotionRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target; // ラジオボタンのvalue属性から感情名を取得
    onEmotionChange(value);
  };
  // currentEmotion が変更されたらラジオボタンに反映する
  React.useEffect(() => {
    const radio = document.querySelector(
      `input[name="${title || 'default'}-emotion-group"][value="${currentEmotion}"]`
    );
    if (radio) {
      (radio as HTMLInputElement).checked = true; // ラジオボタンをチェック状態にする
    }
  }, [currentEmotion, title]);

  return (
    <div className="vrm-controller">
      {title && <h3>{title}</h3>} {/* Display title if provided */}
      <h4>Emotions</h4>
      {emotionNames.map(name => (
        <div key={name} className="control-row">
          <label htmlFor={`${title}-emotion-${name}`}>{name}</label> {/* Ensure unique id */}
          <input
            type="radio"
            id={`${title}-emotion-${name}`} // Ensure unique id
            name={`${title || 'default'}-emotion-group`} // グループ内で共通のname属性
            value={name} // 感情名をvalueとして設定
            onChange={handleEmotionRadioChange} // 更新されたハンドラーを使用
          />
        </div>
      ))}
      {/* アニメーション選択UI */}
      <h4>Animations</h4>
      <div className="animation-buttons">
        {availableAnimations.map(name => (
          <button key={name} onClick={() => onAnimationChange(name)}>
            Play {name}
          </button>
        ))}
      </div>
    </div>
  );
};
