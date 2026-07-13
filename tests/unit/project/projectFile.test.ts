import { describe, expect, it } from "vitest";
import {
  createProjectDocument,
  parseProjectDocument,
  serializeProjectDocument,
} from "@/core/project/projectFile";
import type { PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

const settings: PatternSettings = {
  artworkWidth: 1,
  artworkHeight: 1,
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

const color: PaletteColor = {
  id: "mard:A1",
  brandId: "mard",
  seriesId: "A",
  code: "A1",
  nameZh: "红色",
  rgb: { r: 220, g: 40, b: 40 },
  lab: { l: 50, a: 60, b: 40 },
};

function createPattern(): GeneratedPattern {
  return {
    width: 1,
    height: 1,
    settings,
    targets: [{ x: 0, y: 0, rgb: color.rgb, lab: color.lab }],
    cells: [
      {
        x: 0,
        y: 0,
        targetRgb: color.rgb,
        targetLab: color.lab,
        mappedColor: color,
      },
    ],
    statistics: {
      artworkWidth: 1,
      artworkHeight: 1,
      filledCells: 1,
      emptyCells: 0,
      totalCells: 1,
      actualColorCount: 1,
      usages: [{ color, count: 1 }],
    },
  };
}

describe("projectFile", () => {
  it("round-trips a self-contained edited project", () => {
    const pattern = createPattern();
    const project = createProjectDocument({
      sourceName: "portrait.jpg",
      pngDataUrl: "data:image/png;base64,AA==",
      settings,
      basePattern: pattern,
      currentPattern: pattern,
      savedAt: "2026-07-13T08:00:00.000Z",
    });

    const restored = parseProjectDocument(serializeProjectDocument(project));

    expect(restored).toEqual(project);
    expect(restored.currentPattern?.cells[0]?.mappedColor?.code).toBe("A1");
  });

  it("supports saving source and settings before pattern generation", () => {
    const project = createProjectDocument({
      sourceName: "draft.png",
      pngDataUrl: "data:image/png;base64,AA==",
      settings,
      basePattern: null,
      currentPattern: null,
      savedAt: "2026-07-13T08:00:00.000Z",
    });

    expect(parseProjectDocument(serializeProjectDocument(project))).toMatchObject({
      kind: "beadgrid-project",
      version: 1,
      basePattern: null,
      currentPattern: null,
    });
  });

  it("rejects invalid JSON and unsupported versions", () => {
    expect(() => parseProjectDocument("not-json")).toThrow("工程文件不是有效的 JSON");
    expect(() => parseProjectDocument('{"kind":"beadgrid-project","version":2}')).toThrow(
      "不支持的工程文件版本",
    );
  });

  it("rejects patterns whose cell count does not match dimensions", () => {
    const pattern = createPattern();
    const project = createProjectDocument({
      sourceName: "broken.png",
      pngDataUrl: "data:image/png;base64,AA==",
      settings,
      basePattern: pattern,
      currentPattern: pattern,
      savedAt: "2026-07-13T08:00:00.000Z",
    });
    const payload = JSON.parse(serializeProjectDocument(project)) as {
      currentPattern: GeneratedPattern;
    };
    payload.currentPattern.cells = [];

    expect(() => parseProjectDocument(JSON.stringify(payload))).toThrow("图纸格子数量与尺寸不一致");
  });

  it("rejects non-PNG embedded source data", () => {
    const project = createProjectDocument({
      sourceName: "broken.jpg",
      pngDataUrl: "data:image/jpeg;base64,AA==",
      settings,
      basePattern: null,
      currentPattern: null,
      savedAt: "2026-07-13T08:00:00.000Z",
    });

    expect(() => parseProjectDocument(serializeProjectDocument(project))).toThrow("原图数据不是 PNG");
  });
});
