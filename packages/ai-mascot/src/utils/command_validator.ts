import { validate, ValidationError } from 'class-validator';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import {
  DisplayMarkdownCommand,
  LogMessageCommand,
  SetPoseCommand,
  SpeakCommand, // Add SpeakCommand
  StageCommand,
  TriggerAnimationCommand,
} from '../types/command';

// コマンドクラスのマッピング
const commandRegistry: { [key: string]: ClassConstructor<StageCommand> } = {
  logMessage: LogMessageCommand,
  setPose: SetPoseCommand,
  triggerAnimation: TriggerAnimationCommand,
  speak: SpeakCommand,
  displayMarkdown: DisplayMarkdownCommand,
};

/**
 * StageCommand オブジェクトをバリデーションします。
 * @param input 不明な入力オブジェクト
 * @returns バリデーション結果。成功した場合は command にインスタンス、失敗した場合は errors にエラー配列が含まれます。
 */
export async function validateStageCommand(
  input: unknown
): Promise<{ command: StageCommand | null; errors: ValidationError[] }> {
  // 基本的な形状と command プロパティの存在/型チェック
  if (typeof input !== 'object' || input === null || !('command' in input) || typeof input.command !== 'string') {
    // class-validator のエラー形式に合わせて返す
    return {
      command: null,
      errors: [{ property: 'command', constraints: { isString: 'command must be a string and exist' }, children: [] }],
    };
  }

  const commandType = input.command;
  const CommandClass = commandRegistry[commandType];

  // 不明なコマンドタイプ
  if (!CommandClass) {
    return {
      command: null,
      errors: [
        { property: 'command', constraints: { isKnownCommand: `Unknown command type: ${commandType}` }, children: [] },
      ],
    };
  }

  // plainToInstance でプレーンオブジェクトをクラスインスタンスに変換
  // これにより、ネストされたオブジェクトも対応するクラスに変換される (@Type デコレータが必要)
  const instance = plainToInstance(CommandClass, input);

  // validate でバリデーション実行
  const errors = await validate(instance);

  if (errors.length > 0) {
    return { command: null, errors };
  }

  // バリデーション成功
  return { command: instance, errors: [] };
}
