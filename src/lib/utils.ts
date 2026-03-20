/**
 * ルームID抽出ユーティリティ
 *
 * 入力文字列から UUID v4 を正規表現で抽出する。
 * ルームURL やルームコードからルームIDを取得するために使用。
 */

/** UUID v4 正規表現パターン */
const UUID_V4_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/**
 * 入力文字列から UUID v4 を抽出する。
 * URL やルームコードなど任意の文字列に対応。
 *
 * @param input - 入力文字列（URL、ルームコード等）
 * @returns 抽出された UUID v4 文字列（小文字）。見つからない場合は null。
 */
export function extractRoomId(input: string): string | null {
  const match = input.match(UUID_V4_REGEX);
  return match ? match[0].toLowerCase() : null;
}
