import type { Room, Player, PlayerInput, RoomStatus, RankMode, Team } from '../types';

export interface IDataStore {
  createRoom(): Promise<Room>;
  getRoom(roomId: string): Promise<Room | null>;
  updateRoomStatus(roomId: string, status: RoomStatus): Promise<void>;
  updateRoomRankMode(roomId: string, rankMode: RankMode): Promise<void>;
  deleteRoom(roomId: string): Promise<void>;

  addPlayer(roomId: string, player: PlayerInput): Promise<Player>;
  getPlayers(roomId: string): Promise<Player[]>;
  deletePlayer(roomId: string, playerId: string): Promise<void>;
  updatePlayerTeam(roomId: string, playerId: string, team: Team): Promise<void>;
  resetTeams(roomId: string): Promise<void>;

  cleanupExpiredRooms(): Promise<void>;
}
