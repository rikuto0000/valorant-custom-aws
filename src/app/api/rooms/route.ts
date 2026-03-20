import { getStore } from '@/lib/store';
import type { SuccessResponse, ErrorResponse, Room } from '@/lib/types';

export async function POST(): Promise<Response> {
  try {
    const store = getStore();
    const room = await store.createRoom();

    return Response.json({ data: room } satisfies SuccessResponse<Room>, {
      status: 201,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ルームの作成に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
