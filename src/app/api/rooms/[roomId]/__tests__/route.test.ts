import { describe, it, expect, beforeEach } from 'vitest';
import { GET, POST, PATCH, DELETE } from '../route';
import { DemoStore } from '@/lib/store/demo-store';
import type { PlayerInput } from '@/lib/types';
import { NextRequest } from 'next/server';

// Helper: create a room and return its id
async function createRoom(store: DemoStore): Promise<string> {
  const room = await store.createRoom();
  return room.id;
}

const samplePlayer: PlayerInput = {
  riot_id: 'TestPlayer#JP1',
  display_name: 'TestPlayer',
  rank: 'Gold 2',
  rank_value: 11,
  peak_rank: 'Platinum 1',
  peak_rank_value: 13,
};

function makeParams(roomId: string) {
  return { params: Promise.resolve({ roomId }) };
}

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/rooms/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function deleteRequest(roomId: string, playerId?: string): NextRequest {
  const url = playerId
    ? `http://localhost/api/rooms/${roomId}?playerId=${playerId}`
    : `http://localhost/api/rooms/${roomId}`;
  return new NextRequest(url, { method: 'DELETE' });
}

describe('GET /api/rooms/[roomId]', () => {
  let store: DemoStore;

  beforeEach(() => {
    store = DemoStore.getInstance();
    // Clear store state by deleting all rooms
    (store as unknown as { rooms: Map<string, unknown> }).rooms.clear();
    (store as unknown as { players: Map<string, unknown[]> }).players.clear();
  });

  it('returns room info and players for a valid room', async () => {
    const roomId = await createRoom(store);
    await store.addPlayer(roomId, samplePlayer);

    const response = await GET(new Request('http://localhost'), makeParams(roomId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.room.id).toBe(roomId);
    expect(body.data.room.status).toBe('waiting');
    expect(body.data.players).toHaveLength(1);
    expect(body.data.players[0].riot_id).toBe('TestPlayer#JP1');
  });

  it('returns 404 for a non-existent room', async () => {
    const response = await GET(
      new Request('http://localhost'),
      makeParams('non-existent-id')
    );
    expect(response.status).toBe(404);

    const body = await response.json();
    expect(body.error.code).toBe('ROOM_NOT_FOUND');
  });

  it('returns empty players array for a room with no players', async () => {
    const roomId = await createRoom(store);

    const response = await GET(new Request('http://localhost'), makeParams(roomId));
    const body = await response.json();

    expect(body.data.players).toHaveLength(0);
  });
});

describe('POST /api/rooms/[roomId]', () => {
  let store: DemoStore;

  beforeEach(() => {
    store = DemoStore.getInstance();
    (store as unknown as { rooms: Map<string, unknown> }).rooms.clear();
    (store as unknown as { players: Map<string, unknown[]> }).players.clear();
  });

  it('adds a player and returns 201', async () => {
    const roomId = await createRoom(store);

    const response = await POST(jsonRequest(samplePlayer), makeParams(roomId));
    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.data.riot_id).toBe('TestPlayer#JP1');
    expect(body.data.display_name).toBe('TestPlayer');
    expect(body.data.team).toBeNull();
  });

  it('returns 409 for duplicate riot_id', async () => {
    const roomId = await createRoom(store);
    await store.addPlayer(roomId, samplePlayer);

    const response = await POST(jsonRequest(samplePlayer), makeParams(roomId));
    expect(response.status).toBe(409);

    const body = await response.json();
    expect(body.error.code).toBe('DUPLICATE_PLAYER');
  });
});

describe('PATCH /api/rooms/[roomId]', () => {
  let store: DemoStore;

  beforeEach(() => {
    store = DemoStore.getInstance();
    (store as unknown as { rooms: Map<string, unknown> }).rooms.clear();
    (store as unknown as { players: Map<string, unknown[]> }).players.clear();
  });

  it('updateTeam — updates a player team assignment', async () => {
    const roomId = await createRoom(store);
    const player = await store.addPlayer(roomId, samplePlayer);

    const response = await PATCH(
      jsonRequest({ action: 'updateTeam', playerId: player.id, team: 'A' }),
      makeParams(roomId)
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.success).toBe(true);

    const players = await store.getPlayers(roomId);
    expect(players[0].team).toBe('A');
  });

  it('updateStatus — updates room status', async () => {
    const roomId = await createRoom(store);

    const response = await PATCH(
      jsonRequest({ action: 'updateStatus', status: 'calculating' }),
      makeParams(roomId)
    );
    expect(response.status).toBe(200);

    const room = await store.getRoom(roomId);
    expect(room!.status).toBe('calculating');
  });

  it('updateRankMode — updates room rank mode', async () => {
    const roomId = await createRoom(store);

    const response = await PATCH(
      jsonRequest({ action: 'updateRankMode', rankMode: 'peak' }),
      makeParams(roomId)
    );
    expect(response.status).toBe(200);

    const room = await store.getRoom(roomId);
    expect(room!.rank_mode).toBe('peak');
  });

  it('resetTeams — resets all player teams to null', async () => {
    const roomId = await createRoom(store);
    const player = await store.addPlayer(roomId, samplePlayer);
    await store.updatePlayerTeam(roomId, player.id, 'B');

    const response = await PATCH(
      jsonRequest({ action: 'resetTeams' }),
      makeParams(roomId)
    );
    expect(response.status).toBe(200);

    const players = await store.getPlayers(roomId);
    expect(players[0].team).toBeNull();
  });

  it('returns 400 for unknown action', async () => {
    const roomId = await createRoom(store);

    const response = await PATCH(
      jsonRequest({ action: 'unknownAction' }),
      makeParams(roomId)
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe('INVALID_ACTION');
  });
});

describe('DELETE /api/rooms/[roomId]', () => {
  let store: DemoStore;

  beforeEach(() => {
    store = DemoStore.getInstance();
    (store as unknown as { rooms: Map<string, unknown> }).rooms.clear();
    (store as unknown as { players: Map<string, unknown[]> }).players.clear();
  });

  it('deletes a player and returns success', async () => {
    const roomId = await createRoom(store);
    const player = await store.addPlayer(roomId, samplePlayer);

    const response = await DELETE(
      deleteRequest(roomId, player.id),
      makeParams(roomId)
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.success).toBe(true);

    const players = await store.getPlayers(roomId);
    expect(players).toHaveLength(0);
  });

  it('returns 400 when playerId is missing', async () => {
    const roomId = await createRoom(store);

    const response = await DELETE(
      deleteRequest(roomId),
      makeParams(roomId)
    );
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error.code).toBe('MISSING_PLAYER_ID');
  });
});
