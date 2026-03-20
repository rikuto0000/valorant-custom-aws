import type { MapData } from '../types';
import { MAPS } from '../constants/maps';

/**
 * マップリストからランダムに1つ選択する
 *
 * @param maps - 選択対象のマップリスト
 * @returns ランダムに選択されたマップ
 */
export function randomMapSelect(maps: MapData[]): MapData {
  const index = Math.floor(Math.random() * maps.length);
  return maps[index];
}

/**
 * 投票結果から最多得票のマップを選択する。
 * 同票の場合はランダムに1つを選択する。
 *
 * @param votes - { [mapId]: voterIds[] } 形式の投票結果
 * @returns 選択されたマップ
 */
export function resolveMapVote(votes: Record<string, string[]>): MapData {
  // 得票数を集計
  const entries = Object.entries(votes);

  // 最多得票数を取得
  let maxVotes = 0;
  for (const [, voters] of entries) {
    if (voters.length > maxVotes) {
      maxVotes = voters.length;
    }
  }

  // 最多得票のマップIDを収集
  const topMapIds = entries
    .filter(([, voters]) => voters.length === maxVotes)
    .map(([mapId]) => mapId);

  // 同票の場合はランダムに1つ選択
  const selectedId = topMapIds[Math.floor(Math.random() * topMapIds.length)];

  // MAPS 定数からマップデータを取得
  const map = MAPS.find((m) => m.id === selectedId);
  if (map) return map;

  // フォールバック: マップIDが定数に見つからない場合は最小限のデータを返す
  return { id: selectedId, name: selectedId, image: '' };
}
