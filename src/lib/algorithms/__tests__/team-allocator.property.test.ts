/**
 * Property-Based Tests for Team Allocator
 * Feature: valorant-team-builder
 *
 * Tests Properties 9–14 from the design document using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  autoBalance,
  randomSplit,
  resolveDraftConflict,
  assignLastPlayer,
  buildTeamResult,
} from '../team-allocator';
import type { Player, RankMode } from '../../types';

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

const playerArb = fc.record({
  id: fc.uuid(),
  room_id: fc.uuid(),
  riot_id: fc.string({ minLength: 1, maxLength: 10 }).map((s) => s + '#TAG'),
  display_name: fc.string({ minLength: 1, maxLength: 10 }),
  rank: fc.constantFrom('Iron 1', 'Silver 2', 'Gold 3', 'Diamond 1', 'Radiant'),
  rank_value: fc.integer({ min: 1, max: 25 }),
  peak_rank: fc.constantFrom('Iron 1', 'Silver 2', 'Gold 3', 'Diamond 1', 'Radiant'),
  peak_rank_value: fc.integer({ min: 1, max: 25 }),
  team: fc.constant(null as null),
  created_at: fc.constant(new Date().toISOString()),
});

const playersArb = (min: number, max: number) =>
  fc.array(playerArb, { minLength: min, maxLength: max });

/**
 * Brute-force oracle: try all combinations of floor(n/2) players from n,
 * return the minimum possible difference between the two teams.
 */
function bruteForceMinDifference(players: Player[], rankMode: RankMode): number {
  const key = rankMode === 'peak' ? 'peak_rank_value' : 'rank_value';
  const values = players.map((p) => p[key]);
  const n = values.length;
  const totalSum = values.reduce((a, b) => a + b, 0);
  const targetSize = Math.floor(n / 2);

  let minDiff = Infinity;

  // Generate all combinations of targetSize elements from n
  function combine(start: number, chosen: number, sum: number) {
    if (chosen === targetSize) {
      const diff = Math.abs(totalSum - 2 * sum);
      if (diff < minDiff) minDiff = diff;
      return;
    }
    const remaining = n - start;
    if (remaining < targetSize - chosen) return; // prune
    for (let i = start; i < n; i++) {
      combine(i + 1, chosen + 1, sum + values[i]);
    }
  }

  combine(0, 0, 0);
  return minDiff;
}

// ---------------------------------------------------------------------------
// Property 9: 自動バランスの最適性
// Feature: valorant-team-builder, Property 9: 自動バランスの最適性
// ---------------------------------------------------------------------------

