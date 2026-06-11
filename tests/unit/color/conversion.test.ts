import { describe, expect, it } from "vitest";
import { rgbToLab, srgbChannelToLinear } from "@/core/color/conversion";

describe("color conversion", () => {
  it("converts sRGB edge channels to linear RGB", () => {
    expect(srgbChannelToLinear(0)).toBe(0);
    expect(srgbChannelToLinear(255)).toBeCloseTo(1, 8);
  });

  it("converts white to Lab near reference white", () => {
    const lab = rgbToLab({ r: 255, g: 255, b: 255 });

    expect(lab.l).toBeCloseTo(100, 4);
    expect(lab.a).toBeCloseTo(0, 3);
    expect(lab.b).toBeCloseTo(0, 3);
  });

  it("converts pure red to known Lab coordinates", () => {
    const lab = rgbToLab({ r: 255, g: 0, b: 0 });

    expect(lab.l).toBeCloseTo(53.2408, 3);
    expect(lab.a).toBeCloseTo(80.0925, 3);
    expect(lab.b).toBeCloseTo(67.2032, 3);
  });
});

