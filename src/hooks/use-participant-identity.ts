"use client";

import { useCallback, useState } from "react";
import type { Player } from "@/lib/types";

const PROFILE_KEY = "valorant-participant-profile";
const ROOM_PLAYER_KEY_PREFIX = "valorant-room-player:";

interface ParticipantProfile {
  riotId: string;
  displayName: string;
}

function getRoomPlayerKey(roomId: string): string {
  return `${ROOM_PLAYER_KEY_PREFIX}${roomId}`;
}

function readProfile(): ParticipantProfile | null {
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ParticipantProfile) : null;
  } catch {
    return null;
  }
}

function readRoomPlayerId(roomId: string): string | null {
  try {
    return window.localStorage.getItem(getRoomPlayerKey(roomId));
  } catch {
    return null;
  }
}

export function useParticipantIdentity(roomId: string) {
  const [profile, setProfile] = useState<ParticipantProfile | null>(() => {
    if (typeof window === "undefined") return null;
    return readProfile();
  });
  const [playerId, setPlayerId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return readRoomPlayerId(roomId);
  });

  const rememberPlayer = useCallback(
    (player: Player) => {
      const nextProfile = {
        riotId: player.riot_id,
        displayName: player.display_name,
      };
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      window.localStorage.setItem(getRoomPlayerKey(roomId), player.id);
      setProfile(nextProfile);
      setPlayerId(player.id);
    },
    [roomId],
  );

  const forgetRoomPlayer = useCallback(() => {
    window.localStorage.removeItem(getRoomPlayerKey(roomId));
    setPlayerId(null);
  }, [roomId]);

  return {
    profile,
    playerId,
    rememberPlayer,
    forgetRoomPlayer,
  };
}
