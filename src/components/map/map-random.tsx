'use client';

import { useState, useCallback } from 'react';
import { randomMapSelect } from '@/lib/algorithms/map-selector';
import { MAPS } from '@/lib/constants/maps';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { MapData } from '@/lib/types';

export interface MapRandomProps {
  onMapSelected?: (map: MapData) => void;
}

export function MapRandom({ onMapSelected }: MapRandomProps) {
  const [selectedMap, setSelectedMap] = useState<MapData | null>(null);

  const handleRandomSelect = useCallback(() => {
    const map = randomMapSelect(MAPS);
    setSelectedMap(map);
    onMapSelected?.(map);
  }, [onMapSelected]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>マップランダム選択</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <Button onClick={handleRandomSelect}>
            {selectedMap ? 'もう一度選ぶ' : 'ランダムで選ぶ'}
          </Button>
        </div>

        {selectedMap && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-full max-w-sm overflow-hidden rounded-lg border border-val-border">
              <img
                src={selectedMap.image}
                alt={selectedMap.name}
                className="h-48 w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-lg font-bold text-val-light">{selectedMap.name}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
