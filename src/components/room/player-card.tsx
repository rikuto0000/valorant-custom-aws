"use client";

import Image from "next/image";
import type { Player } from "@/lib/types";
import { getRankByValue } from "@/lib/constants/ranks";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

interface PlayerCardProps {
  player: Player;
  onDelete?: (playerId: string) => void;
}

export function PlayerCard({ player, onDelete }: PlayerCardProps) {
  const currentRank = getRankByValue(player.rank_value);
  const peakRank = getRankByValue(player.peak_rank_value);

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 rounded-lg border border-val-border p-3 transition-colors",
        "bg-val-dark-alt"
      )}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: currentRank?.color ?? "var(--val-border)",
      }}
    >
      {/* ランクバッジ */}
      {currentRank && (
        <div className="flex-shrink-0">
          <Image
            src={currentRank.badgeImage}
            alt={currentRank.labelJa}
            width={40}
            height={40}
            className="object-contain"
            unoptimized
          />
        </div>
      )}

      {/* プレイヤー情報 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-val-light truncate">
          {player.display_name}
        </p>
        <div className="flex items-center gap-2 text-xs text-val-light-muted">
          <span>{currentRank?.labelJa ?? player.rank}</span>
          {peakRank && peakRank.value !== currentRank?.value && (
            <span className="text-val-light-dim">
              (最高: {peakRank.labelJa})
            </span>
          )}
        </div>
      </div>

      {/* 削除ボタン */}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="flex-shrink-0 h-7 w-7 p-0 text-val-light-dim hover:text-val-red"
          onClick={() => onDelete(player.id)}
          aria-label={`${player.display_name}を削除`}
        >
          ✕
        </Button>
      )}
    </div>
  );
}
