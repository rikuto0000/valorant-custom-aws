# 実装計画: VALORANT Custom Team Builder

## 概要

VALORANT カスタムマッチ向けチーム分け支援Webアプリケーションの実装計画。Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS 4 + Radix UI をフロントエンドに、AWS マネージドサービス（DynamoDB, AppSync）をバックエンドに使用するデュアルモード設計。Vitest + fast-check によるプロパティベーステストで正当性を検証する。

## タスク

- [x] 1. 型定義・定数・ユーティリティの基盤構築
  - [x] 1.1 共通型定義ファイル（`src/lib/types.ts`）を作成する
    - Room, Player, PlayerInput, Agent, MapData, RankInfo, AgentRole, TierRank, MapTierData, RoomStatus, RankMode, Team 等の全型定義
    - SuccessResponse<T>, ErrorResponse 型
    - TeamResult インターフェース
    - AgentPickResult インターフェース
    - _Requirements: 8.1, 8.3, 25.1, 25.2, 25.3_

  - [x] 1.2 ランク定数ファイル（`src/lib/constants/ranks.ts`）を作成する
    - Iron 1(1) 〜 Radiant(25) の25段階ランクマッピング
    - 各ランクの tier, tierJa, subRank, value, label, labelJa, color, badgeImage
    - 数値→ランク、ランク→数値の変換ユーティリティ関数
    - デフォルト値 Silver 2 (8)
    - _Requirements: 8.1, 8.2, 26.4_

  - [x] 1.3 エージェント定数ファイル（`src/lib/constants/agents.ts`）を作成する
    - 全31エージェント（Duelist 8, Initiator 7, Controller 6, Sentinel 7）の定義
    - 各エージェントの id, name, nameJa, role, roleJa, image 属性
    - _Requirements: 25.1, 25.2_

  - [x] 1.4 マップ定数ファイル（`src/lib/constants/maps.ts`）を作成する
    - 11種マップ（Abyss, Ascent, Bind, Breeze, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset）の定義
    - 各マップの id, name, image 属性
    - _Requirements: 25.3_

  - [x] 1.5 プロパティテスト: ランクマッピングの全単射性
    - **Property 7: ランクマッピングの全単射性**
    - **Validates: Requirements 8.1, 26.4**

  - [x] 1.6 プロパティテスト: データ定数の整合性
    - **Property 28: データ定数の整合性**
    - **Validates: Requirements 25.1, 25.2, 25.3**


- [x] 2. データストア抽象化レイヤーの実装
  - [x] 2.1 IDataStore インターフェース（`src/lib/store/interface.ts`）を作成する
    - createRoom, getRoom, updateRoomStatus, updateRoomRankMode, deleteRoom
    - addPlayer, getPlayers, deletePlayer, updatePlayerTeam, resetTeams
    - cleanupExpiredRooms
    - _Requirements: 22.3_

  - [x] 2.2 DemoStore（`src/lib/store/demo-store.ts`）を実装する
    - インメモリ Map によるデータ保持
    - globalThis でシングルトン管理（HMR 対応）
    - IDataStore の全メソッド実装
    - プレイヤー重複チェック（同一 riot_id 拒否）
    - ルーム削除時のカスケード削除
    - _Requirements: 22.2, 6.1, 21.3_

  - [x] 2.3 DynamoDBStore（`src/lib/store/dynamodb-store.ts`）を実装する
    - DynamoDB クライアント設定
    - Rooms テーブル操作（PK: roomId, TTL 設定）
    - Players テーブル操作（PK: roomId, SK: playerId）
    - カスケード削除（Query → BatchWriteItem）
    - 24時間 TTL 自動削除設定
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 29.1, 29.2_

  - [x] 2.4 ストアファクトリ（`src/lib/store/index.ts`）を実装する
    - 環境変数（AWS_REGION, DYNAMODB_ROOMS_TABLE_NAME）の有無で自動切替
    - _Requirements: 22.1, 22.2, 22.3, 30.1, 30.2_

  - [x] 2.5 プロパティテスト: ルーム作成の不変条件
    - **Property 1: ルーム作成の不変条件**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 2.6 プロパティテスト: プレイヤー追加のラウンドトリップ
    - **Property 3: プレイヤー追加のラウンドトリップ**
    - **Validates: Requirements 4.2, 5.2**

  - [x] 2.7 プロパティテスト: プレイヤー重複拒否
    - **Property 5: プレイヤー重複拒否**
    - **Validates: Requirements 6.1**

  - [x] 2.8 プロパティテスト: プレイヤー削除の正確性
    - **Property 6: プレイヤー削除の正確性**
    - **Validates: Requirements 7.1**

  - [x] 2.9 プロパティテスト: ランクモード更新のラウンドトリップ
    - **Property 8: ランクモード更新のラウンドトリップ**
    - **Validates: Requirements 8.4**

  - [x] 2.10 プロパティテスト: チームリセットの完全性
    - **Property 15: チームリセットの完全性**
    - **Validates: Requirements 13.4**

  - [x] 2.11 プロパティテスト: カスケード削除の完全性
    - **Property 27: カスケード削除の完全性**
    - **Validates: Requirements 21.3**

