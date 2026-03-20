import Link from "next/link";
import { getStore } from "@/lib/store";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoomClient } from "./room-client";

export default async function RoomPage(props: PageProps<'/room/[roomId]'>) {
  const { roomId } = await props.params;
  const store = getStore();

  const room = await store.getRoom(roomId);

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">ルームが見つかりません</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-val-light-muted">
              指定されたルームは存在しないか、有効期限が切れています。
            </p>
            <Button asChild variant="outline">
              <Link href="/">トップページに戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const players = await store.getPlayers(roomId);

  return <RoomClient room={room} initialPlayers={players} />;
}
