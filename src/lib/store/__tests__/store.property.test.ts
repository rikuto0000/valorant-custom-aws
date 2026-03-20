import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DemoStore } from '../demo-store';
import type { PlayerInput } from '../../types';

// === Helper: PlayerInput arbitrary ===
const playerInputArb = (suffix?: string) =>
  fc.record({
    riot_id: fc
      .string({ minLength: 1, maxLength: 20 })
      .map((s) => s + (suffix ?? '') + '#TAG'),
    display_name: fc.string({ minLength: 1, maxLength: 20 }),
    rank: fc.constantFrom('Iron 1', 'Silver 2', 'Gold 3', 'Diamond 1', 'Radiant'),
    rank_value: fc.integer({ min: 1, max: 25 }),
    peak_rank: fc.constantFrom('Iron 1', 'Silver 2', 'Gold 3', 'Diamond 1', 'Radiant'),
    peak_rank_value: fc.integer({ min: 1, max: 25 }),
  });

// UUID v4 regex
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ISO 8601 regex (basic check)
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

/**
 * Feature: valorant-team-builder, Property 1: ルーム作成の不変条件
 * Validates: Requirements 1.1, 1.3
 */
describe('Property 1: ルーム作成の不変条件', () => {
  it('any room creation returns a room with valid UUID v4 id, status="waiting", rank_mode="current", valid ISO 8601 created_at', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const store = new DemoStore();
        const room = await store.createRoom();

        expect(room.id).toMatch(UUID_V4_REGEX);
        expect(room.status).toBe('waiting');
        expect(room.rank_mode).toBe('current');
        expect(room.created_at).toMatch(ISO_8601_REGEX);
        expect(new Date(room.created_at).getTime()).not.toBeNaN();
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: valorant-team-builder, Property 3: プレイヤー追加のラウンドトリップ
 * Validates: Requirements 4.2, 5.2
 */
describe('Property 3: プレイヤー追加のラウンドトリップ', () => {
  it('for any valid PlayerInput, after adding to a room, getPlayers returns a list containing that player data', async () => {
    await fc.assert(
      fc.asyncProperty(playerInputArb(), async (input: PlayerInput) => {
        const store = new DemoStore();
        const room = await store.createRoom();
        const added = await store.addPlayer(room.id, input);
        const players = await store.getPlayers(room.id);

        expect(players.length).toBe(1);
        const found = players.find((p) => p.id === added.id);
        expect(found).toBeDefined();
        expect(found!.riot_id).toBe(input.riot_id);
        expect(found!.display_name).toBe(input.display_name);
        expect(found!.rank).toBe(input.rank);
        expect(found!.rank_value).toBe(input.rank_value);
        expect(found!.peak_rank).toBe(input.peak_rank);
        expect(found!.peak_rank_value).toBe(input.peak_rank_value);
        expect(found!.team).toBeNull();
        expect(found!.room_id).toBe(room.id);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: valorant-team-builder, Property 5: プレイヤー重複拒否
 * Validates: Requirements 6.1
 */
describe('Property 5: プレイヤー重複拒否', () => {
  it('adding a player with the same riot_id twice should throw, and player count stays the same', async () => {
    await fc.assert(
      fc.asyncProperty(playerInputArb(), async (input: PlayerInput) => {
        const store = new DemoStore();
        const room = await store.createRoom();
        await store.addPlayer(room.id, input);
        const countBefore = (await store.getPlayers(room.id)).length;

        await expect(store.addPlayer(room.id, input)).rejects.toThrow();

        const countAfter = (await store.getPlayers(room.id)).length;
        expect(countAfter).toBe(countBefore);
      }),
      { numRuns: 100 },
    );
  });
});


/**
 * Feature: valorant-team-builder, Property 6: プレイヤー削除の正確性
 * Validates: Requirements 7.1
 */
describe('Property 6: プレイヤー削除の正確性', () => {
  it('after deleting a specific player, they are not in the list and count decreases by 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        playerInputArb('_a'),
        playerInputArb('_b'),
        async (inputA: PlayerInput, inputB: PlayerInput) => {
          const store = new DemoStore();
          const room = await store.createRoom();
          const playerA = await store.addPlayer(room.id, inputA);
          await store.addPlayer(room.id, inputB);

          const countBefore = (await store.getPlayers(room.id)).length;
          expect(countBefore).toBe(2);

          await store.deletePlayer(room.id, playerA.id);

          const playersAfter = await store.getPlayers(room.id);
          expect(playersAfter.length).toBe(countBefore - 1);
          expect(playersAfter.find((p) => p.id === playerA.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: valorant-team-builder, Property 8: ランクモード更新のラウンドトリップ
 * Validates: Requirements 8.4
 */
describe('Property 8: ランクモード更新のラウンドトリップ', () => {
  it('after updating rank_mode to current or peak, getRoom reflects the change', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('current' as const, 'peak' as const),
        async (mode) => {
          const store = new DemoStore();
          const room = await store.createRoom();

          await store.updateRoomRankMode(room.id, mode);
          const updated = await store.getRoom(room.id);

          expect(updated).not.toBeNull();
          expect(updated!.rank_mode).toBe(mode);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: valorant-team-builder, Property 15: チームリセットの完全性
 * Validates: Requirements 13.4
 */
describe('Property 15: チームリセットの完全性', () => {
  it('after assigning teams to players then calling resetTeams, all players have team=null', async () => {
    await fc.assert(
      fc.asyncProperty(
        playerInputArb('_x'),
        playerInputArb('_y'),
        fc.constantFrom('A' as const, 'B' as const),
        fc.constantFrom('A' as const, 'B' as const),
        async (inputX: PlayerInput, inputY: PlayerInput, teamX, teamY) => {
          const store = new DemoStore();
          const room = await store.createRoom();
          const px = await store.addPlayer(room.id, inputX);
          const py = await store.addPlayer(room.id, inputY);

          await store.updatePlayerTeam(room.id, px.id, teamX);
          await store.updatePlayerTeam(room.id, py.id, teamY);

          await store.resetTeams(room.id);

          const players = await store.getPlayers(room.id);
          for (const p of players) {
            expect(p.team).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Feature: valorant-team-builder, Property 27: カスケード削除の完全性
 * Validates: Requirements 21.3
 */
describe('Property 27: カスケード削除の完全性', () => {
  it('after adding players to a room then deleting the room, getPlayers returns empty array', async () => {
    await fc.assert(
      fc.asyncProperty(
        playerInputArb('_1'),
        playerInputArb('_2'),
        async (input1: PlayerInput, input2: PlayerInput) => {
          const store = new DemoStore();
          const room = await store.createRoom();
          await store.addPlayer(room.id, input1);
          await store.addPlayer(room.id, input2);

          await store.deleteRoom(room.id);

          const players = await store.getPlayers(room.id);
          expect(players).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });
});
