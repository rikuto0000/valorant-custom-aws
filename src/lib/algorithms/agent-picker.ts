import type {
  Player,
  Agent,
  AgentPickResult,
  AgentRole,
  MapTierData,
} from '../types';
import { TIER_SCORES } from '../types';
import { AGENTS } from '../constants/agents';
import { getAgentTier } from './tier-utils';

// ロール一覧
const ALL_ROLES: AgentRole[] = ['Duelist', 'Initiator', 'Controller', 'Sentinel'];

/**
 * 重み付きランダム選択 — weights 配列に比例した確率で index を返す
 */
function weightedRandomIndex(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total === 0) return Math.floor(Math.random() * weights.length);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * 配列を Fisher-Yates シャッフル（コピーを返す）
 */
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * BAN済みエージェントを除外した利用可能エージェントリストを返す
 */
function getAvailableAgents(bannedAgentIds: string[]): Agent[] {
  const bannedSet = new Set(bannedAgentIds);
  return AGENTS.filter((a) => !bannedSet.has(a.id));
}

/**
 * ロール分布制約を満たすようにエージェントを割り当てる。
 * 各ロールから最低2人を確保（8 mandatory slots）、残り2人は flex。
 * 10人のプレイヤーに対して使用する想定。
 */
function assignWithRoleConstraint(
  players: Player[],
  available: Agent[],
  teamAIds: Set<string>,
  teamATotalRank: number,
  teamBTotalRank: number,
  mapId: string,
  tierData: MapTierData,
): AgentPickResult[] {
  const usedAgentIds = new Set<string>();
  const results: AgentPickResult[] = new Array(players.length);

  // ロール別に利用可能エージェントを分類
  const availableByRole: Record<AgentRole, Agent[]> = {
    Duelist: [],
    Initiator: [],
    Controller: [],
    Sentinel: [],
  };
  for (const agent of available) {
    availableByRole[agent.role].push(agent);
  }

  // Phase 1: 各ロールから最低2人を確保するスロットを決定
  // プレイヤーをシャッフルしてランダム性を確保
  const playerIndices = shuffle(players.map((_, i) => i));
  const roleSlots: { playerIdx: number; role: AgentRole }[] = [];
  const flexSlots: number[] = [];

  // 各ロールに2スロットずつ割り当て
  let slotIdx = 0;
  for (const role of ALL_ROLES) {
    for (let r = 0; r < 2 && slotIdx < playerIndices.length; r++) {
      roleSlots.push({ playerIdx: playerIndices[slotIdx], role });
      slotIdx++;
    }
  }
  // 残りは flex
  while (slotIdx < playerIndices.length) {
    flexSlots.push(playerIndices[slotIdx]);
    slotIdx++;
  }

  // Tier 重み計算ヘルパー
  const isHigherTeam = (playerIdx: number): boolean => {
    const playerId = players[playerIdx].id;
    return teamAIds.has(playerId)
      ? teamATotalRank >= teamBTotalRank
      : teamBTotalRank >= teamATotalRank;
  };

  const getWeight = (agent: Agent, playerIdx: number): number => {
    const tier = getAgentTier(agent.id, mapId, tierData);
    const score = TIER_SCORES[tier];
    // Higher team gets lower-tier agents: weight = (6 - score)
    // Lower team gets higher-tier agents: weight = score
    if (isHigherTeam(playerIdx)) {
      return 6 - score; // D=5, C=4, B=3, A=2, S=1
    }
    return score; // S=5, A=4, B=3, C=2, D=1
  };

  // Phase 1: ロール制約スロットを埋める
  for (const { playerIdx, role } of roleSlots) {
    const candidates = availableByRole[role].filter((a) => !usedAgentIds.has(a.id));
    if (candidates.length === 0) continue; // fallback: flex で埋める

    const weights = candidates.map((a) => getWeight(a, playerIdx));
    const chosen = candidates[weightedRandomIndex(weights)];
    usedAgentIds.add(chosen.id);
    results[playerIdx] = { playerId: players[playerIdx].id, agent: chosen };
  }

  // Phase 2: flex スロット + ロール制約で埋められなかったスロットを埋める
  const unassigned = players
    .map((_, i) => i)
    .filter((i) => !results[i]);

  for (const playerIdx of unassigned) {
    const candidates = available.filter((a) => !usedAgentIds.has(a.id));
    if (candidates.length === 0) break;

    const weights = candidates.map((a) => getWeight(a, playerIdx));
    const chosen = candidates[weightedRandomIndex(weights)];
    usedAgentIds.add(chosen.id);
    results[playerIdx] = { playerId: players[playerIdx].id, agent: chosen };
  }

  return results.filter(Boolean);
}

/**
 * Tier考慮ランダムピック
 *
 * 1. BAN済みエージェントを除外
 * 2. teamA + teamB を結合して全プレイヤーリストを作成
 * 3. ロール分布制約（各ロール最低2人）を満たす
 * 4. チーム力差に応じた Tier 重み付けでエージェントを選択
 * 5. 重複なし
 */