- [x] 3. チェックポイント — 基盤レイヤーの検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。


- [x] 4. チーム振り分けアルゴリズムの実装
  - [x] 4.1 自動バランスアルゴリズム（`src/lib/algorithms/team-allocator.ts`）を実装する
    - Fisher-Yates シャッフル関数
    - 動的計画法（部分和問題）による最適チーム分割
    - RankMode（current / peak）対応
    - TeamResult 構築（teamA, teamB, teamATotal, teamBTotal, difference）
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 4.2 ランダム振り分け関数を実装する
    - Fisher-Yates シャッフルによる完全ランダム分割
    - _Requirements: 10.1_

  - [x] 4.3 ドラフトモードユーティリティを実装する
    - resolveDraftConflict: 競合時のランダム勝者決定
    - assignLastPlayer: 最終プレイヤーの自動割り当て（人数少ないチームへ）
    - _Requirements: 11.3, 11.4_

  - [x] 4.4 プロパティテスト: 自動バランスの最適性
    - **Property 9: 自動バランスの最適性**
    - ブルートフォースオラクルとの比較で最小差を検証
    - **Validates: Requirements 9.1**

  - [x] 4.5 プロパティテスト: 自動バランスのランクモード準拠
    - **Property 10: 自動バランスのランクモード準拠**
    - **Validates: Requirements 9.3**

  - [x] 4.6 プロパティテスト: チーム振り分けの分割整合性
    - **Property 11: チーム振り分けの分割整合性**
    - **Validates: Requirements 10.1, 9.1**

  - [x] 4.7 プロパティテスト: ドラフト競合解決の公平性
    - **Property 12: ドラフト競合解決の公平性**
    - **Validates: Requirements 11.3**

  - [x] 4.8 プロパティテスト: ドラフト最終プレイヤーの自動割り当て
    - **Property 13: ドラフト最終プレイヤーの自動割り当て**
    - **Validates: Requirements 11.4**

  - [x] 4.9 プロパティテスト: TeamResult 計算の正確性
    - **Property 14: TeamResult 計算の正確性**
    - **Validates: Requirements 12.2, 13.1**


