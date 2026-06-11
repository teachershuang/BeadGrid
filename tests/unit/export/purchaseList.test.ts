import { describe, expect, it } from "vitest";
import { rgbToLab } from "@/core/color/conversion";
import { buildPurchaseListCsv, buildPurchaseListCsvRows } from "@/core/export/purchaseList";
import type { GeneratedPattern } from "@/types/pattern";
import type { PatternSettings } from "@/types/image";
import type { PaletteColor } from "@/types/palette";

const settings: PatternSettings = {
  artworkWidth: 2,
  artworkHeight: 2,
  boardWidth: 29,
  boardHeight: 29,
  brandId: "mard",
  maxColors: 0,
  cleanupLevel: "off",
  fitMode: "cover",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipHorizontal: false,
  alphaThreshold: 0.08,
  transparencyMode: "empty",
  backgroundRgb: { r: 255, g: 255, b: 255 },
  sampleGridSize: 5,
};

function createColor(id: string, code: string, rgb: { r: number; g: number; b: number }): PaletteColor {
  return {
    id,
    brandId: "mard",
    seriesId: "default",
    code,
    nameZh: `${code}-测试色`,
    rgb,
    lab: rgbToLab(rgb),
  };
}

describe("purchaseList", () => {
  it("applies reserve ratio using ceil", () => {
    const color = createColor("a", "A1", { r: 255, g: 0, b: 0 });
    const pattern: GeneratedPattern = {
      width: 2,
      height: 2,
      settings,
      targets: [],
      cells: [],
      statistics: {
        artworkWidth: 2,
        artworkHeight: 2,
        totalCells: 4,
        emptyCells: 0,
        filledCells: 4,
        actualColorCount: 1,
        usages: [{ color, count: 11 }],
      },
    };

    const rows = buildPurchaseListCsvRows(pattern, 0.1);
    expect(rows[0]?.recommendedCount).toBe(13);
  });

  it("adds utf-8 bom and chinese columns to csv export", () => {
    const color = createColor("a", "A1", { r: 255, g: 0, b: 0 });
    const pattern: GeneratedPattern = {
      width: 2,
      height: 2,
      settings,
      targets: [],
      cells: [],
      statistics: {
        artworkWidth: 2,
        artworkHeight: 2,
        totalCells: 4,
        emptyCells: 0,
        filledCells: 4,
        actualColorCount: 1,
        usages: [{ color, count: 2 }],
      },
    };

    const csv = buildPurchaseListCsv(pattern, 0.05);
    expect(csv.startsWith("\uFEFF品牌,色号,中文名称,实际数量,建议准备数量")).toBe(true);
    expect(csv).toContain("MARD,A1,A1-测试色,2,3");
  });
});
