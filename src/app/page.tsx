"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractRoomId } from "@/lib/utils";

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");

  async function handleCreateRoom() {
    setIsCreating(true);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error("ルーム作成に失敗しました");
      const json = await res.json();
      router.push(`/room/${json.data.id}`);
    } catch {
      setIsCreating(false);
    }
  }

  function handleJoinRoom(e: FormEvent) {
    e.preventDefault();
    setJoinError("");
    const id = extractRoomId(roomCode.trim());
    if (id) {
      router.push(`/room/${id}`);
    } else {
      setJoinError("有効なルームコードまたはURLを入力してください");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-val-light">
            <span className="text-val-red">VALORANT</span> Custom Team Builder
          </h1>
          <p className="text-val-light-muted text-sm">
            カスタムマッチのチーム分けを簡単に。ルームを作成してURLを共有するだけ。
          </p>
        </div>

        {/* 部屋を作る */}
        <Card>
          <CardHeader>
            <CardTitle>ルームを作成</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              size="lg"
              className="w-full"
              onClick={handleCreateRoom}
              disabled={isCreating}
            >
              {isCreating ? "作成中..." : "部屋を作る"}
            </Button>
          </CardContent>
        </Card>

        {/* ルームに参加 */}
        <Card>
          <CardHeader>
            <CardTitle>ルームに参加</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="room-code">ルームコードまたはURL</Label>
                <Input
                  id="room-code"
                  placeholder="URLまたはルームコードを貼り付け"
                  value={roomCode}
                  onChange={(e) => {
                    setRoomCode(e.target.value);
                    if (joinError) setJoinError("");
                  }}
                />
                {joinError && (
                  <p className="text-sm text-val-red">{joinError}</p>
                )}
              </div>
              <Button type="submit" variant="outline" className="w-full">
                参加する
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
