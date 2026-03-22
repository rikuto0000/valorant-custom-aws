import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveRank, generateDemoPlayerInfo } from '../valorant-api';
import { RANKS } from '../constants/ranks';

describe('valorant-api', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('generateDemoPlayerInfo', () => {
    it('有効なプレイヤー情報を返す', () => {
      const info = generateDemoPlayerInfo('TestPlayer', 'JP1');
      expect(info.name).toBe('TestPlayer');
      expect(info.tag).toBe('JP1');
      expect(info.displayName).toBe('TestPlayer#JP1');
      expect(info.rankValue).toBeGreaterThanOrEqual(1);
      expect(info.rankValue).toBeLessThanOrEqual(25);
      expect(info.peakRankValue).toBeGreaterThanOrEqual(info.rankValue);
      expect(info.peakRankValue).toBeLessThanOrEqual(25);
      expect(info.rank).toBeTruthy();
      expect(info.peakRank).toBeTruthy();
    });

    it('rank と peakRank が有効なランクラベルである', () => {
      const validLabels = new Set(RANKS.map((r) => r.label));
      for (let i = 0; i < 20; i++) {
        const info = generateDemoPlayerInfo('Player', 'TAG');
        expect(validLabels.has(info.rank)).toBe(true);
        expect(validLabels.has(info.peakRank)).toBe(true);
      }
    });
  });

  describe('resolveRank', () => {
    it('APIキー未設定時はデモモードにフォールバックする', async () => {
      delete process.env.VALORANT_API_KEY;
      const info = await resolveRank('TestPlayer', 'JP1');
      expect(info.name).toBe('TestPlayer');
      expect(info.tag).toBe('JP1');
      expect(info.rankValue).toBeGreaterThanOrEqual(1);
      expect(info.rankValue).toBeLessThanOrEqual(25);
    });

    it('APIエラー時はデモモードにフォールバックする', async () => {
      process.env.VALORANT_API_KEY = 'test-api-key';
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const info = await resolveRank('TestPlayer', 'JP1');
      expect(info.name).toBe('TestPlayer');
      expect(info.tag).toBe('JP1');
      expect(info.rankValue).toBeGreaterThanOrEqual(1);
      expect(info.rankValue).toBeLessThanOrEqual(25);
    });

    it('API非200レスポンス時はデモモードにフォールバックする', async () => {
      process.env.VALORANT_API_KEY = 'test-api-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(null, { status: 404 })
      );

      const info = await resolveRank('TestPlayer', 'JP1');
      expect(info.name).toBe('TestPlayer');
      expect(info.rankValue).toBeGreaterThanOrEqual(1);
    });

    it('API成功時はプレイヤー情報を正しくマッピングする', async () => {
      process.env.VALORANT_API_KEY = 'test-api-key';
      const mockResponse = {
        status: 200,
        data: {
          name: 'Henrik3',
          tag: 'VALO',
          current_data: {
            currenttier: 15,
            currenttierpatched: 'Platinum 3',
          },
          highest_rank: {
            tier: 18,
            patched_tier: 'Diamond 3',
          },
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const info = await resolveRank('Henrik3', 'VALO');
      expect(info.name).toBe('Henrik3');
      expect(info.tag).toBe('VALO');
      expect(info.displayName).toBe('Henrik3#VALO');
      expect(info.rank).toBe('Platinum 3');
      expect(info.rankValue).toBe(13);
      expect(info.peakRank).toBe('Diamond 3');
      expect(info.peakRankValue).toBe(16);
    });

    it('APIレスポンスにdata無しの場合はデモモードにフォールバックする', async () => {
      process.env.VALORANT_API_KEY = 'test-api-key';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 200 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const info = await resolveRank('TestPlayer', 'JP1');
      expect(info.name).toBe('TestPlayer');
      expect(info.rankValue).toBeGreaterThanOrEqual(1);
    });

    it('APIレスポンスにcurrent_data無しの場合はデフォルトランクを使用する', async () => {
      process.env.VALORANT_API_KEY = 'test-api-key';
      const mockResponse = {
        status: 200,
        data: {
          name: 'Player',
          tag: 'TAG',
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const info = await resolveRank('Player', 'TAG');
      // Default rank is Silver 2 (value 8)
      expect(info.rank).toBe('Silver 2');
      expect(info.rankValue).toBe(8);
    });
  });
});
