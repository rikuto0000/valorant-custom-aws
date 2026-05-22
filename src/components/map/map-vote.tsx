'use client';

import { useState, useCallback } from 'react';
import { resolveMapVote } from '@/lib/algorithms/map-selector';
import { MAPS } from '@/lib/constants/maps';
import { useRoomVotes } from '@/hooks/use-room-votes';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player, MapData } from '@/lib/types';

export interface MapVoteProps {
  roomId: string;
  players: Player[];
  participantPlayerId: string | null;
  onMapSelected?: (map: MapData) => void;
}

export function MapVote({
  roomId,
  players,
  participantPlayerId,
  onMapSelected,
}: MapVoteProps) {
  const {
    votes,
    loading,
    error,
    submitVote,
    clearVotes,
  } = useRoomVotes(roomId, 'map');
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [result, setResult] = useState<MapData | null>(null);
  const requiredVoteCount = Math.min(10, players.length);
  const ownVote = participantPlayerId
    ? votes.find((vote) => vote.player_id === participantPlayerId) ?? null
    : null;

  const handleMapSelect = useCallback((mapId: string) => {
    if (ownVote) return;
    setCurrentSelection(mapId);
  }, [ownVote]);

  const handleVoteConfirm = useCallback(async () => {
    if (!participantPlayerId || !currentSelection) return;
    const ok = await submitVote(participantPlayerId, [currentSelection]);
    if (ok) {
      setCurrentSelection(null);
    }
  }, [currentSelection, participantPlayerId, submitVote]);

  const handleRevealVotes = useCallback(() => {
    if (votes.length < requiredVoteCount) return;
    const groupedVotes: Record<string, string[]> = {};
    for (const vote of votes) {
      const mapId = vote.choices[0];
      if (!mapId) continue;
      groupedVotes[mapId] = [...(groupedVotes[mapId] ?? []), vote.player_id];
    }
    const selectedMap = resolveMapVote(groupedVotes);
    setResult(selectedMap);
    onMapSelected?.(selectedMap);
  }, [onMapSelected, requiredVoteCount, votes]);

  const handleResetVotes = useCallback(async () => {
    await clearVotes();
    setCurrentSelection(null);
    setResult(null);
  }, [clearVotes]);

  // Vote tally for display
  const voteCounts: Record<string, number> = {};
  for (const vote of votes) {
    const mapId = vote.choices[0];
    if (mapId) {
      voteCounts[mapId] = (voteCounts[mapId] ?? 0) + 1;
    }
  }

  // === Result view ===
  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>投票結果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-val-border">
              <img
                src={result.image}
                alt={result.name}
                className="h-48 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-lg font-bold text-val-light">{result.name}</p>
              </div>
            </div>
          </div>

          {/* Vote summary */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-val-light-muted">得票数</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MAPS.map((map) => {
                const count = voteCounts[map.id] ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={map.id}
                    className={`flex items-center justify-between rounded-md border px-3 py-1.5 text-sm ${
                      map.id === result.id
                        ? 'border-val-red bg-val-red/10 text-val-light'
                        : 'border-val-border text-val-light-muted'
                    }`}
                  >
                    <span>{map.name}</span>
                    <Badge variant={map.id === result.id ? 'default' : 'secondary'}>
                      {count}票
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // === Voting view ===
  return (
    <Card>
      <CardHeader>
        <CardTitle>マップ投票</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge>投票済み {votes.length}/{requiredVoteCount}</Badge>
          <span className="text-sm text-val-light-muted">
            {requiredVoteCount}票集まったら開示できます
          </span>
        </div>

        <p className="text-sm text-val-light-muted">
          各参加者がプレイしたいマップを1つ選択してください
        </p>
        {!participantPlayerId && (
          <p className="text-sm text-yellow-400">
            自分のIDで参加すると投票できます。
          </p>
        )}
        {ownVote && (
          <div className="rounded-md border border-val-border bg-val-dark-alt p-3 text-sm text-val-light-muted">
            投票済み: {MAPS.find((map) => map.id === ownVote.choices[0])?.name ?? ownVote.choices[0]}
          </div>
        )}
        {error && (
          <p className="text-sm text-val-red">{error}</p>
        )}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MAPS.map((map) => {
            const isSelected = (ownVote?.choices[0] ?? currentSelection) === map.id;
            return (
              <button
                key={map.id}
                type="button"
                disabled={Boolean(ownVote)}
                onClick={() => handleMapSelect(map.id)}
                className={`relative overflow-hidden rounded-lg border transition-all ${
                  isSelected
                    ? 'border-val-red ring-2 ring-val-red'
                    : 'border-val-border hover:border-val-border-hover'
                }`}
              >
                <img
                  src={map.image}
                  alt={map.name}
                  className="h-20 w-full object-cover sm:h-24"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-xs font-medium text-val-light">{map.name}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="sm"
            disabled={!participantPlayerId || Boolean(ownVote) || !currentSelection || loading}
            onClick={handleVoteConfirm}
          >
            {ownVote ? '投票済み' : '投票する'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={votes.length < requiredVoteCount}
            onClick={handleRevealVotes}
          >
            開示する
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetVotes}
          >
            投票をリセット
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
