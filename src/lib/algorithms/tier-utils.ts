import type { Agent, TierRank, MapTierData } from '../types';
import { TIER_SCORES } from '../types';

/** Tier の順序定数（S が最高、D が最低） */
export const TIER_ORDER: TierRank[] = ['S', 'A', 'B', 'C', 'D'];

const TIER_STORAGE_KEY = 'valorant-tier-data';

/**
 * Tier データを localStorage に保存する
 */
export function saveTierData(data: MapTierData): void {
  localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(data));
}

/**
 * localStorage から Tier データを読み込む。未保存の場合は空オブジェクトを返す。
 */
export function loadTierData(): MapTierData {
  const raw = localStorage.getItem(TIER_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as MapTierData;
  } catch {
    return {};
  }
}

/**
 * エージェントリストを Tier 順（S → A → B → C → D）にソートする。
 * 同一 Tier 内では元の順序を維持する（安定ソート）。
 */
export function sortByTier(
  agents: Agent[],
  tierData: Record<string, TierRank>,
): Agent[] {
  return [...agents].sort((a, b) => {
    const tierA = tierData[a.id] ?? 'B';
    const tierB = tierData[b.id] ?? 'B';
    const scoreA = TIER_SCORES[tierA];
    const scoreB = TIER_SCORES[tierB];
    // 高スコア（S=5）が先に来るよう降順
    return scoreB - scoreA;
  });
}

/**
 * 指定マップにおけるエージェントの Tier を返す。未設定の場合はデフォルト 'B'。
 */
export function getAgentTier(
  agentId: string,
  mapId: string,
  tierData: MapTierData,
): TierRank {
  return tierData[mapId]?.[agentId] ?? 'B';
}
