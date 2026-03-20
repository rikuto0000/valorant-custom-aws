/**
 * Property-Based Tests for Utils
 * Feature: valorant-team-builder
 *
 * Tests Property 2 from the design document using fast-check.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { extractRoomId } from '../utils';

// ---------------------------------------------------------------------------
// Helpers / Arbitraries
// ---------------------------------------------------------------------------

/** Hex character arbitrary */
const hexCharArb = fc.constantFrom(
  ...'0123456789abcdef'.split(''),
);

/** Generate a fixed-length hex string */
function hexString(length: number) {
  return fc.array(hexCharArb, { minLength: length, maxLength: length })
    .map((chars) => chars.join(''));
}

/**
 * Arbitrary for valid UUID v4 strings.
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is [89ab].
 */
const uuidV4Arb = fc
  .tuple(
    hexString(8),
    hexString(4),
    hexString(3),
    fc.constantFrom('8', '9', 'a', 'b'),
    hexString(3),
    hexString(12),
  )
  .map(([p1, p2, p3, variant, p4, p5]) =>
    `${p1}-${p2}-4${p3}-${variant}${p4}-${p5}`,
  );

/** Arbitrary for surrounding text that won't accidentally contain a UUID v4 */
const surroundingTextArb = fc.array(
  fc.constantFrom(
    ...'abcdefghijklmnopqrstuvwxyz /:.?=&_'.split(''),
  ),
  { minLength: 0, maxLength: 20 },
).map((chars) => chars.join(''));

// ---------------------------------------------------------------------------
// Property 2: ルームID抽出の正確性
// Feature: valorant-team-builder, Property 2: ルームID抽出の正確性
// ---------------------------------------------------------------------------

describe('Property 2: ルームID抽出の正確性', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * For any valid UUID v4 embedded in an arbitrary string,
   * extractRoomId returns exactly that UUID (lowercased).
   */
  it('extracts the UUID from any string containing a valid UUID v4', () => {
    fc.assert(
      fc.property(
        uuidV4Arb,
        surroundingTextArb,
        surroundingTextArb,
        (uuid, prefix, suffix) => {
          const input = `${prefix}${uuid}${suffix}`;
          const result = extractRoomId(input);
          expect(result).toBe(uuid.toLowerCase());
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.2**
   *
   * For strings without any UUID v4, extractRoomId returns null.
   */
  it('returns null for strings without a UUID v4', () => {
    const noUuidArb = fc.array(
      fc.constantFrom(
        ...'ghijklmnopqrstuvwxyz!@#$%^&*() '.split(''),
      ),
      { minLength: 0, maxLength: 50 },
    ).map((chars) => chars.join(''));

    fc.assert(
      fc.property(noUuidArb, (input) => {
        const result = extractRoomId(input);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
