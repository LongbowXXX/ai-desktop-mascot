import { Type } from 'class-transformer';
import { IsString, ValidateNested, IsDefined } from 'class-validator';

// 基本的なコマンド構造 (クラスに変更)
export class BaseCommand<T extends string, P> {
  @IsString()
  @IsDefined()
  command!: T;

  @ValidateNested()
  @Type(() => Object) // ここは具象クラスでオーバーライドする必要がある
  @IsDefined()
  payload!: P;
}

// logMessage コマンドのペイロードクラス
export class LogMessagePayload {
  @IsString()
  @IsDefined()
  message!: string;
}
export class LogMessageCommand extends BaseCommand<'logMessage', LogMessagePayload> {
  declare command: 'logMessage';

  @ValidateNested()
  @Type(() => LogMessagePayload)
  @IsDefined()
  declare payload: LogMessagePayload;
}

// setPose コマンドのペイロードクラス (将来用)
export class SetPosePayload {
  @IsString()
  @IsDefined()
  characterId!: string;

  @IsString()
  @IsDefined()
  poseName!: string; // TODO: 特定のポーズ名に限定する場合は @IsIn を使用
}
export class SetPoseCommand extends BaseCommand<'setPose', SetPosePayload> {
  declare command: 'setPose';

  @ValidateNested()
  @Type(() => SetPosePayload)
  @IsDefined()
  declare payload: SetPosePayload;
}

// triggerAnimation コマンドのペイロードクラス (将来用)
export class TriggerAnimationPayload {
  @IsString()
  @IsDefined()
  characterId!: string;

  @IsString()
  @IsDefined()
  animationName!: string; // TODO: 特定のアニメーション名に限定する場合は @IsIn を使用
}
export class TriggerAnimationCommand extends BaseCommand<'triggerAnimation', TriggerAnimationPayload> {
  declare command: 'triggerAnimation';

  @ValidateNested()
  @Type(() => TriggerAnimationPayload)
  @IsDefined()
  declare payload: TriggerAnimationPayload;
}

// speak コマンドのペイロードクラス
export class SpeakPayload {
  @IsString()
  @IsDefined()
  characterId!: string;

  @IsString()
  @IsDefined()
  message!: string;

  @IsString()
  @IsDefined()
  caption!: string;

  @IsString()
  @IsDefined()
  emotion!: string;

  @IsString()
  @IsDefined()
  speakId!: string; // 発話一意IDを追加
}
export class SpeakCommand extends BaseCommand<'speak', SpeakPayload> {
  declare command: 'speak';

  @ValidateNested()
  @Type(() => SpeakPayload)
  @IsDefined()
  declare payload: SpeakPayload;
}

export class DisplayMarkdownPayload {
  @IsString()
  @IsDefined()
  text!: string;
}
export class DisplayMarkdownCommand extends BaseCommand<'displayMarkdown', DisplayMarkdownPayload> {
  declare command: 'displayMarkdown';

  @ValidateNested()
  @Type(() => DisplayMarkdownPayload)
  @IsDefined()
  declare payload: DisplayMarkdownPayload;
}

// 受け取る可能性のある全てのコマンドの Union 型 (クラスの Union に変更)
export type StageCommand =
  | LogMessageCommand
  | SetPoseCommand
  | TriggerAnimationCommand
  | SpeakCommand
  | DisplayMarkdownCommand;
