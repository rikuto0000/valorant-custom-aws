import { describe, it, expect } from 'vitest';
import { extractRoomId } from '../utils';

describe('extractRoomId', () => {
  it('URLからUUID v4を抽出する', () => {
    const result = extractRoomId(
      'https://example.com/room/550e8400-e29b-41d4-a716-446655440000'
    );
    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('UUID v4文字列をそのまま返す', () => {
    const result = extractRoomId('550e8400-e29b-41d4-a716-446655440000');
    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('大文字のUUID v4を小文字に変換して返す', () => {
    const result = extractRoomId('550E8400-E29B-41D4-A716-446655440000');
    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('UUIDを含まない文字列にはnullを返す', () => {
    expect(extractRoomId('invalid')).toBeNull();
    expect(extractRoomId('')).toBeNull();
    expect(extractRoomId('not-a-uuid')).toBeNull();
  });

  it('UUID v4以外のバージョンにはnullを返す', () => {
    // version 1 (first digit of 3rd group is 1, not 4)
    expect(extractRoomId('550e8400-e29b-11d4-a716-446655440000')).toBeNull();
    // version 3 (first digit of 3rd group is 3, not 4)
    expect(extractRoomId('550e8400-e29b-31d4-a716-446655440000')).toBeNull();
  });

  it('variant bitが不正なUUIDにはnullを返す', () => {
    // variant bits should be 8, 9, a, or b — using 0 here
    expect(extractRoomId('550e8400-e29b-41d4-0716-446655440000')).toBeNull();
  });

  it('クエリパラメータ付きURLからUUIDを抽出する', () => {
    const result = extractRoomId(
      'https://example.com/room/550e8400-e29b-41d4-a716-446655440000?tab=team'
    );
    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('テキスト中に埋め込まれたUUIDを抽出する', () => {
    const result = extractRoomId(
      'ルームID: 550e8400-e29b-41d4-a716-446655440000 に参加してください'
    );
    expect(result).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
