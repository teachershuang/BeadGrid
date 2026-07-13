import type { PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";

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

function validateSettings(value: unknown): asserts value is PatternSettings {
  if (!isRecord(value)) {
    throw new Error("工程文件缺少生成参数。");
  }

  if (!isPositiveInteger(value.artworkWidth) || !isPositiveInteger(value.artworkHeight)) {
    throw new Error("工程文件的作品尺寸无效。");
  }
  if (!isPositiveInteger(value.boardWidth) || !isPositiveInteger(value.boardHeight)) {
    throw new Error("工程文件的底板尺寸无效。");
  }
  if (typeof value.brandId !== "string" || value.brandId.length === 0) {
    throw new Error("工程文件的品牌色板无效。");
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
  if (value.width !== settings.artworkWidth || value.height !== settings.artworkHeight) {
    throw new Error(`${label}尺寸与生成参数不一致。`);
  }
  if (!Array.isArray(value.cells) || value.cells.length !== value.width * value.height) {
    throw new Error(`${label}格子数量与尺寸不一致。`);
  }
  if (!Array.isArray(value.targets) || value.targets.length !== value.width * value.height) {
    throw new Error(`${label}采样数据数量与尺寸不一致。`);
  }
  if (!isRecord(value.statistics) || value.statistics.totalCells !== value.width * value.height) {
    throw new Error(`${label}统计数据无效。`);
  }
  validateSettings(value.settings);
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

  validateSettings(value.settings);
  validatePattern(value.basePattern, "自动生成基线", value.settings);
  validatePattern(value.currentPattern, "当前图纸", value.settings);

  return value as unknown as BeadGridProjectDocumentV1;
}
