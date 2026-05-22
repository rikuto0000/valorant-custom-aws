import type { RankMode, RoomStatus, RoomVoteKind, Team } from '@/lib/types';

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          status: RoomStatus;
          rank_mode: RankMode;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          status?: RoomStatus;
          rank_mode?: RankMode;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          status?: RoomStatus;
          rank_mode?: RankMode;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          room_id: string;
          riot_id: string;
          display_name: string;
          rank: string;
          rank_value: number;
          peak_rank: string;
          peak_rank_value: number;
          team: Team;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          riot_id: string;
          display_name: string;
          rank: string;
          rank_value: number;
          peak_rank: string;
          peak_rank_value: number;
          team?: Team;
          created_at?: string;
        };
        Update: {
          riot_id?: string;
          display_name?: string;
          rank?: string;
          rank_value?: number;
          peak_rank?: string;
          peak_rank_value?: number;
          team?: Team;
        };
        Relationships: [
          {
            foreignKeyName: 'players_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      room_votes: {
        Row: {
          room_id: string;
          kind: RoomVoteKind;
          player_id: string;
          choices: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          room_id: string;
          kind: RoomVoteKind;
          player_id: string;
          choices: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          choices?: string[];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'room_votes_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_votes_player_id_fkey';
            columns: ['player_id'];
            referencedRelation: 'players';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