describe('Property 9: 自動バランスの最適性', () => {
  /**
   * **Validates: Requirements 9.1**
   *
   * For any 2–8 players, autoBalance returns a difference that is minimal
   * (compared with a brute-force oracle over all possible splits).
   */
  it('autoBalance produces the minimum possible difference (brute-force oracle)', () => {
    fc.assert(
      fc.property(
        playersArb(2, 8),
        fc.constantFrom<RankMode>('current', 'peak'),
        (players, rankMode) => {
          const result = autoBalance(players, rankMode);
          const oracleDiff = bruteForceMinDifference(players, rankMode);
          expect(result.difference).toBe(oracleDiff);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: 自動バランスのランクモード準拠
// Feature: valorant-team-builder, Property 10: 自動バランスのランクモード準拠
// ---------------------------------------------------------------------------

describe('Property 10: 自動バランスのランクモード準拠', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * For current mode: teamATotal + teamBTotal === sum of all rank_value
   * For peak mode: teamATotal + teamBTotal === sum of all peak_rank_value
   */
  it('teamATotal + teamBTotal equals the sum of the appropriate rank values', () => {
    fc.assert(
      fc.property(
        playersArb(2, 10),
        fc.constantFrom<RankMode>('current', 'peak'),
        (players, rankMode) => {
          const result = autoBalance(players, rankMode);
          const key = rankMode === 'peak' ? 'peak_rank_value' : 'rank_value';
          const expectedTotal = players.reduce((sum, p) => sum + p[key], 0);
          expect(result.teamATotal + result.teamBTotal).toBe(expectedTotal);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: チーム振り分けの分割整合性
// Feature: valorant-team-builder, Property 11: チーム振り分けの分割整合性
// ---------------------------------------------------------------------------

describe('Property 11: チーム振り分けの分割整合性', () => {
  /**
   * **Validates: Requirements 10.1, 9.1**
   *
   * For any team split (autoBalance or randomSplit): union of teamA and teamB
   * equals the original set, and their intersection is empty.
   * Checked by player IDs.
   */
  it('autoBalance: union equals original set and intersection is empty', () => {
    fc.assert(
      fc.property(
        playersArb(2, 10),
        fc.constantFrom<RankMode>('current', 'peak'),
        (players, rankMode) => {
          const result = autoBalance(players, rankMode);
          const idsA = result.teamA.map((p) => p.id);
          const idsB = result.teamB.map((p) => p.id);
          const originalIds = new Set(players.map((p) => p.id));
          const unionIds = new Set([...idsA, ...idsB]);

          // Union equals original
          expect(unionIds.size).toBe(originalIds.size);
          for (const id of originalIds) {
            expect(unionIds.has(id)).toBe(true);
          }

          // Intersection is empty
          const intersection = idsA.filter((id) => idsB.includes(id));
          expect(intersection).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('randomSplit: union equals original set and intersection is empty', () => {
    fc.assert(
      fc.property(playersArb(2, 10), (players) => {
        const result = randomSplit(players);
        const idsA = result.teamA.map((p) => p.id);
        const idsB = result.teamB.map((p) => p.id);
        const originalIds = new Set(players.map((p) => p.id));
        const unionIds = new Set([...idsA, ...idsB]);

        // Union equals original
        expect(unionIds.size).toBe(originalIds.size);
        for (const id of originalIds) {
          expect(unionIds.has(id)).toBe(true);
        }

        // Intersection is empty
        const intersection = idsA.filter((id) => idsB.includes(id));
        expect(intersection).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: ドラフト競合解決の公平性
// Feature: valorant-team-builder, Property 12: ドラフト競合解決の公平性
// ---------------------------------------------------------------------------

describe('Property 12: ドラフト競合解決の公平性', () => {
  /**
   * **Validates: Requirements 11.3**
   *
   * resolveDraftConflict returns winner 'A' or 'B'.
   * Run many times and verify both outcomes occur (statistical test).
   */
  it('resolveDraftConflict always returns A or B, and both outcomes occur', () => {
    const outcomes = new Set<'A' | 'B'>();

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (_seed) => {
        const { winner } = resolveDraftConflict();
        expect(winner === 'A' || winner === 'B').toBe(true);
        outcomes.add(winner);
      }),
      { numRuns: 200 },
    );

    // Statistical check: with 200 runs, both outcomes should appear
    expect(outcomes.has('A')).toBe(true);
    expect(outcomes.has('B')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 13: ドラフト最終プレイヤーの自動割り当て
// Feature: valorant-team-builder, Property 13: ドラフト最終プレイヤーの自動割り当て
// ---------------------------------------------------------------------------

describe('Property 13: ドラフト最終プレイヤーの自動割り当て', () => {
  /**
   * **Validates: Requirements 11.4**
   *
   * When teamA.length < teamB.length → returns 'A'
   * When teamB.length < teamA.length → returns 'B'
   * When equal → returns 'A' or 'B'
   */
  it('assigns to the smaller team, or either when equal', () => {
    fc.assert(
      fc.property(
        playersArb(0, 5),
        playersArb(0, 5),
        (teamA, teamB) => {
          const result = assignLastPlayer(teamA, teamB);

          if (teamA.length < teamB.length) {
            expect(result).toBe('A');
          } else if (teamB.length < teamA.length) {
            expect(result).toBe('B');
          } else {
            expect(result === 'A' || result === 'B').toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: TeamResult 計算の正確性
// Feature: valorant-team-builder, Property 14: TeamResult 計算の正確性
// ---------------------------------------------------------------------------

describe('Property 14: TeamResult 計算の正確性', () => {
  /**
   * **Validates: Requirements 12.2, 13.1**
   *
   * teamATotal === sum of teamA players' rank values
   * teamBTotal === sum of teamB players' rank values
   * difference === |teamATotal - teamBTotal|
   */
  it('buildTeamResult computes correct totals and difference', () => {
    fc.assert(
      fc.property(
        playersArb(0, 5),
        playersArb(0, 5),
        fc.constantFrom<RankMode>('current', 'peak'),
        (teamA, teamB, rankMode) => {
          const result = buildTeamResult(teamA, teamB, rankMode);
          const key = rankMode === 'peak' ? 'peak_rank_value' : 'rank_value';

          const expectedA = teamA.reduce((sum, p) => sum + p[key], 0);
          const expectedB = teamB.reduce((sum, p) => sum + p[key], 0);

          expect(result.teamATotal).toBe(expectedA);
          expect(result.teamBTotal).toBe(expectedB);
          expect(result.difference).toBe(Math.abs(expectedA - expectedB));
        },
      ),
      { numRuns: 100 },
    );
  });
});
