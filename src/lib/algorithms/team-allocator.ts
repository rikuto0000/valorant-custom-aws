import type { Player, TeamResult, RankMode, Team } from '../types';

/**
 * Fisher-Yates シャッフル（in-place ではなくコピーを返す）
 */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 2チームから TeamResult を構築するヘルパー
 */
export function buildTeamResult(
  teamA: Player[],
  teamB: Player[],
  rankMode: RankMode,
): TeamResult {
  const key = rankMode === 'peak' ? 'peak_rank_value' : 'rank_value';
  const teamATotal = teamA.reduce((sum, p) => sum + p[key], 0);
  const teamBTotal = teamB.reduce((sum, p) => sum + p[key], 0);
  return {
    teamA,
    teamB,
    teamATotal,
    teamBTotal,
    difference: Math.abs(teamATotal - teamBTotal),
  };
}

/**
 * 自動バランスアルゴリズム（動的計画法）
 *
 * 1. プレイヤーをシャッフル（同一構成でも異なる結果を生成可能にする）
 * 2. rankMode に応じた rank_value を取得
 * 3. DP で最適な targetSize 人の部分集合を見つけ、合計差を最小化
 * 4. バックトラックで Team A メンバーを特定、残りを Team B に
 */
export function autoBalance(
  players: Player[],
  rankMode: RankMode,
): TeamResult {
  const shuffled = shuffle(players);
  const n = shuffled.length;
  const key = rankMode === 'peak' ? 'peak_rank_value' : 'rank_value';
  const values = shuffled.map((p) => p[key]);

  const totalSum = values.reduce((a, b) => a + b, 0);
  const targetSize = Math.floor(n / 2);

  // dp[i][j] = true iff we can select exactly i players with rank sum j
  // We need the full range 0..totalSum because the optimal subset may exceed floor(totalSum/2)
  const dp: boolean[][] = Array.from({ length: targetSize + 1 }, () =>
    new Array(totalSum + 1).fill(false),
  );
  dp[0][0] = true;

  // track which player was chosen at each state for backtracking
  const parent: number[][] = Array.from({ length: targetSize + 1 }, () =>
    new Array(totalSum + 1).fill(-1),
  );

  // Fill DP table
  for (let pIdx = 0; pIdx < n; pIdx++) {
    const v = values[pIdx];
    // Iterate in reverse to avoid using the same player twice
    for (let i = Math.min(targetSize, pIdx + 1); i >= 1; i--) {
      for (let j = totalSum; j >= v; j--) {
        if (dp[i - 1][j - v] && !dp[i][j]) {
          dp[i][j] = true;
          parent[i][j] = pIdx;
        }
      }
    }
  }

  // Find the best sum for exactly targetSize players — closest to floor(totalSum/2)
  const half = Math.floor(totalSum / 2);
  let bestSum = 0;
  let bestDiff = Infinity;
  for (let j = 0; j <= totalSum; j++) {
    if (dp[targetSize][j]) {
      const diff = Math.abs(totalSum - 2 * j);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestSum = j;
      }
    }
  }

  // Backtrack to find which players are in Team A
  const inTeamA = new Set<number>();
  let remCount = targetSize;
  let remSum = bestSum;
  while (remCount > 0) {
    const pIdx = parent[remCount][remSum];
    inTeamA.add(pIdx);
    remSum -= values[pIdx];
    remCount--;
  }

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  for (let i = 0; i < n; i++) {
    if (inTeamA.has(i)) {
      teamA.push(shuffled[i]);
    } else {
      teamB.push(shuffled[i]);
    }
  }

  return buildTeamResult(teamA, teamB, rankMode);
}

/**
 * ランダム振り分け — Fisher-Yates シャッフルで完全ランダムに2チームへ分割
 */
export function randomSplit(players: Player[]): TeamResult {
  const shuffled = shuffle(players);
  const mid = Math.floor(shuffled.length / 2);
  const teamA = shuffled.slice(0, mid);
  const teamB = shuffled.slice(mid);
  return buildTeamResult(teamA, teamB, 'current');
}

/**
 * ドラフト競合解決 — 両チームが同一プレイヤーを選択した場合、ランダムで勝者を決定
 */
export function resolveDraftConflict(): { winner: 'A' | 'B' } {
  return { winner: Math.random() < 0.5 ? 'A' : 'B' };
}

/**
 * 最終プレイヤーの自動割り当て — 人数の少ないチームへ割り当て、同数ならランダム
 */
export function assignLastPlayer(
  teamA: Player[],
  teamB: Player[],
): Team {
  if (teamA.length < teamB.length) return 'A';
  if (teamB.length < teamA.length) return 'B';
  return Math.random() < 0.5 ? 'A' : 'B';
}
