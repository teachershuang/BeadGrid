import { describe, expect, it } from "vitest";
import { calculateDecodedImageSize } from "@/core/image/loadSourceImage";

describe("calculateDecodedImageSize", () => {
  it("keeps ordinary images unchanged", () => {
    expect(calculateDecodedImageSize(1920, 1080)).toEqual({ width: 1920, height: 1080 });
  });

  it("reduces oversized phone images while preserving aspect ratio", () => {
    const size = calculateDecodedImageSize(12_000, 9_000);

    expect(size.width).toBeLessThanOrEqual(4096);
    expect(size.height).toBeLessThanOrEqual(4096);
    expect(size.width * size.height).toBeLessThanOrEqual(16_777_216);
    expect(size.width / size.height).toBeCloseTo(4 / 3, 2);
  });

  it("rejects invalid dimensions before allocating a canvas", () => {
    expect(() => calculateDecodedImageSize(0, 100)).toThrow("图片尺寸无效");
  });
});
