"use client";

import { useState, useEffect, useCallback } from "react";
import type { TierRank, MapTierData } from "@/lib/types";
import { loadTierData, saveTierData } from "@/lib/algorithms/tier-utils";

interface UseAgentTierReturn {
  /** マップ別エージェントTierデータ */
  tierData: MapTierData;
  /** 指定マップ・エージェントのTierを設定する */
  setTier: (mapId: string, agentId: string, tier: TierRank) => void;
  /** 指定マップ・エージェントのTierを取得する（未設定時はデフォルト 'B'） */
  getTier: (mapId: string, agentId: string) => TierRank;
}

/**
 * エージェントTier管理フック
 *
 * localStorage からマップ別Tierデータを読み込み・保存する。
 * Tier変更時は即座に localStorage へ永続化する。
 *
 * Validates: Requirements 18.2, 18.3
 */
export function useAgentTier(): UseAgentTierReturn {
  const [tierData, setTierData] = useState<MapTierData>({});

  // マウント時に localStorage から読み込み
  useEffect(() => {
    setTierData(loadTierData());
  }, []);

  const setTier = useCallback((mapId: string, agentId: string, tier: TierRank) => {
    setTierData((prev) => {
      const updated: MapTierData = {
        ...prev,
        [mapId]: {
          ...prev[mapId],
          [agentId]: tier,
        },
      };
      saveTierData(updated);
      return updated;
    });
  }, []);

  const getTier = useCallback(
    (mapId: string, agentId: string): TierRank => {
      return tierData[mapId]?.[agentId] ?? "B";
    },
    [tierData],
  );

  return { tierData, setTier, getTier };
}
