/**
 * Property-Based Tests for Map Selector
 * Feature: valorant-team-builder
 *
 * Tests Properties 25–26 from the design document using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { randomMapSelect, resolveMapVote } from '../map-selector';
import { MAPS } from '../../constants/maps';

// ---------------------------------------------------------------------------
// Property 25: マップランダム選択の有効性
// Feature: valorant-team-builder, Property 25: マップランダム選択の有効性
// ---------------------------------------------------------------------------

describe('Property 25: マップランダム選択の有効性', () => {
  /**
   * **Validates: Requirements 19.1**
   *
   * Any random map selection result must be one of the 11 supported maps.
   */
  it('randomMapSelect always returns one of the 11 supported maps', () => {
    const mapIds = new Set(MAPS.map((m) => m.id));

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (_seed) => {
        const result = randomMapSelect(MAPS);
        expect(mapIds.has(result.id)).toBe(true);
        expect(MAPS).toContainEqual(result);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 26: マップ投票の最多得票選択
// Feature: valorant-team-builder, Property 26: マップ投票の最多得票選択
// ---------------------------------------------------------------------------

describe('Property 26: マップ投票の最多得票選択', () => {
  /** Arbitrary: generate a non-empty votes record using valid map IDs */
  const votesArb = fc
    .array(
      fc.record({
        mapId: fc.constantFrom(...MAPS.map((m) => m.id)),
        voterCount: fc.integer({ min: 0, max: 10 }),
      }),
      { minLength: 1, maxLength: 11 },
    )
    .map((entries) => {
      const votes: Record<string, string[]> = {};
      for (const { mapId, voterCount } of entries) {
        if (!votes[mapId]) {
          votes[mapId] = Array.from({ length: voterCount }, (_, i) => `p${i}`);
        }
      }
      return votes;
    })
    .filter((votes) => Object.keys(votes).length > 0);

  /**
   * **Validates: Requirements 20.2, 20.3**
   *
   * For any vote result, the selected map must be the one with the most votes.
   * When tied, the selected map must be from the tied group.
   */
  it('resolveMapVote selects a map with the maximum vote count', () => {
    fc.assert(
      fc.property(votesArb, (votes) => {
        const result = resolveMapVote(votes);

        // Compute max vote count
        const maxVotes = Math.max(
          ...Object.values(votes).map((v) => v.length),
        );

        // Collect all map IDs with max votes (the tied group)
        const topMapIds = Object.entries(votes)
          .filter(([, voters]) => voters.length === maxVotes)
          .map(([mapId]) => mapId);

        // The selected map must be from the tied group
        expect(topMapIds).toContain(result.id);
      }),
      { numRuns: 100 },
    );
  });
});
