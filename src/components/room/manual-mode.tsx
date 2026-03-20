"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { Player, RankMode, TeamResult } from "@/lib/types";
import { buildTeamResult } from "@/lib/algorithms/team-allocator";
import { getRankByValue } from "@/lib/constants/ranks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface ManualModeProps {
  players: Player[];
  rankMode: RankMode;
  onComplete: (result: TeamResult) => void;
}

type Column = "unassigned" | "A" | "B";

export function ManualMode({ players, rankMode, onComplete }: ManualModeProps) {
  // Track assignment: playerId → column
  const [assignments, setAssignments] = useState<Record<string, Column>>(() => {
    const init: Record<string, Column> = {};
    for (const p of players) {
      init[p.id] = "unassigned";
    }
    return init;
  });

  const [draggedId, setDraggedId] = useState<string | null>(null);

  const getPlayersInColumn = useCallback(
    (col: Column) => players.filter((p) => assignments[p.id] === col),
    [players, assignments]
  );

  const unassignedPlayers = getPlayersInColumn("unassigned");
  const teamAPlayers = getPlayersInColumn("A");
  const teamBPlayers = getPlayersInColumn("B");

  const key = rankMode === "peak" ? "peak_rank_value" : "rank_value";
  const teamATotal = teamAPlayers.reduce((sum, p) => sum + p[key], 0);
  const teamBTotal = teamBPlayers.reduce((sum, p) => sum + p[key], 0);
  const difference = Math.abs(teamATotal - teamBTotal);

  // Click to cycle: unassigned → A → B → unassigned
  const handleClick = useCallback((playerId: string) => {
    setAssignments((prev) => {
      const current = prev[playerId];
      let next: Column;
      if (current === "unassigned") next = "A";
      else if (current === "A") next = "B";
      else next = "unassigned";
      return { ...prev, [playerId]: next };
    });
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((playerId: string) => {
    setDraggedId(playerId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (col: Column) => {
      if (!draggedId) return;
      setAssignments((prev) => ({ ...prev, [draggedId]: col }));
      setDraggedId(null);
    },
    [draggedId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
  }, []);

  const canConfirm = unassignedPlayers.length === 0 && teamAPlayers.length > 0 && teamBPlayers.length > 0;

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    onComplete(buildTeamResult(teamAPlayers, teamBPlayers, rankMode));
  }, [canConfirm, teamAPlayers, teamBPlayers, rankMode, onComplete]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-val-light-muted text-center">
        クリックでチーム移動（未割当→A→B→未割当）、またはドラッグ＆ドロップ
      </p>

      {/* リアルタイム合計・差分 */}
      <div className="flex items-center justify-center gap-4 text-sm">
        <span className="text-blue-400">
          A: <span className="font-bold">{teamATotal}</span>
        </span>
        <span
          className={cn(
            "font-bold",
            difference === 0
              ? "text-green-400"
              : difference <= 3
                ? "text-yellow-400"
                : "text-val-red"
          )}
        >
          差分 {difference}
        </span>
        <span className="text-red-400">
          B: <span className="font-bold">{teamBTotal}</span>
        </span>
      </div>

      {/* 3カラムレイアウト */}
      <div className="grid grid-cols-3 gap-2">
        <ManualColumn
          title="未割当"
          players={unassignedPlayers}
          column="unassigned"
          colorClass="text-val-light-muted"
          rankMode={rankMode}
          onPlayerClick={handleClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggedId={draggedId}
        />
        <ManualColumn
          title="チーム A"
          players={teamAPlayers}
          column="A"
          colorClass="text-blue-400"
          rankMode={rankMode}
          onPlayerClick={handleClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggedId={draggedId}
        />
        <ManualColumn
          title="チーム B"
          players={teamBPlayers}
          column="B"
          colorClass="text-red-400"
          rankMode={rankMode}
          onPlayerClick={handleClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggedId={draggedId}
        />
      </div>

      <div className="flex justify-center">
        <Button onClick={handleConfirm} disabled={!canConfirm}>
          確定
        </Button>
      </div>
    </div>
  );
}


function ManualColumn({
  title,
  players,
  column,
  colorClass,
  rankMode,
  onPlayerClick,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  draggedId,
}: {
  title: string;
  players: Player[];
  column: Column;
  colorClass: string;
  rankMode: RankMode;
  onPlayerClick: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (col: Column) => void;
  onDragEnd: () => void;
  draggedId: string | null;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-val-border bg-val-dark-alt p-2 min-h-[120px] transition-colors",
        draggedId && "border-dashed border-val-border-hover"
      )}
      onDragOver={onDragOver}
      onDrop={() => onDrop(column)}
    >
      <p className={cn("text-xs font-medium mb-2 text-center", colorClass)}>
        {title} ({players.length})
      </p>
      <div className="space-y-1">
        {players.map((player) => (
          <ManualPlayerItem
            key={player.id}
            player={player}
            rankMode={rankMode}
            onClick={() => onPlayerClick(player.id)}
            onDragStart={() => onDragStart(player.id)}
            onDragEnd={onDragEnd}
            isDragging={draggedId === player.id}
          />
        ))}
        {players.length === 0 && (
          <p className="text-[10px] text-val-light-dim text-center py-4">
            ここにドロップ
          </p>
        )}
      </div>
    </div>
  );
}

function ManualPlayerItem({
  player,
  rankMode,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  player: Player;
  rankMode: RankMode;
  onClick: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const value = rankMode === "peak" ? player.peak_rank_value : player.rank_value;
  const rankInfo = getRankByValue(value);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded border border-val-border bg-val-dark p-1.5 cursor-pointer select-none transition-opacity",
        isDragging && "opacity-40"
      )}
      style={{
        borderLeftWidth: "2px",
        borderLeftColor: rankInfo?.color ?? "var(--val-border)",
      }}
    >
      {rankInfo && (
        <Image
          src={rankInfo.badgeImage}
          alt={rankInfo.labelJa}
          width={20}
          height={20}
          className="object-contain flex-shrink-0"
          unoptimized
        />
      )}
      <span className="text-[11px] text-val-light truncate flex-1">
        {player.display_name}
      </span>
      <Badge variant="outline" className="text-[9px] flex-shrink-0">
        {value}
      </Badge>
    </div>
  );
}
