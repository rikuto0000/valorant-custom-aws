/**
 * Property-Based Tests for Agent Picker
 * Feature: valorant-team-builder
 *
 * Tests Properties 16–22 from the design document using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { tierAwareRandomPick, simpleRandomPick, rerollAgent, teamBan, voteBan } from '../agent-picker';
import { AGENTS } from '../../constants/agents';
import type { Player, AgentRole, MapTierData, TierRank } from '../../types';
import { TIER_SCORES } from '../../types';

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

const playerArb = fc.record({
  id: fc.uuid(),
  room_id: fc.uuid(),
  riot_id: fc.string({ minLength: 1, maxLength: 10 }).map(s => s + '#TAG'),
  display_name: fc.string({ minLength: 1, maxLength: 10 }),
  rank: fc.constantFrom('Iron 1', 'Silver 2', 'Gold 3', 'Diamond 1', 'Radiant'),
  rank_value: fc.integer({ min: 1, max: 25 }),
  peak_rank: fc.constantFrom('Iron 1', 'Silver 2', 'Gold 3', 'Diamond 1', 'Radiant'),
  peak_rank_value: fc.integer({ min: 1, max: 25 }),
  team: fc.constant(null as null),
  created_at: fc.constant(new Date().toISOString()),
});

const agentIdArb = fc.constantFrom(...AGENTS.map(a => a.id));

const tierRankArb = fc.constantFrom<TierRank>('S', 'A', 'B', 'C', 'D');

/** Generate a simple tierData with varied tiers for a given mapId */
const tierDataArb = (mapId: string) =>
  fc.record(
    Object.fromEntries(
      AGENTS.map(a => [a.id, tierRankArb])
    ) as Record<string, fc.Arbitrary<TierRank>>
  ).map(agentTiers => ({ [mapId]: agentTiers }) as MapTierData);


// ---------------------------------------------------------------------------
// Property 16: チームBAN数の正確性
// Feature: valorant-team-builder, Property 16: チームBAN数の正確性
// ---------------------------------------------------------------------------

