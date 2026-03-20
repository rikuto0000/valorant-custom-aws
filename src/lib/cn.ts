import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSS クラス名マージユーティリティ
 * clsx で条件付きクラスを結合し、tailwind-merge で競合を解決する。
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
