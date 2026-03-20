# 要件定義書

## はじめに

VALORANT Custom Team Builder は、VALORANTのカスタムマッチにおいてプレイヤーのランク情報に基づき公平なチーム分けを自動で行うWebアプリケーションである。ホストがルームを作成し、URLを共有するだけで参加可能とする。対象ユーザーはVALORANTのカスタムマッチを遊ぶプレイヤーグループ（2〜10人）であり、対応言語は日本語とする。

技術スタックとして、フロントエンドは Next.js 16 (App Router) / React 19 / TypeScript / Tailwind CSS 4 + Radix UI を使用し、バックエンドは AWS サービス（Amazon DynamoDB、AWS AppSync、Amazon API Gateway、AWS Lambda）を使用する。外部APIとして Henrik-3 Unofficial Valorant API を利用する。

## 用語集

- **Team_Builder**: VALORANT Custom Team Builder アプリケーション全体を指す
- **Room_Manager**: ルームの作成・取得・更新・削除を管理するサーバーサイドコンポーネント
- **Player_Manager**: プレイヤーの追加・削除・情報取得を管理するサーバーサイドコンポーネント
- **Team_Allocator**: チーム振り分けアルゴリズムを実行するコンポーネント
- **Agent_System**: エージェントBAN・ピック・Tier管理を行うコンポーネント
- **Map_Selector**: マップ選択（ランダム・投票）を行うコンポーネント
- **Rank_Resolver**: Riot ID からランク情報を取得・数値化するコンポーネント
- **DynamoDB_Store**: Amazon DynamoDB を使用したデータ永続化レイヤー
- **Demo_Store**: インメモリ Map を使用したデモ用データレイヤー（globalThis で HMR 対応）
- **AppSync_Endpoint**: AWS AppSync を使用したリアルタイム同期エンドポイント
- **Henrik_API**: Henrik-3 Unofficial Valorant API の呼び出しを行う外部APIクライアント
- **Riot_ID**: VALORANTプレイヤーの識別子（Name#Tag 形式）
- **Rank_Value**: ランクを1〜25の整数に数値化した値（Iron 1 = 1, Radiant = 25）
- **Room_Status**: ルームの状態を表す値（waiting / calculating / finished）
- **Rank_Mode**: ランク計算に使用するモード（current: 現在ランク / peak: 最高ランク）

## 要件

### 要件 1: ルーム作成

**ユーザーストーリー:** カスタムマッチのホストとして、新しいルームを作成したい。参加者にURLを共有してプレイヤーを集められるようにするため。

#### 受け入れ基準

1. WHEN ユーザーがトップページの「部屋を作る」ボタンを押下した場合, THE Room_Manager SHALL UUID v4 形式の一意な識別子を持つ新規ルームを作成し、初期ステータスを "waiting"、ランクモードを "current" に設定する
2. WHEN 新規ルームの作成が完了した場合, THE Team_Builder SHALL /room/[roomId] ページへ自動遷移する
3. WHEN 新規ルームが作成される場合, THE Room_Manager SHALL 作成日時（created_at）をルームレコードに記録する

### 要件 2: ルーム参加

**ユーザーストーリー:** カスタムマッチの参加者として、共有されたURLまたはルームコードでルームに参加したい。簡単にルームへアクセスできるようにするため。

#### 受け入れ基準

1. WHEN ユーザーがルームURLに直接アクセスした場合, THE Team_Builder SHALL 該当ルームの画面を表示する
2. WHEN ユーザーがトップページでルームコードを入力した場合, THE Team_Builder SHALL 入力文字列からルームIDを正規表現で自動抽出し、該当ルーム画面へ遷移する
3. IF 指定されたルームIDに対応するルームが存在しない場合, THEN THE Team_Builder SHALL ルームが見つからない旨のエラーメッセージを表示する

### 要件 3: ルームURL共有

**ユーザーストーリー:** ルームのホストとして、ルームURLを簡単に共有したい。参加者を素早く招待できるようにするため。

#### 受け入れ基準

1. WHEN ユーザーがルーム画面のURL共有ボタンを押下した場合, THE Team_Builder SHALL クリップボードAPIを使用してルームURLをクリップボードにコピーする
2. WHEN URLのクリップボードコピーが完了した場合, THE Team_Builder SHALL コピー完了を示すフィードバックをユーザーに表示する


