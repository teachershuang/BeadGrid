import { rgbToHex } from "@/core/color/utils";
import type { GeneratedPattern, PatternColorUsage } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export interface ChartRenderOptions {
  title?: string;
  showCodes?: boolean;
  showLegend?: boolean;
  majorGridEvery?: number;
  boardGridEvery?: number;
  mutedMode?: "gray" | "transparent" | "hidden";
  focusColorId?: string | null;
}

const DEFAULT_CELL_SIZE = 22;
const MIN_CELL_SIZE = 12;
const HEADER_HEIGHT = 72;
const PADDING = 18;
const LEGEND_ITEM_HEIGHT = 24;
const LEGEND_ITEM_GAP = 8;
const LEGEND_COLUMNS = 6;

function getCellSize(pattern: GeneratedPattern) {
  const maxDimension = Math.max(pattern.width, pattern.height);
  if (maxDimension <= 60) {
    return DEFAULT_CELL_SIZE;
  }

  if (maxDimension <= 100) {
    return 18;
  }

  return MIN_CELL_SIZE;
}

function getLegendRows(usages: PatternColorUsage[]) {
  return Math.max(1, Math.ceil(usages.length / LEGEND_COLUMNS));
}

function getLegendHeight(usages: PatternColorUsage[], showLegend: boolean) {
  if (!showLegend || usages.length === 0) {
    return 0;
  }

  return 18 + getLegendRows(usages) * LEGEND_ITEM_HEIGHT + (getLegendRows(usages) - 1) * LEGEND_ITEM_GAP;
}

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getReadableTextColor(rgb: PaletteColor["rgb"]) {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.63 ? "#1B1917" : "#F9F6F1";
}

function drawHeader(
  context: CanvasRenderingContext2D,
  pattern: GeneratedPattern,
  title: string,
  width: number,
  highlightedUsage?: PatternColorUsage,
) {
  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, HEADER_HEIGHT);
  context.fillStyle = "#1b1917";
  context.font = '600 32px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "top";
  context.fillText(title, PADDING, 16);

  const summary = `${pattern.width}x${pattern.height} / ${pattern.statistics.actualColorCount}色 / 共${pattern.statistics.filledCells}颗`;
  context.font = '500 22px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.fillText(summary, PADDING, 46);

  if (highlightedUsage) {
    context.textAlign = "right";
    context.fillStyle = "#44403c";
    context.fillText(`分色图 ${highlightedUsage.color.code} / ${highlightedUsage.count}颗`, width - PADDING, 32);
    context.textAlign = "left";
  }

  context.strokeStyle = "#d9d2cb";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, HEADER_HEIGHT - 0.5);
  context.lineTo(width, HEADER_HEIGHT - 0.5);
  context.stroke();
}

function drawLegend(
  context: CanvasRenderingContext2D,
  usages: PatternColorUsage[],
  canvasWidth: number,
  startY: number,
) {
  if (usages.length === 0) {
    return;
  }

  const innerWidth = canvasWidth - PADDING * 2;
  const columnWidth = innerWidth / LEGEND_COLUMNS;
  context.font = '500 14px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "middle";

  usages.forEach((usage, index) => {
    const column = index % LEGEND_COLUMNS;
    const row = Math.floor(index / LEGEND_COLUMNS);
    const x = PADDING + column * columnWidth;
    const y = startY + row * (LEGEND_ITEM_HEIGHT + LEGEND_ITEM_GAP);

    context.fillStyle = rgbToHex(usage.color.rgb);
    context.fillRect(x, y, 18, 18);
    context.strokeStyle = "rgba(27, 25, 23, 0.15)";
    context.strokeRect(x + 0.5, y + 0.5, 17, 17);

    context.fillStyle = "#1b1917";
    context.fillText(`${usage.color.code}  ${usage.count}`, x + 26, y + 9);
  });
}

