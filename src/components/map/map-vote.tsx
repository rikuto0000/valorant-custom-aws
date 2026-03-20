'use client';

import { useState, useCallback } from 'react';
import { resolveMapVote } from '@/lib/algorithms/map-selector';
import { MAPS } from '@/lib/constants/maps';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player, MapData } from '@/lib/types';

export interface MapVoteProps {
  players: Player[];
  onMapSelected?: (map: MapData) => void;
}

export function MapVote({ players, onMapSelected }: MapVoteProps) {
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [votes, setVotes] = useState<Record<string, string[]>>({});
  const [currentSelection, setCurrentSelection] = useState<string | null>(null);
  const [result, setResult] = useState<MapData | null>(null);

  const currentPlayer = players[currentVoterIndex] ?? null;

  const handleMapSelect = useCallback((mapId: string) => {
    setCurrentSelection(mapId);
  }, []);

  const handleVoteConfirm = useCallback(() => {
    if (!currentSelection || !currentPlayer) return;

    const newVotes = { ...votes };
    // Add voter to the selected map's voter list
    if (!newVotes[currentSelection]) {
      newVotes[currentSelection] = [];
    }
    newVotes[currentSelection] = [...newVotes[currentSelection], currentPlayer.id];
    setVotes(newVotes);
    setCurrentSelection(null);

    if (currentVoterIndex + 1 >= players.length) {
      // All players voted — resolve
      const selectedMap = resolveMapVote(newVotes);
      setResult(selectedMap);
      onMapSelected?.(selectedMap);
    } else {
      setCurrentVoterIndex(currentVoterIndex + 1);
    }
  }, [currentSelection, currentPlayer, votes, currentVoterIndex, players, onMapSelected]);

  // Vote tally for display
  const voteCounts: Record<string, number> = {};
  for (const [mapId, voters] of Object.entries(votes)) {
    voteCounts[mapId] = voters.length;
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
        {currentPlayer && (
          <div className="flex items-center gap-2">
            <Badge>{currentPlayer.display_name}</Badge>
            <span className="text-sm text-val-light-muted">
              ({currentVoterIndex + 1}/{players.length})
            </span>
          </div>
        )}

        <p className="text-sm text-val-light-muted">
          プレイしたいマップを1つ選択してください
        </p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {MAPS.map((map) => {
            const isSelected = currentSelection === map.id;
            return (
              <button
                key={map.id}
                type="button"
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

        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!currentSelection}
            onClick={handleVoteConfirm}
          >
            投票する
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
