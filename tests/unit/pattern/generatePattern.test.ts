import { describe, expect, it } from "vitest";
import { rgbToLab } from "@/core/color/conversion";
import { generatePattern } from "@/core/pattern/generatePattern";
import type { PixelSourceImage, PatternSettings } from "@/types/image";
import type { PaletteColor } from "@/types/palette";

const palette: PaletteColor[] = [
  {
    id: "brand:red",
    brandId: "brand",
    seriesId: "default",
    code: "R1",
    rgb: { r: 255, g: 0, b: 0 },
    lab: rgbToLab({ r: 255, g: 0, b: 0 }),
  },
  {
    id: "brand:green",
    brandId: "brand",
    seriesId: "default",
    code: "G1",
    rgb: { r: 0, g: 255, b: 0 },
    lab: rgbToLab({ r: 0, g: 255, b: 0 }),
  },
  {
    id: "brand:blue",
    brandId: "brand",
    seriesId: "default",
    code: "B1",
    rgb: { r: 0, g: 0, b: 255 },
    lab: rgbToLab({ r: 0, g: 0, b: 255 }),
  },
];

const settings: PatternSettings = {
  artworkWidth: 2,
  artworkHeight: 2,
  boardWidth: 29,
  boardHeight: 29,
  brandId: "brand",
  maxColors: 2,
  cleanupLevel: "off",
  fitMode: "cover",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipHorizontal: false,
  alphaThreshold: 0.05,
  transparencyMode: "empty",
  backgroundRgb: { r: 255, g: 255, b: 255 },
  sampleGridSize: 5,
};

describe("generatePattern", () => {
  it("keeps the final color count within maxColors", () => {
    const image: PixelSourceImage = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 0, 0, 255,
      ]),
    };

    const pattern = generatePattern(image, settings, palette);
    expect(pattern.statistics.actualColorCount).toBeLessThanOrEqual(2);
  });
});
