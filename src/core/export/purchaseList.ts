import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export interface PurchaseListItem {
  color: PaletteColor;
  count: number;
  recommendedCount: number;
}

export function buildPurchaseList(
  pattern: GeneratedPattern,
  reserveRatio: number,
): PurchaseListItem[] {
  return pattern.statistics.usages.map((usage) => ({
    color: usage.color,
    count: usage.count,
    recommendedCount: Math.ceil(usage.count * (1 + reserveRatio)),
  }));
}

export interface PurchaseListCsvRow {
  code: string;
  count: number;
  recommendedCount: number;
}

export function buildPurchaseListCsvRows(pattern: GeneratedPattern, reserveRatio: number): PurchaseListCsvRow[] {
  return buildPurchaseList(pattern, reserveRatio).map((item) => ({
    code: item.color.code,
    count: item.count,
    recommendedCount: item.recommendedCount,
  }));
}

export function buildPurchaseListCsv(pattern: GeneratedPattern, reserveRatio: number) {
  const rows = buildPurchaseListCsvRows(pattern, reserveRatio);
  const header = ["色号", "实际数量", "建议准备数量"];
  return [header.join(","), ...rows.map((row) => [row.code, row.count, row.recommendedCount].join(","))].join("\n");
}
