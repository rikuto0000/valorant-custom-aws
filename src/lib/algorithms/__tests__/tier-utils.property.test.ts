/**
 * Property-Based Tests for Tier Utils
 * Feature: valorant-team-builder
 *
 * Tests Properties 23–24 from the design document using fast-check.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { saveTierData, loadTierData, sortByTier } from '../tier-utils';
import { AGENTS } from '../../constants/agents';
import type { Agent, TierRank, MapTierData } from '../../types';
import { TIER_SCORES } from '../../types';

// ---------------------------------------------------------------------------
// localStorage mock for Node.js environment
// ---------------------------------------------------------------------------

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

const tierRankArb = fc.constantFrom<TierRank>('S', 'A', 'B', 'C', 'D');

const mapIdArb = fc.constantFrom(
  'abyss', 'ascent', 'bind', 'breeze', 'fracture',
  'haven', 'icebox', 'lotus', 'pearl', 'split', 'sunset',
);

/** Generate a MapTierData with 1-3 maps, each with tier assignments for some agents */
const mapTierDataArb = fc
  .array(mapIdArb, { minLength: 1, maxLength: 3 })
  .chain(mapIds => {
    const entries = mapIds.map(mapId => {
      const agentTiersArb = fc.record(
        Object.fromEntries(
          AGENTS.map(a => [a.id, tierRankArb])
        ) as Record<string, fc.Arbitrary<TierRank>>
      );
      return fc.tuple(fc.constant(mapId), agentTiersArb);
    });
    return fc.tuple(...entries);
  })
  .map(entries => {
    const data: MapTierData = {};
    for (const [mapId, agentTiers] of entries) {
      data[mapId as string] = agentTiers as Record<string, TierRank>;
    }
    return data;
  });

// ---------------------------------------------------------------------------
// Property 23: Tier データの localStorage ラウンドトリップ
// Feature: valorant-team-builder, Property 23: Tier データの localStorage ラウンドトリップ
// ---------------------------------------------------------------------------

describe('Property 23: Tier データの localStorage ラウンドトリップ', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  /**
   * **Validates: Requirements 18.2, 18.3**
   *
   * Save tierData to localStorage, load it back, verify equality.
   */
  it('saveTierData then loadTierData returns the same data', () => {
    fc.assert(
      fc.property(mapTierDataArb, (tierData) => {
        localStorageMock.clear();
        saveTierData(tierData);
        const loaded = loadTierData();
        expect(loaded).toEqual(tierData);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 24: Tier ソートの順序性
// Feature: valorant-team-builder, Property 24: Tier ソートの順序性
// ---------------------------------------------------------------------------

describe('Property 24: Tier ソートの順序性', () => {
  /**
   * **Validates: Requirements 18.4**
   *
   * After sortByTier, agents are ordered S → A → B → C → D.
   */
  it('sortByTier produces agents in S → A → B → C → D order', () => {
    // Generate random tier assignments for all agents
    const tierAssignmentArb = fc.record(
      Object.fromEntries(
        AGENTS.map(a => [a.id, tierRankArb])
      ) as Record<string, fc.Arbitrary<TierRank>>
    );

    fc.assert(
      fc.property(tierAssignmentArb, (tierAssignment) => {
        const sorted = sortByTier(AGENTS, tierAssignment);

        // Verify ordering: each agent's tier score should be >= the next agent's
        for (let i = 0; i < sorted.length - 1; i++) {
          const tierA = tierAssignment[sorted[i].id] ?? 'B';
          const tierB = tierAssignment[sorted[i + 1].id] ?? 'B';
          const scoreA = TIER_SCORES[tierA];
          const scoreB = TIER_SCORES[tierB];
          expect(scoreA).toBeGreaterThanOrEqual(scoreB);
        }
      }),
      { numRuns: 100 },
    );
  });
});
