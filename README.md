# DessinFlux

動画解説（YouTube, Shorts, スライド等）で使える、**アニメーション図解（GIF画像）を即座に生成・出力するツール**です。

---

## 🌟 特徴

- **マルチフォーマット出力（WebM / MP4 / GIF）**:
  - **WebM**: 動画編集ソフト向け（VP9高画質、軽量、背景透過対応）
  - **MP4**: 汎用動画フォーマット
  - **GIF**: WebやSNSでの埋め込み・共有用
- **背景透過エクスポート**: 動画のテロップやワイプ、スライドの上に図解だけをポイッと重ねられるアルファチャンネル透過対応。
- **直感的なパーセント座標（%）**: アスペクト比が変わってもオブジェクトが崩れにくく、マウスドラッグでの微調整も可能。
- **マルチアスペクト比対応**: 動画本編用の `16:9`、SNS/スライド用の `1:1`、Shorts/TikTok用の `9:16`、標準の `4:3` をワンクリック切替。
- **シナリオブック管理**: `password.json` のように、関連する複数の短い解説（例: 平文保存、ハッシュ化、パスキー等）を1ファイルにまとめてタブ切替。
- **動画用キャプションバー**: 画面下部にステップごとの解説字幕を自動表示（複数行折り返し対応）。

---

## 🚀 クイックスタート

### 前提条件
- Node.js (v20以上推奨)
- [mise](https://mise.jdx.dev/) (任意・推奨)

### 起動方法

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

起動後、ブラウザで `http://localhost:5173` を開きます。

---

## 📖 シナリオJSONのフォーマット

`scenarios/password.json` を参考に、以下のような形式でシナリオを記述します。

```json
{
  "title": "解説集のタイトル",
  "aspectRatio": "16:9",
  "scenarios": [
    {
      "id": "scenario-1",
      "title": "1. ユーザー登録の流れ",
      "nodes": [
        { "id": "client", "label": "ユーザー端末", "sublabel": "Browser", "icon": "laptop", "x": 20, "y": 50, "color": "blue" },
        { "id": "server", "label": "Webサーバー", "sublabel": "API", "icon": "server", "x": 50, "y": 50, "color": "purple" },
        { "id": "db", "label": "データベース", "sublabel": "Users", "icon": "database", "x": 80, "y": 50, "color": "emerald" }
      ],
      "steps": [
        {
          "duration": 2200,
          "caption": "ユーザーがパスワードを入力してサーバーへ送信します",
          "action": {
            "type": "message",
            "from": "client",
            "to": "server",
            "label": "ユーザー登録",
            "payload": "user: alice, pass: mypassword123",
            "icon": "key",
            "status": "safe"
          }
        },
        {
          "duration": 2500,
          "caption": "サーバーはパスワードを一方向ハッシュ関数で暗号化します",
          "action": {
            "type": "transform",
            "target": "server",
            "label": "ハッシュ化",
            "badge": "Argon2id",
            "result": "$argon2id$v=19$...",
            "icon": "shield-check"
          }
        }
      ]
    }
  ]
}
```

### ステップアクションの種類
- **`message`**: AからBへパケット（データバブル）がスムーズに移動
- **`transform`**: 対象ノードが発光し、変換結果バッジを表示（ハッシュ化・暗号化など）
- **`state`**: 対象ノードに保存状態や状態変化のバッジを表示
- **`result`**: 成功（緑）または失敗（赤）の判定バッジを表示

---

## 🎨 外部素材（Actor画像）の持ち込み＆左右反転

プロジェクト内の `public/actors/` フォルダに任意の画像ファイル（PNG、SVG、WebP、JPG等）を配置するだけで、ノードにアバターやキャラクター画像を表示できます。

```json
{
  "id": "user",
  "label": "ユーザー",
  "image": "/actors/my-character.png",
  "flipX": true,
  "x": 20,
  "y": 50
}
```

- **`image`**: 画像のパス（例: `"/actors/avatar.png"`）
- **`flipX`**: `true` に設定すると、キャラクター画像が **左右反転** します（右向き・左向きの会話や対峙構図に最適です。テキストは反転しません）。
- **`scale`**: `1.25` 等の数値でキャラクターやノードの大きさを個別に拡大・縮小できます。
- **`frame`**: `false` に設定すると外側のカード枠が消え、立ち絵アバターのみを綺麗に配置できます。
- **`connectTo`**: `["server"]` のように接続先ノードIDを指定します。解説キャラ等の不要な自動線引きを防止できます。
- 画像が存在しない場合やロード失敗時は、同梱のデフォルトアバター（`avatar-bot.svg` / `avatar-user.svg`）に自動フォールバックされます。

---

## 📚 ドキュメント (Docs)

より詳細なパラメータ仕様やアーキテクチャ設計については、`docs/` 配下のドキュメントを参照してください。

- 📄 [**シナリオ仕様書 (docs/scenario_spec.md)**](docs/scenario_spec.md):
  - 全ノードプロパティ一覧（`scale`, `frame`, `connectTo` 等）
  - 各ステップアクション（`message`, `transform`, `state`, `result`）のパラメータ詳細
  - 立ち絵キャラクター配置のベストプラクティスと完全なJSON例
- 🏗️ [**アーキテクチャ設計書 (docs/architecture.md)**](docs/architecture.md):
  - DOMプレビューとCanvasエクスポーターのデュアルレンダリング設計
  - CORS対策と画像フォールバック機構
  - Tauri（デスクトップアプリ化）に関する技術的検討とトレードオフ

---

## 🤖 AIにシナリオを作らせるプロンプト雛形

アプリ上部の **「AIプロンプト雛形」** ボタンを押すと、クリップボードにプロンプトがコピーされます。
ChatGPT, Claude, Gemini 等にそのまま貼り付けて、動かしたい仕組み（例: OAuth2.0、JWT認証、公開鍵暗号、TCPスリーウェイハンドシェイクなど）を伝えるだけでシナリオJSONを生成してくれます。

