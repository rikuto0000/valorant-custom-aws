import { type NextRequest } from 'next/server';
import { getStore } from '@/lib/store';
import type {
  SuccessResponse,
  ErrorResponse,
  Player,
  PlayerInput,
  Room,
  Team,
  RoomStatus,
  RankMode,
} from '@/lib/types';

// GET /api/rooms/[roomId] — ルーム情報 + プレイヤー一覧取得
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  try {
    const { roomId } = await params;
    const store = getStore();

    const room = await store.getRoom(roomId);
    if (!room) {
      return Response.json(
        {
          error: {
            code: 'ROOM_NOT_FOUND',
            message: 'ルームが見つかりません',
          },
        } satisfies ErrorResponse,
        { status: 404 }
      );
    }

    const players = await store.getPlayers(roomId);

    return Response.json({
      data: { room, players },
    } satisfies SuccessResponse<{ room: Room; players: Player[] }>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ルーム情報の取得に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

// POST /api/rooms/[roomId] — プレイヤー追加
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  try {
    const { roomId } = await params;
    const store = getStore();
    const body = (await request.json()) as PlayerInput;

    const player = await store.addPlayer(roomId, body);

    return Response.json({ data: player } satisfies SuccessResponse<Player>, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('既に')) {
      return Response.json(
        {
          error: {
            code: 'DUPLICATE_PLAYER',
            message: error.message,
          },
        } satisfies ErrorResponse,
        { status: 409 }
      );
    }

    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'プレイヤーの追加に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

// PATCH /api/rooms/[roomId] — ルーム/プレイヤー更新
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  try {
    const { roomId } = await params;
    const store = getStore();
    const body = await request.json();
    const { action } = body as { action: string };

    switch (action) {
      case 'updateTeam': {
        const { playerId, team } = body as { playerId: string; team: Team };
        await store.updatePlayerTeam(roomId, playerId, team);
        break;
      }
      case 'updateStatus': {
        const { status } = body as { status: RoomStatus };
        await store.updateRoomStatus(roomId, status);
        break;
      }
      case 'updateRankMode': {
        const { rankMode } = body as { rankMode: RankMode };
        await store.updateRoomRankMode(roomId, rankMode);
        break;
      }
      case 'resetTeams': {
        await store.resetTeams(roomId);
        break;
      }
      default:
        return Response.json(
          {
            error: {
              code: 'INVALID_ACTION',
              message: `不明なアクション: ${action}`,
            },
          } satisfies ErrorResponse,
          { status: 400 }
        );
    }

    return Response.json({
      data: { success: true },
    } satisfies SuccessResponse<{ success: true }>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ルームの更新に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}

// DELETE /api/rooms/[roomId]?playerId={id} — プレイヤー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
): Promise<Response> {
  try {
    const { roomId } = await params;
    const playerId = request.nextUrl.searchParams.get('playerId');

    if (!playerId) {
      return Response.json(
        {
          error: {
            code: 'MISSING_PLAYER_ID',
            message: 'playerId クエリパラメータが必要です',
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const store = getStore();
    await store.deletePlayer(roomId, playerId);

    return Response.json({
      data: { success: true },
    } satisfies SuccessResponse<{ success: true }>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'プレイヤーの削除に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
