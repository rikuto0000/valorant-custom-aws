"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import type { Player, RankMode, TeamResult } from "@/lib/types";
import {
  resolveDraftConflict,
  assignLastPlayer,
  buildTeamResult,
} from "@/lib/algorithms/team-allocator";
import { getRankByValue } from "@/lib/constants/ranks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type DraftPhase = "leader" | "pick" | "conflict" | "done";
type DraftTurn = "A" | "B";

interface DraftModeProps {
  players: Player[];
  rankMode: RankMode;
  onComplete: (result: TeamResult) => void;
}

interface ConflictInfo {
  player: Player;
  winner: "A" | "B";
}

export function DraftMode({ players, rankMode, onComplete }: DraftModeProps) {
  const [phase, setPhase] = useState<DraftPhase>("leader");
  const [teamA, setTeamA] = useState<Player[]>([]);
  const [teamB, setTeamB] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState<DraftTurn>("A");
  const [pendingPickA, setPendingPickA] = useState<Player | null>(null);
  const [pendingPickB, setPendingPickB] = useState<Player | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  // 競合敗者の補償ピック
  const [compensationTurn, setCompensationTurn] = useState<DraftTurn | null>(null);

  const assigned = new Set([...teamA.map((p) => p.id), ...teamB.map((p) => p.id)]);
  const unassigned = players.filter((p) => !assigned.has(p.id));

  // リーダー選択フェーズ
  const handleLeaderPick = useCallback(
    (player: Player, team: DraftTurn) => {
      if (team === "A") {
        setPendingPickA(player);
      } else {
        setPendingPickB(player);
      }
    },
    []
  );

  const confirmLeaders = useCallback(() => {
    if (!pendingPickA || !pendingPickB) return;

    // 同一プレイヤーを選択した場合 → 競合解決
    if (pendingPickA.id === pendingPickB.id) {
      const { winner } = resolveDraftConflict();
      setConflict({ player: pendingPickA, winner });
      if (winner === "A") {
        setTeamA([pendingPickA]);
        setCompensationTurn("B");
      } else {
        setTeamB([pendingPickA]);
        setCompensationTurn("A");
      }
      setPendingPickA(null);
      setPendingPickB(null);
      setPhase("conflict");
      return;
    }

    setTeamA([pendingPickA]);
    setTeamB([pendingPickB]);
    setPendingPickA(null);
    setPendingPickB(null);
    setCurrentTurn("A");
    setPhase("pick");
  }, [pendingPickA, pendingPickB]);

  // 競合解決後の処理
  const handleConflictContinue = useCallback(() => {
    setConflict(null);
    if (compensationTurn) {
      setCurrentTurn(compensationTurn);
      setCompensationTurn(null);
      // 敗者がリーダーを選び直す（pickフェーズへ移行し、敗者のターンから開始）
      setPhase("pick");
    }
  }, [compensationTurn]);

  // ピックフェーズ
  const handlePick = useCallback(
    (player: Player) => {
      const newTeamA = currentTurn === "A" ? [...teamA, player] : teamA;
      const newTeamB = currentTurn === "B" ? [...teamB, player] : teamB;

      if (currentTurn === "A") {
        setTeamA(newTeamA);
      } else {
        setTeamB(newTeamB);
      }

      // 残りプレイヤーチェック
      const newAssigned = new Set([
        ...newTeamA.map((p) => p.id),
        ...newTeamB.map((p) => p.id),
      ]);
      const remaining = players.filter((p) => !newAssigned.has(p.id));

      if (remaining.length === 1) {
        // 最終プレイヤー自動割り当て
        const lastTeam = assignLastPlayer(newTeamA, newTeamB);
        const finalA = lastTeam === "A" ? [...newTeamA, remaining[0]] : newTeamA;
        const finalB = lastTeam === "B" ? [...newTeamB, remaining[0]] : newTeamB;
        setTeamA(finalA);
        setTeamB(finalB);
        setPhase("done");
        onComplete(buildTeamResult(finalA, finalB, rankMode));
        return;
      }

      if (remaining.length === 0) {
        setPhase("done");
        onComplete(buildTeamResult(newTeamA, newTeamB, rankMode));
        return;
      }

      setCurrentTurn(currentTurn === "A" ? "B" : "A");
    },
    [currentTurn, teamA, teamB, players, rankMode, onComplete]
  );

  return (
    <div className="space-y-4">
      {/* フェーズ表示 */}
      <div className="text-center">
        <Badge variant="secondary" className="text-sm">
          {phase === "leader" && "Phase 1: リーダー選択"}
          {phase === "pick" && `Phase 2: ピック — チーム${currentTurn}のターン`}
          {phase === "conflict" && "競合解決"}
          {phase === "done" && "ドラフト完了"}
        </Badge>
      </div>

      {/* リーダー選択フェーズ */}
      {phase === "leader" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-400 text-center">
                チームAリーダー
              </p>
              {pendingPickA ? (
                <PickedPlayerCard player={pendingPickA} />
              ) : (
                <p className="text-xs text-val-light-dim text-center py-3">
                  未選択
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-400 text-center">
                チームBリーダー
              </p>
              {pendingPickB ? (
                <PickedPlayerCard player={pendingPickB} />
              ) : (
                <p className="text-xs text-val-light-dim text-center py-3">
                  未選択
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-val-light-muted text-center">
            各チームのリーダーを選択してください
          </p>

          <div className="space-y-1.5">
            {players.map((player) => (
              <DraftPlayerRow
                key={player.id}
                player={player}
                onPickA={() => handleLeaderPick(player, "A")}
                onPickB={() => handleLeaderPick(player, "B")}
                selectedA={pendingPickA?.id === player.id}
                selectedB={pendingPickB?.id === player.id}
              />
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={confirmLeaders}
              disabled={!pendingPickA || !pendingPickB}
            >
              リーダー確定
            </Button>
          </div>
        </div>
      )}

      {/* 競合解決表示 */}
      {phase === "conflict" && conflict && (
        <Card>
          <CardContent className="py-6 text-center space-y-3">
            <p className="text-sm text-val-light-muted">
              両チームが同じプレイヤーを選択しました
            </p>
            <p className="text-lg font-bold text-val-light">
              {conflict.player.display_name}
            </p>
            <p className="text-sm">
              → <span className={conflict.winner === "A" ? "text-blue-400" : "text-red-400"}>
                チーム{conflict.winner}
              </span> が獲得
            </p>
            <p className="text-xs text-val-light-dim">
              チーム{conflict.winner === "A" ? "B" : "A"}に補償ピック権が付与されます
            </p>
            <Button size="sm" onClick={handleConflictContinue}>
              続行
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ピックフェーズ */}
      {phase === "pick" && (
        <div className="space-y-4">
          {/* 現在のチーム構成 */}
          <div className="grid grid-cols-2 gap-3">
            <MiniTeamList title="チーム A" players={teamA} colorClass="text-blue-400" />
            <MiniTeamList title="チーム B" players={teamB} colorClass="text-red-400" />
          </div>

          {/* 未割り当てプレイヤー */}
          <div className="space-y-1.5">
            <p className="text-xs text-val-light-muted">
              チーム{currentTurn}がプレイヤーを選択してください
            </p>
            {unassigned.map((player) => (
              <button
                key={player.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-2 rounded-md border border-val-border bg-val-dark p-2 text-left transition-colors",
                  currentTurn === "A"
                    ? "hover:border-blue-400/50 hover:bg-blue-400/5"
                    : "hover:border-red-400/50 hover:bg-red-400/5"
                )}
                onClick={() => handlePick(player)}
              >
                <PlayerBadge player={player} />
                <span className="text-sm text-val-light flex-1 truncate">
                  {player.display_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


function PickedPlayerCard({ player }: { player: Player }) {
  const rankInfo = getRankByValue(player.rank_value);
  return (
    <div className="flex items-center gap-2 rounded-md border border-val-border bg-val-dark-alt p-2">
      <PlayerBadge player={player} />
      <span className="text-xs font-medium text-val-light truncate">
        {player.display_name}
      </span>
      <Badge variant="outline" className="text-[10px] ml-auto">
        {rankInfo?.labelJa ?? player.rank}
      </Badge>
    </div>
  );
}

function DraftPlayerRow({
  player,
  onPickA,
  onPickB,
  selectedA,
  selectedB,
}: {
  player: Player;
  onPickA: () => void;
  onPickB: () => void;
  selectedA: boolean;
  selectedB: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-val-border bg-val-dark p-2">
      <PlayerBadge player={player} />
      <span className="text-sm text-val-light flex-1 truncate">
        {player.display_name}
      </span>
      <Button
        variant={selectedA ? "default" : "outline"}
        size="sm"
        className={cn("h-7 text-xs", selectedA && "bg-blue-600 hover:bg-blue-700")}
        onClick={onPickA}
      >
        A
      </Button>
      <Button
        variant={selectedB ? "default" : "outline"}
        size="sm"
        className={cn("h-7 text-xs", selectedB && "bg-red-600 hover:bg-red-700")}
        onClick={onPickB}
      >
        B
      </Button>
    </div>
  );
}

function MiniTeamList({
  title,
  players,
  colorClass,
}: {
  title: string;
  players: Player[];
  colorClass: string;
}) {
  return (
    <div className="rounded-md border border-val-border bg-val-dark-alt p-2">
      <p className={cn("text-xs font-medium mb-1", colorClass)}>{title}</p>
      {players.length === 0 ? (
        <p className="text-[10px] text-val-light-dim">なし</p>
      ) : (
        <div className="space-y-0.5">
          {players.map((p) => (
            <p key={p.id} className="text-xs text-val-light truncate">
              {p.display_name}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerBadge({ player }: { player: Player }) {
  const rankInfo = getRankByValue(player.rank_value);
  if (!rankInfo) return null;
  return (
    <Image
      src={rankInfo.badgeImage}
      alt={rankInfo.labelJa}
      width={24}
      height={24}
      className="object-contain flex-shrink-0"
      unoptimized
    />
  );
}
