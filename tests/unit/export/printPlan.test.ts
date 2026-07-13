import { describe, expect, it } from "vitest";
import { buildPrintPlan } from "@/core/export/printPlan";
import type { PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";

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

function createPattern(): GeneratedPattern {
  return {
    width: 65,
    height: 60,
    settings,
    targets: [],
    cells: [],
    statistics: {
      artworkWidth: 65,
      artworkHeight: 60,
      totalCells: 3900,
      emptyCells: 3900,
      filledCells: 0,
      actualColorCount: 0,
      usages: [],
    },
  };
}

describe("printPlan", () => {
  it("creates one row-major PDF page per board", () => {
    const pages = buildPrintPlan(createPattern());

    expect(pages).toHaveLength(9);
    expect(pages.map((page) => [page.rowIndex, page.columnIndex])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2],
    ]);
  });

  it("keeps the actual edge-board size and provides printable labels", () => {
    const lastPage = buildPrintPlan(createPattern()).at(-1);

    expect(lastPage?.viewport).toEqual({
      startColumn: 58,
      startRow: 58,
      width: 7,
      height: 2,
    });
    expect(lastPage?.title).toBe("BeadGrid 底板 R03 C03");
    expect(lastPage?.subtitle).toBe("MARD · 全图 65×60 · 本页 7×2");
  });
});
