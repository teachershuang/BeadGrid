import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export interface PurchaseListItem {
  color: PaletteColor;
  count: number;
  recommendedCount: number;
}

export interface PurchaseListCsvRow {
  brandId: string;
  code: string;
  nameZh: string;
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

export function buildPurchaseListCsvRows(
  pattern: GeneratedPattern,
  reserveRatio: number,
): PurchaseListCsvRow[] {
  return buildPurchaseList(pattern, reserveRatio).map((item) => ({
    brandId: item.color.brandId,
    code: item.color.code,
    nameZh: item.color.nameZh ?? "",
    count: item.count,
    recommendedCount: item.recommendedCount,
  }));
}

export function buildPurchaseListCsv(pattern: GeneratedPattern, reserveRatio: number) {
  const rows = buildPurchaseListCsvRows(pattern, reserveRatio);
  const header = ["品牌", "色号", "中文名称", "实际数量", "建议准备数量"];
  const csvRows = rows.map((row) => [
    row.brandId.toUpperCase(),
    row.code,
    escapeCsvValue(row.nameZh),
    String(row.count),
    String(row.recommendedCount),
  ]);

  return ["\uFEFF" + header.join(","), ...csvRows.map((row) => row.join(","))].join("\r\n");
}

function escapeCsvValue(value: string) {
  if (!value.includes(",") && !value.includes("\"") && !value.includes("\n")) {
    return value;
  }

  return `"${value.replaceAll("\"", "\"\"")}"`;
}
