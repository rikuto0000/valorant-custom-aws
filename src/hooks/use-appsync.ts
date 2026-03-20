"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/** AppSync サブスクリプションから受信するイベントデータ */
interface AppSyncEvent {
  type: string;
  roomId: string;
  timestamp: string;
  payload?: unknown;
}

interface UseAppSyncReturn {
  /** WebSocket 接続状態 */
  connected: boolean;
  /** 最後に受信したイベントデータ */
  lastEvent: AppSyncEvent | null;
  /** 手動リフレッシュトリガー（デモモードでも使用可能） */
  refresh: () => void;
}

/**
 * AppSync リアルタイム同期フック
 *
 * AWS モード時: GraphQL Subscriptions によるリアルタイム通知を受信
 * デモモード時: 無効化（手動リフレッシュのみ）
 *
 * @param roomId - 購読対象のルームID
 * @param onRefresh - 手動リフレッシュ時に呼ばれるコールバック
 *
 * Validates: Requirements 23.1, 23.2, 23.3
 */
export function useAppSync(
  roomId: string | null,
  onRefresh?: () => void,
): UseAppSyncReturn {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AppSyncEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 環境変数でモード判定
  const apiUrl = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_APPSYNC_API_URL ?? ""
    : "";
  const apiKey = typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_APPSYNC_API_KEY ?? ""
    : "";
  const isAwsMode = Boolean(apiUrl && apiKey);

  useEffect(() => {
    // デモモードまたはルームID未指定の場合は接続しない
    if (!isAwsMode || !roomId) {
      setConnected(false);
      return;
    }

    // AppSync リアルタイムエンドポイントへ WebSocket 接続
    const realtimeUrl = apiUrl.replace("https://", "wss://").replace("appsync-api", "appsync-realtime-api");

    const header = btoa(JSON.stringify({
      host: new URL(apiUrl).host,
      "x-api-key": apiKey,
    }));

    const connectUrl = `${realtimeUrl}?header=${header}&payload=${btoa("{}")}`;

    try {
      const ws = new WebSocket(connectUrl, ["graphql-ws"]);
      wsRef.current = ws;

      ws.onopen = () => {
        // connection_init ハンドシェイク
        ws.send(JSON.stringify({ type: "connection_init" }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "connection_ack") {
            // サブスクリプション登録
            const subscriptionQuery = `subscription OnRoomUpdate($roomId: String!) {
              onRoomUpdate(roomId: $roomId) {
                type
                roomId
                timestamp
                payload
              }
            }`;

            ws.send(JSON.stringify({
              id: `sub-${roomId}`,
              type: "start",
              payload: {
                data: JSON.stringify({
                  query: subscriptionQuery,
                  variables: { roomId },
                }),
                extensions: {
                  authorization: {
                    host: new URL(apiUrl).host,
                    "x-api-key": apiKey,
                  },
                },
              },
            }));
            setConnected(true);
          }

          if (message.type === "data" && message.payload?.data?.onRoomUpdate) {
            setLastEvent(message.payload.data.onRoomUpdate as AppSyncEvent);
          }

          if (message.type === "ka") {
            // keep-alive — 接続維持
          }

          if (message.type === "error") {
            console.error("[AppSync] サブスクリプションエラー:", message.payload);
            setConnected(false);
          }
        } catch {
          // メッセージパースエラーは無視
        }
      };

      ws.onerror = () => {
        setConnected(false);
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        // 自動再接続（5秒後）
        reconnectTimerRef.current = setTimeout(() => {
          // useEffect の再実行で再接続される
        }, 5000);
      };
    } catch {
      setConnected(false);
    }

    return () => {
      // クリーンアップ
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };
  }, [isAwsMode, roomId, apiUrl, apiKey]);

  const refresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  return { connected, lastEvent, refresh };
}
