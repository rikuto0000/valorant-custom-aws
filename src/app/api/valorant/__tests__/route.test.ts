import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock resolveRank
vi.mock('@/lib/valorant-api', () => ({
  resolveRank: vi.fn(),
}));

import { resolveRank } from '@/lib/valorant-api';
const mockResolveRank = vi.mocked(resolveRank);

function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/valorant');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe('GET /api/valorant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when name is missing', async () => {
    const request = createRequest({ tag: 'JP1' });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('MISSING_PARAMS');
    expect(body.error.message).toContain('name');
  });

  it('returns 400 when tag is missing', async () => {
    const request = createRequest({ name: 'TestPlayer' });
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 400 when both name and tag are missing', async () => {
    const request = createRequest({});
    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 200 with player info on success', async () => {
    const mockPlayerInfo = {
      name: 'TestPlayer',
      tag: 'JP1',
      displayName: 'TestPlayer#JP1',
      rank: 'Gold 2',
      rankValue: 11,
      peakRank: 'Platinum 1',
      peakRankValue: 13,
      source: 'api' as const,
    };
    mockResolveRank.mockResolvedValue(mockPlayerInfo);

    const request = createRequest({ name: 'TestPlayer', tag: 'JP1' });
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual(mockPlayerInfo);
    expect(mockResolveRank).toHaveBeenCalledWith('TestPlayer', 'JP1');
  });

  it('returns 500 when resolveRank throws', async () => {
    mockResolveRank.mockRejectedValue(new Error('Unexpected error'));

    const request = createRequest({ name: 'TestPlayer', tag: 'JP1' });
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('ランク情報の取得に失敗しました');
  });

  it('passes correct name and tag to resolveRank', async () => {
    mockResolveRank.mockResolvedValue({
      name: 'Player',
      tag: 'TAG',
      displayName: 'Player#TAG',
      rank: 'Silver 2',
      rankValue: 8,
      peakRank: 'Silver 2',
      peakRankValue: 8,
      source: 'api' as const,
    });

    const request = createRequest({ name: 'Player', tag: 'TAG' });
    await GET(request);

    expect(mockResolveRank).toHaveBeenCalledWith('Player', 'TAG');
  });
});
