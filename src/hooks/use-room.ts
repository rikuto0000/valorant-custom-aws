"use client";

import { useState, useCallback } from "react";
import type {
  Room,
  Player,
  PlayerInput,
  Team,
  RankMode,
  SuccessResponse,
  ErrorResponse,
} from "@/lib/types";

interface UseRoomState {
  room: Room | null;
  players: Player[];
  loading: boolean;
  error: string | null;
}

interface UseRoomReturn extends UseRoomState {
  fetchRoom: (roomId: string) => Promise<void>;
  addPlayer: (roomId: string, playerInput: PlayerInput) => Promise<Player | null>;
  deletePlayer: (roomId: string, playerId: string) => Promise<boolean>;
  updateTeam: (roomId: string, playerId: string, team: Team) => Promise<boolean>;
  updateRankMode: (roomId: string, rankMode: RankMode) => Promise<boolean>;
  resetTeams: (roomId: string) => Promise<boolean>;
}

export function useRoom(initialRoom?: Room, initialPlayers?: Player[]): UseRoomReturn {
  const [room, setRoom] = useState<Room | null>(initialRoom ?? null);
  const [players, setPlayers] = useState<Player[]>(initialPlayers ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(async (roomId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`);
      const json = await res.json();
      if (!res.ok) {
        const err = json as ErrorResponse;
        setError(err.error.message);
        return;
      }
      const data = (json as SuccessResponse<{ room: Room; players: Player[] }>).data;
      setRoom(data.room);
      setPlayers(data.players);
    } catch {
      setError("ルーム情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  const addPlayer = useCallback(async (roomId: string, playerInput: PlayerInput): Promise<Player | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playerInput),
      });
      const json = await res.json();
      if (!res.ok) {
        const err = json as ErrorResponse;
        setError(err.error.message);
        return null;
      }
      const player = (json as SuccessResponse<Player>).data;
      // Re-fetch to get updated list
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      if (roomRes.ok) {
        const roomJson = await roomRes.json();
        const data = (roomJson as SuccessResponse<{ room: Room; players: Player[] }>).data;
        setRoom(data.room);
        setPlayers(data.players);
      }
      return player;
    } catch {
      setError("プレイヤーの追加に失敗しました");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePlayer = useCallback(async (roomId: string, playerId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}?playerId=${playerId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json as ErrorResponse;
        setError(err.error.message);
        return false;
      }
      // Re-fetch to get updated list
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      if (roomRes.ok) {
        const roomJson = await roomRes.json();
        const data = (roomJson as SuccessResponse<{ room: Room; players: Player[] }>).data;
        setRoom(data.room);
        setPlayers(data.players);
      }
      return true;
    } catch {
      setError("プレイヤーの削除に失敗しました");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTeam = useCallback(async (roomId: string, playerId: string, team: Team): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateTeam", playerId, team }),
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json as ErrorResponse;
        setError(err.error.message);
        return false;
      }
      // Re-fetch
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      if (roomRes.ok) {
        const roomJson = await roomRes.json();
        const data = (roomJson as SuccessResponse<{ room: Room; players: Player[] }>).data;
        setRoom(data.room);
        setPlayers(data.players);
      }
      return true;
    } catch {
      setError("チームの更新に失敗しました");
      return false;
    }
  }, []);

  const updateRankMode = useCallback(async (roomId: string, rankMode: RankMode): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateRankMode", rankMode }),
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json as ErrorResponse;
        setError(err.error.message);
        return false;
      }
      // Re-fetch
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      if (roomRes.ok) {
        const roomJson = await roomRes.json();
        const data = (roomJson as SuccessResponse<{ room: Room; players: Player[] }>).data;
        setRoom(data.room);
        setPlayers(data.players);
      }
      return true;
    } catch {
      setError("ランクモードの更新に失敗しました");
      return false;
    }
  }, []);

  const resetTeams = useCallback(async (roomId: string): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetTeams" }),
      });
      if (!res.ok) {
        const json = await res.json();
        const err = json as ErrorResponse;
        setError(err.error.message);
        return false;
      }
      // Re-fetch
      const roomRes = await fetch(`/api/rooms/${roomId}`);
      if (roomRes.ok) {
        const roomJson = await roomRes.json();
        const data = (roomJson as SuccessResponse<{ room: Room; players: Player[] }>).data;
        setRoom(data.room);
        setPlayers(data.players);
      }
      return true;
    } catch {
      setError("チームリセットに失敗しました");
      return false;
    }
  }, []);

  return {
    room,
    players,
    loading,
    error,
    fetchRoom,
    addPlayer,
    deletePlayer,
    updateTeam,
    updateRankMode,
    resetTeams,
  };
}
