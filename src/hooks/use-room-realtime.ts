"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export function useRoomRealtime(
  roomId: string | null,
  onRefresh?: () => void,
): void {
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !roomId) {
      return;
    }

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) return;

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        onRefresh?.();
      }, 100);
    };

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        scheduleRefresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_votes',
          filter: `room_id=eq.${roomId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [roomId, onRefresh]);
}
