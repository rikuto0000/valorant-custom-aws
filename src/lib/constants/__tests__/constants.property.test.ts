import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RANKS, getRankByValue, getValueByLabel, RANK_BY_VALUE } from '../ranks';
import { AGENTS, AGENTS_BY_ROLE } from '../agents';
import { MAPS } from '../maps';

// Feature: valorant-team-builder, Property 7: ランクマッピングの全単射性
// **Validates: Requirements 8.1, 26.4**
describe('Property 7: ランクマッピングの全単射性', () => {
  it('任意のランク値(1-25)に対してgetRankByValueが有効なRankInfoを返す', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), (value) => {
        const rank = getRankByValue(value);
        expect(rank).toBeDefined();
        expect(rank!.value).toBe(value);
        expect(rank!.label).toBeTruthy();
        expect(rank!.tier).toBeTruthy();
        expect(rank!.color).toBeTruthy();
        expect(rank!.badgeImage).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('逆変換: getValueByLabel(getRankByValue(v).label) === v', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), (value) => {
        const rank = getRankByValue(value)!;
        const reversed = getValueByLabel(rank.label);
        expect(reversed).toBe(value);
      }),
      { numRuns: 100 }
    );
  });

  it('全25値が一意のラベルにマッピングされる', () => {
    const labels = new Set<string>();
    for (let v = 1; v <= 25; v++) {
      const rank = getRankByValue(v);
      expect(rank).toBeDefined();
      expect(labels.has(rank!.label)).toBe(false);
      labels.add(rank!.label);
    }
    expect(labels.size).toBe(25);
  });

  it('各ティアは固有のカラーとバッジ画像パスを持つ', () => {
    // Collect unique tiers and verify each has a unique color
    const tierColors = new Map<string, string>();
    for (const rank of RANKS) {
      if (tierColors.has(rank.tier)) {
        // Same tier should have same color
        expect(tierColors.get(rank.tier)).toBe(rank.color);
      } else {
        tierColors.set(rank.tier, rank.color);
      }
    }
    // All tier colors should be unique across different tiers
    const uniqueColors = new Set(tierColors.values());
    expect(uniqueColors.size).toBe(tierColors.size);

    // Each rank has a unique badge image path
    const badgeImages = new Set<string>();
    for (const rank of RANKS) {
      expect(badgeImages.has(rank.badgeImage)).toBe(false);
      badgeImages.add(rank.badgeImage);
    }
    expect(badgeImages.size).toBe(25);
  });

  it('RANKS配列は正確に25エントリを持つ', () => {
    expect(RANKS.length).toBe(25);
    expect(RANK_BY_VALUE.size).toBe(25);
  });
});

// Feature: valorant-team-builder, Property 28: データ定数の整合性
// **Validates: Requirements 25.1, 25.2, 25.3**
describe('Property 28: データ定数の整合性', () => {
  it('AGENTSは合計28体である', () => {
    expect(AGENTS.length).toBe(28);
  });

  it('ロール分布: Duelist 8, Initiator 7, Controller 6, Sentinel 7', () => {
    expect(AGENTS_BY_ROLE.Duelist.length).toBe(8);
    expect(AGENTS_BY_ROLE.Initiator.length).toBe(7);
    expect(AGENTS_BY_ROLE.Controller.length).toBe(6);
    expect(AGENTS_BY_ROLE.Sentinel.length).toBe(7);
  });

  it('任意のインデックスのエージェントが全必須フィールドを持つ', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: AGENTS.length - 1 }), (index) => {
        const agent = AGENTS[index];
        expect(agent.id).toBeTruthy();
        expect(typeof agent.id).toBe('string');
        expect(agent.name).toBeTruthy();
        expect(typeof agent.name).toBe('string');
        expect(agent.nameJa).toBeTruthy();
        expect(typeof agent.nameJa).toBe('string');
        expect(['Duelist', 'Initiator', 'Controller', 'Sentinel']).toContain(agent.role);
        expect(agent.roleJa).toBeTruthy();
        expect(typeof agent.roleJa).toBe('string');
        expect(agent.image).toBeTruthy();
        expect(agent.image).toMatch(/^\/images\/agents\//);
      }),
      { numRuns: 100 }
    );
  });

  it('MAPSは11種である', () => {
    expect(MAPS.length).toBe(11);
  });

  it('任意のインデックスのマップが全必須フィールドを持つ', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: MAPS.length - 1 }), (index) => {
        const map = MAPS[index];
        expect(map.id).toBeTruthy();
        expect(typeof map.id).toBe('string');
        expect(map.name).toBeTruthy();
        expect(typeof map.name).toBe('string');
        expect(map.image).toBeTruthy();
        expect(map.image).toMatch(/^\/images\/maps\//);
      }),
      { numRuns: 100 }
    );
  });

  it('全エージェントIDが一意である', () => {
    const ids = AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(AGENTS.length);
  });

  it('全マップIDが一意である', () => {
    const ids = MAPS.map((m) => m.id);
    expect(new Set(ids).size).toBe(MAPS.length);
  });
});
