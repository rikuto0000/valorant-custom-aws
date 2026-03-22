"use client";

import { useState, useCallback } from "react";
import type { Player, RankMode, TeamResult } from "@/lib/types";
import { autoBalance, randomSplit } from "@/lib/algorithms/team-allocator";
import { Button } from "@/components/ui/button";
import { TeamDisplay } from "./team-display";
import { DraftMode } from "@/components/room/draft-mode";
import { ManualMode } from "@/components/room/manual-mode";
import { cn } from "@/lib/cn";

type AllocationMode = "auto" | "random" | "draft" | "manual";

interface AllocationPanelProps {
  players: Player[];
  rankMode: RankMode;
  onRankModeChange?: (mode: RankMode) => void;
  onReset?: () => void;
  onTeamResultChange?: (result: TeamResult) => void;
}

const MODES: { value: AllocationMode; label: string }[] = [
  { value: "auto", label: "自動バランス" },
  { value: "random", label: "ランダム" },
  { value: "draft", label: "ドラフト" },
  { value: "manual", label: "手動" },
];

export function AllocationPanel({
  players,
  rankMode,
  onRankModeChange,
  onReset,
  onTeamResultChange,
}: AllocationPanelProps) {
  const [mode, setMode] = useState<AllocationMode>("auto");
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);

  const handleAllocate = useCallback(() => {
    if (players.length < 2) return;
    let result: TeamResult | null = null;
    if (mode === "auto") {
      result = autoBalance(players, rankMode);
    } else if (mode === "random") {
      result = randomSplit(players);
    }
    if (result) {
      setTeamResult(result);
      onTeamResultChange?.(result);
    }
  }, [players, rankMode, mode, onTeamResultChange]);

  const handleRegenerate = useCallback(() => {
    handleAllocate();
  }, [handleAllocate]);

  const handleReset = useCallback(() => {
    setTeamResult(null);
    onReset?.();
  }, [onReset]);

  const handleDraftComplete = useCallback((result: TeamResult) => {
    setTeamResult(result);
    onTeamResultChange?.(result);
  }, [onTeamResultChange]);

  const handleManualComplete = useCallback((result: TeamResult) => {
    setTeamResult(result);
    onTeamResultChange?.(result);
  }, [onTeamResultChange]);

  const handleTeamResultChange = useCallback((result: TeamResult) => {
    setTeamResult(result);
    onTeamResultChange?.(result);
  }, [onTeamResultChange]);

  // ドラフト・手動モードで結果未確定の場合は専用UIを表示
  if (mode === "draft" && !teamResult) {
    return (
      <div className="space-y-4">
        <ModeSelector mode={mode} onModeChange={(m) => { setMode(m); setTeamResult(null); }} />
        <DraftMode
          players={players}
          rankMode={rankMode}
          onComplete={handleDraftComplete}
        />
      </div>
    );
  }

  if (mode === "manual" && !teamResult) {
    return (
      <div className="space-y-4">
        <ModeSelector mode={mode} onModeChange={(m) => { setMode(m); setTeamResult(null); }} />
        <ManualMode
          players={players}
          rankMode={rankMode}
          onComplete={handleManualComplete}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ModeSelector mode={mode} onModeChange={(m) => { setMode(m); setTeamResult(null); }} />

      {/* 自動/ランダムの実行ボタン */}
      {(mode === "auto" || mode === "random") && !teamResult && (
        <div className="flex justify-center">
          <Button
            onClick={handleAllocate}
            disabled={players.length < 2}
          >
            {mode === "auto" ? "自動バランスで振り分け" : "ランダムで振り分け"}
          </Button>
        </div>
      )}

      {/* 結果表示 */}
      {teamResult && (
        <TeamDisplay
          teamResult={teamResult}
          rankMode={rankMode}
          onRegenerate={mode === "draft" || mode === "manual" ? undefined : handleRegenerate}
          onReset={handleReset}
          onRankModeChange={onRankModeChange}
          onTeamResultChange={handleTeamResultChange}
        />
      )}
    </div>
  );
}

function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: AllocationMode;
  onModeChange: (mode: AllocationMode) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 flex-wrap">
      {MODES.map((m) => (
        <Button
          key={m.value}
          variant={mode === m.value ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange(m.value)}
          className={cn(
            mode === m.value && "pointer-events-none"
          )}
        >
          {m.label}
        </Button>
      ))}
    </div>
  );
}
