'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { AGENTS } from '@/lib/constants/agents';
import { teamBan, voteBan } from '@/lib/algorithms/agent-picker';
import { getAgentById } from '@/lib/constants/agents';
import { useRoomVotes } from '@/hooks/use-room-votes';
import { AgentIcon } from './agent-icon';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Player } from '@/lib/types';

type BanMode = 'team' | 'vote';
type TeamBanPhase = 'teamA' | 'teamB' | 'done';

export interface BanPanelProps {
  roomId: string;
  players: Player[];
  participantPlayerId: string | null;
  onBanComplete: (bannedIds: string[]) => void;
}

export function BanPanel({
  roomId,
  players,
  participantPlayerId,
  onBanComplete,
}: BanPanelProps) {
  const [banMode, setBanMode] = useState<BanMode>('team');
  const {
    votes: roomVotes,
    loading: votesLoading,
    error: votesError,
    submitVote,
    clearVotes,
  } = useRoomVotes(roomId, 'ban');

  // Team BAN state
  const [teamBanPhase, setTeamBanPhase] = useState<TeamBanPhase>('teamA');
  const [teamABan, setTeamABan] = useState<string | null>(null);
  const [, setTeamBBan] = useState<string | null>(null);

  // Vote BAN state
  const [currentVotes, setCurrentVotes] = useState<string[]>([]);
  const requiredVoteCount = Math.min(10, players.length);
  const ownVote = participantPlayerId
    ? roomVotes.find((vote) => vote.player_id === participantPlayerId) ?? null
    : null;

  // Result state
  const [bannedIds, setBannedIds] = useState<string[] | null>(null);

  const handleSkip = useCallback(() => {
    onBanComplete([]);
  }, [onBanComplete]);

  // === Team BAN handlers ===
  const handleTeamBanSelect = useCallback((agentId: string) => {
    if (teamBanPhase === 'teamA') {
      setTeamABan(agentId);
      setTeamBanPhase('teamB');
    } else if (teamBanPhase === 'teamB') {
      setTeamBBan(agentId);
      const result = teamBan(teamABan!, agentId);
      setBannedIds(result);
      setTeamBanPhase('done');
    }
  }, [teamBanPhase, teamABan]);

  // === Vote BAN handlers ===
  const handleVoteSelect = useCallback((agentId: string) => {
    if (ownVote) return;
    setCurrentVotes((prev) => {
      if (prev.includes(agentId)) {
        return prev.filter((id) => id !== agentId);
      }
      if (prev.length >= 2) return prev;
      return [...prev, agentId];
    });
  }, [ownVote]);

  const handleVoteConfirm = useCallback(async () => {
    if (!participantPlayerId || currentVotes.length !== 2) return;
    const ok = await submitVote(participantPlayerId, currentVotes);
    if (ok) {
      setCurrentVotes([]);
    }
  }, [currentVotes, participantPlayerId, submitVote]);

  const handleRevealVotes = useCallback(() => {
    if (roomVotes.length < requiredVoteCount) return;
    const voteRecord = Object.fromEntries(
      roomVotes.map((vote) => [vote.player_id, vote.choices]),
    );
    const result = voteBan(voteRecord);
    setBannedIds(result);
  }, [requiredVoteCount, roomVotes]);

  const handleResetVoteBan = useCallback(async () => {
    await clearVotes();
    setCurrentVotes([]);
    setBannedIds(null);
  }, [clearVotes]);

  const handleConfirmBan = useCallback(() => {
    if (bannedIds) {
      onBanComplete(bannedIds);
    }
  }, [bannedIds, onBanComplete]);

  // Already banned in team mode (to grey out)
  const teamBannedSet = new Set<string>();
  if (teamABan) teamBannedSet.add(teamABan);

  // === Render BAN result ===
  if (bannedIds) {
    const bannedAgents = bannedIds.map((id) => getAgentById(id)).filter(Boolean);
    return (
      <Card>
        <CardHeader>
          <CardTitle>BAN結果</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 justify-center">
            {bannedAgents.map((agent) => agent && (
              <div key={agent.id} className="flex flex-col items-center gap-1">
                <div className="relative">
                  <AgentIcon agent={agent} size="lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-val-red">✕</span>
                  </div>
                </div>
                <span className="text-sm text-val-light-muted">{agent.nameJa}</span>
              </div>
            ))}
            {bannedIds.length === 0 && (
              <p className="text-val-light-muted">BANなし</p>
            )}
          </div>
          <div className="flex justify-center">
            <Button onClick={handleConfirmBan}>確定して次へ</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>エージェントBAN</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={banMode === 'team' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setBanMode('team');
              setTeamBanPhase('teamA');
              setTeamABan(null);
              setTeamBBan(null);
              setBannedIds(null);
            }}
          >
            チームBAN
          </Button>
          <Button
            variant={banMode === 'vote' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              setBanMode('vote');
              setCurrentVotes([]);
              setBannedIds(null);
            }}
          >
            投票BAN
          </Button>
          <Button variant="ghost" size="sm" onClick={handleSkip}>
            スキップ
          </Button>
        </div>

        {/* Team BAN mode */}
        {banMode === 'team' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant={teamBanPhase === 'teamA' ? 'default' : 'secondary'}>
                チームA
              </Badge>
              <span className="text-val-light-dim">→</span>
              <Badge variant={teamBanPhase === 'teamB' ? 'default' : 'secondary'}>
                チームB
              </Badge>
              {teamABan && (
                <span className="ml-2 text-sm text-val-light-muted">
                  チームA BAN: {getAgentById(teamABan)?.nameJa}
                </span>
              )}
            </div>
            <p className="text-sm text-val-light-muted">
              {teamBanPhase === 'teamA'
                ? 'チームA: BANするエージェントを選択'
                : 'チームB: BANするエージェントを選択'}
            </p>
            <AgentGrid
              onSelect={handleTeamBanSelect}
              disabledIds={teamBannedSet}
              selectedIds={new Set()}
            />
          </div>
        )}

        {/* Vote BAN mode */}
        {banMode === 'vote' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge>投票済み {roomVotes.length}/{requiredVoteCount}</Badge>
              <span className="text-sm text-val-light-muted">
                {requiredVoteCount}票集まったら開示できます
              </span>
            </div>
            <p className="text-sm text-val-light-muted">
              各参加者がBANしたいエージェントを2体選択してください
            </p>
            {!participantPlayerId && (
              <p className="text-sm text-yellow-400">
                自分のIDで参加すると投票できます。
              </p>
            )}
            {ownVote && (
              <div className="rounded-md border border-val-border bg-val-dark-alt p-3 text-sm text-val-light-muted">
                投票済み: {ownVote.choices
                  .map((id) => getAgentById(id)?.nameJa ?? id)
                  .join(' / ')}
              </div>
            )}
            {votesError && (
              <p className="text-sm text-val-red">{votesError}</p>
            )}
            <AgentGrid
              onSelect={handleVoteSelect}
              disabledIds={new Set(ownVote ? AGENTS.map((agent) => agent.id) : [])}
              selectedIds={new Set(ownVote?.choices ?? currentVotes)}
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                size="sm"
                disabled={!participantPlayerId || Boolean(ownVote) || currentVotes.length !== 2 || votesLoading}
                onClick={handleVoteConfirm}
              >
                {ownVote ? '投票済み' : `投票する (${currentVotes.length}/2)`}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={roomVotes.length < requiredVoteCount}
                onClick={handleRevealVotes}
              >
                開示する
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetVoteBan}
              >
                投票をリセット
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// === Agent Grid sub-component ===
interface AgentGridProps {
  onSelect: (agentId: string) => void;
  disabledIds: Set<string>;
  selectedIds: Set<string>;
}

function AgentGrid({ onSelect, disabledIds, selectedIds }: AgentGridProps) {
  return (
    <div className="grid grid-cols-7 gap-2 sm:grid-cols-10">
      {AGENTS.map((agent) => {
        const isDisabled = disabledIds.has(agent.id);
        const isSelected = selectedIds.has(agent.id);
        return (
          <button
            key={agent.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelect(agent.id)}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-md p-1 transition-colors',
              isDisabled && 'opacity-30 cursor-not-allowed',
              isSelected && 'bg-val-red/20 ring-1 ring-val-red',
              !isDisabled && !isSelected && 'hover:bg-val-dark-alt cursor-pointer',
            )}
          >
            <AgentIcon agent={agent} size="sm" />
            <span className="text-[10px] leading-tight text-val-light-muted truncate w-full text-center">
              {agent.nameJa}
            </span>
          </button>
        );
      })}
    </div>
  );
}
