import { describe, expect, it } from "vitest";
import { buildBoardSplitPlan } from "@/core/export/boardSplitPlan";
import type { GeneratedPattern } from "@/types/pattern";
import type { PatternSettings } from "@/types/image";

const settings: PatternSettings = {
  artworkWidth: 65,
  artworkHeight: 60,
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

describe("boardSplitPlan", () => {
  it("builds split plan using board width and height", () => {
    const pattern: GeneratedPattern = {
      width: 65,
      height: 60,
      settings,
      targets: [],
      cells: [],
      statistics: {
        artworkWidth: 65,
        artworkHeight: 60,
        totalCells: 3900,
        emptyCells: 0,
        filledCells: 3900,
        actualColorCount: 0,
        usages: [],
      },
    };

    const plan = buildBoardSplitPlan(pattern);
    expect(plan).toHaveLength(9);
    expect(plan[0]?.filename).toBe("board_R01_C01.png");
    expect(plan[8]?.viewport.width).toBe(7);
    expect(plan[8]?.viewport.height).toBe(2);
  });
});
