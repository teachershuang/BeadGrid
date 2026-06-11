import { describe, expect, it } from "vitest";
import { deltaE00 } from "@/core/color/ciede2000";

describe("CIEDE2000", () => {
  it("matches published reference case 1", () => {
    const result = deltaE00(
      { l: 50, a: 2.6772, b: -79.7751 },
      { l: 50, a: 0, b: -82.7485 },
    );

    expect(result).toBeCloseTo(2.0425, 4);
  });

  it("matches published reference case 2", () => {
    const result = deltaE00(
      { l: 50, a: 3.1571, b: -77.2803 },
      { l: 50, a: 0, b: -82.7485 },
    );

    expect(result).toBeCloseTo(2.8615, 4);
  });

  it("returns zero for identical colors", () => {
    expect(deltaE00({ l: 60, a: -1, b: 40 }, { l: 60, a: -1, b: 40 })).toBeCloseTo(0, 8);
  });
});