- [x] 5. エージェントシステムの実装
  - [x] 5.1 エージェントピックロジック（`src/lib/algorithms/agent-picker.ts`）を実装する
    - tierAwareRandomPick: Tier考慮ランダムピック（ロール制約・チーム力差補正）
    - simpleRandomPick: シンプルランダムピック
    - rerollAgent: 個別リロール
    - BAN済みエージェント除外ロジック
    - ロール分布制約（各ロール最低2人）
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.6, 17.1, 17.2, 17.3_

  - [x] 5.2 投票BANロジックを実装する
    - 得票数集計・上位2キャラクター選出
    - 同票時ランダム選択
    - _Requirements: 14.2, 15.2, 15.3_

  - [x] 5.3 Tier データ管理ユーティリティを実装する
    - localStorage への保存・読み込み
    - Tier ソート関数（S → A → B → C → D）
    - TIER_SCORES 定数
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 5.4 プロパティテスト: チームBAN数の正確性
    - **Property 16: チームBAN数の正確性**
    - **Validates: Requirements 14.2**

  - [x] 5.5 プロパティテスト: 投票BANの得票順選択
    - **Property 17: 投票BANの得票順選択**
    - **Validates: Requirements 15.2, 15.3**

  - [x] 5.6 プロパティテスト: Tier考慮ピックのチーム力差補正
    - **Property 18: Tier考慮ピックのチーム力差補正**
    - **Validates: Requirements 16.1**

  - [x] 5.7 プロパティテスト: ロール分布制約
    - **Property 19: ロール分布制約**
    - **Validates: Requirements 16.2**

  - [x] 5.8 プロパティテスト: BANエージェント除外
    - **Property 20: BANエージェント除外**
    - **Validates: Requirements 16.3, 17.2**

  - [x] 5.9 プロパティテスト: エージェント割り当ての一意性
    - **Property 21: エージェント割り当ての一意性**
    - **Validates: Requirements 16.4, 17.3**

  - [x] 5.10 プロパティテスト: エージェントリロールの有効性
    - **Property 22: エージェントリロールの有効性**
    - **Validates: Requirements 16.6**

  - [x] 5.11 プロパティテスト: Tier データの localStorage ラウンドトリップ
    - **Property 23: Tier データの localStorage ラウンドトリップ**
    - **Validates: Requirements 18.2, 18.3**

  - [x] 5.12 プロパティテスト: Tier ソートの順序性
    - **Property 24: Tier ソートの順序性**
    - **Validates: Requirements 18.4**


- [x] 6. マップ選択・ランク解決・ユーティリティの実装
  - [x] 6.1 マップ選択ロジック（`src/lib/algorithms/map-selector.ts`）を実装する
    - randomMapSelect: ランダム選択
    - resolveMapVote: 投票結果からマップ選択（同票時ランダム）
    - _Requirements: 19.1, 20.2, 20.3_

  - [x] 6.2 Valorant API クライアント（`src/lib/valorant-api.ts`）を実装する
    - Henrik-3 API 呼び出し（resolveRank 関数）
    - API未構成・エラー時のデモモードフォールバック
    - _Requirements: 4.1, 4.3, 24.6, 24.7_

  - [x] 6.3 ルームID抽出ユーティリティを実装する
    - 入力文字列からUUID v4 を正規表現で抽出する関数
    - _Requirements: 2.2_

  - [x] 6.4 プロパティテスト: マップランダム選択の有効性
    - **Property 25: マップランダム選択の有効性**
    - **Validates: Requirements 19.1**

  - [x] 6.5 プロパティテスト: マップ投票の最多得票選択
    - **Property 26: マップ投票の最多得票選択**
    - **Validates: Requirements 20.2, 20.3**

  - [x] 6.6 プロパティテスト: ルームID抽出の正確性
    - **Property 2: ルームID抽出の正確性**
    - **Validates: Requirements 2.2**

  - [x] 6.7 プロパティテスト: デモモードフォールバックの有効性
    - **Property 4: デモモードフォールバックの有効性**
    - **Validates: Requirements 4.3**

- [x] 7. チェックポイント — ビジネスロジック層の検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。


- [x] 8. API エンドポイントの実装
  - [x] 8.1 ルーム作成 API（`src/app/api/rooms/route.ts`）を実装する
    - POST: 新規ルーム作成、ルーム情報返却
    - _Requirements: 1.1, 1.3, 24.1_

  - [x] 8.2 ルーム操作 API（`src/app/api/rooms/[roomId]/route.ts`）を実装する
    - GET: ルーム情報 + プレイヤー一覧取得（404 エラーハンドリング含む）
    - POST: プレイヤー追加（重複チェック含む）
    - PATCH: action パラメータによるルーム/プレイヤー更新（updateTeam, updateStatus, updateRankMode, resetTeams）
    - DELETE: プレイヤー削除（playerId クエリパラメータ）
    - _Requirements: 2.3, 6.1, 7.1, 8.4, 13.4, 24.2, 24.3, 24.4, 24.5_

  - [x] 8.3 Valorant API プロキシ（`src/app/api/valorant/route.ts`）を実装する
    - GET: name, tag パラメータでランク情報取得
    - APIキー未設定時のデモモードフォールバック
    - _Requirements: 4.1, 4.3, 24.6, 24.7, 28.1_