export function tierAwareRandomPick(
  teamA: Player[],
  teamB: Player[],
  bannedAgentIds: string[],
  mapId: string,
  tierData: MapTierData,
): AgentPickResult[] {
  const available = getAvailableAgents(bannedAgentIds);
  const allPlayers = [...teamA, ...teamB];
  const teamAIds = new Set(teamA.map((p) => p.id));

  const teamATotalRank = teamA.reduce((sum, p) => sum + p.rank_value, 0);
  const teamBTotalRank = teamB.reduce((sum, p) => sum + p.rank_value, 0);

  return assignWithRoleConstraint(
    allPlayers,
    available,
    teamAIds,
    teamATotalRank,
    teamBTotalRank,
    mapId,
    tierData,
  );
}

/**
 * シンプルランダムピック
 *
 * 1. BAN済みエージェントを除外
 * 2. 利用可能エージェントをシャッフル
 * 3. 各プレイヤーに一意のエージェントを割り当て（重複なし）
 */
export function simpleRandomPick(
  players: Player[],
  bannedAgentIds: string[],
): AgentPickResult[] {
  const available = getAvailableAgents(bannedAgentIds);
  const shuffled = shuffle(available);

  return players.map((player, i) => ({
    playerId: player.id,
    agent: shuffled[i],
  }));
}

/**
 * 個別リロール
 *
 * 1. 現在の割り当てから対象プレイヤーのエージェントを取得
 * 2. 他プレイヤーに割り当て済み・BAN済み・現在のエージェントを除外
 * 3. mapId と tierData が提供されていれば Tier 重み付きで選択、なければランダム
 */
export function rerollAgent(
  playerId: string,
  currentPicks: AgentPickResult[],
  bannedAgentIds: string[],
  mapId: string | null,
  tierData: MapTierData | null,
): AgentPickResult {
  const currentPick = currentPicks.find((p) => p.playerId === playerId);
  const currentAgentId = currentPick?.agent.id;

  const usedAgentIds = new Set(
    currentPicks
      .filter((p) => p.playerId !== playerId)
      .map((p) => p.agent.id),
  );
  const bannedSet = new Set(bannedAgentIds);

  const candidates = AGENTS.filter(
    (a) =>
      !usedAgentIds.has(a.id) &&
      !bannedSet.has(a.id) &&
      a.id !== currentAgentId,
  );

  let chosen: Agent;
  if (mapId && tierData && candidates.length > 0) {
    // Tier 重み付き選択（リロールではニュートラルな重み = score そのまま）
    const weights = candidates.map((a) => {
      const tier = getAgentTier(a.id, mapId, tierData);
      return TIER_SCORES[tier];
    });
    chosen = candidates[weightedRandomIndex(weights)];
  } else {
    chosen = candidates[Math.floor(Math.random() * candidates.length)];
  }

  return { playerId, agent: chosen };
}

// ============================================================
// 投票BAN ロジック (Task 5.2)
// ============================================================

/**
 * チームBAN — 各チームが1キャラクターずつBAN。合計2キャラクター。
 */
export function teamBan(banA: string, banB: string): string[] {
  return [banA, banB];
}

/**
 * 投票BAN — 全プレイヤーが各2キャラクターに投票し、得票数上位2キャラクターをBAN。
 * 同票の場合はランダムで選択。
 *
 * @param votes - { [playerId]: [agentId1, agentId2] }
 * @returns BAN対象の2エージェントID
 */
export function voteBan(votes: Record<string, string[]>): string[] {
  // 得票数を集計
  const counts = new Map<string, number>();
  for (const agentIds of Object.values(votes)) {
    for (const agentId of agentIds) {
      counts.set(agentId, (counts.get(agentId) ?? 0) + 1);
    }
  }

  // 得票数降順でソート
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) return [];
  if (sorted.length === 1) return [sorted[0][0]];

  const result: string[] = [];

  // 1位を選出
  const topCount = sorted[0][1];
  const topTied = sorted.filter(([, c]) => c === topCount).map(([id]) => id);

  if (topTied.length >= 2) {
    // 1位タイが2人以上 → ランダムで2人選出
    const shuffled = shuffle(topTied);
    return shuffled.slice(0, 2);
  }

  // 1位は確定
  result.push(topTied[0]);

  // 2位を選出
  const secondCount = sorted.find(([id]) => id !== topTied[0])![1];
  const secondTied = sorted
    .filter(([id, c]) => c === secondCount && id !== topTied[0])
    .map(([id]) => id);

  if (secondTied.length === 1) {
    result.push(secondTied[0]);
  } else {
    // 2位タイ → ランダムで1人選出
    const shuffled = shuffle(secondTied);
    result.push(shuffled[0]);
  }

  return result;
}
