import { rgbToHex } from "@/core/color/utils";
import type { GeneratedPattern, PatternColorUsage } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";
import { buildPurchaseList } from "@/core/export/purchaseList";

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

export interface GridViewport {
  startColumn: number;
  startRow: number;
  width: number;
  height: number;
}

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

function calculateGridDimensions(viewport: GridViewport, cellSize: number) {
  return {
    width: viewport.width * cellSize,
    height: viewport.height * cellSize,
  };
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

function drawSimpleHeader(
  context: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  width: number,
) {
  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, HEADER_HEIGHT);
  context.fillStyle = "#1b1917";
  context.font = '600 30px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "top";
  context.fillText(title, PADDING, 14);
  context.font = '500 20px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.fillStyle = "#4a433d";
  context.fillText(subtitle, PADDING, 44);
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
  viewport: GridViewport = {
    startColumn: 0,
    startRow: 0,
    width: pattern.width,
    height: pattern.height,
  },
) {
  const majorGridEvery = options.majorGridEvery ?? 10;
  const boardGridEvery = options.boardGridEvery ?? Math.max(pattern.settings.boardWidth, pattern.settings.boardHeight);
  const showCodes = options.showCodes ?? true;
  const focusColorId = options.focusColorId ?? null;
  const mutedMode = options.mutedMode ?? "gray";
  const endColumn = viewport.startColumn + viewport.width;
  const endRow = viewport.startRow + viewport.height;

  for (const cell of pattern.cells) {
    if (
      cell.x < viewport.startColumn ||
      cell.x >= endColumn ||
      cell.y < viewport.startRow ||
      cell.y >= endRow
    ) {
      continue;
    }

    const x = originX + (cell.x - viewport.startColumn) * cellSize;
    const y = originY + (cell.y - viewport.startRow) * cellSize;

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
  for (let column = 0; column <= viewport.width; column += 1) {
    const position = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, originY);
    context.lineTo(position, originY + viewport.height * cellSize);
    context.stroke();
  }
  for (let row = 0; row <= viewport.height; row += 1) {
    const position = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, position);
    context.lineTo(originX + viewport.width * cellSize, position);
    context.stroke();
  }

  context.strokeStyle = "rgba(220, 78, 78, 0.65)";
  context.lineWidth = 2;
  for (let column = 0; column <= viewport.width; column += 1) {
    const globalColumn = viewport.startColumn + column;
    if (globalColumn % majorGridEvery !== 0) {
      continue;
    }
    const position = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, originY);
    context.lineTo(position, originY + viewport.height * cellSize);
    context.stroke();
  }
  for (let row = 0; row <= viewport.height; row += 1) {
    const globalRow = viewport.startRow + row;
    if (globalRow % majorGridEvery !== 0) {
      continue;
    }
    const position = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, position);
    context.lineTo(originX + viewport.width * cellSize, position);
    context.stroke();
  }

  context.strokeStyle = "rgba(43, 35, 35, 0.55)";
  context.lineWidth = 3;
  for (let column = 0; column <= viewport.width; column += 1) {
    const globalColumn = viewport.startColumn + column;
    if (globalColumn % boardGridEvery !== 0) {
      continue;
    }
    const position = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(position, originY);
    context.lineTo(position, originY + viewport.height * cellSize);
    context.stroke();
  }
  for (let row = 0; row <= viewport.height; row += 1) {
    const globalRow = viewport.startRow + row;
    if (globalRow % boardGridEvery !== 0) {
      continue;
    }
    const position = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, position);
    context.lineTo(originX + viewport.width * cellSize, position);
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

export function renderPurchaseListPng(pattern: GeneratedPattern, reserveRatio: number) {
  const items = buildPurchaseList(pattern, reserveRatio);
  const rowHeight = 34;
  const title = "BeadGrid 采购清单";
  const subtitle = `预留比例 ${Math.round(reserveRatio * 100)}% / 非空总数 ${pattern.statistics.filledCells}`;
  const width = 960;
  const height = HEADER_HEIGHT + PADDING * 2 + 80 + items.length * rowHeight;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建采购清单画布。");
  }

  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, height);
  drawSimpleHeader(context, title, subtitle, width);

  const startY = HEADER_HEIGHT + PADDING;
  context.fillStyle = "#1b1917";
  context.font = '600 16px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "middle";
  const columns = [
    { label: "色块", x: PADDING, width: 60 },
    { label: "色号", x: PADDING + 72, width: 120 },
    { label: "实际数量", x: PADDING + 220, width: 140 },
    { label: "建议准备", x: PADDING + 400, width: 140 },
  ];

  columns.forEach((column) => {
    context.fillText(column.label, column.x, startY + 12);
  });

  context.strokeStyle = "#d8d0c8";
  context.beginPath();
  context.moveTo(PADDING, startY + 22);
  context.lineTo(width - PADDING, startY + 22);
  context.stroke();

  items.forEach((item, index) => {
    const rowY = startY + 36 + index * rowHeight;
    context.fillStyle = rgbToHex(item.color.rgb);
    context.fillRect(PADDING, rowY - 9, 18, 18);
    context.strokeStyle = "rgba(27, 25, 23, 0.16)";
    context.strokeRect(PADDING + 0.5, rowY - 8.5, 17, 17);

    context.fillStyle = "#1b1917";
    context.fillText(item.color.code, columns[1]!.x, rowY);
    context.fillText(String(item.count), columns[2]!.x, rowY);
    context.fillText(String(item.recommendedCount), columns[3]!.x, rowY);

    context.strokeStyle = "rgba(27, 25, 23, 0.08)";
    context.beginPath();
    context.moveTo(PADDING, rowY + 16);
    context.lineTo(width - PADDING, rowY + 16);
    context.stroke();
  });

  return canvas;
}

export function renderBoardSplitChart(
  pattern: GeneratedPattern,
  viewport: GridViewport,
  title: string,
  subtitle: string,
) {
  const cellSize = getCellSize(pattern);
  const grid = calculateGridDimensions(viewport, cellSize);
  const width = grid.width + PADDING * 2;
  const height = HEADER_HEIGHT + PADDING * 2 + grid.height;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建底板拆分画布。");
  }

  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, height);
  drawSimpleHeader(context, title, subtitle, width);
  drawPatternGrid(
    context,
    pattern,
    PADDING,
    HEADER_HEIGHT + PADDING,
    cellSize,
    {
      showCodes: true,
      showLegend: false,
      majorGridEvery: 10,
      boardGridEvery: Math.max(pattern.settings.boardWidth, pattern.settings.boardHeight),
    },
    viewport,
  );

  return canvas;
}