- [x] 9. 汎用UIコンポーネントとレイアウトの実装
  - [x] 9.1 ルートレイアウト（`src/app/layout.tsx`）を実装する
    - ダークテーマ設定、VALORANTブランドカラー
    - OkLCH 色彩モデル + CSS カスタムプロパティによるカラーシステム
    - Tailwind CSS 4 グローバル設定
    - _Requirements: 26.1, 26.2_

  - [x] 9.2 汎用UIコンポーネント（`src/components/ui/`）を実装する
    - Radix UI ベースの button, badge, card, input, label コンポーネント
    - レスポンシブ対応
    - _Requirements: 26.3_

  - [x] 9.3 エージェントアイコン・バッジコンポーネント（`src/components/agent/`）を実装する
    - agent-icon.tsx: sm/md/lg 3サイズ対応、ロール別カラー
    - agent-badge.tsx: エージェントバッジ表示
    - _Requirements: 26.5_

- [x] 10. トップページの実装
  - [x] 10.1 トップページ（`src/app/page.tsx`）を実装する
    - 「部屋を作る」ボタン（POST /api/rooms → /room/[roomId] 遷移）
    - ルームコード入力フォーム（UUID 自動抽出 → /room/[roomId] 遷移）
    - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 11. ルーム画面 — プレイヤー管理UIの実装
  - [x] 11.1 ルーム画面ページ（`src/app/room/[roomId]/page.tsx`）を実装する
    - Server Component でルームデータ取得
    - ルーム未発見時のエラー表示
    - URL共有ボタン（クリップボードAPI + フィードバック表示）
    - _Requirements: 2.1, 2.3, 3.1, 3.2_

  - [x] 11.2 プレイヤー追加フォーム（`src/components/room/player-form.tsx`）を実装する
    - API取得モード: Riot ID 入力 → /api/valorant 呼び出し → プレイヤー追加
    - 手動入力モード: プレイヤー名・現在ランク・最高ランク入力フォーム
    - ローディングアニメーション
    - バリデーション（Riot ID 形式、空入力チェック）
    - _Requirements: 4.1, 4.2, 4.4, 5.1, 5.2_

  - [x] 11.3 プレイヤー一覧・カード（`src/components/room/player-list.tsx`, `player-card.tsx`）を実装する
    - プレイヤー情報表示（表示名、ランク、ランクバッジ画像）
    - 削除ボタン
    - ランクティア固有背景色
    - _Requirements: 7.1, 7.2, 26.4_

  - [x] 11.4 ルームデータ管理フック（`src/hooks/use-room.ts`）を実装する
    - ルームデータ・プレイヤーリストの状態管理
    - API呼び出しラッパー（追加・削除・更新）
    - _Requirements: 4.2, 7.1, 27.2_


- [x] 12. チェックポイント — API・基本UI層の検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [x] 13. ルーム画面 — チーム振り分けUIの実装
  - [x] 13.1 チーム振り分け結果表示（`src/components/room/team-display.tsx`）を実装する
    - チームA・チームBのプレイヤー一覧表示
    - 各チームの Rank_Value 合計・差分表示
    - 再生成ボタン・リセットボタン
    - ランクモード切替UI
    - _Requirements: 8.3, 8.4, 13.1, 13.2, 13.4_

  - [x] 13.2 自動バランス・ランダム振り分けUIを実装する
    - モード選択（自動バランス / ランダム）
    - 振り分け実行 → TeamResult 表示
    - _Requirements: 9.1, 10.1_

  - [x] 13.3 ドラフトモードUI（`src/components/room/draft-mode.tsx`）を実装する
    - Phase 1: リーダー選択画面
    - Phase 2: 交互ピック画面
    - 競合解決表示
    - 最終プレイヤー自動割り当て
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 13.4 手動振り分けUI（`src/components/room/manual-mode.tsx`）を実装する
    - ドラッグ＆ドロップによるチーム間移動
    - リアルタイム Rank_Value 合計・差分表示
    - _Requirements: 12.1, 12.2, 13.3_

