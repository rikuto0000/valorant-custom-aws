/**
 * Property-Based Tests for Valorant API (Demo Mode Fallback)
 * Feature: valorant-team-builder
 *
 * Tests Property 4 from the design document using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateDemoPlayerInfo } from '../valorant-api';
import { RANKS } from '../constants/ranks';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validRankLabels = new Set(RANKS.map((r) => r.label));

/** Arbitrary for player name (non-empty alphanumeric) */
const nameArb = fc.string({ minLength: 1, maxLength: 16 });

/** Arbitrary for player tag */
const tagArb = fc.string({ minLength: 1, maxLength: 5 });

// ---------------------------------------------------------------------------
// Property 4: デモモードフォールバックの有効性
// Feature: valorant-team-builder, Property 4: デモモードフォールバックの有効性
// ---------------------------------------------------------------------------

describe('Property 4: デモモードフォールバックの有効性', () => {
  /**
   * **Validates: Requirements 4.3**
   *
   * In any API-unconfigured or error state, the rank info returned by
   * Rank_Resolver has rank_value in 1-25 range and valid rank strings.
   */
  it('generateDemoPlayerInfo returns valid rank_value (1-25) and valid rank strings', () => {
    fc.assert(
      fc.property(nameArb, tagArb, (name, tag) => {
        const info = generateDemoPlayerInfo(name, tag);

        // rank_value in 1-25 range
        expect(info.rankValue).toBeGreaterThanOrEqual(1);
        expect(info.rankValue).toBeLessThanOrEqual(25);

        // peakRankValue in 1-25 range
        expect(info.peakRankValue).toBeGreaterThanOrEqual(1);
        expect(info.peakRankValue).toBeLessThanOrEqual(25);

        // peakRankValue >= rankValue
        expect(info.peakRankValue).toBeGreaterThanOrEqual(info.rankValue);

        // rank and peakRank are valid rank label strings
        expect(validRankLabels.has(info.rank)).toBe(true);
        expect(validRankLabels.has(info.peakRank)).toBe(true);

        // displayName is correctly formatted
        expect(info.displayName).toBe(`${name}#${tag}`);

        // source should always be 'demo' for generateDemoPlayerInfo
        expect(info.source).toBe('demo');
      }),
      { numRuns: 100 },
    );
  });
});
