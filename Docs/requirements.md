# Requirement for AI Desktop Mascot System

## List of requirement

- 機能要求
  - Desktop Mascot 表示
    - TypeScript + React + electron + vite で UI 表示を構築
    - Socket.io クライアントとなり、AI サーバと連携できる
    - キャラクタ表示、UI 表示、Agent 音声出力、ユーザ音声入力を担当
  - アプリ本体
    - Python
    - Socket.io サーバーとなり LLM を利用して AI の振る舞いや音声認識・音声データ作成を行う
    - Google ADK (Agent Development Kit)
    - uv でパッケージ管理
- 非機能要求
  - 開発環境
    - VS Code
      - .vscode/extensions.json で推奨 Plugin を定義
      - .vscode/settings.json で設定を共有
      - .vscode/tasks.json でよく使うコマンドを共有
    - GitHub Copilot
      - [awesome-copilot](https://github.com/github/awesome-copilot) を参照にプロンプトを充実させる
    - MCP
      - [TypeScript MCP](https://github.com/modelcontextprotocol/typescript-sdk)

## 割り込み可能な対話システム

- クライアントからは音声データを送る
  - 常時音認有効時
  - Agent が答えを求めているとき
  - ユーザがマイクボタンを押したとき
- サーバ側
  - 音声データを受けて、音声認識する
  - 音声認識結果をイベント化
  - テキスト入力もイベント化
  - 時限イベントなども同列に扱う
- 割り込み制御
  - イベントには優先度や割り込み可能性、割り込まれた際の挙動を設定
  - 例えば音声入力中に時限イベントが来たら、キューに積む
  - 音声入力後の応答生成や実行中に新しい入力が来たら前のをキャンセル
  - 時限イベント中に、新しい入力来たら、イベントを後ろに積む（イベントの設定次第）
  - 対話キューに積む、割り込む、割り込まれたら後に送る
- イベントから Agent の応答を生成する
  - イベント＋ Agent 応答生成＋応答実行が一つのタスク
  - 応答生成まで、Queue に積む
  - 対話は Background 状態（入力中、生成中 or Queue での待ち）と Foreground (応答中)
  - ForeGround になれる Task は一つ
  - Foreground の Task の応答生成が完了したら、次の Background の生成を（暫定の最新履歴で）かいしする（履歴整合性）
  - Fore が途中でキャンセルされたら、キャンセル入りで履歴を作り、Back 生成を再生成する

## ユーザパーソナリティの永続化

対話セッション終わりに、対話を分析し、ユーザのパーソナリティを永続化する

- 趣味嗜好
- 性格
- ユーザの呼び方

## 対話セッション終了の判断

- LLM による判断
- 時間による判断
