# DessinFlux

動画解説（YouTube, Shorts, スライド等）で使える、**アニメーション図解（GIF画像）を即座に生成・出力するツール**です。

---

## 🌟 特徴

- **AIフレンドリー**: 複雑な描画コードではなく、宣言型の「シナリオJSON」をAIに作らせて貼り付けるだけ。
- **直感的なパーセント座標（%）**: アスペクト比が変わってもオブジェクトが崩れにくく、マウスドラッグでの微調整も可能。
- **マルチアスペクト比対応**: 動画本編用の `16:9`、SNS/スライド用の `1:1`、Shorts/TikTok用の `9:16`、標準の `4:3` をワンクリック切替。
- **シナリオブック管理**: `password.json` のように、関連する複数の短い解説（例: 平文保存、ハッシュ化、パスキー等）を1ファイルにまとめてタブ切替。
- **ワンクリックGIFエクスポート**: ブラウザ内で高速にGIFエンコードし、そのまま動画編集ソフトへドラッグ＆ドロップ可能。
- **動画用キャプションバー**: 画面下部にステップごとの解説字幕を自動表示。

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

## 🤖 AIにシナリオを作らせるプロンプト雛形

アプリ上部の **「AIプロンプト雛形」** ボタンを押すと、クリップボードにプロンプトがコピーされます。
ChatGPT, Claude, Gemini 等にそのまま貼り付けて、動かしたい仕組み（例: OAuth2.0、JWT認証、公開鍵暗号、TCPスリーウェイハンドシェイクなど）を伝えるだけでシナリオJSONを生成してくれます。
