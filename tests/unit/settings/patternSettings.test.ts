import { describe, expect, it } from "vitest";
import {
  arePatternSettingsEqual,
  assertPatternSettings,
  clampIntegerInput,
} from "@/core/settings/patternSettings";
import type { PatternSettings } from "@/types/image";

const settings: PatternSettings = {
  artworkWidth: 48,
  artworkHeight: 48,
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
  backgroundRgb: { r: 248, g: 241, b: 230 },
  sampleGridSize: 5,
};

describe("patternSettings", () => {
  it("clamps manually entered integers to the supported range", () => {
    expect(clampIntegerInput("-5", 8, 300, 48)).toBe(8);
    expect(clampIntegerInput("999", 8, 300, 48)).toBe(300);
    expect(clampIntegerInput("not-a-number", 8, 300, 48)).toBe(48);
    expect(clampIntegerInput("29.6", 1, 99, 29)).toBe(30);
  });

  it("validates every generation setting", () => {
    expect(() => assertPatternSettings(settings)).not.toThrow();
    expect(() => assertPatternSettings({ ...settings, maxColors: 65 })).toThrow("最大颜色数无效");
    expect(() => assertPatternSettings({ ...settings, zoom: Number.NaN })).toThrow("缩放参数无效");
    expect(() => assertPatternSettings({ ...settings, backgroundRgb: { r: -1, g: 0, b: 0 } })).toThrow(
      "背景颜色无效",
    );
  });

  it("compares nested RGB settings as well as scalar settings", () => {
    expect(arePatternSettingsEqual(settings, { ...settings })).toBe(true);
    expect(
      arePatternSettingsEqual(settings, {
        ...settings,
        backgroundRgb: { ...settings.backgroundRgb, b: 231 },
      }),
    ).toBe(false);
  });
});
