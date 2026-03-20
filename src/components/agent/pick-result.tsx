'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/cn';
import { AGENTS } from '@/lib/constants/agents';
import {
  tierAwareRandomPick,
  simpleRandomPick,
  rerollAgent,
} from '@/lib/algorithms/agent-picker';
import { AgentIcon } from './agent-icon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player, AgentPickResult, MapTierData } from '@/lib/types';

type PickMode = 'tier' | 'simple';

const ANIMATION_FRAMES = 10;
const ANIMATION_INTERVAL_MS = 100;

export interface PickResultProps {
  players: Player[];
  teamA: Player[];
  teamB: Player[];
  bannedAgentIds: string[];
  mapId: string | null;
  tierData: MapTierData | null;
  onComplete?: () => void;
}

export function PickResult({
  players,
  teamA,
  teamB,
  bannedAgentIds,
  mapId,
  tierData,
  onComplete,
}: PickResultProps) {
  const [pickMode, setPickMode] = useState<PickMode>('tier');
  const [picks, setPicks] = useState<AgentPickResult[] | null>(null);
  const [animating, setAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const [displayPicks, setDisplayPicks] = useState<AgentPickResult[] | null>(null);
  const finalPicksRef = useRef<AgentPickResult[] | null>(null);

  const runPick = useCallback(() => {
    let result: AgentPickResult[];
    if (pickMode === 'tier' && mapId && tierData) {
      result = tierAwareRandomPick(teamA, teamB, bannedAgentIds, mapId, tierData);
    } else {
      result = simpleRandomPick(players, bannedAgentIds);
    }
    finalPicksRef.current = result;
    setAnimating(true);
    setAnimationFrame(0);
    setPicks(null);
  }, [pickMode, teamA, teamB, players, bannedAgentIds, mapId, tierData]);

  // Animation effect
  useEffect(() => {
    if (!animating) return;

    if (animationFrame >= ANIMATION_FRAMES) {
      setAnimating(false);
      setPicks(finalPicksRef.current);
      setDisplayPicks(finalPicksRef.current);
      return;
    }

    // Show random agents during animation
    const bannedSet = new Set(bannedAgentIds);
    const available = AGENTS.filter((a) => !bannedSet.has(a.id));
    const randomPicks: AgentPickResult[] = players.map((p) => ({
      playerId: p.id,
      agent: available[Math.floor(Math.random() * available.length)],
    }));
    setDisplayPicks(randomPicks);

    const timer = setTimeout(() => {
      setAnimationFrame((f) => f + 1);
    }, ANIMATION_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [animating, animationFrame, players, bannedAgentIds]);

  const handleReroll = useCallback(
    (playerId: string) => {
      if (!picks) return;
      const newPick = rerollAgent(playerId, picks, bannedAgentIds, mapId, tierData);
      const updated = picks.map((p) =>
        p.playerId === playerId ? newPick : p,
      );
      setPicks(updated);
      setDisplayPicks(updated);
    },
    [picks, bannedAgentIds, mapId, tierData],
  );

  const getPlayerById = (id: string) => players.find((p) => p.id === id);
  const isTeamA = (playerId: string) => teamA.some((p) => p.id === playerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>エージェントピック</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selection + execute */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={pickMode === 'tier' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPickMode('tier')}
            disabled={animating}
          >
            Tier考慮
          </Button>
          <Button
            variant={pickMode === 'simple' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPickMode('simple')}
            disabled={animating}
          >
            シンプル
          </Button>
          <Button
            size="sm"
            onClick={runPick}
            disabled={animating}
          >
            {animating ? 'ピック中...' : 'ピック実行'}
          </Button>
        </div>

        {pickMode === 'tier' && !mapId && (
          <p className="text-sm text-val-light-dim">
            ※ マップ未選択のためシンプルモードで実行されます
          </p>
        )}

        {/* Results */}
        {displayPicks && (
          <div className="space-y-3">
            {displayPicks.map((pick) => {
              const player = getPlayerById(pick.playerId);
              if (!player) return null;
              const teamLabel = isTeamA(pick.playerId) ? 'A' : 'B';
              return (
                <div
                  key={pick.playerId}
                  className={cn(
                    'flex items-center gap-3 rounded-md border border-val-border p-3',
                    animating && 'animate-pulse',
                  )}
                >
                  <Badge
                    variant={teamLabel === 'A' ? 'default' : 'secondary'}
                    className="shrink-0"
                  >
                    {teamLabel}
                  </Badge>
                  <span className="text-sm font-medium min-w-[80px]">
                    {player.display_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <AgentIcon agent={pick.agent} size="sm" />
                    <span className="text-sm text-val-light-muted">
                      {pick.agent.nameJa}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {pick.agent.roleJa}
                    </Badge>
                  </div>
                  {!animating && picks && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto shrink-0"
                      onClick={() => handleReroll(pick.playerId)}
                    >
                      リロール
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Complete button */}
        {picks && !animating && onComplete && (
          <div className="flex justify-end">
            <Button onClick={onComplete}>完了</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
