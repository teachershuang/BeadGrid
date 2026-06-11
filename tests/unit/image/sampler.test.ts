import { describe, expect, it } from "vitest";
import { generateTargetCells, sampleArtworkPoint } from "@/core/image/sampler";
import type { PixelSourceImage } from "@/types/image";

const onePixelImage: PixelSourceImage = {
  width: 1,
  height: 1,
  data: new Uint8ClampedArray([255, 0, 0, 64]),
};

describe("image sampler", () => {
  it("treats low-alpha samples as empty when transparency mode is empty", () => {
    const sample = sampleArtworkPoint(
      onePixelImage,
      1,
      1,
      {
        fitMode: "contain",
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        flipHorizontal: false,
      },
      {
        alphaThreshold: 0.4,
        transparencyMode: "empty",
        backgroundRgb: { r: 255, g: 255, b: 255 },
        sampleGridSize: 3,
      },
      0.5,
      0.5,
    );

    expect(sample).toBeNull();
  });

  it("composites low-alpha samples against the chosen background when blend mode is enabled", () => {
    const sample = sampleArtworkPoint(
      onePixelImage,
      1,
      1,
      {
        fitMode: "cover",
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        flipHorizontal: false,
      },
      {
        alphaThreshold: 0.4,
        transparencyMode: "blend",
        backgroundRgb: { r: 255, g: 255, b: 255 },
        sampleGridSize: 3,
      },
      0.5,
      0.5,
    );

    expect(sample?.rgb.r).toBeCloseTo(255, 0);
    expect(sample?.rgb.g).toBeGreaterThan(180);
    expect(sample?.rgb.b).toBeGreaterThan(180);
  });

  it("samples independent artwork cells instead of flattening the image first", () => {
    const image: PixelSourceImage = {
      width: 20,
      height: 1,
      data: new Uint8ClampedArray(
        Array.from({ length: 20 }, (_, index) =>
          index < 10 ? [255, 0, 0, 255] : [0, 255, 0, 255],
        ).flat(),
      ),
    };

    const targets = generateTargetCells(
      image,
      2,
      1,
      {
        fitMode: "contain",
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        flipHorizontal: false,
      },
      {
        alphaThreshold: 0.05,
        transparencyMode: "empty",
        backgroundRgb: { r: 255, g: 255, b: 255 },
        sampleGridSize: 5,
      },
    );

    expect((targets[0]?.rgb?.r ?? 0) - (targets[0]?.rgb?.g ?? 0)).toBeGreaterThan(120);
    expect((targets[1]?.rgb?.g ?? 0) - (targets[1]?.rgb?.r ?? 0)).toBeGreaterThan(120);
  });
});
