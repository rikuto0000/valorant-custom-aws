"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { Player } from "@/lib/types";

const PROFILE_KEY = "valorant-participant-profile";
const ROOM_PLAYER_KEY_PREFIX = "valorant-room-player:";
const ROOM_HOST_KEY_PREFIX = "valorant-room-host:";
const IDENTITY_CHANGE_EVENT = "valorant-identity-change";

interface ParticipantProfile {
  riotId: string;
  displayName: string;
}

function getRoomPlayerKey(roomId: string): string {
  return `${ROOM_PLAYER_KEY_PREFIX}${roomId}`;
}

function getRoomHostKey(roomId: string): string {
  return `${ROOM_HOST_KEY_PREFIX}${roomId}`;
}

function readProfileRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PROFILE_KEY);
  } catch {
    return null;
  }
}

function readRoomPlayerId(roomId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(getRoomPlayerKey(roomId));
  } catch {
    return null;
  }
}

function readRoomHost(roomId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(getRoomHostKey(roomId)) === "1";
  } catch {
    return false;
  }
}

function subscribeIdentity(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(IDENTITY_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(IDENTITY_CHANGE_EVENT, callback);
  };
}

function notifyIdentityChanged() {
  window.dispatchEvent(new Event(IDENTITY_CHANGE_EVENT));
}

export function rememberRoomHost(roomId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getRoomHostKey(roomId), "1");
    notifyIdentityChanged();
  } catch {
    // Ignore storage failures; the room still works as a participant.
  }
}

export function useParticipantIdentity(roomId: string) {
  const getPlayerSnapshot = useCallback(() => readRoomPlayerId(roomId), [roomId]);
  const getHostSnapshot = useCallback(() => readRoomHost(roomId), [roomId]);
  const profileRaw = useSyncExternalStore(subscribeIdentity, readProfileRaw, () => null);
  const playerId = useSyncExternalStore(subscribeIdentity, getPlayerSnapshot, () => null);
  const isHost = useSyncExternalStore(subscribeIdentity, getHostSnapshot, () => false);
  const profile = useMemo(() => {
    if (!profileRaw) return null;
    try {
      return JSON.parse(profileRaw) as ParticipantProfile;
    } catch {
      return null;
    }
  }, [profileRaw]);

  const rememberPlayer = useCallback(
    (player: Player) => {
      const nextProfile = {
        riotId: player.riot_id,
        displayName: player.display_name,
      };
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(nextProfile));
      window.localStorage.setItem(getRoomPlayerKey(roomId), player.id);
      notifyIdentityChanged();
    },
    [roomId],
  );

  const forgetRoomPlayer = useCallback(() => {
    window.localStorage.removeItem(getRoomPlayerKey(roomId));
    notifyIdentityChanged();
  }, [roomId]);

  const markAsHost = useCallback(() => {
    rememberRoomHost(roomId);
  }, [roomId]);

  return {
    profile,
    playerId,
    isHost,
    rememberPlayer,
    forgetRoomPlayer,
    markAsHost,
  };
}