### 要件 4: プレイヤー追加（API取得モード）

**ユーザーストーリー:** ルーム参加者として、Riot ID を入力するだけでランク情報を自動取得してプレイヤー登録したい。手動入力の手間を省くため。

#### 受け入れ基準

1. WHEN ユーザーが Riot_ID（Name#Tag 形式）を入力して追加ボタンを押下した場合, THE Rank_Resolver SHALL Henrik_API を呼び出し、表示名・現在ランク・現在ランク数値・最高ランク・最高ランク数値を取得する
2. WHEN Henrik_API からランク情報の取得が完了した場合, THE Player_Manager SHALL 取得した情報をもとにプレイヤーをルームに追加する
3. IF Henrik_API が未構成またはエラーを返した場合, THEN THE Rank_Resolver SHALL デモモードに自動フォールバックし、ランダムなランク情報を生成してプレイヤーを追加する
4. WHILE プレイヤー情報をAPIから取得中の状態である場合, THE Team_Builder SHALL ローディングアニメーションを表示し、UIをブロックしない

### 要件 5: プレイヤー追加（手動入力モード）

**ユーザーストーリー:** ルーム参加者として、ランク情報を手動で入力してプレイヤー登録したい。API取得できない場合でもプレイヤーを追加できるようにするため。

#### 受け入れ基準

1. WHEN ユーザーが手動入力モードを選択した場合, THE Team_Builder SHALL プレイヤー名、現在ランク、最高ランクの入力フォームを表示する
2. WHEN ユーザーが手動入力フォームに情報を入力して追加ボタンを押下した場合, THE Player_Manager SHALL 入力された情報をもとにプレイヤーをルームに追加する

### 要件 6: プレイヤー重複防止

**ユーザーストーリー:** ルームのホストとして、同一プレイヤーの重複登録を防止したい。正確なチーム分けを行うため。

#### 受け入れ基準

1. WHEN 既にルームに登録済みの Riot_ID と同一の Riot_ID でプレイヤー追加が試行された場合, THE Player_Manager SHALL 追加を拒否し、重複している旨のエラーメッセージを表示する

### 要件 7: プレイヤー削除

**ユーザーストーリー:** ルームのホストとして、ルームからプレイヤーを削除したい。退出したプレイヤーをリストから除外するため。

#### 受け入れ基準

1. WHEN ユーザーがプレイヤーの削除ボタンを押下した場合, THE Player_Manager SHALL 該当プレイヤーをルームから削除する
2. WHEN プレイヤーの削除が完了した場合, THE Team_Builder SHALL プレイヤーリストを即座に更新して表示する

### 要件 8: ランクシステム

**ユーザーストーリー:** チーム振り分けの利用者として、VALORANTの公式ランク体系に基づいたランク管理を利用したい。正確なバランス計算を行うため。

#### 受け入れ基準

1. THE Team_Builder SHALL Iron 1（数値1）から Radiant（数値25）までの26段階のランク体系を管理する（Iron/Bronze/Silver/Gold/Platinum/Diamond/Ascendant/Immortal は各3サブランク、Radiant は単独）
2. WHEN プレイヤーのランク情報が未取得の場合, THE Rank_Resolver SHALL デフォルト値として Silver 2（数値8）を設定する
3. THE Team_Builder SHALL ランクモードとして "current"（現在ランク）と "peak"（最高ランク）の2種類を提供する
4. WHEN ユーザーがランクモードを変更した場合, THE Room_Manager SHALL ルームのランクモード設定を更新する


### 要件 9: 自動バランスチーム振り分け

**ユーザーストーリー:** ルームのホストとして、ランクに基づいた公平なチーム分けを自動で行いたい。両チームの実力差を最小化するため。

#### 受け入れ基準

1. WHEN ユーザーが自動バランスモードを選択した場合, THE Team_Allocator SHALL 動的計画法（部分和問題）ベースのアルゴリズムを使用して、両チームの Rank_Value 合計差が最小となる組み合わせを算出する
2. WHEN 自動バランス計算を実行する場合, THE Team_Allocator SHALL プレイヤーリストをシャッフルしてからアルゴリズムを適用し、同一ランク構成でも異なる結果を生成可能にする
3. WHEN 自動バランス計算を実行する場合, THE Team_Allocator SHALL 選択中の Rank_Mode（current または peak）に対応する Rank_Value を使用する
4. THE Team_Allocator SHALL 10人規模のプレイヤーに対して自動バランス計算を1秒以内に完了する

