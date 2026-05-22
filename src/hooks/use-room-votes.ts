"use client";

import { useCallback, useEffect, useState } from "react";
import type { ErrorResponse, RoomVote, RoomVoteKind, SuccessResponse } from "@/lib/types";

export function useRoomVotes(roomId: string, kind: RoomVoteKind) {
  const [votes, setVotes] = useState<RoomVote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/votes?kind=${kind}`);
      const json = await res.json();
      if (!res.ok) {
        setError((json as ErrorResponse).error.message);
        return;
      }
      setVotes((json as SuccessResponse<RoomVote[]>).data);
    } catch {
      setError("投票情報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [kind, roomId]);

  useEffect(() => {
    void fetchVotes();
    const timer = setInterval(() => {
      void fetchVotes();
    }, 2000);

    return () => clearInterval(timer);
  }, [fetchVotes]);

  const submitVote = useCallback(
    async (playerId: string, choices: string[]): Promise<boolean> => {
      setError(null);
      try {
        const res = await fetch(`/api/rooms/${roomId}/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, playerId, choices }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError((json as ErrorResponse).error.message);
          return false;
        }
        await fetchVotes();
        return true;
      } catch {
        setError("投票の保存に失敗しました");
        return false;
      }
    },
    [fetchVotes, kind, roomId],
  );

  const clearVotes = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${roomId}/votes?kind=${kind}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setError((json as ErrorResponse).error.message);
        return false;
      }
      await fetchVotes();
      return true;
    } catch {
      setError("投票のリセットに失敗しました");
      return false;
    }
  }, [fetchVotes, kind, roomId]);

  return {
    votes,
    loading,
    error,
    fetchVotes,
    submitVote,
    clearVotes,
  };
}