function drawCellCode(
  context: CanvasRenderingContext2D,
  code: string,
  x: number,
  y: number,
  size: number,
  fillStyle: string,
) {
  if (size < 16) {
    return;
  }

  context.fillStyle = fillStyle;
  context.font = `${Math.max(9, Math.floor(size * 0.42))}px "Bahnschrift", "Cascadia Code", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(code, x + size / 2, y + size / 2 + 0.5);
}

function drawPatternGrid(
  context: CanvasRenderingContext2D,
  pattern: GeneratedPattern,
  originX: number,
  originY: number,
  cellSize: number,
  options: ChartRenderOptions,
) {
  const majorGridEvery = options.majorGridEvery ?? 10;
  const boardGridEvery = options.boardGridEvery ?? Math.max(pattern.settings.boardWidth, pattern.settings.boardHeight);
  const showCodes = options.showCodes ?? true;
  const focusColorId = options.focusColorId ?? null;
  const mutedMode = options.mutedMode ?? "gray";

  for (const cell of pattern.cells) {
    const x = originX + cell.x * cellSize;
    const y = originY + cell.y * cellSize;

    if (!cell.mappedColor) {
      context.fillStyle = "#fffdf9";
      context.fillRect(x, y, cellSize, cellSize);
      continue;
    }

    const isFocused = !focusColorId || cell.mappedColor.id === focusColorId;
    if (isFocused) {
      context.fillStyle = rgbToHex(cell.mappedColor.rgb);
      context.fillRect(x, y, cellSize, cellSize);
      if (showCodes) {
        drawCellCode(context, cell.mappedColor.code, x, y, cellSize, getReadableTextColor(cell.mappedColor.rgb));
      }
      continue;
    }

    if (mutedMode === "hidden") {
      context.fillStyle = "#fffdf9";
      context.fillRect(x, y, cellSize, cellSize);
    } else if (mutedMode === "transparent") {
      context.fillStyle = `${rgbToHex(cell.mappedColor.rgb)}33`;
      context.fillRect(x, y, cellSize, cellSize);
    } else {
      context.fillStyle = "#ece7e3";
      context.fillRect(x, y, cellSize, cellSize);
      if (showCodes) {
        drawCellCode(context, cell.mappedColor.code, x, y, cellSize, "#8f8a84");
      }
    }
  }

  context.strokeStyle = "rgba(114, 110, 104, 0.24)";
  context.lineWidth = 1;
  for (let column = 0; column <= pattern.width; column += 1) {
    const position = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, originY);
    context.lineTo(position, originY + pattern.height * cellSize);
    context.stroke();
  }
  for (let row = 0; row <= pattern.height; row += 1) {
    const position = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, position);
    context.lineTo(originX + pattern.width * cellSize, position);
    context.stroke();
  }

  context.strokeStyle = "rgba(220, 78, 78, 0.65)";
  context.lineWidth = 2;
  for (let column = 0; column <= pattern.width; column += majorGridEvery) {
    const position = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, originY);
    context.lineTo(position, originY + pattern.height * cellSize);
    context.stroke();
  }
  for (let row = 0; row <= pattern.height; row += majorGridEvery) {
    const position = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, position);
    context.lineTo(originX + pattern.width * cellSize, position);
    context.stroke();
  }

  context.strokeStyle = "rgba(43, 35, 35, 0.55)";
  context.lineWidth = 3;
  for (let column = 0; column <= pattern.width; column += boardGridEvery) {
    const position = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, originY);
    context.lineTo(position, originY + pattern.height * cellSize);
    context.stroke();
  }
  for (let row = 0; row <= pattern.height; row += boardGridEvery) {
    const position = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, position);
    context.lineTo(originX + pattern.width * cellSize, position);
    context.stroke();
  }
}

export function renderPatternChart(pattern: GeneratedPattern, options: ChartRenderOptions = {}) {
  const cellSize = getCellSize(pattern);
  const showLegend = options.showLegend ?? true;
  const legendHeight = getLegendHeight(pattern.statistics.usages, showLegend);
  const chartWidth = pattern.width * cellSize + PADDING * 2;
  const chartHeight = pattern.height * cellSize + HEADER_HEIGHT + PADDING * 2 + legendHeight;
  const canvas = createCanvas(chartWidth, chartHeight);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建导出画布。");
  }

  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, chartWidth, chartHeight);

  const focusedUsage = options.focusColorId
    ? pattern.statistics.usages.find((usage) => usage.color.id === options.focusColorId)
    : undefined;

  drawHeader(
    context,
    pattern,
    options.title ?? "BeadGrid 拼豆底稿",
    chartWidth,
    focusedUsage,
  );

  const originX = PADDING;
  const originY = HEADER_HEIGHT + PADDING;
  drawPatternGrid(context, pattern, originX, originY, cellSize, options);

  if (showLegend) {
    drawLegend(
      context,
      pattern.statistics.usages,
      chartWidth,
      HEADER_HEIGHT + PADDING + pattern.height * cellSize + 18,
    );
  }

  return canvas;
}