### 要件 10: ランダムチーム振り分け

**ユーザーストーリー:** ルームのホストとして、ランクを考慮しないランダムなチーム分けを行いたい。カジュアルに遊ぶ場合に使用するため。

#### 受け入れ基準

1. WHEN ユーザーがランダムモードを選択した場合, THE Team_Allocator SHALL Fisher-Yates シャッフルアルゴリズムを使用してプレイヤーを完全ランダムに2チームへ振り分ける

### 要件 11: ドラフトモードチーム振り分け

**ユーザーストーリー:** ルームのホストとして、リーダーが交互にプレイヤーを選ぶドラフト形式のチーム分けを行いたい。戦略的なチーム編成を楽しむため。

#### 受け入れ基準

1. WHEN ユーザーがドラフトモードを選択した場合, THE Team_Allocator SHALL Phase 1 として各チームのリーダー選択画面を表示する
2. WHEN リーダー選択が完了した場合, THE Team_Allocator SHALL Phase 2 としてリーダーが交互にプレイヤーをピックする画面を表示する
3. WHEN 両チームのリーダーが同一プレイヤーを選択した場合, THE Team_Allocator SHALL ランダムで勝者を決定し、敗者に補償ピック権を付与する
4. WHEN 未割り当てプレイヤーが残り1人の場合, THE Team_Allocator SHALL 人数の少ないチームへ自動割り当てする

### 要件 12: 手動チーム振り分け

**ユーザーストーリー:** ルームのホストとして、ドラッグ＆ドロップでプレイヤーを自由にチーム間移動したい。完全に手動でチーム編成を行うため。

#### 受け入れ基準

1. WHEN ユーザーが手動振り分けモードを選択した場合, THE Team_Builder SHALL ドラッグ＆ドロップでプレイヤーをチーム間移動できるUIを表示する
2. WHILE 手動振り分けモードが有効な状態である場合, THE Team_Builder SHALL 各チームの Rank_Value 合計と両チーム間の差分をリアルタイムで表示する

### 要件 13: チーム振り分け結果表示と操作

**ユーザーストーリー:** ルームのホストとして、チーム振り分け結果を確認し、必要に応じて調整したい。最終的なチーム編成を確定するため。

#### 受け入れ基準

1. WHEN チーム振り分けが完了した場合, THE Team_Builder SHALL チームA・チームBのプレイヤー一覧、各チームの Rank_Value 合計、両チーム間の差分（絶対値）を表示する
2. WHEN ユーザーが再生成ボタンを押下した場合, THE Team_Allocator SHALL 同一モードでチーム振り分けを再実行する
3. WHEN チーム振り分け結果が表示されている状態でユーザーがドラッグ＆ドロップ操作を行った場合, THE Team_Builder SHALL プレイヤーのチーム間入れ替えを反映する
4. WHEN ユーザーがリセットボタンを押下した場合, THE Team_Builder SHALL 全プレイヤーのチーム割り当てを解除し、プレイヤー追加画面に戻る


### 要件 14: エージェントチームBANモード

**ユーザーストーリー:** チームメンバーとして、相手チームが使用するエージェントをBANしたい。戦略的な駆け引きを楽しむため。

#### 受け入れ基準

1. WHEN ユーザーがチームBANモードを選択した場合, THE Agent_System SHALL 各チームが交互に1キャラクターずつBAN選択する画面を表示する
2. WHEN 両チームのBAN選択が完了した場合, THE Agent_System SHALL 合計2キャラクターをBAN済みとして記録する

### 要件 15: エージェント個人投票BANモード

**ユーザーストーリー:** チームメンバーとして、投票でBANエージェントを決めたい。全員の意見を反映したBAN選択を行うため。

#### 受け入れ基準

1. WHEN ユーザーが個人投票BANモードを選択した場合, THE Agent_System SHALL 全プレイヤーが各2キャラクターに投票する画面を表示する
2. WHEN 全プレイヤーの投票が完了した場合, THE Agent_System SHALL 得票数上位2キャラクターをBAN済みとして記録する
3. WHEN 得票数が同数のキャラクターが存在する場合, THE Agent_System SHALL 同数のキャラクターからランダムでBAN対象を選択する

