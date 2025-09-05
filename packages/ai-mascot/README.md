# VTuber Stage

AI V-Tuber システムのフロントエンドであり、VRM モデルの描画、アニメーション、表情制御、コンテンツ表示を担当します。

## 概要

`ai-mascot` は、リアルタイムで V-Tuber キャラクターを描画し、`stage-director` からのコマンドに基づいてキャラクターの表情や動作を制御するフロントエンド Web アプリケーションです。Three.js と `@pixiv/three-vrm` を使用して VRM モデルをレンダリングし、OBS Studio を介して配信可能な映像を生成します。

## アーキテクチャにおける役割

メインの [アーキテクチャドキュメント](../../docs/architecture.md) で説明されているように、`ai-mascot` は以下の役割を担います:

1.  VRM モデルの読み込みとレンダリング。
2.  `stage-director` からの WebSocket コマンドを受信し、キャラクターの表情、ポーズ、視線をリアルタイムで更新。
3.  OBS Studio との連携 (`obs-websocket-js`) により、シーン切り替えやソース表示/非表示を制御。
4.  (オプション) TTS (Text-to-Speech) を使用した音声合成とリップシンク。

## 機能

- **VRM モデルのレンダリング:** Three.js と `@pixiv/three-vrm` を使用。
- **リアルタイム更新:** WebSocket を介して受信したコマンドに基づく表情やポーズの更新。
- **OBS 制御:** `obs-websocket-js` を使用して OBS Studio をリモート制御。
- **TTS/リップシンク:** (オプション) 音声合成とリップシンクのサポート。

## 技術スタック

- TypeScript
- React
- Vite
- Three.js
- `@pixiv/three-vrm`
- WebSocket クライアント
- `obs-websocket-js`

## 前提条件

- Node.js >= 16
- npm

## インストール

1. **依存関係のインストール:**

   ```bash
   npm install
   ```

2. **環境変数の設定:**

   必要に応じて `.env` ファイルを作成し、設定を追加します。

## サービスの実行

開発サーバーを起動するには、以下のコマンドを実行します:

```bash
npm run dev
```

サーバ起動時に表示されるアドレスに、ブラウザでアクセスしてアプリケーションを確認できます。

## ビルド

本番環境用にビルドするには、以下のコマンドを実行します:

```bash
npm run build
```

生成されたファイルは `dist/` ディレクトリに出力されます。

## 開発

このプロジェクトでは、コードの品質を確保するためにいくつかのツールを使用しています:

- **フォーマット:** `prettier`
- **リンティング:** `eslint`

これらのツールは、次のようなコマンドで実行できます:

```bash
npm run lint
npm run format
```

## ライセンス

このプロジェクトは MIT ライセンスの下でライセンスされています - 詳細はメインの [LICENSE](../../LICENSE) ファイルを参照してください。
