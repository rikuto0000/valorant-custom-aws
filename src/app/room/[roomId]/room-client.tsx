"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Room, Player, PlayerInput, TeamResult, MapData } from "@/lib/types";
import { useRoom } from "@/hooks/use-room";
import { useRoomRealtime } from "@/hooks/use-room-realtime";
import { useAgentTier } from "@/hooks/use-agent-tier";
import { useParticipantIdentity } from "@/hooks/use-participant-identity";
import { PlayerForm } from "@/components/room/player-form";
import { PlayerList } from "@/components/room/player-list";
import { AllocationPanel } from "@/components/room/allocation-panel";
import { TeamDisplay } from "@/components/room/team-display";
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
import { buildTeamResult } from "@/lib/algorithms/team-allocator";

type Phase = "player" | "team";

interface RoomClientProps {
  room: Room;
  initialPlayers: Player[];
}

export function RoomClient({ room, initialPlayers }: RoomClientProps) {
  const {
    room: currentRoom,
    players,
    loading,
    error,
    addPlayer,
    deletePlayer,
    updateTeam,
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
  const [showAdminAdd, setShowAdminAdd] = useState(false);

  // Optional feature state
  const [bannedAgentIds, setBannedAgentIds] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);
  const [mapMode, setMapMode] = useState<"random" | "vote">("random");

  // URL copy
  const [copied, setCopied] = useState(false);

  const { tierData } = useAgentTier();
  const {
    profile,
    playerId: ownPlayerId,
    isHost,
    rememberPlayer,
    forgetRoomPlayer,
  } = useParticipantIdentity(room.id);
  const currentRankMode = currentRoom?.rank_mode ?? room.rank_mode;
  const ownPlayer = ownPlayerId
    ? players.find((player) => player.id === ownPlayerId) ?? null
    : null;
  const assignedTeamResult = useMemo(() => {
    const teamA = players.filter((player) => player.team === "A");
    const teamB = players.filter((player) => player.team === "B");
    if (teamA.length === 0 && teamB.length === 0) return null;
    return buildTeamResult(teamA, teamB, currentRankMode);
  }, [currentRankMode, players]);
  const visibleTeamResult = teamResult ?? assignedTeamResult;
  useRoomRealtime(room.id, () => fetchRoom(room.id));

  useEffect(() => {
    if (ownPlayerId && players.length > 0 && !ownPlayer) {
      forgetRoomPlayer();
    }
  }, [ownPlayerId, ownPlayer, players.length, forgetRoomPlayer]);

  const effectivePhase: Phase = phase === "player" && assignedTeamResult ? "team" : phase;

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  const handleSelfPlayerAdded = useCallback(
    async (playerInput: PlayerInput) => {
      const added = await addPlayer(room.id, playerInput);
      if (added) {
        rememberPlayer(added);
      }
      return added;
    },
    [addPlayer, rememberPlayer, room.id]
  );

  const handleAdminPlayerAdded = useCallback(
    async (playerInput: PlayerInput) => {
      return addPlayer(room.id, playerInput);
    },
    [addPlayer, room.id]
  );

  const handleDeletePlayer = useCallback(
    async (playerId: string) => {
      const deleted = await deletePlayer(room.id, playerId);
      if (deleted && playerId === ownPlayerId) {
        forgetRoomPlayer();
      }
    },
    [deletePlayer, forgetRoomPlayer, ownPlayerId, room.id]
  );

  const handleStartAllocation = useCallback(() => {
    if (isHost && players.length >= 2) {
      setPhase("team");
    }
  }, [isHost, players.length]);

  const handleResetToPlayer = useCallback(async () => {
    if (!isHost) return;
    setTeamResult(null);
    setBannedAgentIds([]);
    setSelectedMap(null);
    setShowBan(false);
    setShowMap(false);
    setShowPick(false);
    setShowTierEditor(false);
    setShowAdminAdd(false);
    await resetTeams(room.id);
    setPhase("player");
  }, [isHost, resetTeams, room.id]);

  const handleRankModeChange = useCallback(
    async (mode: "current" | "peak") => {
      if (!isHost) return;
      await updateRankMode(room.id, mode);
    },
    [isHost, updateRankMode, room.id]
  );

  const persistTeamResult = useCallback(
    async (result: TeamResult) => {
      setTeamResult(result);
      const updates = [
        ...result.teamA.map((player) => updateTeam(room.id, player.id, "A")),
        ...result.teamB.map((player) => updateTeam(room.id, player.id, "B")),
      ];
      const results = await Promise.all(updates);
      if (results.every(Boolean)) {
        await fetchRoom(room.id);
      }
    },
    [fetchRoom, room.id, updateTeam],
  );

  const handleTeamResultChange = useCallback((result: TeamResult) => {
    if (!isHost) return;
    void persistTeamResult(result);
  }, [isHost, persistTeamResult]);

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
        {effectivePhase === "player" && (
          <>
            {ownPlayer ? (
              <Card>
                <CardHeader>
                  <CardTitle>参加中</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-val-light">
                      {ownPlayer.display_name}
                    </p>
                    <p className="text-xs text-val-light-muted font-mono">
                      {ownPlayer.riot_id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePlayer(ownPlayer.id)}
                    disabled={loading}
                  >
                    参加を取り消す
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <PlayerForm
                roomId={room.id}
                title="自分のIDで参加"
                submitLabel="このルームに参加"
                apiLabel="Riot IDで参加"
                showManualMode={false}
                defaultRiotId={profile?.riotId ?? ""}
                demoWarningMessage="⚠ API取得に失敗したため、ランダムなランクで参加しました。必要なら代理追加の手動入力で修正できます。"
                onPlayerAdded={handleSelfPlayerAdded}
              />
            )}

            {isHost && (
            <CollapsibleSection
              title="代理でプレイヤー追加"
              open={showAdminAdd}
              onToggle={() => setShowAdminAdd(!showAdminAdd)}
            >
              <PlayerForm
                roomId={room.id}
                title="プレイヤー追加"
                submitLabel="追加"
                onPlayerAdded={handleAdminPlayerAdded}
              />
            </CollapsibleSection>
            )}

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
                    onDeletePlayer={isHost ? handleDeletePlayer : undefined}
                  />
                )}
              </CardContent>
            </Card>

            {isHost && players.length >= 2 && (
              <div className="flex justify-center">
                <Button onClick={handleStartAllocation}>
                  チーム振り分けへ ({players.length}人)
                </Button>
              </div>
            )}
            {!isHost && players.length >= 2 && (
              <Card>
                <CardContent className="py-3 text-center text-sm text-val-light-muted">
                  ホストがチーム分けを開始します
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* === チーム振り分けフェーズ === */}
        {effectivePhase === "team" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>チーム振り分け</CardTitle>
              </CardHeader>
              <CardContent>
                {isHost ? (
                  <>
                    <AllocationPanel
                      players={players}
                      rankMode={currentRankMode}
                      onRankModeChange={handleRankModeChange}
                      onReset={handleResetToPlayer}
                      onTeamResultChange={handleTeamResultChange}
                    />
                    {assignedTeamResult && !teamResult && (
                      <div className="mt-4 border-t border-val-border pt-4">
                        <TeamDisplay
                          teamResult={assignedTeamResult}
                          rankMode={currentRankMode}
                          onReset={handleResetToPlayer}
                          onRankModeChange={handleRankModeChange}
                          onTeamResultChange={handleTeamResultChange}
                        />
                      </div>
                    )}
                  </>
                ) : visibleTeamResult ? (
                  <TeamDisplay
                    teamResult={visibleTeamResult}
                    rankMode={currentRankMode}
                  />
                ) : (
                  <p className="py-6 text-center text-sm text-val-light-muted">
                    ホストがチーム分け中です
                  </p>
                )}
              </CardContent>
            </Card>

            {/* === オプション機能（折りたたみ） === */}
            {visibleTeamResult && (
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
                    roomId={room.id}
                    players={players}
                    participantPlayerId={ownPlayerId}
                    allowTeamBan={isHost}
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
                    {isHost && (
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
                    )}
                    {isHost && mapMode === "random" ? (
                      <MapRandom onMapSelected={handleMapSelected} />
                    ) : (
                      <MapVote
                        roomId={room.id}
                        players={players}
                        participantPlayerId={ownPlayerId}
                        onMapSelected={handleMapSelected}
                      />
                    )}
                  </div>
                </CollapsibleSection>

                {/* エージェントピック */}
                <CollapsibleSection
                  title="エージェントピック"
                  open={showPick}
                  hidden={!isHost}
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
                      teamA={visibleTeamResult.teamA}
                      teamB={visibleTeamResult.teamB}
                      bannedAgentIds={bannedAgentIds}
                      mapId={selectedMap?.id ?? null}
                      tierData={Object.keys(tierData).length > 0 ? tierData : null}
                    />
                  </div>
                </CollapsibleSection>
              </div>
            )}

            <div className={isHost ? "flex justify-center" : "hidden"}>
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
  hidden = false,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  hidden?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  if (hidden) return null;

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
