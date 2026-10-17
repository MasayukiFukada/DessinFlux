# シナリオ仕様書 (Scenario Specification)

本ドキュメントは、DessinFlux におけるアニメーション図解シナリオ（JSON）のフォーマット、各ノードのパラメータ、およびステップアクションの仕様を定義した完全リファレンスです。

---

## 1. 全体構造 (ScenarioBook)

1つのJSONファイルは **`ScenarioBook`** として定義され、複数の関連するシナリオ（例: 「平文保存」「ハッシュ化」「パスキー」など）を1つにまとめて管理できます。

```typescript
interface ScenarioBook {
  title: string;              // 解説集のタイトル
  description?: string;        // 解説集の概要説明
  aspectRatio?: AspectRatio;  // デフォルトのアスペクト比 ("16:9" | "1:1" | "4:3" | "9:16")
  scenarios: Scenario[];      // 含まれるシナリオのリスト
}
```

### シナリオ (Scenario)

各シナリオは独立したアニメーション定義を持ちます。

```typescript
interface Scenario {
  id: string;                 // シナリオ固有のID（英数字・ハイフン推奨）
  title: string;              // シナリオの表示名
  description?: string;        // シナリオの詳細説明
  nodes: ScenarioNode[];      // 画面上に配置するノード・キャラクターの一覧
  steps: ScenarioStep[];      // アニメーションステップの時系列配列
}
```

---

## 2. ノード仕様 (ScenarioNode)

ノードは、サーバーやデータベースなどのシステムコンポーネント、または解説役のキャラクター（立ち絵・アバター）を表現します。

### パラメータ一覧

| プロパティ | 型 | 必須 | デフォルト値 | 説明 |
| :--- | :--- | :---: | :---: | :--- |
| **`id`** | `string` | **必須** | - | ノードの一意なID。アクションの `from`, `to`, `target` や `connectTo` から参照されます。 |
| **`label`** | `string` | **必須** | - | ノードのメイン名称（例: `"Webサーバー"`, `"結月ゆかり"`）。 |
| **`sublabel`** | `string` | 任意 | - | ノードの補足説明（例: `"API / Auth"`, `"ブラウザ"`）。 |
| **`x`** | `number` | **必須** | - | 水平位置。画面左端を `0`、右端を `100` とするパーセント値。 |
| **`y`** | `number` | **必須** | - | 垂直位置。画面上端を `0`、下端を `100` とするパーセント値。 |
| **`color`** | `NodeColor` | 任意 | `"blue"` | ノードのテーマカラー（`"blue"` \| `"emerald"` \| `"amber"` \| `"purple"` \| `"rose"` \| `"cyan"` \| `"slate"`）。 |
| **`icon`** | `string` | 任意 | - | 表示するベクターアイコン名（例: `"laptop"`, `"server"`, `"database"`, `"shield"`, `"key"` 等）。 |
| **`image`** | `string` | 任意 | - | 外部アクター画像へのパス（例: `"/actors/avatar.png"`）。指定時はアイコンより優先されます。 |
| **`flipX`** | `boolean` | 任意 | `false` | 画像を水平方向（左右）に反転するかどうか。キャラの向き調整に使用します。 |
| **`scale`** | `number` | 任意 | `1.0` | ノード・アクターの拡大縮小倍率（例: `1.25`, `0.85`）。 |
| **`frame`** | `boolean` | 任意 | `true` | 外側のカード枠・背景・枠線を表示するかどうか。`false` にすると枠なしの立ち絵モードになります。 |
| **`connectTo`** | `string[]` | 任意 | - | このノードから点線を引く接続先ノードIDの配列。 |

### 座標系のルール
- 画面サイズやアスペクト比（16:9, 9:16等）に依存しないよう、位置はすべて **パーセント座標（0〜100%）** で指定します。
- ノードの中心点が指定された `(x, y)` 座標に配置されます。
- GUIプレビュー上でマウスドラッグによる直感的な位置調整が可能です。

---

## 3. ノードの使い分けパターン

### パターンA: 標準システムコンポーネント（枠あり）
通常のサーバー、DB、クライアント端末などの構成図用ノードです。

```json
{
  "id": "server",
  "label": "Webサーバー",
  "sublabel": "Express API",
  "icon": "server",
  "connectTo": ["db"],
  "color": "purple",
  "x": 50,
  "y": 55
}
```

### パターンB: 解説役・立ち絵キャラクター（枠なしアバター）
画面の隅に配置する解説キャラクターです。`frame: false` でカード枠を消し、`scale` で存在感を調整し、`connectTo: []` で他のノードと勝手に線が結ばれるのを防ぎます。

```json
{
  "id": "narrator",
  "label": "結月ゆかり",
  "image": "/actors/Yukari_yamarisu_0000.png",
  "frame": false,
  "scale": 1.25,
  "flipX": false,
  "x": 12,
  "y": 32
}
```

> [!NOTE]
> 指定した画像が見つからない場合や読み込みエラーとなった場合は、自動的に同梱のデフォルトアバター（`/actors/avatar-bot.svg` または `/actors/avatar-user.svg`）へフォールバックされます。

---

## 4. 接続線 (`connectTo`) の仕様

- **明示指定**: シナリオ内のいずれかのノードで `connectTo` が定義されている場合、`connectTo` に含まれるノードID間のみに点線が描画されます。
- **自動接続の防止**: 解説アクター等、線をつなぎたくないノードは `connectTo` を指定しないか `[]` とすることで独立して配置できます。
- **フォールバック**: 全ノードで `connectTo` が一切指定されていない場合は、`frame: false` を除くノード同士が配列順に自動接続されます。

