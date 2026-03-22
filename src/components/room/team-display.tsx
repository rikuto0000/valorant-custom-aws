"use client";

import { useState, useCallback, type DragEvent } from "react";
import Image from "next/image";
import type { Player, TeamResult, RankMode } from "@/lib/types";
import { getRankByValue } from "@/lib/constants/ranks";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TeamDisplayProps {
  teamResult: TeamResult;
  rankMode: RankMode;
  onRegenerate?: () => void;
  onReset?: () => void;
  onRankModeChange?: (mode: RankMode) => void;
  onTeamResultChange?: (result: TeamResult) => void;
}

function TeamPlayerCard({
  player,
  rankMode,
  onDragStart,
}: {
  player: Player;
  rankMode: RankMode;
  onDragStart: (e: DragEvent, playerId: string) => void;
}) {
  const value = rankMode === "peak" ? player.peak_rank_value : player.rank_value;
  const rankInfo = getRankByValue(value);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, player.id)}
      className="flex items-center gap-2 rounded-md border border-val-border bg-val-dark p-2 cursor-grab active:cursor-grabbing hover:border-val-light-dim transition-colors"
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: rankInfo?.color ?? "var(--val-border)",
      }}
    >
      {rankInfo && (
        <Image
          src={rankInfo.badgeImage}
          alt={rankInfo.labelJa}
          width={28}
          height={28}
          className="object-contain flex-shrink-0"
          unoptimized
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-val-light truncate">
          {player.display_name}
        </p>
      </div>
      <Badge variant="outline" className="text-[10px] flex-shrink-0">
        {rankInfo?.labelJa ?? value}
      </Badge>
    </div>
  );
}

function TeamColumn({
  title,
  team,
  players,
  total,
  rankMode,
  colorClass,
  onDragStart,
  onDrop,
  dragOver,
  onDragOver,
  onDragLeave,
}: {
  title: string;
  team: "A" | "B";
  players: Player[];
  total: number;
  rankMode: RankMode;
  colorClass: string;
  onDragStart: (e: DragEvent, playerId: string) => void;
  onDrop: (e: DragEvent, targetTeam: "A" | "B") => void;
  dragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
}) {
  return (
    <Card
      className={cn("flex-1 transition-colors", dragOver && "ring-2 ring-val-red/50")}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, team)}
    >
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className={cn("text-base text-center", colorClass)}>
          {title}
        </CardTitle>
        <p className="text-center text-sm text-val-light-muted">
          合計: <span className="font-bold text-val-light">{total}</span>
        </p>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {players.map((player) => (
          <TeamPlayerCard
            key={player.id}
            player={player}
            rankMode={rankMode}
            onDragStart={onDragStart}
          />
        ))}
        {players.length === 0 && (
          <p className="text-center text-xs text-val-light-dim py-4">
            プレイヤーなし
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamDisplay({
  teamResult,
  rankMode,
  onRegenerate,
  onReset,
  onRankModeChange,
  onTeamResultChange,
}: TeamDisplayProps) {
  const [dragOverTeam, setDragOverTeam] = useState<"A" | "B" | null>(null);

  const handleDragStart = useCallback((e: DragEvent, playerId: string) => {
    e.dataTransfer.setData("text/plain", playerId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: DragEvent, team: "A" | "B") => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTeam(team);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTeam(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetTeam: "A" | "B") => {
      e.preventDefault();
      setDragOverTeam(null);
      const playerId = e.dataTransfer.getData("text/plain");
      if (!playerId || !onTeamResultChange) return;

      // どちらのチームにいるか探す
      const inA = teamResult.teamA.find((p) => p.id === playerId);
      const inB = teamResult.teamB.find((p) => p.id === playerId);

      if (inA && targetTeam === "B") {
        const newA = teamResult.teamA.filter((p) => p.id !== playerId);
        const newB = [...teamResult.teamB, inA];
        const key = rankMode === "peak" ? "peak_rank_value" : "rank_value";
        const aTotal = newA.reduce((s, p) => s + p[key], 0);
        const bTotal = newB.reduce((s, p) => s + p[key], 0);
        onTeamResultChange({
          teamA: newA,
          teamB: newB,
          teamATotal: aTotal,
          teamBTotal: bTotal,
          difference: Math.abs(aTotal - bTotal),
        });
      } else if (inB && targetTeam === "A") {
        const newB = teamResult.teamB.filter((p) => p.id !== playerId);
        const newA = [...teamResult.teamA, inB];
        const key = rankMode === "peak" ? "peak_rank_value" : "rank_value";
        const aTotal = newA.reduce((s, p) => s + p[key], 0);
        const bTotal = newB.reduce((s, p) => s + p[key], 0);
        onTeamResultChange({
          teamA: newA,
          teamB: newB,
          teamATotal: aTotal,
          teamBTotal: bTotal,
          difference: Math.abs(aTotal - bTotal),
        });
      }
    },
    [teamResult, rankMode, onTeamResultChange]
  );

  return (
    <div className="space-y-4">
      {/* ランクモード切替 */}
      {onRankModeChange && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={rankMode === "current" ? "default" : "outline"}
            size="sm"
            onClick={() => onRankModeChange("current")}
          >
            現在ランク
          </Button>
          <Button
            variant={rankMode === "peak" ? "default" : "outline"}
            size="sm"
            onClick={() => onRankModeChange("peak")}
          >
            最高ランク
          </Button>
        </div>
      )}

      {/* チーム表示 */}
      <div className="flex gap-3 items-start">
        <TeamColumn
          title="チーム A"
          team="A"
          players={teamResult.teamA}
          total={teamResult.teamATotal}
          rankMode={rankMode}
          colorClass="text-blue-400"
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          dragOver={dragOverTeam === "A"}
          onDragOver={(e) => handleDragOver(e, "A")}
          onDragLeave={handleDragLeave}
        />

        {/* 差分表示 */}
        <div className="flex flex-col items-center justify-center pt-16 min-w-[60px]">
          <span className="text-xs text-val-light-dim">差分</span>
          <span
            className={cn(
              "text-xl font-bold",
              teamResult.difference === 0
                ? "text-green-400"
                : teamResult.difference <= 3
                  ? "text-yellow-400"
                  : "text-val-red"
            )}
          >
            {teamResult.difference}
          </span>
          {onTeamResultChange && (
            <p className="text-[10px] text-val-light-dim mt-2 text-center">
              ドラッグで入替
            </p>
          )}
        </div>

        <TeamColumn
          title="チーム B"
          team="B"
          players={teamResult.teamB}
          total={teamResult.teamBTotal}
          rankMode={rankMode}
          colorClass="text-red-400"
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          dragOver={dragOverTeam === "B"}
          onDragOver={(e) => handleDragOver(e, "B")}
          onDragLeave={handleDragLeave}
        />
      </div>

      {/* アクションボタン */}
      <div className="flex items-center justify-center gap-3">
        {onRegenerate && (
          <Button variant="outline" size="sm" onClick={onRegenerate}>
            再生成
          </Button>
        )}
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset}>
            リセット
          </Button>
        )}
      </div>
    </div>
  );
}
