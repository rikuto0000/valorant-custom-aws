import type { Agent, AgentRole } from '../types';

/**
 * 全エージェント定数定義
 * Duelist 8体, Initiator 7体, Controller 6体, Sentinel 7体 = 計28体
 */
export const AGENTS: Agent[] = [
  // === Duelist (8) ===
  { id: 'jett', name: 'Jett', nameJa: 'ジェット', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/jett.jpg' },
  { id: 'phoenix', name: 'Phoenix', nameJa: 'フェニックス', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/phoenix.jpg' },
  { id: 'reyna', name: 'Reyna', nameJa: 'レイナ', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/reyna.jpg' },
  { id: 'raze', name: 'Raze', nameJa: 'レイズ', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/raze.jpg' },
  { id: 'yoru', name: 'Yoru', nameJa: 'ヨル', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/yoru.jpg' },
  { id: 'neon', name: 'Neon', nameJa: 'ネオン', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/neon.jpg' },
  { id: 'iso', name: 'Iso', nameJa: 'アイソ', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/iso.jpg' },
  { id: 'waylay', name: 'Waylay', nameJa: 'ウェイレイ', role: 'Duelist', roleJa: 'デュエリスト', image: '/images/agents/waylay.jpg' },

  // === Initiator (7) ===
  { id: 'breach', name: 'Breach', nameJa: 'ブリーチ', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/breach.jpg' },
  { id: 'sova', name: 'Sova', nameJa: 'ソヴァ', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/sova.jpg' },
  { id: 'skye', name: 'Skye', nameJa: 'スカイ', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/skye.jpg' },
  { id: 'kayo', name: 'KAY/O', nameJa: 'ケイ/オー', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/kayo.jpg' },
  { id: 'fade', name: 'Fade', nameJa: 'フェイド', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/fade.jpg' },
  { id: 'gekko', name: 'Gekko', nameJa: 'ゲッコー', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/gekko.jpg' },
  { id: 'tejo', name: 'Tejo', nameJa: 'テホ', role: 'Initiator', roleJa: 'イニシエーター', image: '/images/agents/tejo.jpg' },

  // === Controller (6) ===
  { id: 'brimstone', name: 'Brimstone', nameJa: 'ブリムストーン', role: 'Controller', roleJa: 'コントローラー', image: '/images/agents/brimstone.jpg' },
  { id: 'viper', name: 'Viper', nameJa: 'ヴァイパー', role: 'Controller', roleJa: 'コントローラー', image: '/images/agents/viper.jpg' },
  { id: 'omen', name: 'Omen', nameJa: 'オーメン', role: 'Controller', roleJa: 'コントローラー', image: '/images/agents/omen.jpg' },
  { id: 'astra', name: 'Astra', nameJa: 'アストラ', role: 'Controller', roleJa: 'コントローラー', image: '/images/agents/astra.jpg' },
  { id: 'harbor', name: 'Harbor', nameJa: 'ハーバー', role: 'Controller', roleJa: 'コントローラー', image: '/images/agents/harbor.jpg' },
  { id: 'clove', name: 'Clove', nameJa: 'クローヴ', role: 'Controller', roleJa: 'コントローラー', image: '/images/agents/clove.jpg' },

  // === Sentinel (7) ===
  { id: 'sage', name: 'Sage', nameJa: 'セージ', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/sage.jpg' },
  { id: 'cypher', name: 'Cypher', nameJa: 'サイファー', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/cypher.jpg' },
  { id: 'killjoy', name: 'Killjoy', nameJa: 'キルジョイ', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/killjoy.jpg' },
  { id: 'chamber', name: 'Chamber', nameJa: 'チェンバー', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/chamber.jpg' },
  { id: 'deadlock', name: 'Deadlock', nameJa: 'デッドロック', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/deadlock.jpg' },
  { id: 'vyse', name: 'Vyse', nameJa: 'ヴァイス', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/vyse.jpg' },
  { id: 'veto', name: 'Veto', nameJa: 'ヴィト', role: 'Sentinel', roleJa: 'センチネル', image: '/images/agents/veto.jpeg' },
];

/** ロール別エージェントマップ */
export const AGENTS_BY_ROLE: Record<AgentRole, Agent[]> = {
  Duelist: AGENTS.filter((a) => a.role === 'Duelist'),
  Initiator: AGENTS.filter((a) => a.role === 'Initiator'),
  Controller: AGENTS.filter((a) => a.role === 'Controller'),
  Sentinel: AGENTS.filter((a) => a.role === 'Sentinel'),
};

/** IDからエージェントを検索 */
export function getAgentById(id: string): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}
