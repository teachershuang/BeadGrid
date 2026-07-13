import { describe, expect, it } from "vitest";
import { resolvePatternCellIndex } from "@/components/patternPreviewGeometry";

const layout = {
  originX: 20,
  originY: 30,
  cellWidth: 10,
  cellHeight: 20,
  gridWidth: 40,
  gridHeight: 60,
};

describe("resolvePatternCellIndex", () => {
  it("maps canvas coordinates to a row-major cell index", () => {
    expect(resolvePatternCellIndex(21, 31, 4, 3, layout)).toBe(0);
    expect(resolvePatternCellIndex(59, 89, 4, 3, layout)).toBe(11);
    expect(resolvePatternCellIndex(45, 55, 4, 3, layout)).toBe(6);
  });

  it("rejects points outside the grid and the exclusive far edge", () => {
    expect(resolvePatternCellIndex(19.9, 40, 4, 3, layout)).toBeNull();
    expect(resolvePatternCellIndex(30, 29.9, 4, 3, layout)).toBeNull();
    expect(resolvePatternCellIndex(60, 50, 4, 3, layout)).toBeNull();
    expect(resolvePatternCellIndex(50, 90, 4, 3, layout)).toBeNull();
  });
});
