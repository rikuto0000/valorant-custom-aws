// === ルーム ===
export type RoomStatus = 'waiting' | 'calculating' | 'finished';
export type RankMode = 'current' | 'peak';

export interface Room {
  id: string;          // UUID v4
  created_at: string;  // ISO 8601
  status: RoomStatus;
  rank_mode: RankMode;
}

// === プレイヤー ===
export type Team = 'A' | 'B' | null;

export interface Player {
  id: string;            // UUID v4
  room_id: string;       // 所属ルームID
  riot_id: string;       // Riot ID (Name#Tag)
  display_name: string;  // 表示名
  rank: string;          // 現在ランク文字列 (例: "Gold 2")
  rank_value: number;    // 現在ランク数値 (1〜25)
  peak_rank: string;     // 最高ランク文字列
  peak_rank_value: number; // 最高ランク数値 (1〜25)
  team: Team;            // チーム割り当て
  created_at: string;    // ISO 8601
}

export interface PlayerInput {
  riot_id: string;
  display_name: string;
  rank: string;
  rank_value: number;
  peak_rank: string;
  peak_rank_value: number;
}

// === エージェント ===
export type AgentRole = 'Duelist' | 'Initiator' | 'Controller' | 'Sentinel';
export type TierRank = 'S' | 'A' | 'B' | 'C' | 'D';

export interface Agent {
  id: string;        // 小文字ID (例: "jett")
  name: string;      // 英名 (例: "Jett")
  nameJa: string;    // 日本語名 (例: "ジェット")
  role: AgentRole;
  roleJa: string;    // 日本語ロール名
  image: string;     // 画像パス (例: "/images/agents/jett.jpg")
}

// マップ別Tierデータ（localStorage保存）
// { [mapId]: { [agentId]: TierRank } }
export type MapTierData = Record<string, Record<string, TierRank>>;

// Tier数値変換
export const TIER_SCORES: Record<TierRank, number> = {
  S: 5, A: 4, B: 3, C: 2, D: 1,
};

// === マップ ===
export interface MapData {
  id: string;        // 小文字ID (例: "ascent")
  name: string;      // 英名 (例: "Ascent")
  image: string;     // 画像パス (例: "/images/maps/ascent.jpg")
}

// === ランク ===
export interface RankInfo {
  tier: string;        // ティア名 (例: "Gold")
  tierJa: string;      // 日本語ティア名 (例: "ゴールド")
  subRank: number;     // サブランク (1-3, Radiant は 0)
  value: number;       // 数値 (1〜25)
  label: string;       // 表示ラベル (例: "Gold 2")
  labelJa: string;     // 日本語ラベル (例: "ゴールド2")
  color: string;       // ティア固有カラー
  badgeImage: string;  // バッジ画像パス
}

// === チーム振り分け結果 ===
export interface TeamResult {
  teamA: Player[];
  teamB: Player[];
  teamATotal: number;
  teamBTotal: number;
  difference: number;
}

// === エージェントピック結果 ===
export interface AgentPickResult {
  playerId: string;
  agent: Agent;
}

// === API レスポンス ===
export type SuccessResponse<T> = { data: T };
export type ErrorResponse = {
  error: {
    code: string;      // 例: "ROOM_NOT_FOUND", "DUPLICATE_PLAYER"
    message: string;   // ユーザー向けメッセージ（日本語）
  };
};