### 要件 16: エージェントランダムピック（Tier考慮版）

**ユーザーストーリー:** チームメンバーとして、チーム力差を考慮したエージェントランダムピックを利用したい。弱いチームに有利なエージェントを割り当てることでバランスを取るため。

#### 受け入れ基準

1. WHEN ユーザーがTier考慮ランダムピックを選択した場合, THE Agent_System SHALL マップ別エージェントTier（S〜D、5段階）を考慮し、Rank_Value 合計が高いチームには低Tierエージェントを、低いチームには高Tierエージェントを優先的に割り当てる
2. WHEN Tier考慮ランダムピックを実行する場合, THE Agent_System SHALL 各ロール（Duelist, Initiator, Controller, Sentinel）から最低2人を確保する
3. THE Agent_System SHALL BAN済みエージェントをピック候補から除外する
4. THE Agent_System SHALL 各プレイヤーに異なるエージェントを割り当てる（重複なし）
5. WHEN エージェントピック結果を表示する場合, THE Agent_System SHALL アニメーション（10フレーム × 100ms）を使用して結果を表示する
6. WHEN ユーザーが個別エージェントのリロールボタンを押下した場合, THE Agent_System SHALL 該当プレイヤーのエージェントを再抽選する

### 要件 17: エージェントランダムピック（シンプル版）

**ユーザーストーリー:** チームメンバーとして、Tierを考慮しないシンプルなランダムピックを利用したい。カジュアルにエージェントを決めるため。

#### 受け入れ基準

1. WHEN ユーザーがシンプルランダムピックを選択した場合, THE Agent_System SHALL Tier情報を無視して純粋ランダムにエージェントを各プレイヤーに割り当てる
2. THE Agent_System SHALL BAN済みエージェントをピック候補から除外する
3. THE Agent_System SHALL 各プレイヤーに異なるエージェントを割り当てる（重複なし）

### 要件 18: エージェントTier管理

**ユーザーストーリー:** ルームのホストとして、マップ別にエージェントのTierを設定したい。Tier考慮ランダムピックの精度を調整するため。

#### 受け入れ基準

1. THE Agent_System SHALL マップ別にエージェントの強さをS（5点）、A（4点）、B（3点、デフォルト）、C（2点）、D（1点）の5段階で管理する
2. WHEN ユーザーがエージェントTierを変更した場合, THE Agent_System SHALL 変更内容を localStorage に保存する
3. WHEN エージェントTier管理画面を表示する場合, THE Agent_System SHALL localStorage から保存済みのTier情報を読み込む
4. THE Agent_System SHALL Tier順にエージェントをソート・グループ化して表示する機能を提供する

### 要件 19: マップランダム選択

**ユーザーストーリー:** ルームのホストとして、プレイするマップをランダムに決めたい。マップ選択の手間を省くため。

#### 受け入れ基準

1. WHEN ユーザーがマップランダム選択を実行した場合, THE Map_Selector SHALL 対応マップ11種（Abyss, Ascent, Bind, Breeze, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset）からランダムに1つを選択して表示する

### 要件 20: マップ投票選択

**ユーザーストーリー:** ルームの参加者として、投票でプレイするマップを決めたい。全員の希望を反映したマップ選択を行うため。

#### 受け入れ基準

1. WHEN ユーザーがマップ投票モードを選択した場合, THE Map_Selector SHALL 全プレイヤーがマップに投票する画面を表示する
2. WHEN 全プレイヤーの投票が完了した場合, THE Map_Selector SHALL 最多得票のマップを選択結果として表示する
3. WHEN 最多得票のマップが複数存在する場合, THE Map_Selector SHALL 同票のマップからランダムに1つを選択する


### 要件 21: AWSデータ永続化（DynamoDB）

**ユーザーストーリー:** システム管理者として、ルームとプレイヤーのデータをAWSのマネージドデータベースに永続化したい。スケーラブルで運用負荷の低いデータ管理を実現するため。

#### 受け入れ基準

