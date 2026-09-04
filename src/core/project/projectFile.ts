import type { PatternSettings } from "@/types/image";
import type { GeneratedPattern, PatternCell } from "@/types/pattern";
import {
  arePatternSettingsEqual,
  assertPatternSettings,
} from "@/core/settings/patternSettings";
import { calculatePatternStatistics } from "@/core/statistics/patternStatistics";

export interface BeadGridProjectDocumentV1 {
  kind: "beadgrid-project";
  version: 1;
  savedAt: string;
  source: {
    name: string;
    pngDataUrl: string;
  };
  settings: PatternSettings;
  basePattern: GeneratedPattern | null;
  currentPattern: GeneratedPattern | null;
}

interface CreateProjectDocumentInput {
  sourceName: string;
  pngDataUrl: string;
  settings: PatternSettings;
  basePattern: GeneratedPattern | null;
  currentPattern: GeneratedPattern | null;
  savedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateRgb(value: unknown, label: string) {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.r) ||
    !isFiniteNumber(value.g) ||
    !isFiniteNumber(value.b) ||
    value.r < 0 || value.r > 255 ||
    value.g < 0 || value.g > 255 ||
    value.b < 0 || value.b > 255
  ) {
    throw new Error(`${label}的 RGB 颜色无效。`);
  }
}

function validateLab(value: unknown, label: string) {
  if (!isRecord(value) || !isFiniteNumber(value.l) || !isFiniteNumber(value.a) || !isFiniteNumber(value.b)) {
    throw new Error(`${label}的 Lab 颜色无效。`);
  }
}

function validatePaletteColor(value: unknown, label: string) {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" || value.id.length === 0 ||
    typeof value.brandId !== "string" || value.brandId.length === 0 ||
    typeof value.seriesId !== "string" ||
    typeof value.code !== "string" || value.code.length === 0 ||
    (value.nameZh !== undefined && typeof value.nameZh !== "string")
  ) {
    throw new Error(`${label}的色号数据无效。`);
  }
  validateRgb(value.rgb, label);
  validateLab(value.lab, label);
}

function validateNullableColorPair(rgb: unknown, lab: unknown, label: string) {
  if ((rgb === null) !== (lab === null)) {
    throw new Error(`${label}的采样颜色不完整。`);
  }
  if (rgb !== null) {
    validateRgb(rgb, label);
    validateLab(lab, label);
  }
}

function validatePattern(
  value: unknown,
  label: string,
  settings: PatternSettings,
): asserts value is GeneratedPattern | null {
  if (value === null) {
    return;
  }
  if (!isRecord(value) || !isPositiveInteger(value.width) || !isPositiveInteger(value.height)) {
    throw new Error(`${label}尺寸无效。`);
  }
  const width = value.width;
  const height = value.height;
  if (width !== settings.artworkWidth || height !== settings.artworkHeight) {
    throw new Error(`${label}尺寸与生成参数不一致。`);
  }
  if (!Array.isArray(value.cells) || value.cells.length !== width * height) {
    throw new Error(`${label}格子数量与尺寸不一致。`);
  }
  if (!Array.isArray(value.targets) || value.targets.length !== width * height) {
    throw new Error(`${label}采样数据数量与尺寸不一致。`);
  }
  assertPatternSettings(value.settings, label);
  if (!arePatternSettingsEqual(value.settings, settings)) {
    throw new Error(`${label}的生成参数与工程设置不一致。`);
  }

  value.cells.forEach((cell, index) => {
    const expectedX = index % width;
    const expectedY = Math.floor(index / width);
    if (!isRecord(cell) || cell.x !== expectedX || cell.y !== expectedY) {
      throw new Error(`${label}第 ${index + 1} 格的坐标无效。`);
    }
    validateNullableColorPair(cell.targetRgb, cell.targetLab, `${label}第 ${index + 1} 格`);
    if (cell.mappedColor !== null) {
      validatePaletteColor(cell.mappedColor, `${label}第 ${index + 1} 格`);
    }
  });

  value.targets.forEach((target, index) => {
    const expectedX = index % width;
    const expectedY = Math.floor(index / width);
    if (!isRecord(target) || target.x !== expectedX || target.y !== expectedY) {
      throw new Error(`${label}第 ${index + 1} 个采样点的坐标无效。`);
    }
    validateNullableColorPair(target.rgb, target.lab, `${label}第 ${index + 1} 个采样点`);
  });

  value.statistics = calculatePatternStatistics(
    width,
    height,
    value.cells as unknown as PatternCell[],
  );
}

export function createProjectDocument({
  sourceName,
  pngDataUrl,
  settings,
  basePattern,
  currentPattern,
  savedAt = new Date().toISOString(),
}: CreateProjectDocumentInput): BeadGridProjectDocumentV1 {
  return {
    kind: "beadgrid-project",
    version: 1,
    savedAt,
    source: {
      name: sourceName,
      pngDataUrl,
    },
    settings,
    basePattern,
    currentPattern,
  };
}

export function serializeProjectDocument(project: BeadGridProjectDocumentV1) {
  return JSON.stringify(project);
}

export function parseProjectDocument(raw: string): BeadGridProjectDocumentV1 {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("工程文件不是有效的 JSON。");
  }

  if (!isRecord(value) || value.kind !== "beadgrid-project") {
    throw new Error("不是有效的 BeadGrid 工程文件。");
  }
  if (value.version !== 1) {
    throw new Error(`不支持的工程文件版本：${String(value.version ?? "未知")}。`);
  }
  if (typeof value.savedAt !== "string" || Number.isNaN(Date.parse(value.savedAt))) {
    throw new Error("工程文件的保存时间无效。");
  }
  if (!isRecord(value.source) || typeof value.source.name !== "string") {
    throw new Error("工程文件缺少原图信息。");
  }
  if (
    typeof value.source.pngDataUrl !== "string" ||
    !value.source.pngDataUrl.startsWith("data:image/png;base64,")
  ) {
    throw new Error("工程文件中的原图数据不是 PNG。");
  }

  assertPatternSettings(value.settings);
  validatePattern(value.basePattern, "自动生成基线", value.settings);
  validatePattern(value.currentPattern, "当前图纸", value.settings);

  return value as unknown as BeadGridProjectDocumentV1;
}
