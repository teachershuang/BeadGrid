import type { PatternSettings } from "@/types/image";

export const patternSettingLimits = {
  artworkWidth: { min: 8, max: 300 },
  artworkHeight: { min: 8, max: 300 },
  boardWidth: { min: 1, max: 99 },
  boardHeight: { min: 1, max: 99 },
  maxColors: { min: 0, max: 64 },
} as const;

const cleanupLevels = new Set(["off", "light", "medium", "strong"]);
const fitModes = new Set(["cover", "contain"]);
const rotations = new Set([0, 90, 180, 270]);
const transparencyModes = new Set(["empty", "blend"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumberInRange(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function isIntegerInRange(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function clampIntegerInput(value: string, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function assertPatternSettings(
  value: unknown,
  label = "工程文件的生成参数",
): asserts value is PatternSettings {
  if (!isRecord(value)) {
    throw new Error(`${label}缺失。`);
  }

  // Read-only project compatibility keeps 1x1 valid, while the UI starts at 8x8.
  if (
    !isIntegerInRange(value.artworkWidth, 1, patternSettingLimits.artworkWidth.max) ||
    !isIntegerInRange(value.artworkHeight, 1, patternSettingLimits.artworkHeight.max)
  ) {
    throw new Error(`${label}的作品尺寸无效。`);
  }
  if (
    !isIntegerInRange(value.boardWidth, patternSettingLimits.boardWidth.min, patternSettingLimits.boardWidth.max) ||
    !isIntegerInRange(value.boardHeight, patternSettingLimits.boardHeight.min, patternSettingLimits.boardHeight.max)
  ) {
    throw new Error(`${label}的底板尺寸无效。`);
  }
  if (typeof value.brandId !== "string" || value.brandId.trim().length === 0) {
    throw new Error(`${label}的品牌色板无效。`);
  }
  if (!isIntegerInRange(value.maxColors, patternSettingLimits.maxColors.min, patternSettingLimits.maxColors.max)) {
    throw new Error(`${label}的最大颜色数无效。`);
  }
  if (typeof value.cleanupLevel !== "string" || !cleanupLevels.has(value.cleanupLevel)) {
    throw new Error(`${label}的杂色清理参数无效。`);
  }
  if (typeof value.fitMode !== "string" || !fitModes.has(value.fitMode)) {
    throw new Error(`${label}的裁切方式无效。`);
  }
  if (!isFiniteNumberInRange(value.zoom, 0.5, 3)) {
    throw new Error(`${label}的缩放参数无效。`);
  }
  if (!isFiniteNumberInRange(value.offsetX, -1, 1) || !isFiniteNumberInRange(value.offsetY, -1, 1)) {
    throw new Error(`${label}的构图偏移无效。`);
  }
  if (typeof value.rotation !== "number" || !rotations.has(value.rotation)) {
    throw new Error(`${label}的旋转参数无效。`);
  }
  if (typeof value.flipHorizontal !== "boolean") {
    throw new Error(`${label}的翻转参数无效。`);
  }
  if (!isFiniteNumberInRange(value.alphaThreshold, 0, 0.8)) {
    throw new Error(`${label}的透明阈值无效。`);
  }
  if (typeof value.transparencyMode !== "string" || !transparencyModes.has(value.transparencyMode)) {
    throw new Error(`${label}的透明区域处理方式无效。`);
  }
  if (!isIntegerInRange(value.sampleGridSize, 3, 7)) {
    throw new Error(`${label}的采样密度无效。`);
  }
  if (
    !isRecord(value.backgroundRgb) ||
    !isIntegerInRange(value.backgroundRgb.r, 0, 255) ||
    !isIntegerInRange(value.backgroundRgb.g, 0, 255) ||
    !isIntegerInRange(value.backgroundRgb.b, 0, 255)
  ) {
    throw new Error(`${label}的背景颜色无效。`);
  }
}

export function arePatternSettingsEqual(left: PatternSettings, right: PatternSettings) {
  return (
    left.artworkWidth === right.artworkWidth &&
    left.artworkHeight === right.artworkHeight &&
    left.boardWidth === right.boardWidth &&
    left.boardHeight === right.boardHeight &&
    left.brandId === right.brandId &&
    left.maxColors === right.maxColors &&
    left.cleanupLevel === right.cleanupLevel &&
    left.fitMode === right.fitMode &&
    left.zoom === right.zoom &&
    left.offsetX === right.offsetX &&
    left.offsetY === right.offsetY &&
    left.rotation === right.rotation &&
    left.flipHorizontal === right.flipHorizontal &&
    left.alphaThreshold === right.alphaThreshold &&
    left.transparencyMode === right.transparencyMode &&
    left.sampleGridSize === right.sampleGridSize &&
    left.backgroundRgb.r === right.backgroundRgb.r &&
    left.backgroundRgb.g === right.backgroundRgb.g &&
    left.backgroundRgb.b === right.backgroundRgb.b
  );
}
