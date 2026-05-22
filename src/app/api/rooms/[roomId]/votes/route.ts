import { type NextRequest } from 'next/server';
import { getStore } from '@/lib/store';
import type {
  ErrorResponse,
  RoomVote,
  RoomVoteKind,
  SuccessResponse,
} from '@/lib/types';

const VOTE_KINDS = new Set<RoomVoteKind>(['ban', 'map']);

function parseKind(value: string | null): RoomVoteKind | null {
  if (!value || !VOTE_KINDS.has(value as RoomVoteKind)) return null;
  return value as RoomVoteKind;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  try {
    const { roomId } = await params;
    const kind = parseKind(request.nextUrl.searchParams.get('kind'));
    if (!kind) {
      return Response.json(
        {
          error: {
            code: 'INVALID_VOTE_KIND',
            message: 'kind は ban または map を指定してください',
          },
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

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
        { status: 404 },
      );
    }

    const votes = await store.getRoomVotes(roomId, kind);
    return Response.json({ data: votes } satisfies SuccessResponse<RoomVote[]>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '投票情報の取得に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const {
      kind,
      playerId,
      choices,
    } = body as {
      kind?: string;
      playerId?: string;
      choices?: unknown;
    };
    const voteKind = parseKind(kind ?? null);

    if (!voteKind || !playerId || !Array.isArray(choices)) {
      return Response.json(
        {
          error: {
            code: 'INVALID_VOTE',
            message: 'kind, playerId, choices が必要です',
          },
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const normalizedChoices = choices
      .filter((choice): choice is string => typeof choice === 'string')
      .filter(Boolean);
    const expectedChoiceCount = voteKind === 'ban' ? 2 : 1;
    if (normalizedChoices.length !== expectedChoiceCount) {
      return Response.json(
        {
          error: {
            code: 'INVALID_CHOICE_COUNT',
            message: voteKind === 'ban'
              ? 'BAN投票は2体選択してください'
              : 'マップ投票は1つ選択してください',
          },
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    const store = getStore();
    const players = await store.getPlayers(roomId);
    if (!players.some((player) => player.id === playerId)) {
      return Response.json(
        {
          error: {
            code: 'PLAYER_NOT_FOUND',
            message: 'このルームの参加者として登録されていません',
          },
        } satisfies ErrorResponse,
        { status: 403 },
      );
    }

    const vote = await store.upsertRoomVote(
      roomId,
      voteKind,
      playerId,
      normalizedChoices,
    );
    return Response.json({ data: vote } satisfies SuccessResponse<RoomVote>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '投票の保存に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
): Promise<Response> {
  try {
    const { roomId } = await params;
    const kind = parseKind(request.nextUrl.searchParams.get('kind'));
    if (!kind) {
      return Response.json(
        {
          error: {
            code: 'INVALID_VOTE_KIND',
            message: 'kind は ban または map を指定してください',
          },
        } satisfies ErrorResponse,
        { status: 400 },
      );
    }

    await getStore().clearRoomVotes(roomId, kind);
    return Response.json({
      data: { success: true },
    } satisfies SuccessResponse<{ success: true }>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '投票のリセットに失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 },
    );
  }
}
