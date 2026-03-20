import type { RankInfo } from '../types';

/**
 * VALORANT ランク定数（Iron 1 〜 Radiant の25段階）
 * 各ランクの tier, tierJa, subRank, value, label, labelJa, color, badgeImage を定義
 */
export const RANKS: RankInfo[] = [
  // Iron (アイアン) - value 1-3
  { tier: 'Iron', tierJa: 'アイアン', subRank: 1, value: 1, label: 'Iron 1', labelJa: 'アイアン1', color: '#3E3C3C', badgeImage: '/images/badges/アイアン1.png' },
  { tier: 'Iron', tierJa: 'アイアン', subRank: 2, value: 2, label: 'Iron 2', labelJa: 'アイアン2', color: '#3E3C3C', badgeImage: '/images/badges/アイアン2.png' },
  { tier: 'Iron', tierJa: 'アイアン', subRank: 3, value: 3, label: 'Iron 3', labelJa: 'アイアン3', color: '#3E3C3C', badgeImage: '/images/badges/アイアン3.png' },

  // Bronze (ブロンズ) - value 4-6
  { tier: 'Bronze', tierJa: 'ブロンズ', subRank: 1, value: 4, label: 'Bronze 1', labelJa: 'ブロンズ1', color: '#A5855D', badgeImage: '/images/badges/ブロンズ1.png' },
  { tier: 'Bronze', tierJa: 'ブロンズ', subRank: 2, value: 5, label: 'Bronze 2', labelJa: 'ブロンズ2', color: '#A5855D', badgeImage: '/images/badges/ブロンズ2.png' },
  { tier: 'Bronze', tierJa: 'ブロンズ', subRank: 3, value: 6, label: 'Bronze 3', labelJa: 'ブロンズ3', color: '#A5855D', badgeImage: '/images/badges/ブロンズ3.png' },

  // Silver (シルバー) - value 7-9
  { tier: 'Silver', tierJa: 'シルバー', subRank: 1, value: 7, label: 'Silver 1', labelJa: 'シルバー1', color: '#B3B3B3', badgeImage: '/images/badges/シルバー1.png' },
  { tier: 'Silver', tierJa: 'シルバー', subRank: 2, value: 8, label: 'Silver 2', labelJa: 'シルバー2', color: '#B3B3B3', badgeImage: '/images/badges/シルバー2.png' },
  { tier: 'Silver', tierJa: 'シルバー', subRank: 3, value: 9, label: 'Silver 3', labelJa: 'シルバー3', color: '#B3B3B3', badgeImage: '/images/badges/シルバー3.png' },

  // Gold (ゴールド) - value 10-12
  { tier: 'Gold', tierJa: 'ゴールド', subRank: 1, value: 10, label: 'Gold 1', labelJa: 'ゴールド1', color: '#ECB73E', badgeImage: '/images/badges/ゴールド1.png' },
  { tier: 'Gold', tierJa: 'ゴールド', subRank: 2, value: 11, label: 'Gold 2', labelJa: 'ゴールド2', color: '#ECB73E', badgeImage: '/images/badges/ゴールド2.png' },
  { tier: 'Gold', tierJa: 'ゴールド', subRank: 3, value: 12, label: 'Gold 3', labelJa: 'ゴールド3', color: '#ECB73E', badgeImage: '/images/badges/ゴールド3.png' },

  // Platinum (プラチナ) - value 13-15
  { tier: 'Platinum', tierJa: 'プラチナ', subRank: 1, value: 13, label: 'Platinum 1', labelJa: 'プラチナ1', color: '#59A9B6', badgeImage: '/images/badges/プラチナ1.png' },
  { tier: 'Platinum', tierJa: 'プラチナ', subRank: 2, value: 14, label: 'Platinum 2', labelJa: 'プラチナ2', color: '#59A9B6', badgeImage: '/images/badges/プラチナ2.png' },
  { tier: 'Platinum', tierJa: 'プラチナ', subRank: 3, value: 15, label: 'Platinum 3', labelJa: 'プラチナ3', color: '#59A9B6', badgeImage: '/images/badges/プラチナ3.png' },

  // Diamond (ダイヤ) - value 16-18
  { tier: 'Diamond', tierJa: 'ダイヤ', subRank: 1, value: 16, label: 'Diamond 1', labelJa: 'ダイヤ1', color: '#B489F0', badgeImage: '/images/badges/ダイヤ1.png' },
  { tier: 'Diamond', tierJa: 'ダイヤ', subRank: 2, value: 17, label: 'Diamond 2', labelJa: 'ダイヤ2', color: '#B489F0', badgeImage: '/images/badges/ダイヤ2.png' },
  { tier: 'Diamond', tierJa: 'ダイヤ', subRank: 3, value: 18, label: 'Diamond 3', labelJa: 'ダイヤ3', color: '#B489F0', badgeImage: '/images/badges/ダイヤ3.png' },

  // Ascendant (アセンダント) - value 19-21
  { tier: 'Ascendant', tierJa: 'アセンダント', subRank: 1, value: 19, label: 'Ascendant 1', labelJa: 'アセンダント1', color: '#2A9E6F', badgeImage: '/images/badges/アセンダント1.png' },
  { tier: 'Ascendant', tierJa: 'アセンダント', subRank: 2, value: 20, label: 'Ascendant 2', labelJa: 'アセンダント2', color: '#2A9E6F', badgeImage: '/images/badges/アセンダント2.png' },
  { tier: 'Ascendant', tierJa: 'アセンダント', subRank: 3, value: 21, label: 'Ascendant 3', labelJa: 'アセンダント3', color: '#2A9E6F', badgeImage: '/images/badges/アセンダント3.png' },

  // Immortal (イモータル) - value 22-24
  { tier: 'Immortal', tierJa: 'イモータル', subRank: 1, value: 22, label: 'Immortal 1', labelJa: 'イモータル1', color: '#BF4045', badgeImage: '/images/badges/イモータル1.png' },
  { tier: 'Immortal', tierJa: 'イモータル', subRank: 2, value: 23, label: 'Immortal 2', labelJa: 'イモータル2', color: '#BF4045', badgeImage: '/images/badges/イモータル2.png' },
  { tier: 'Immortal', tierJa: 'イモータル', subRank: 3, value: 24, label: 'Immortal 3', labelJa: 'イモータル3', color: '#BF4045', badgeImage: '/images/badges/イモータル3.png' },

  // Radiant (レディアント) - value 25
  { tier: 'Radiant', tierJa: 'レディアント', subRank: 0, value: 25, label: 'Radiant', labelJa: 'レディアント', color: '#FFFFAA', badgeImage: '/images/badges/レディアント.png' },
];

/** 数値 → RankInfo の変換マップ */
export const RANK_BY_VALUE: Map<number, RankInfo> = new Map(
  RANKS.map((rank) => [rank.value, rank])
);

/** 英語ラベル → 数値の変換マップ */
export const RANK_BY_LABEL: Map<string, number> = new Map(
  RANKS.map((rank) => [rank.label, rank.value])
);

/** デフォルトランク: Silver 2 (value: 8) */
export const DEFAULT_RANK: RankInfo = RANK_BY_VALUE.get(8)!;

/** 数値から RankInfo を取得 */
export function getRankByValue(value: number): RankInfo | undefined {
  return RANK_BY_VALUE.get(value);
}

/** 英語ラベルから数値を取得 */
export function getValueByLabel(label: string): number | undefined {
  return RANK_BY_LABEL.get(label);
}