describe('Property 16: チームBAN数の正確性', () => {
  /**
   * **Validates: Requirements 14.2**
   *
   * teamBan always returns exactly 2 banned agent IDs.
   */
  it('teamBan returns exactly 2 banned agent IDs', () => {
    fc.assert(
      fc.property(agentIdArb, agentIdArb, (banA, banB) => {
        const result = teamBan(banA, banB);
        expect(result).toHaveLength(2);
        expect(result[0]).toBe(banA);
        expect(result[1]).toBe(banB);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: 投票BANの得票順選択
// Feature: valorant-team-builder, Property 17: 投票BANの得票順選択
// ---------------------------------------------------------------------------

describe('Property 17: 投票BANの得票順選択', () => {
  /**
   * **Validates: Requirements 15.2, 15.3**
   *
   * voteBan returns agents that are in the top-2 vote count.
   * Each returned agent's vote count >= any non-returned agent's count.
   */
  it('voteBan selects agents from the top-2 vote counts', () => {
    // Generate 5-10 players, each voting for 2 distinct agents
    const votesArb = fc
      .integer({ min: 5, max: 10 })
      .chain(numPlayers =>
        fc.tuple(
          ...Array.from({ length: numPlayers }, (_, i) =>
            fc.tuple(
              fc.constant(`player-${i}`),
              fc.shuffledSubarray(AGENTS.map(a => a.id), { minLength: 2, maxLength: 2 }),
            )
          )
        )
      )
      .map(entries => {
        const votes: Record<string, string[]> = {};
        for (const [pid, agentIds] of entries) {
          votes[pid as string] = agentIds as string[];
        }
        return votes;
      });

    fc.assert(
      fc.property(votesArb, (votes) => {
        const result = voteBan(votes);
        expect(result.length).toBeLessThanOrEqual(2);

        // Count votes
        const counts = new Map<string, number>();
        for (const agentIds of Object.values(votes)) {
          for (const agentId of agentIds) {
            counts.set(agentId, (counts.get(agentId) ?? 0) + 1);
          }
        }

        // Each returned agent's count should be >= any non-returned agent's count
        const resultSet = new Set(result);
        const returnedCounts = result.map(id => counts.get(id) ?? 0);
        const minReturnedCount = Math.min(...returnedCounts);

        for (const [agentId, count] of counts.entries()) {
          if (!resultSet.has(agentId)) {
            expect(count).toBeLessThanOrEqual(minReturnedCount);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 18: Tier考慮ピックのチーム力差補正
// Feature: valorant-team-builder, Property 18: Tier考慮ピックのチーム力差補正
// ---------------------------------------------------------------------------

describe('Property 18: Tier考慮ピックのチーム力差補正', () => {
  /**
   * **Validates: Requirements 16.1**
   *
   * For two teams with different rank totals, the higher-ranked team's
   * average tier score should be <= the lower-ranked team's average tier score.
   * This is a statistical property — verified over multiple runs (80%+ trend).
   */
  it('higher-ranked team gets lower average tier score in 80%+ of runs', () => {
    const mapId = 'ascent';

    // Team A: high rank players (rank_value 15-25)
    const highRankPlayerArb = fc.record({
      id: fc.uuid(),
      room_id: fc.uuid(),
      riot_id: fc.string({ minLength: 1, maxLength: 10 }).map(s => s + '#TAG'),
      display_name: fc.string({ minLength: 1, maxLength: 10 }),
      rank: fc.constant('Diamond 1'),
      rank_value: fc.integer({ min: 15, max: 25 }),
      peak_rank: fc.constant('Diamond 1'),
      peak_rank_value: fc.integer({ min: 15, max: 25 }),
      team: fc.constant(null as null),
      created_at: fc.constant(new Date().toISOString()),
    });

    // Team B: low rank players (rank_value 1-10)
    const lowRankPlayerArb = fc.record({
      id: fc.uuid(),
      room_id: fc.uuid(),
      riot_id: fc.string({ minLength: 1, maxLength: 10 }).map(s => s + '#TAG'),
      display_name: fc.string({ minLength: 1, maxLength: 10 }),
      rank: fc.constant('Iron 1'),
      rank_value: fc.integer({ min: 1, max: 10 }),
      peak_rank: fc.constant('Iron 1'),
      peak_rank_value: fc.integer({ min: 1, max: 10 }),
      team: fc.constant(null as null),
      created_at: fc.constant(new Date().toISOString()),
    });

    let correctCount = 0;
    const totalRuns = 100;

    fc.assert(
      fc.property(
        fc.array(highRankPlayerArb, { minLength: 5, maxLength: 5 }),
        fc.array(lowRankPlayerArb, { minLength: 5, maxLength: 5 }),
        tierDataArb(mapId),
        (teamA, teamB, tierData) => {
          const result = tierAwareRandomPick(teamA, teamB, [], mapId, tierData);

          const teamAIds = new Set(teamA.map(p => p.id));
          const teamAResults = result.filter(r => teamAIds.has(r.playerId));
          const teamBResults = result.filter(r => !teamAIds.has(r.playerId));

          if (teamAResults.length === 0 || teamBResults.length === 0) return;

          const avgTierA =
            teamAResults.reduce((sum, r) => {
              const tier = tierData[mapId]?.[r.agent.id] ?? 'B';
              return sum + TIER_SCORES[tier];
            }, 0) / teamAResults.length;

          const avgTierB =
            teamBResults.reduce((sum, r) => {
              const tier = tierData[mapId]?.[r.agent.id] ?? 'B';
              return sum + TIER_SCORES[tier];
            }, 0) / teamBResults.length;

          // Higher-ranked team (A) should get lower or equal avg tier score
          if (avgTierA <= avgTierB) {
            correctCount++;
          }
        },
      ),
      { numRuns: totalRuns },
    );

    // Statistical: at least 80% of runs should show the trend
    expect(correctCount).toBeGreaterThanOrEqual(totalRuns * 0.8);
  });
});

// ---------------------------------------------------------------------------
// Property 19: ロール分布制約
// Feature: valorant-team-builder, Property 19: ロール分布制約
// ---------------------------------------------------------------------------

describe('Property 19: ロール分布制約', () => {
  /**
   * **Validates: Requirements 16.2**
   *
   * For 10 players, tierAwareRandomPick result has at least 2 agents per role.
   */
  it('tierAwareRandomPick assigns at least 2 agents per role for 10 players', () => {
    const mapId = 'ascent';

    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 5, maxLength: 5 }),
        fc.array(playerArb, { minLength: 5, maxLength: 5 }),
        tierDataArb(mapId),
        (teamA, teamB, tierData) => {
          const result = tierAwareRandomPick(teamA, teamB, [], mapId, tierData);

          // Count agents per role
          const roleCounts: Record<string, number> = {
            Duelist: 0,
            Initiator: 0,
            Controller: 0,
            Sentinel: 0,
          };
          for (const pick of result) {
            roleCounts[pick.agent.role]++;
          }

          expect(roleCounts['Duelist']).toBeGreaterThanOrEqual(2);
          expect(roleCounts['Initiator']).toBeGreaterThanOrEqual(2);
          expect(roleCounts['Controller']).toBeGreaterThanOrEqual(2);
          expect(roleCounts['Sentinel']).toBeGreaterThanOrEqual(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: BANエージェント除外
// Feature: valorant-team-builder, Property 20: BANエージェント除外
// ---------------------------------------------------------------------------

describe('Property 20: BANエージェント除外', () => {
  /**
   * **Validates: Requirements 16.3, 17.2**
   *
   * For any pick result (tier or simple), no banned agent appears in the results.
   */
  it('tierAwareRandomPick excludes banned agents', () => {
    const mapId = 'ascent';

    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 5, maxLength: 5 }),
        fc.array(playerArb, { minLength: 5, maxLength: 5 }),
        fc.shuffledSubarray(AGENTS.map(a => a.id), { minLength: 0, maxLength: 4 }),
        tierDataArb(mapId),
        (teamA, teamB, bannedIds, tierData) => {
          const result = tierAwareRandomPick(teamA, teamB, bannedIds, mapId, tierData);
          const bannedSet = new Set(bannedIds);

          for (const pick of result) {
            expect(bannedSet.has(pick.agent.id)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('simpleRandomPick excludes banned agents', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 2, maxLength: 10 }),
        fc.shuffledSubarray(AGENTS.map(a => a.id), { minLength: 0, maxLength: 4 }),
        (players, bannedIds) => {
          const result = simpleRandomPick(players, bannedIds);
          const bannedSet = new Set(bannedIds);

          for (const pick of result) {
            expect(bannedSet.has(pick.agent.id)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 21: エージェント割り当ての一意性
// Feature: valorant-team-builder, Property 21: エージェント割り当ての一意性
// ---------------------------------------------------------------------------

describe('Property 21: エージェント割り当ての一意性', () => {
  /**
   * **Validates: Requirements 16.4, 17.3**
   *
   * All agents in pick results are unique (no duplicates).
   */
  it('tierAwareRandomPick assigns unique agents', () => {
    const mapId = 'ascent';

    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 5, maxLength: 5 }),
        fc.array(playerArb, { minLength: 5, maxLength: 5 }),
        tierDataArb(mapId),
        (teamA, teamB, tierData) => {
          const result = tierAwareRandomPick(teamA, teamB, [], mapId, tierData);
          const agentIds = result.map(r => r.agent.id);
          const uniqueIds = new Set(agentIds);
          expect(uniqueIds.size).toBe(agentIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('simpleRandomPick assigns unique agents', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 2, maxLength: 10 }),
        (players) => {
          const result = simpleRandomPick(players, []);
          const agentIds = result.map(r => r.agent.id);
          const uniqueIds = new Set(agentIds);
          expect(uniqueIds.size).toBe(agentIds.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 22: エージェントリロールの有効性
// Feature: valorant-team-builder, Property 22: エージェントリロールの有効性
// ---------------------------------------------------------------------------

describe('Property 22: エージェントリロールの有効性', () => {
  /**
   * **Validates: Requirements 16.6**
   *
   * After reroll, new agent differs from old, is not banned,
   * and is not assigned to others.
   */
  it('rerollAgent returns a different, non-banned, non-duplicate agent', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 3, maxLength: 10 }),
        fc.shuffledSubarray(AGENTS.map(a => a.id), { minLength: 0, maxLength: 4 }),
        (players, bannedIds) => {
          // First do a simple pick to get current assignments
          const currentPicks = simpleRandomPick(players, bannedIds);
          if (currentPicks.length === 0) return;

          // Pick a random player to reroll
          const targetIdx = Math.floor(Math.random() * currentPicks.length);
          const targetPlayerId = currentPicks[targetIdx].playerId;
          const oldAgentId = currentPicks[targetIdx].agent.id;

          const newPick = rerollAgent(
            targetPlayerId,
            currentPicks,
            bannedIds,
            null,
            null,
          );

          // New agent differs from old
          expect(newPick.agent.id).not.toBe(oldAgentId);

          // New agent is not banned
          const bannedSet = new Set(bannedIds);
          expect(bannedSet.has(newPick.agent.id)).toBe(false);

          // New agent is not assigned to other players
          const otherAgentIds = new Set(
            currentPicks
              .filter(p => p.playerId !== targetPlayerId)
              .map(p => p.agent.id),
          );
          expect(otherAgentIds.has(newPick.agent.id)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
