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

type Phase = "player" | "team";

interface RoomClientProps {
  room: Room;
  initialPlayers: Player[];
}

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

  const [phase, setPhase] = useState<Phase>("player");
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);

  // Optional sections toggle
  const [showBan, setShowBan] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPick, setShowPick] = useState(false);
  const [showTierEditor, setShowTierEditor] = useState(false);

  // Optional feature state
  const [bannedAgentIds, setBannedAgentIds] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [mapMode, setMapMode] = useState<"random" | "vote">("random");

  // URL copy
  const [copied, setCopied] = useState(false);

  const { tierData } = useAgentTier();
  useAppSync(room.id, () => fetchRoom(room.id));

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

  const handleStartAllocation = useCallback(() => {
    if (players.length >= 2) {
      setPhase("team");
    }
  }, [players.length]);

  const handleResetToPlayer = useCallback(async () => {
    setTeamResult(null);
    setBannedAgentIds([]);
    setSelectedMap(null);
    setShowBan(false);
    setShowMap(false);
    setShowPick(false);
    setShowTierEditor(false);
    await resetTeams(room.id);
    setPhase("player");
  }, [resetTeams, room.id]);

  const handleRankModeChange = useCallback(
    async (mode: "current" | "peak") => {
      await updateRankMode(room.id, mode);
    },
    [updateRankMode, room.id]
  );

  const handleTeamResultChange = useCallback((result: TeamResult) => {
    setTeamResult(result);
  }, []);

  const handleBanComplete = useCallback((ids: string[]) => {
    setBannedAgentIds(ids);
  }, []);

  const handleMapSelected = useCallback((map: MapData) => {
    setSelectedMap(map);
  }, []);

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-val-light">
              <span className="text-val-red">VALORANT</span> カスタム
            </h1>
            <p className="text-xs text-val-light-dim mt-0.5 font-mono">
              {room.id.slice(0, 8)}...
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyUrl}>
            {copied ? "コピーしました" : "URLを共有"}
          </Button>
        </div>

        {/* エラー表示 */}
        {error && (
          <Card className="border-val-red">
            <CardContent className="py-3">
              <p className="text-sm text-val-red">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* === プレイヤー登録フェーズ === */}
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

        {/* === チーム振り分けフェーズ === */}
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
                  onTeamResultChange={handleTeamResultChange}
                />
              </CardContent>
            </Card>

            {/* === オプション機能（折りたたみ） === */}
            {teamResult && (
              <div className="space-y-3">
                <p className="text-sm text-val-light-muted text-center">
                  オプション機能
                </p>

                {/* エージェントBAN */}
                <CollapsibleSection
                  title="エージェントBAN"
                  open={showBan}
                  onToggle={() => setShowBan(!showBan)}
                >
                  <BanPanel
                    players={players}
                    onBanComplete={handleBanComplete}
                  />
                </CollapsibleSection>

                {/* マップ選択 */}
                <CollapsibleSection
                  title="マップ選択"
                  open={showMap}
                  onToggle={() => setShowMap(!showMap)}
                >
                  <div className="space-y-3">
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
                  </div>
                </CollapsibleSection>

                {/* エージェントピック */}
                <CollapsibleSection
                  title="エージェントピック"
                  open={showPick}
                  onToggle={() => setShowPick(!showPick)}
                >
                  <div className="space-y-3">
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
                  </div>
                </CollapsibleSection>
              </div>
            )}

            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={handleResetToPlayer}>
                リセット（プレイヤー登録に戻る）
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** 折りたたみセクション */
function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-val-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-val-light hover:bg-val-dark-alt transition-colors"
      >
        <span>{title}</span>
        <span className="text-val-light-dim text-xs">
          {open ? "▲ 閉じる" : "▼ 開く"}
        </span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
