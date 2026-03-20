import { getRankByValue, DEFAULT_RANK, RANKS } from './constants/ranks';

/**
 * Valorant プレイヤー情報（Henrik-3 API またはデモモードから取得）
 */
export interface ValorantPlayerInfo {
  name: string;
  tag: string;
  displayName: string;
  rank: string;
  rankValue: number;
  peakRank: string;
  peakRankValue: number;
  /** データ取得元: 'api' = Henrik API, 'demo' = デモモード（ランダム生成） */
  source: 'api' | 'demo';
  /** デバッグ用: フォールバック理由（本番では削除） */
  _debug?: string;
}

/** Henrik-3 API v2 MMR レスポンスの型定義 */
interface HenrikMMRResponse {
  status: number;
  data?: {
    name?: string;
    tag?: string;
    current_data?: {
      currenttier?: number;
      currenttierpatched?: string;
    };
    highest_rank?: {
      tier?: number;
      patched_tier?: string;
    };
  };
}

const HENRIK_API_BASE = 'https://api.henrikdev.xyz';
const DEFAULT_REGION = 'ap';

/**
 * Henrik-3 API 経由でプレイヤーのランク情報を取得する。
 * API キーが未設定またはエラー時はデモモードにフォールバックする。
 */
export async function resolveRank(
  name: string,
  tag: string
): Promise<ValorantPlayerInfo> {
  const apiKey = process.env.VALORANT_API_KEY;

  if (!apiKey) {
    const demo = generateDemoPlayerInfo(name, tag);
    demo._debug = 'NO_API_KEY';
    return demo;
  }

  try {
    return await fetchFromHenrikAPI(name, tag, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Valorant API] フォールバック発生:', message);
    const demo = generateDemoPlayerInfo(name, tag);
    demo._debug = message;
    return demo;
  }
}

/**
 * Henrik-3 API v2 MMR エンドポイントからプレイヤー情報を取得する
 */
async function fetchFromHenrikAPI(
  name: string,
  tag: string,
  apiKey: string
): Promise<ValorantPlayerInfo> {
  // v2 エンドポイントを使用（v3 はレスポンス構造が異なるため）
  const url = `${HENRIK_API_BASE}/valorant/v2/mmr/${DEFAULT_REGION}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Henrik API error: ${response.status} ${body}`);
  }

  const json: HenrikMMRResponse = await response.json();

  if (!json.data) {
    throw new Error('Henrik API returned no data');
  }

  // Henrik API の tier ID (3=Iron1 ... 27=Radiant) → うちの value (1〜25) に変換
  const currentTierId = json.data.current_data?.currenttier;
  const currentRank = currentTierId != null && currentTierId >= 3
    ? getRankByValue(currentTierId - 2)
    : undefined;

  const peakTierId = json.data.highest_rank?.tier;
  const peakRank = peakTierId != null && peakTierId >= 3
    ? getRankByValue(peakTierId - 2)
    : undefined;

  // currenttierpatched が "Gold 2" のような文字列を返すので、それも使える
  const resolvedCurrentRank = currentRank ?? DEFAULT_RANK;
  const resolvedPeakRank = peakRank ?? resolvedCurrentRank;

  return {
    name: json.data.name ?? name,
    tag: json.data.tag ?? tag,
    displayName: `${json.data.name ?? name}#${json.data.tag ?? tag}`,
    rank: json.data.current_data?.currenttierpatched ?? resolvedCurrentRank.label,
    rankValue: resolvedCurrentRank.value,
    peakRank: json.data.highest_rank?.patched_tier ?? resolvedPeakRank.label,
    peakRankValue: resolvedPeakRank.value,
    source: 'api',
  };
}


/**
 * デモモード: ランダムなランク情報を生成する。
 * peak_rank は current_rank 以上の値になる。
 */
export function generateDemoPlayerInfo(
  name: string,
  tag: string
): ValorantPlayerInfo {
  const maxRankValue = RANKS.length; // 25
  const rankValue = Math.floor(Math.random() * maxRankValue) + 1;
  const currentRank = getRankByValue(rankValue) ?? DEFAULT_RANK;

  // peak_rank は current_rank 以上
  const peakRankValue =
    rankValue + Math.floor(Math.random() * (maxRankValue - rankValue + 1));
  const peakRank = getRankByValue(peakRankValue) ?? currentRank;

  return {
    name,
    tag,
    displayName: `${name}#${tag}`,
    rank: currentRank.label,
    rankValue: currentRank.value,
    peakRank: peakRank.label,
    peakRankValue: peakRank.value,
    source: 'demo',
  };
}
