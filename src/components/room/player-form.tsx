"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { RANKS, DEFAULT_RANK } from "@/lib/constants/ranks";
import type { Player, PlayerInput } from "@/lib/types";
import { cn } from "@/lib/cn";

type InputMode = "api" | "manual";

interface PlayerFormProps {
  roomId: string;
  title?: string;
  submitLabel?: string;
  apiLabel?: string;
  showManualMode?: boolean;
  defaultRiotId?: string;
  demoWarningMessage?: string;
  onPlayerAdded: (playerInput: PlayerInput) => Promise<Player | null>;
}

export function PlayerForm({
  title = "プレイヤー追加",
  submitLabel = "追加",
  apiLabel = "API取得",
  showManualMode = true,
  defaultRiotId = "",
  demoWarningMessage = "⚠ API取得に失敗したため、ランダムなランクが割り当てられました。手動入力で修正できます。",
  onPlayerAdded,
}: PlayerFormProps) {
  const formId = useId();
  const [mode, setMode] = useState<InputMode>("api");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // API mode state
  const [riotId, setRiotId] = useState(defaultRiotId);
  const [demoWarning, setDemoWarning] = useState(false);

  // Manual mode state
  const [displayName, setDisplayName] = useState("");
  const [currentRankValue, setCurrentRankValue] = useState(DEFAULT_RANK.value);
  const [peakRankValue, setPeakRankValue] = useState(DEFAULT_RANK.value);

  useEffect(() => {
    if (defaultRiotId && !riotId) {
      setRiotId(defaultRiotId);
    }
  }, [defaultRiotId, riotId]);

  function resetForm() {
    setRiotId("");
    setDisplayName("");
    setCurrentRankValue(DEFAULT_RANK.value);
    setPeakRankValue(DEFAULT_RANK.value);
    setError("");
  }

  async function handleApiSubmit() {
    const trimmed = riotId.trim();
    if (!trimmed) {
      setError("Riot IDを入力してください");
      return;
    }
    if (!trimmed.includes("#")) {
      setError("Riot IDは Name#Tag の形式で入力してください");
      return;
    }

    const [name, tag] = trimmed.split("#");
    if (!name || !tag) {
      setError("Riot IDは Name#Tag の形式で入力してください");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // Valorant API でランク情報取得
      const apiRes = await fetch(
        `/api/valorant?name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`
      );
      const apiJson = await apiRes.json();

      if (!apiRes.ok) {
        setError(apiJson.error?.message ?? "ランク情報の取得に失敗しました");
        return;
      }

      const info = apiJson.data;

      // API取得失敗でデモモードにフォールバックした場合は警告表示
      if (info.source === 'demo') {
        setDemoWarning(true);
      } else {
        setDemoWarning(false);
      }

      const playerInput: PlayerInput = {
        riot_id: `${info.name}#${info.tag}`,
        display_name: info.displayName ?? `${info.name}#${info.tag}`,
        rank: info.rank,
        rank_value: info.rankValue,
        peak_rank: info.peakRank,
        peak_rank_value: info.peakRankValue,
      };

      const added = await onPlayerAdded(playerInput);
      if (added) {
        resetForm();
      }
    } catch {
      setError("プレイヤーの追加に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit() {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("プレイヤー名を入力してください");
      return;
    }

    const currentRank = RANKS.find((r) => r.value === currentRankValue);
    const peakRank = RANKS.find((r) => r.value === peakRankValue);

    if (!currentRank || !peakRank) {
      setError("ランクを選択してください");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const playerInput: PlayerInput = {
        riot_id: `manual_${trimmedName}_${Date.now()}`,
        display_name: trimmedName,
        rank: currentRank.label,
        rank_value: currentRank.value,
        peak_rank: peakRank.label,
        peak_rank_value: peakRank.value,
      };

      const added = await onPlayerAdded(playerInput);
      if (added) {
        resetForm();
      }
    } catch {
      setError("プレイヤーの追加に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "api") {
      handleApiSubmit();
    } else {
      handleManualSubmit();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* モード切替タブ */}
        {showManualMode && (
          <div className="flex gap-1 mb-4 p-1 rounded-md bg-val-dark">
            <button
              type="button"
              className={cn(
                "flex-1 py-1.5 px-3 text-sm rounded transition-colors",
                mode === "api"
                  ? "bg-val-dark-alt text-val-light font-medium"
                  : "text-val-light-dim hover:text-val-light"
              )}
              onClick={() => { setMode("api"); setError(""); }}
            >
              {apiLabel}
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 py-1.5 px-3 text-sm rounded transition-colors",
                mode === "manual"
                  ? "bg-val-dark-alt text-val-light font-medium"
                  : "text-val-light-dim hover:text-val-light"
              )}
              onClick={() => { setMode("manual"); setError(""); }}
            >
              手動入力
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "api" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-riot-id`}>Riot ID</Label>
              <Input
                id={`${formId}-riot-id`}
                placeholder="Name#Tag"
                value={riotId}
                onChange={(e) => {
                  setRiotId(e.target.value);
                  if (error) setError("");
                }}
                disabled={loading}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-display-name`}>プレイヤー名</Label>
                <Input
                  id={`${formId}-display-name`}
                  placeholder="表示名を入力"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-current-rank`}>現在ランク</Label>
                  <select
                    id={`${formId}-current-rank`}
                    className="flex h-10 w-full rounded-md border border-val-input-border bg-val-input-bg px-3 py-2 text-sm text-val-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-val-ring"
                    value={currentRankValue}
                    onChange={(e) => setCurrentRankValue(Number(e.target.value))}
                    disabled={loading}
                  >
                    {RANKS.map((rank) => (
                      <option key={rank.value} value={rank.value}>
                        {rank.labelJa}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-peak-rank`}>最高ランク</Label>
                  <select
                    id={`${formId}-peak-rank`}
                    className="flex h-10 w-full rounded-md border border-val-input-border bg-val-input-bg px-3 py-2 text-sm text-val-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-val-ring"
                    value={peakRankValue}
                    onChange={(e) => setPeakRankValue(Number(e.target.value))}
                    disabled={loading}
                  >
                    {RANKS.map((rank) => (
                      <option key={rank.value} value={rank.value}>
                        {rank.labelJa}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-val-red">{error}</p>
          )}

          {demoWarning && (
            <p className="text-sm text-yellow-400">
              {demoWarningMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-val-light border-t-transparent" />
                取得中...
              </span>
            ) : (
              submitLabel
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
