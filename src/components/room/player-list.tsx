"use client";

import type { Player } from "@/lib/types";
import { PlayerCard } from "./player-card";

interface PlayerListProps {
  players: Player[];
  onDeletePlayer?: (playerId: string) => void;
}

export function PlayerList({ players, onDeletePlayer }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="text-center py-8 text-val-light-dim text-sm">
        プレイヤーがまだ追加されていません
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-val-light-muted mb-2">
        <span>プレイヤー一覧</span>
        <span>{players.length}人</span>
      </div>
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          onDelete={onDeletePlayer}
        />
      ))}
    </div>
  );
}