- [x] 14. ルーム画面 — エージェントBAN・ピックUIの実装
  - [x] 14.1 BANパネル（`src/components/agent/ban-panel.tsx`）を実装する
    - チームBANモード: 各チーム交互に1キャラクターBAN
    - 個人投票BANモード: 全プレイヤー各2キャラクター投票
    - BAN結果表示
    - _Requirements: 14.1, 14.2, 15.1, 15.2, 15.3_

  - [x] 14.2 ピック結果表示（`src/components/agent/pick-result.tsx`）を実装する
    - Tier考慮 / シンプルランダムピック選択UI
    - アニメーション表示（10フレーム × 100ms）
    - 個別リロールボタン
    - _Requirements: 16.1, 16.5, 16.6, 17.1_

  - [x] 14.3 Tier編集UI（`src/components/agent/tier-editor.tsx`）を実装する
    - マップ別エージェントTier（S〜D）編集画面
    - localStorage 保存・読み込み
    - Tier順ソート・グループ化表示
    - _Requirements: 18.1, 18.2, 18.3, 18.4_


- [x] 15. ルーム画面 — マップ選択UIの実装
  - [x] 15.1 マップランダム選択UI（`src/components/map/map-random.tsx`）を実装する
    - ランダム選択実行ボタン
    - 選択結果表示（マップ画像 + マップ名）
    - _Requirements: 19.1_

  - [x] 15.2 マップ投票UI（`src/components/map/map-vote.tsx`）を実装する
    - 全プレイヤーのマップ投票画面
    - 投票結果集計・最多得票マップ表示
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 16. リアルタイム同期とフックの実装
  - [x] 16.1 AppSync リアルタイム同期フック（`src/hooks/use-appsync.ts`）を実装する
    - AWS モード時: GraphQL Subscriptions によるリアルタイム通知
    - デモモード時: 無効化（手動リフレッシュ）
    - _Requirements: 23.1, 23.2, 23.3_

  - [x] 16.2 エージェントTier管理フック（`src/hooks/use-agent-tier.ts`）を実装する
    - localStorage からのTierデータ読み込み・保存
    - マップ別Tierデータ管理
    - _Requirements: 18.2, 18.3_

- [x] 17. 画面遷移フローの統合
  - [x] 17.1 ルーム画面のフェーズ遷移を統合する
    - PlayerPhase → TeamPhase → AgentBanPhase → MapPhase → AgentPickPhase
    - 各フェーズ間の状態管理とUI切替
    - スキップ機能（BAN、マップ選択）
    - 再振り分け（AgentPickPhase → TeamPhase）
    - _Requirements: 1.2, 13.2, 13.4_

  - [x] 17.2 環境変数管理と `.env.example` を作成する
    - AWS_REGION, DYNAMODB_ROOMS_TABLE_NAME, DYNAMODB_PLAYERS_TABLE_NAME
    - APPSYNC_API_URL, APPSYNC_API_KEY
    - VALORANT_API_KEY
    - _Requirements: 28.1, 28.2, 30.1, 30.2, 30.3_

- [x] 18. 最終チェックポイント — 全体統合の検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

## 備考

- `*` マーク付きタスクはオプションであり、MVP 優先時はスキップ可能
- 各タスクは具体的な要件番号を参照しトレーサビリティを確保
- チェックポイントで段階的に品質を検証
- プロパティテストは設計書の正当性プロパティ（Property 1〜28）を fast-check で検証
- ユニットテストとプロパティテストは補完的に使用する