1. THE DynamoDB_Store SHALL ルームデータを DynamoDB テーブルに保存する（パーティションキー: roomId、属性: created_at, status, rank_mode）
2. THE DynamoDB_Store SHALL プレイヤーデータを DynamoDB テーブルに保存する（パーティションキー: roomId、ソートキー: playerId、属性: riot_id, display_name, rank, rank_value, peak_rank, peak_rank_value, team, created_at）
3. WHEN ルームが削除された場合, THE DynamoDB_Store SHALL 該当ルームに所属する全プレイヤーデータを連動して削除する
4. WHEN 新規ルームが作成される場合, THE DynamoDB_Store SHALL 作成から24時間以上経過したルームとその関連プレイヤーデータを自動削除する

### 要件 22: デュアルモード設計（AWS / デモ）

**ユーザーストーリー:** 開発者として、AWS環境が未構成でもアプリケーションを動作させたい。ローカル開発やデモ目的で使用するため。

#### 受け入れ基準

1. WHEN AWS関連の環境変数（AWS_REGION, DYNAMODB_TABLE_NAME 等）が設定済みの場合, THE Team_Builder SHALL DynamoDB_Store を使用してデータを永続化する
2. WHEN AWS関連の環境変数が未設定の場合, THE Team_Builder SHALL Demo_Store（インメモリ Map、globalThis で HMR 対応）を使用してデータを保持する
3. THE Team_Builder SHALL データストアの切り替えを環境変数の設定のみで実現し、アプリケーションコードの変更を不要とする

### 要件 23: リアルタイム同期（AWS AppSync）

**ユーザーストーリー:** ルーム参加者として、他の参加者の操作（プレイヤー追加・チーム変更等）をリアルタイムで確認したい。全員が同じ情報を共有するため。

#### 受け入れ基準

1. WHILE AWSモードが有効な状態である場合, THE AppSync_Endpoint SHALL GraphQL Subscriptions を使用してルーム内のデータ変更をリアルタイムで全クライアントに配信する
2. WHEN プレイヤーの追加・削除・チーム変更が発生した場合, THE AppSync_Endpoint SHALL 変更内容を購読中の全クライアントに即座に通知する
3. WHILE デモモードが有効な状態である場合, THE Team_Builder SHALL リアルタイム同期を無効化し、手動リフレッシュでデータを更新する

### 要件 24: APIエンドポイント

**ユーザーストーリー:** フロントエンド開発者として、統一されたAPIエンドポイントを通じてバックエンドと通信したい。フロントエンドとバックエンドの責務を明確に分離するため。

#### 受け入れ基準

1. WHEN POST /api/rooms リクエストを受信した場合, THE Room_Manager SHALL 新規ルームを作成し、ルーム情報（id, created_at, status, rank_mode）を返却する
2. WHEN GET /api/rooms/[roomId] リクエストを受信した場合, THE Room_Manager SHALL 該当ルームの情報とプレイヤー一覧を返却する
3. WHEN POST /api/rooms/[roomId] リクエストを受信した場合, THE Player_Manager SHALL リクエストボディの情報（riot_id, display_name, rank, rank_value, peak_rank, peak_rank_value）をもとにプレイヤーを追加し、プレイヤー情報を返却する
4. WHEN PATCH /api/rooms/[roomId] リクエストを受信した場合, THE Room_Manager SHALL action パラメータ（updateTeam, updateStatus, updateRankMode, resetTeams）に応じてルームまたはプレイヤー情報を更新する
5. WHEN DELETE /api/rooms/[roomId]?playerId={id} リクエストを受信した場合, THE Player_Manager SHALL 該当プレイヤーをルームから削除する
6. WHEN GET /api/valorant?name={name}&tag={tag} リクエストを受信した場合, THE Rank_Resolver SHALL Henrik_API を呼び出してプレイヤー情報（name, tag, rank, rankValue, peakRank, peakRankValue, displayName）を返却する
7. IF Henrik_API の呼び出しが失敗またはAPIキーが未設定の場合, THEN THE Rank_Resolver SHALL デモモードでランダムなランク情報を生成して返却する

### 要件 25: エージェントデータ管理

**ユーザーストーリー:** 開発者として、エージェントデータを定数ファイルで一元管理したい。新エージェント追加時の変更箇所を最小化するため。

#### 受け入れ基準

