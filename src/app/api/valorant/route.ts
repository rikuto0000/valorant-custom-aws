import { type NextRequest } from 'next/server';
import { resolveRank } from '@/lib/valorant-api';
import type { SuccessResponse, ErrorResponse } from '@/lib/types';
import type { ValorantPlayerInfo } from '@/lib/valorant-api';

// GET /api/valorant?name={name}&tag={tag} — Valorant ランク情報取得プロキシ
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const name = request.nextUrl.searchParams.get('name');
    const tag = request.nextUrl.searchParams.get('tag');

    if (!name || !tag) {
      return Response.json(
        {
          error: {
            code: 'MISSING_PARAMS',
            message: 'name と tag クエリパラメータが必要です',
          },
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const playerInfo = await resolveRank(name, tag);

    return Response.json({
      data: playerInfo,
    } satisfies SuccessResponse<ValorantPlayerInfo>);
  } catch {
    return Response.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'ランク情報の取得に失敗しました',
        },
      } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
