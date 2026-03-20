"use client";

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
}

function TeamPlayerCard({ player, rankMode }: { player: Player; rankMode: RankMode }) {
  const value = rankMode === "peak" ? player.peak_rank_value : player.rank_value;
  const rankInfo = getRankByValue(value);

  return (
    <div
      className="flex items-center gap-2 rounded-md border border-val-border bg-val-dark p-2"
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
  players,
  total,
  rankMode,
  colorClass,
}: {
  title: string;
  players: Player[];
  total: number;
  rankMode: RankMode;
  colorClass: string;
}) {
  return (
    <Card className="flex-1">
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
          <TeamPlayerCard key={player.id} player={player} rankMode={rankMode} />
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
}: TeamDisplayProps) {
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
          players={teamResult.teamA}
          total={teamResult.teamATotal}
          rankMode={rankMode}
          colorClass="text-blue-400"
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
        </div>

        <TeamColumn
          title="チーム B"
          players={teamResult.teamB}
          total={teamResult.teamBTotal}
          rankMode={rankMode}
          colorClass="text-red-400"
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
