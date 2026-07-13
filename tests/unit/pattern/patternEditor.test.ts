import { describe, expect, it } from "vitest";
import {
  applyPatternEditCommand,
  createPatternEditCommand,
} from "@/core/pattern/patternEditor";
import type { PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";
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

const red: PaletteColor = {
  id: "mard:A1",
  brandId: "mard",
  code: "A1",
  nameZh: "红色",
  rgb: { r: 220, g: 40, b: 40 },
  lab: { l: 50, a: 60, b: 40 },
};

const blue: PaletteColor = {
  id: "mard:B1",
  brandId: "mard",
  code: "B1",
  nameZh: "蓝色",
  rgb: { r: 30, g: 80, b: 210 },
  lab: { l: 40, a: 20, b: -60 },
};

function createPattern(): GeneratedPattern {
  const cells = [
    { x: 0, y: 0, targetRgb: red.rgb, targetLab: red.lab, mappedColor: red },
    { x: 1, y: 0, targetRgb: red.rgb, targetLab: red.lab, mappedColor: red },
    { x: 0, y: 1, targetRgb: red.rgb, targetLab: red.lab, mappedColor: red },
    { x: 1, y: 1, targetRgb: null, targetLab: null, mappedColor: null },
  ];

  return {
    width: 2,
    height: 2,
    cells,
    targets: cells.map((cell) => ({
      x: cell.x,
      y: cell.y,
      rgb: cell.targetRgb,
      lab: cell.targetLab,
    })),
    settings,
    statistics: {
      artworkWidth: 2,
      artworkHeight: 2,
      filledCells: 3,
      emptyCells: 1,
      totalCells: 4,
      actualColorCount: 1,
      usages: [{ color: red, count: 3 }],
    },
  };
}

describe("patternEditor", () => {
  it("applies a multi-cell stroke and recalculates sorted statistics", () => {
    const pattern = createPattern();
    const command = createPatternEditCommand(pattern, [
      { index: 0, mappedColor: blue },
      { index: 1, mappedColor: blue },
      { index: 3, mappedColor: blue },
    ]);

    expect(command?.changes).toHaveLength(3);
    const edited = applyPatternEditCommand(pattern, command!, "forward");

    expect(edited.cells.map((cell) => cell.mappedColor?.code ?? null)).toEqual([
      "B1",
      "B1",
      "A1",
      "B1",
    ]);
    expect(edited.statistics.filledCells).toBe(4);
    expect(edited.statistics.emptyCells).toBe(0);
    expect(edited.statistics.usages.map((usage) => [usage.color.code, usage.count])).toEqual([
      ["B1", 3],
      ["A1", 1],
    ]);
  });

  it("supports erasing and undoing a stroke", () => {
    const pattern = createPattern();
    const command = createPatternEditCommand(pattern, [
      { index: 0, mappedColor: null },
      { index: 2, mappedColor: blue },
    ]);
    const edited = applyPatternEditCommand(pattern, command!, "forward");
    const restored = applyPatternEditCommand(edited, command!, "backward");

    expect(edited.statistics.filledCells).toBe(2);
    expect(restored.cells).toEqual(pattern.cells);
    expect(restored.statistics).toEqual(pattern.statistics);
  });

  it("ignores duplicate indexes and unchanged colors", () => {
    const pattern = createPattern();
    const command = createPatternEditCommand(pattern, [
      { index: 0, mappedColor: red },
      { index: 1, mappedColor: blue },
      { index: 1, mappedColor: blue },
    ]);

    expect(command?.changes).toHaveLength(1);
    expect(command?.changes[0]?.index).toBe(1);
    expect(createPatternEditCommand(pattern, [{ index: 0, mappedColor: red }])).toBeNull();
  });

  it("rejects out-of-range cell indexes", () => {
    expect(() =>
      createPatternEditCommand(createPattern(), [{ index: 4, mappedColor: blue }]),
    ).toThrow("图纸格子索引超出范围");
  });
});
