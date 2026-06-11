import { describe, expect, it } from "vitest";
import { rgbToLab } from "@/core/color/conversion";
import { findNearestPaletteColor } from "@/core/palette/matcher";
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
];

describe("palette matcher", () => {
  it("finds the perceptually nearest palette color", () => {
    const nearest = findNearestPaletteColor(rgbToLab({ r: 240, g: 15, b: 20 }), palette);
    expect(nearest?.code).toBe("R1");
  });
});

