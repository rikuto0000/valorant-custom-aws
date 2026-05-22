import { v4 as uuidv4 } from 'uuid';
import type { Player, PlayerInput, RankMode, Room, RoomStatus, Team, RoomVote, RoomVoteKind } from '../types';
import { getSupabaseAdmin } from '../supabase/server';
import type { IDataStore } from './interface';

const TTL_SECONDS = 86400; // 24 hours

function expiresAtFrom(date: Date): string {
  return new Date(date.getTime() + TTL_SECONDS * 1000).toISOString();
}

function raiseSupabaseError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export class SupabaseStore implements IDataStore {
  async createRoom(): Promise<Room> {
    const now = new Date();
    const room: Room = {
      id: uuidv4(),
      status: 'waiting',
      rank_mode: 'current',
      created_at: now.toISOString(),
    };

    const { error } = await getSupabaseAdmin()
      .from('rooms')
      .insert({
        ...room,
        expires_at: expiresAtFrom(now),
      });

    raiseSupabaseError(error);
    return room;
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const { data, error } = await getSupabaseAdmin()
      .from('rooms')
      .select('id, status, rank_mode, created_at')
      .eq('id', roomId)
      .maybeSingle();

    raiseSupabaseError(error);
    return data;
  }

  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('rooms')
      .update({ status })
      .eq('id', roomId);

    raiseSupabaseError(error);
  }

  async updateRoomRankMode(roomId: string, rankMode: RankMode): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('rooms')
      .update({ rank_mode: rankMode })
      .eq('id', roomId);

    raiseSupabaseError(error);
  }

  async deleteRoom(roomId: string): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('rooms')
      .delete()
      .eq('id', roomId);

    raiseSupabaseError(error);
  }

  async addPlayer(roomId: string, player: PlayerInput): Promise<Player> {
    const existing = await this.getPlayers(roomId);
    const duplicate = existing.find((p) => p.riot_id === player.riot_id);
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

    const { data, error } = await getSupabaseAdmin()
      .from('players')
      .insert(newPlayer)
      .select()
      .single();

    raiseSupabaseError(error);
    if (!data) {
      throw new Error('プレイヤーの追加に失敗しました');
    }

    return data;
  }

  async getPlayers(roomId: string): Promise<Player[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('players')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    raiseSupabaseError(error);
    return data ?? [];
  }

  async deletePlayer(roomId: string, playerId: string): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('players')
      .delete()
      .eq('room_id', roomId)
      .eq('id', playerId);

    raiseSupabaseError(error);
  }

  async updatePlayerTeam(roomId: string, playerId: string, team: Team): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('players')
      .update({ team })
      .eq('room_id', roomId)
      .eq('id', playerId);

    raiseSupabaseError(error);
  }

  async resetTeams(roomId: string): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('players')
      .update({ team: null })
      .eq('room_id', roomId);

    raiseSupabaseError(error);
  }

  async getRoomVotes(roomId: string, kind: RoomVoteKind): Promise<RoomVote[]> {
    const { data, error } = await getSupabaseAdmin()
      .from('room_votes')
      .select('*')
      .eq('room_id', roomId)
      .eq('kind', kind)
      .order('created_at', { ascending: true });

    raiseSupabaseError(error);
    return data ?? [];
  }

  async upsertRoomVote(
    roomId: string,
    kind: RoomVoteKind,
    playerId: string,
    choices: string[],
  ): Promise<RoomVote> {
    const { data, error } = await getSupabaseAdmin()
      .from('room_votes')
      .upsert(
        {
          room_id: roomId,
          kind,
          player_id: playerId,
          choices,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'room_id,kind,player_id' },
      )
      .select()
      .single();

    raiseSupabaseError(error);
    if (!data) {
      throw new Error('投票の保存に失敗しました');
    }
    return data;
  }

  async clearRoomVotes(roomId: string, kind: RoomVoteKind): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('room_votes')
      .delete()
      .eq('room_id', roomId)
      .eq('kind', kind);

    raiseSupabaseError(error);
  }

  async cleanupExpiredRooms(): Promise<void> {
    const { error } = await getSupabaseAdmin()
      .from('rooms')
      .delete()
      .lt('expires_at', new Date().toISOString());

    raiseSupabaseError(error);
  }
}
