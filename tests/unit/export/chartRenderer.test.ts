import { describe, expect, it } from "vitest";
import { rgbToLab } from "@/core/color/conversion";
import { isBoardBoundaryLine } from "@/core/export/chartRenderer";
import { buildSeparatedSheetPlan } from "@/core/export/separatedSheetPlan";
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
    rgb,
    lab: rgbToLab(rgb),
  };
}

describe("chartRenderer", () => {
  it("emphasizes both edges when the final board is only partially filled", () => {
    expect(isBoardBoundaryLine(0, 48, 0, 29)).toBe(true);
    expect(isBoardBoundaryLine(29, 48, 29, 29)).toBe(true);
    expect(isBoardBoundaryLine(48, 48, 48, 29)).toBe(true);
    expect(isBoardBoundaryLine(47, 48, 47, 29)).toBe(false);
  });

  it("builds separated sheet plan in descending usage order", () => {
    const c1 = createColor("a", "A1", { r: 255, g: 0, b: 0 });
    const c2 = createColor("b", "B1", { r: 0, g: 255, b: 0 });
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
        actualColorCount: 2,
        usages: [
          { color: c2, count: 9 },
          { color: c1, count: 3 },
        ],
      },
    };

    const plan = buildSeparatedSheetPlan(pattern);
    expect(plan.map((item) => item.color.code)).toEqual(["B1", "A1"]);
    expect(plan[0]?.filename).toContain("01_B1_9");
  });
});
