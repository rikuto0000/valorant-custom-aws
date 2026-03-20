import { describe, it, expect } from 'vitest';
import { randomMapSelect, resolveMapVote } from '../map-selector';
import { MAPS } from '../../constants/maps';

describe('randomMapSelect', () => {
  it('returns a map from the provided list', () => {
    const result = randomMapSelect(MAPS);
    expect(MAPS).toContainEqual(result);
  });

  it('works with a single-element list', () => {
    const single = [MAPS[0]];
    const result = randomMapSelect(single);
    expect(result).toEqual(MAPS[0]);
  });
});

describe('resolveMapVote', () => {
  it('selects the map with the most votes', () => {
    const votes: Record<string, string[]> = {
      ascent: ['p1', 'p2', 'p3'],
      bind: ['p4'],
      haven: ['p5', 'p6'],
    };
    const result = resolveMapVote(votes);
    expect(result.id).toBe('ascent');
  });

  it('selects from tied maps when votes are equal', () => {
    const votes: Record<string, string[]> = {
      ascent: ['p1', 'p2'],
      bind: ['p3', 'p4'],
    };
    const result = resolveMapVote(votes);
    expect(['ascent', 'bind']).toContain(result.id);
  });

  it('handles single vote entry', () => {
    const votes: Record<string, string[]> = {
      lotus: ['p1'],
    };
    const result = resolveMapVote(votes);
    expect(result.id).toBe('lotus');
  });

  it('returns full MapData from MAPS constant', () => {
    const votes: Record<string, string[]> = {
      split: ['p1', 'p2'],
    };
    const result = resolveMapVote(votes);
    expect(result).toEqual({ id: 'split', name: 'Split', image: '/images/maps/split.jpg' });
  });
});