1. THE Agent_System SHALL 全31エージェントを4ロール（Duelist 8体, Initiator 7体, Controller 6体, Sentinel 7体）に分類して定数ファイルで管理する
2. THE Agent_System SHALL 各エージェントの属性として id（小文字ID）、name（英名）、nameJa（日本語名）、role（英名ロール）、roleJa（日本語ロール）、image（画像パス）を保持する
3. THE Agent_System SHALL マップデータ（11種: Abyss, Ascent, Bind, Breeze, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset）を定数ファイルで管理する

### 要件 26: UI/UXデザイン

**ユーザーストーリー:** ルーム参加者として、VALORANTの世界観に合ったダークテーマのUIを使用したい。ゲームの雰囲気を損なわずにチーム分けを行うため。

#### 受け入れ基準

1. THE Team_Builder SHALL ダークモードをデフォルトテーマとし、VALORANTブランドカラー（レッド、ネイビー、ホワイト基調）を使用する
2. THE Team_Builder SHALL OkLCH 色彩モデルと CSS カスタムプロパティを使用したカラーシステムを実装する
3. THE Team_Builder SHALL PC およびスマートフォンの両方に対応したレスポンシブデザインを提供する
4. THE Team_Builder SHALL 各ランクティアに固有の背景色を割り当て、ランクバッジ画像（/images/badges/ 配下）を表示する
5. THE Team_Builder SHALL エージェント画像（/images/agents/ 配下）をロール別カラーで表示し、sm/md/lg の3サイズに対応する

### 要件 27: 非機能要件 — パフォーマンスと可用性

**ユーザーストーリー:** ルーム参加者として、快適な操作体験を得たい。ストレスなくチーム分けを完了するため。

#### 受け入れ基準

1. THE Team_Allocator SHALL 10人規模のプレイヤーに対するチーム振り分け計算を1秒以内に完了する
2. THE Team_Builder SHALL API取得処理を非同期で実行し、UIスレッドをブロックしない
3. THE Team_Builder SHALL 外部API（Henrik_API）および AWS サービスが未接続の場合でもデモモードで動作可能とする
4. IF 外部APIまたは AWS サービスへの接続が失敗した場合, THEN THE Team_Builder SHALL デモモードへ自動フォールバックする

### 要件 28: 非機能要件 — セキュリティ

**ユーザーストーリー:** システム管理者として、APIキーやAWS認証情報を安全に管理したい。不正アクセスを防止するため。

#### 受け入れ基準

1. THE Team_Builder SHALL Valorant APIキー（VALORANT_API_KEY）をサーバーサイドの環境変数としてのみ使用し、クライアントサイドに公開しない
2. THE Team_Builder SHALL AWS認証情報をサーバーサイドの環境変数または IAM ロールを通じてのみ使用し、クライアントサイドに公開しない

### 要件 29: 非機能要件 — データ管理

**ユーザーストーリー:** システム管理者として、古いルームデータを自動的にクリーンアップしたい。不要なデータの蓄積を防止するため。

#### 受け入れ基準

1. WHEN 新規ルームが作成される場合, THE DynamoDB_Store SHALL 作成から24時間以上経過した全ルームとその関連プレイヤーデータを削除する
2. WHEN ルームが削除される場合, THE DynamoDB_Store SHALL 該当ルームに所属する全プレイヤーデータを連動して削除する

### 要件 30: 環境変数管理

**ユーザーストーリー:** 開発者として、環境変数の設定のみでアプリケーションの動作モードを切り替えたい。デプロイ環境に応じた柔軟な構成を実現するため。

#### 受け入れ基準

1. THE Team_Builder SHALL 以下の環境変数を使用する: AWS_REGION（AWSリージョン）、DYNAMODB_ROOMS_TABLE_NAME（ルームテーブル名）、DYNAMODB_PLAYERS_TABLE_NAME（プレイヤーテーブル名）、APPSYNC_API_URL（AppSync エンドポイントURL）、APPSYNC_API_KEY（AppSync APIキー）、VALORANT_API_KEY（Henrik-3 APIキー）
2. WHEN 全てのAWS関連環境変数が未設定の場合, THE Team_Builder SHALL デモモードで動作する
3. THE Team_Builder SHALL VALORANT_API_KEY が未設定の場合でもデモモード（ランダムランク生成）で Valorant API 機能を提供する
