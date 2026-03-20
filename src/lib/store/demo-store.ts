import { v4 as uuidv4 } from 'uuid';
import type { Room, Player, PlayerInput, RoomStatus, RankMode, Team } from '../types';
import type { IDataStore } from './interface';

const GLOBAL_KEY = '__valorant_demo_store__';

declare global {
  // eslint-disable-next-line no-var
  var __valorant_demo_store__: DemoStore | undefined;
}

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export class DemoStore implements IDataStore {
  private rooms: Map<string, Room> = new Map();
  private players: Map<string, Player[]> = new Map();

  static getInstance(): DemoStore {
    if (!globalThis[GLOBAL_KEY]) {
      globalThis[GLOBAL_KEY] = new DemoStore();
    }
    return globalThis[GLOBAL_KEY]!;
  }

  async createRoom(): Promise<Room> {
    const room: Room = {
      id: uuidv4(),
      status: 'waiting',
      rank_mode: 'current',
      created_at: new Date().toISOString(),
    };
    this.rooms.set(room.id, room);
    this.players.set(room.id, []);
    return room;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    return this.rooms.get(roomId) ?? null;
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.status = status;
    }
  }

  async updateRoomRankMode(roomId: string, rankMode: RankMode): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.rank_mode = rankMode;
    }
  }

  async deleteRoom(roomId: string): Promise<void> {
    this.rooms.delete(roomId);
    this.players.delete(roomId);
  }

  async addPlayer(roomId: string, player: PlayerInput): Promise<Player> {
    const roomPlayers = this.players.get(roomId) ?? [];

    const duplicate = roomPlayers.find((p) => p.riot_id === player.riot_id);
    if (duplicate) {
      throw new Error(`プレイヤー ${player.riot_id} は既にこのルームに登録されています`);
    }

    const newPlayer: Player = {
      id: uuidv4(),
      room_id: roomId,
      ...player,
      team: null,
      created_at: new Date().toISOString(),
    };

    roomPlayers.push(newPlayer);
    this.players.set(roomId, roomPlayers);
    return newPlayer;
  }

  async getPlayers(roomId: string): Promise<Player[]> {
    return this.players.get(roomId) ?? [];
  }

  async deletePlayer(roomId: string, playerId: string): Promise<void> {
    const roomPlayers = this.players.get(roomId);
    if (roomPlayers) {
      this.players.set(
        roomId,
        roomPlayers.filter((p) => p.id !== playerId),
      );
    }
  }

  async updatePlayerTeam(roomId: string, playerId: string, team: Team): Promise<void> {
    const roomPlayers = this.players.get(roomId);
    if (roomPlayers) {
      const player = roomPlayers.find((p) => p.id === playerId);
      if (player) {
        player.team = team;
      }
    }
  }

  async resetTeams(roomId: string): Promise<void> {
    const roomPlayers = this.players.get(roomId);
    if (roomPlayers) {
      for (const player of roomPlayers) {
        player.team = null;
      }
    }
  }

  async cleanupExpiredRooms(): Promise<void> {
    const now = Date.now();
    for (const [roomId, room] of this.rooms) {
      const createdAt = new Date(room.created_at).getTime();
      if (now - createdAt > ROOM_TTL_MS) {
        this.rooms.delete(roomId);
        this.players.delete(roomId);
      }
    }
  }
}
