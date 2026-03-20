import { describe, it, expect } from 'vitest';
import { POST } from '../route';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

describe('POST /api/rooms', () => {
  it('creates a new room and returns 201 with room data', async () => {
    const response = await POST();

    expect(response.status).toBe(201);

    const body = await response.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toMatch(UUID_V4_REGEX);
    expect(body.data.status).toBe('waiting');
    expect(body.data.rank_mode).toBe('current');
    expect(body.data.created_at).toMatch(ISO_8601_REGEX);
  });

  it('returns SuccessResponse<Room> shape', async () => {
    const response = await POST();
    const body = await response.json();

    expect(body).toHaveProperty('data');
    expect(body.data).toHaveProperty('id');
    expect(body.data).toHaveProperty('created_at');
    expect(body.data).toHaveProperty('status');
    expect(body.data).toHaveProperty('rank_mode');
  });

  it('creates unique rooms on successive calls', async () => {
    const res1 = await POST();
    const res2 = await POST();
    const body1 = await res1.json();
    const body2 = await res2.json();

    expect(body1.data.id).not.toBe(body2.data.id);
  });
});
