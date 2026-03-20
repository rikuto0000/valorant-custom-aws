import { describe, it, expect } from 'vitest';
import {
  RANKS,
  DEFAULT_RANK,
  RANK_BY_VALUE,
  RANK_BY_LABEL,
  getRankByValue,
  getValueByLabel,
} from './ranks';

describe('ranks constants', () => {
  it('should have exactly 25 ranks', () => {
    expect(RANKS).toHaveLength(25);
  });

  it('should have values from 1 to 25 in order', () => {
    RANKS.forEach((rank, index) => {
      expect(rank.value).toBe(index + 1);
    });
  });

  it('should have correct tier groupings', () => {
    const tiers = [
      { tier: 'Iron', count: 3 },
      { tier: 'Bronze', count: 3 },
      { tier: 'Silver', count: 3 },
      { tier: 'Gold', count: 3 },
      { tier: 'Platinum', count: 3 },
      { tier: 'Diamond', count: 3 },
      { tier: 'Ascendant', count: 3 },
      { tier: 'Immortal', count: 3 },
      { tier: 'Radiant', count: 1 },
    ];
    for (const { tier, count } of tiers) {
      expect(RANKS.filter((r) => r.tier === tier)).toHaveLength(count);
    }
  });

  it('should have Radiant with subRank 0', () => {
    const radiant = RANKS.find((r) => r.tier === 'Radiant');
    expect(radiant?.subRank).toBe(0);
  });

  it('should have subRanks 1-3 for non-Radiant tiers', () => {
    const nonRadiant = RANKS.filter((r) => r.tier !== 'Radiant');
    for (const rank of nonRadiant) {
      expect(rank.subRank).toBeGreaterThanOrEqual(1);
      expect(rank.subRank).toBeLessThanOrEqual(3);
    }
  });

  it('should have all required fields on every rank', () => {
    for (const rank of RANKS) {
      expect(rank.tier).toBeTruthy();
      expect(rank.tierJa).toBeTruthy();
      expect(rank.label).toBeTruthy();
      expect(rank.labelJa).toBeTruthy();
      expect(rank.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(rank.badgeImage).toMatch(/^\/images\/badges\/.+\.png$/);
    }
  });
});

describe('DEFAULT_RANK', () => {
  it('should be Silver 2 with value 8', () => {
    expect(DEFAULT_RANK.label).toBe('Silver 2');
    expect(DEFAULT_RANK.value).toBe(8);
    expect(DEFAULT_RANK.tier).toBe('Silver');
    expect(DEFAULT_RANK.subRank).toBe(2);
  });
});

describe('RANK_BY_VALUE', () => {
  it('should contain all 25 ranks', () => {
    expect(RANK_BY_VALUE.size).toBe(25);
  });

  it('should map value 1 to Iron 1', () => {
    expect(RANK_BY_VALUE.get(1)?.label).toBe('Iron 1');
  });

  it('should map value 25 to Radiant', () => {
    expect(RANK_BY_VALUE.get(25)?.label).toBe('Radiant');
  });
});

describe('RANK_BY_LABEL', () => {
  it('should contain all 25 ranks', () => {
    expect(RANK_BY_LABEL.size).toBe(25);
  });

  it('should map "Gold 2" to 11', () => {
    expect(RANK_BY_LABEL.get('Gold 2')).toBe(11);
  });
});

describe('getRankByValue', () => {
  it('should return correct rank for valid values', () => {
    expect(getRankByValue(1)?.label).toBe('Iron 1');
    expect(getRankByValue(8)?.label).toBe('Silver 2');
    expect(getRankByValue(25)?.label).toBe('Radiant');
  });

  it('should return undefined for invalid values', () => {
    expect(getRankByValue(0)).toBeUndefined();
    expect(getRankByValue(26)).toBeUndefined();
    expect(getRankByValue(-1)).toBeUndefined();
  });
});

describe('getValueByLabel', () => {
  it('should return correct value for valid labels', () => {
    expect(getValueByLabel('Iron 1')).toBe(1);
    expect(getValueByLabel('Silver 2')).toBe(8);
    expect(getValueByLabel('Radiant')).toBe(25);
  });

  it('should return undefined for invalid labels', () => {
    expect(getValueByLabel('Unknown')).toBeUndefined();
    expect(getValueByLabel('')).toBeUndefined();
  });
});