---

## 5. ステップとアクション仕様 (ScenarioStep)

各ステップは、一定時間（`duration` ms）の間に実行される1つのアクションと、画面下部に表示される字幕（`caption`）で構成されます。

```typescript
interface ScenarioStep {
  duration?: number;          // ステップの表示時間（ミリ秒、デフォルト: 2000）
  caption?: string;           // 画面下部に表示される解説字幕（複数行自動折り返し）
  action: StepAction;         // アニメーションアクション
}
```

### アクション種別一覧

#### 1. `message` (データパケット送信)
ノードAからノードBへパケットがスムーズに移動します。

```json
{
  "type": "message",
  "from": "client",
  "to": "server",
  "label": "ユーザー登録リクエスト",
  "payload": "user: alice, pass: mypassword123",
  "icon": "key",
  "status": "warning"
}
```
- **`from`**: 送信元ノードID
- **`to`**: 送信先ノードID（到達時に波紋リング演出が発生）
- **`label`**: パケットのタイトル
- **`payload`** (任意): パケット内に表示する詳細データ文字列
- **`icon`** (任意): パケットアイコン
- **`status`** (任意): `"info"` \| `"safe"` \| `"warning"` \| `"danger"`

#### 2. `transform` (ノード内でのデータ変換・処理)
対象ノードが発光し、処理バッジと変換後の値がポップアップします（ハッシュ化、トークン生成、暗号化など）。

```json
{
  "type": "transform",
  "target": "server",
  "label": "ハッシュ化を実行",
  "badge": "Argon2id",
  "result": "$argon2id$v=19$m=65536...",
  "icon": "shield-check"
}
```
- **`target`**: 処理を行うノードID
- **`label`**: 処理内容のタイトル
- **`badge`** (任意): アルゴリズム名やタグ（右上に角括弧付きで表示）
- **`result`** (任意): 変換結果の値
- **`icon`** (任意): バッジアイコン

#### 3. `state` (状態変化の保存・表示)
対象ノードに現在の保持状態バッジを表示します。

```json
{
  "type": "state",
  "target": "db",
  "label": "平文保存完了 (危険⚠️)",
  "value": "alice | mypassword123",
  "status": "danger"
}
```
- **`target`**: 対象ノードID
- **`label`**: 状態名
- **`value`** (任意): 保持されている値
- **`status`**: `"safe"` \| `"warning"` \| `"danger"`

#### 4. `result` (成否判定バッジ)
ステップの最終結果として、成功またはエラーのバッジを対象ノード付近に表示します。

```json
{
  "type": "result",
  "target": "server",
  "label": "パスキー登録完了！",
  "status": "success"
}
```
- **`target`**: 対象ノードID
- **`label`**: 結果メッセージ
- **`status`**: `"success"` (緑色) \| `"error"` (赤色)

---

## 6. 完全なシナリオ例

```json
{
  "title": "認証技術の解説サンプル",
  "aspectRatio": "16:9",
  "scenarios": [
    {
      "id": "sample-auth",
      "title": "セッショントークン発行",
      "nodes": [
        {
          "id": "narrator",
          "label": "解説ちゃん",
          "image": "/actors/avatar-bot.svg",
          "frame": false,
          "scale": 1.2,
          "x": 10,
          "y": 30
        },
        {
          "id": "browser",
          "label": "ブラウザ",
          "icon": "laptop",
          "connectTo": ["auth_server"],
          "color": "blue",
          "x": 35,
          "y": 55
        },
        {
          "id": "auth_server",
          "label": "認証サーバー",
          "icon": "server",
          "connectTo": ["cache"],
          "color": "purple",
          "x": 65,
          "y": 55
        },
        {
          "id": "cache",
          "label": "Redis",
          "sublabel": "セッションストア",
          "icon": "database",
          "color": "rose",
          "x": 90,
          "y": 55
        }
      ],
      "steps": [
        {
          "duration": 2200,
          "caption": "ユーザーが正しい認証情報を入力し、サーバーにログインを要求します",
          "action": {
            "type": "message",
            "from": "browser",
            "to": "auth_server",
            "label": "POST /login",
            "payload": "user: alice",
            "icon": "key",
            "status": "safe"
          }
        },
        {
          "duration": 2400,
          "caption": "サーバーは暗号論的疑似乱数生成器を用いて一意なセッショントークンを生成します",
          "action": {
            "type": "transform",
            "target": "auth_server",
            "label": "セッションID生成",
            "badge": "crypto.randomBytes",
            "result": "sess_8f39a01c4...",
            "icon": "sparkles"
          }
        },
        {
          "duration": 2000,
          "caption": "生成されたセッション情報をインメモリデータベースにキャッシュします",
          "action": {
            "type": "message",
            "from": "auth_server",
            "to": "cache",
            "label": "SET session",
            "payload": "TTL: 3600s",
            "icon": "database",
            "status": "safe"
          }
        },
        {
          "duration": 2000,
          "caption": "認証が成功し、安全なCookieとしてブラウザにセッションIDが返却されます",
          "action": {
            "type": "result",
            "target": "browser",
            "label": "ログイン完了 (HttpOnly Cookie)",
            "status": "success"
          }
        }
      ]
    }
  ]
}
```
