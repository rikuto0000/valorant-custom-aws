"use client";

import { useState, useCallback } from "react";
import type { Room, Player, PlayerInput, TeamResult, MapData } from "@/lib/types";
import { useRoom } from "@/hooks/use-room";
import { useAppSync } from "@/hooks/use-appsync";
import { useAgentTier } from "@/hooks/use-agent-tier";
import { PlayerForm } from "@/components/room/player-form";
import { PlayerList } from "@/components/room/player-list";
import { AllocationPanel } from "@/components/room/allocation-panel";
import { BanPanel } from "@/components/agent/ban-panel";
import { PickResult } from "@/components/agent/pick-result";
import { TierEditor } from "@/components/agent/tier-editor";
import { MapRandom } from "@/components/map/map-random";
import { MapVote } from "@/components/map/map-vote";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Phase = "player" | "team" | "agentBan" | "map" | "agentPick";
type MapMode = "random" | "vote";

interface RoomClientProps {
  room: Room;
  initialPlayers: Player[];
}

const PHASE_LABELS: Record<Phase, string> = {
  player: "プレイヤー登録",
  team: "チーム振り分け",
  agentBan: "エージェントBAN",
  map: "マップ選択",
  agentPick: "エージェントピック",
};

export function RoomClient({ room, initialPlayers }: RoomClientProps) {
  const {
    players,
    loading,
    error,
    addPlayer,
    deletePlayer,
    updateRankMode,
    resetTeams,
    fetchRoom,
  } = useRoom(room, initialPlayers);

  // Phase state
  const [phase, setPhase] = useState<Phase>("player");

  // Team result state
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);

  // BAN state
  const [bannedAgentIds, setBannedAgentIds] = useState<string[]>([]);

  // Map state
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("random");

  // Tier editor visibility
  const [showTierEditor, setShowTierEditor] = useState(false);

  // URL copy state
  const [copied, setCopied] = useState(false);

  // Agent tier hook
  const { tierData } = useAgentTier();

  // AppSync real-time sync
  useAppSync(room.id, () => fetchRoom(room.id));

  // === Handlers ===

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  const handlePlayerAdded = useCallback(
    async (playerInput: PlayerInput) => {
      await addPlayer(room.id, playerInput);
    },
    [addPlayer, room.id]
  );

  const handleDeletePlayer = useCallback(
    async (playerId: string) => {
      await deletePlayer(room.id, playerId);
    },
    [deletePlayer, room.id]
  );

  // PlayerPhase → TeamPhase
  const handleStartAllocation = useCallback(() => {
    if (players.length >= 2) {
      setPhase("team");
    }
  }, [players.length]);

  // TeamPhase → AgentBanPhase (team confirmed)
  const handleTeamConfirmed = useCallback((result: TeamResult) => {
    setTeamResult(result);
    setPhase("agentBan");
  }, []);

  // TeamPhase → PlayerPhase (reset)
  const handleResetToPlayer = useCallback(async () => {
    setTeamResult(null);
    setBannedAgentIds([]);
    setSelectedMap(null);
    await resetTeams(room.id);
    setPhase("player");
  }, [resetTeams, room.id]);

  // Rank mode change
  const handleRankModeChange = useCallback(
    async (mode: "current" | "peak") => {
      await updateRankMode(room.id, mode);
    },
    [updateRankMode, room.id]
  );

  // AgentBanPhase → MapPhase
  const handleBanComplete = useCallback((ids: string[]) => {
    setBannedAgentIds(ids);
    setPhase("map");
  }, []);

  // MapPhase → AgentPickPhase
  const handleMapSelected = useCallback((map: MapData) => {
    setSelectedMap(map);
    setPhase("agentPick");
  }, []);

  const handleSkipMap = useCallback(() => {
    setSelectedMap(null);
    setPhase("agentPick");
  }, []);

  // AgentPickPhase → TeamPhase (re-allocate)
  const handleReAllocate = useCallback(() => {
    setTeamResult(null);
    setBannedAgentIds([]);
    setSelectedMap(null);
    setPhase("team");
  }, []);

  // === Render ===

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-val-light">
              <span className="text-val-red">VALORANT</span> ルーム
            </h1>
            <p className="text-xs text-val-light-dim mt-0.5 font-mono">
              {room.id.slice(0, 8)}...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{PHASE_LABELS[phase]}</Badge>
            <Button variant="outline" size="sm" onClick={handleCopyUrl}>
              {copied ? "コピーしました" : "URLを共有"}
            </Button>
          </div>
        </div>

        {/* フェーズインジケーター */}
        <div className="flex items-center justify-center gap-1 text-xs">
          {(Object.keys(PHASE_LABELS) as Phase[]).map((p, i) => (
            <span key={p} className="flex items-center gap-1">
              {i > 0 && <span className="text-val-light-dim">→</span>}
              <span
                className={
                  p === phase
                    ? "text-val-red font-bold"
                    : "text-val-light-dim"
                }
              >
                {PHASE_LABELS[p]}
              </span>
            </span>
          ))}
        </div>

        {/* エラー表示 */}
        {error && (
          <Card className="border-val-red">
            <CardContent className="py-3">
              <p className="text-sm text-val-red">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* === PlayerPhase === */}
        {phase === "player" && (
          <>
            <PlayerForm roomId={room.id} onPlayerAdded={handlePlayerAdded} />

            <Card>
              <CardHeader>
                <CardTitle>参加者</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-6">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-val-light border-t-transparent" />
                  </div>
                ) : (
                  <PlayerList
                    players={players}
                    onDeletePlayer={handleDeletePlayer}
                  />
                )}
              </CardContent>
            </Card>

            {players.length >= 2 && (
              <div className="flex justify-center">
                <Button onClick={handleStartAllocation}>
                  チーム振り分けへ ({players.length}人)
                </Button>
              </div>
            )}
          </>
        )}

        {/* === TeamPhase === */}
        {phase === "team" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>チーム振り分け</CardTitle>
              </CardHeader>
              <CardContent>
                <AllocationPanel
                  players={players}
                  rankMode={room.rank_mode}
                  onRankModeChange={handleRankModeChange}
                  onReset={handleResetToPlayer}
                  onTeamConfirmed={handleTeamConfirmed}
                />
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={handleResetToPlayer}>
                リセット（プレイヤー登録に戻る）
              </Button>
            </div>
          </>
        )}

        {/* === AgentBanPhase === */}
        {phase === "agentBan" && (
          <>
            <BanPanel
              players={players}
              onBanComplete={handleBanComplete}
            />

            <div className="flex justify-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => handleBanComplete([])}>
                BANをスキップ
              </Button>
            </div>
          </>
        )}

        {/* === MapPhase === */}
        {phase === "map" && (
          <>
            {/* マップ選択モード切替 */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={mapMode === "random" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapMode("random")}
              >
                ランダム
              </Button>
              <Button
                variant={mapMode === "vote" ? "default" : "outline"}
                size="sm"
                onClick={() => setMapMode("vote")}
              >
                投票
              </Button>
            </div>

            {mapMode === "random" ? (
              <MapRandom onMapSelected={handleMapSelected} />
            ) : (
              <MapVote players={players} onMapSelected={handleMapSelected} />
            )}

            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={handleSkipMap}>
                マップ選択をスキップ
              </Button>
            </div>
          </>
        )}

        {/* === AgentPickPhase === */}
        {phase === "agentPick" && teamResult && (
          <>
            {/* Tier編集トグル */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTierEditor(!showTierEditor)}
              >
                {showTierEditor ? "Tier編集を閉じる" : "Tier編集"}
              </Button>
            </div>

            {showTierEditor && (
              <TierEditor onClose={() => setShowTierEditor(false)} />
            )}

            <PickResult
              players={players}
              teamA={teamResult.teamA}
              teamB={teamResult.teamB}
              bannedAgentIds={bannedAgentIds}
              mapId={selectedMap?.id ?? null}
              tierData={Object.keys(tierData).length > 0 ? tierData : null}
            />

            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" onClick={handleReAllocate}>
                再振り分け（チーム振り分けに戻る）
              </Button>
              <Button variant="ghost" size="sm" onClick={handleResetToPlayer}>
                リセット（最初に戻る）
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
