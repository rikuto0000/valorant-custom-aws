'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { AGENTS } from '@/lib/constants/agents';
import { MAPS } from '@/lib/constants/maps';
import { TIER_ORDER, saveTierData, loadTierData, sortByTier } from '@/lib/algorithms/tier-utils';
import { AgentIcon } from './agent-icon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TierRank, MapTierData } from '@/lib/types';

const TIER_COLORS: Record<TierRank, string> = {
  S: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  A: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  B: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
  C: 'bg-green-500/20 text-green-400 border-green-500/40',
  D: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

const TIER_LABELS: Record<TierRank, string> = {
  S: 'S (5点)',
  A: 'A (4点)',
  B: 'B (3点)',
  C: 'C (2点)',
  D: 'D (1点)',
};

export interface TierEditorProps {
  onClose?: () => void;
}

export function TierEditor({ onClose }: TierEditorProps) {
  const [tierData, setTierData] = useState<MapTierData>({});
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = loadTierData();
    setTierData(saved);
  }, []);

  const currentMapTiers = tierData[selectedMapId] ?? {};

  const getAgentTier = (agentId: string): TierRank => {
    return currentMapTiers[agentId] ?? 'B';
  };

  const cycleTier = useCallback(
    (agentId: string) => {
      const current = getAgentTier(agentId);
      const currentIndex = TIER_ORDER.indexOf(current);
      const nextTier = TIER_ORDER[(currentIndex + 1) % TIER_ORDER.length];

      const updated: MapTierData = {
        ...tierData,
        [selectedMapId]: {
          ...currentMapTiers,
          [agentId]: nextTier,
        },
      };
      setTierData(updated);
      saveTierData(updated);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tierData, selectedMapId, currentMapTiers],
  );

  // Group agents by tier
  const sorted = sortByTier(AGENTS, currentMapTiers);
  const grouped: Record<TierRank, typeof AGENTS> = { S: [], A: [], B: [], C: [], D: [] };
  for (const agent of sorted) {
    const tier = getAgentTier(agent.id);
    grouped[tier].push(agent);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tier編集</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            閉じる
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map selector */}
        <div className="space-y-1">
          <label htmlFor="tier-map-select" className="text-sm text-val-light-muted">
            マップ選択
          </label>
          <select
            id="tier-map-select"
            value={selectedMapId}
            onChange={(e) => setSelectedMapId(e.target.value)}
            className="w-full rounded-md border border-val-input-border bg-val-input-bg px-3 py-2 text-sm text-val-light focus:outline-none focus:ring-2 focus:ring-val-ring"
          >
            {MAPS.map((map) => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-val-light-dim">
          エージェントをクリックするとTierが切り替わります（S→A→B→C→D→S）
        </p>

        {/* Tier groups */}
        {TIER_ORDER.map((tier) => (
          <div key={tier} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                className={cn('border', TIER_COLORS[tier])}
              >
                {TIER_LABELS[tier]}
              </Badge>
              <span className="text-xs text-val-light-dim">
                {grouped[tier].length}体
              </span>
            </div>
            {grouped[tier].length > 0 ? (
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
                {grouped[tier].map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => cycleTier(agent.id)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-md p-1 transition-colors',
                      'hover:bg-val-dark cursor-pointer',
                      'border border-transparent',
                      TIER_COLORS[tier].split(' ')[0],
                    )}
                  >
                    <AgentIcon agent={agent} size="sm" />
                    <span className="text-[10px] leading-tight text-val-light-muted truncate w-full text-center">
                      {agent.nameJa}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-val-light-dim pl-2">—</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
