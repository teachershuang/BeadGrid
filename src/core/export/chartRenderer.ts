import { buildPurchaseList } from "@/core/export/purchaseList";
import { rgbToHex } from "@/core/color/utils";
import type { GeneratedPattern, PatternCell, PatternColorUsage } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export interface ChartRenderOptions {
  title?: string;
  subtitle?: string;
  showCodes?: boolean;
  showLegend?: boolean;
  showCoordinates?: boolean;
  minorGridEvery?: number;
  mutedMode?: "gray" | "transparent" | "hidden";
  focusColorId?: string | null;
}

export interface GridViewport {
  startColumn: number;
  startRow: number;
  width: number;
  height: number;
}

const HEADER_HEIGHT = 86;
const PADDING = 22;
const OUTER_GUTTER = 18;
const COORDINATE_GUTTER = 28;
const LEGEND_COLUMNS = 4;
const LEGEND_ITEM_HEIGHT = 30;
const LEGEND_ROW_GAP = 8;

function createCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function getCellSize(pattern: GeneratedPattern) {
  const longestSide = Math.max(pattern.width, pattern.height);
  if (longestSide <= 60) {
    return 22;
  }

  if (longestSide <= 100) {
    return 18;
  }

  if (longestSide <= 180) {
    return 14;
  }

  return 12;
}

function getReadableTextColor(rgb: PaletteColor["rgb"]) {
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.63 ? "#1b1917" : "#fdf9f1";
}

function getGridViewport(pattern: GeneratedPattern, viewport?: GridViewport): GridViewport {
  return (
    viewport ?? {
      startColumn: 0,
      startRow: 0,
      width: pattern.width,
      height: pattern.height,
    }
  );
}

function getPatternCell(pattern: GeneratedPattern, x: number, y: number) {
  return pattern.cells[y * pattern.width + x] ?? null;
}

function drawHeader(
  context: CanvasRenderingContext2D,
  width: number,
  title: string,
  subtitle: string,
) {
  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, HEADER_HEIGHT);

  context.fillStyle = "#1b1917";
  context.font = '700 30px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "top";
  context.fillText(title, PADDING, 16);

  context.fillStyle = "#4b433d";
  context.font = '500 18px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.fillText(subtitle, PADDING, 50);

  context.strokeStyle = "#ddd3c9";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, HEADER_HEIGHT - 0.5);
  context.lineTo(width, HEADER_HEIGHT - 0.5);
  context.stroke();
}

function drawLegend(
  context: CanvasRenderingContext2D,
  usages: PatternColorUsage[],
  width: number,
  startY: number,
) {
  if (usages.length === 0) {
    return;
  }

  const innerWidth = width - PADDING * 2;
  const columnWidth = innerWidth / LEGEND_COLUMNS;

  context.font = '500 14px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "middle";

  usages.forEach((usage, index) => {
    const column = index % LEGEND_COLUMNS;
    const row = Math.floor(index / LEGEND_COLUMNS);
    const x = PADDING + column * columnWidth;
    const y = startY + row * (LEGEND_ITEM_HEIGHT + LEGEND_ROW_GAP);
    const label = `${usage.color.code}${usage.color.nameZh ? ` ${usage.color.nameZh}` : ""}  ${usage.count}`;

    context.fillStyle = rgbToHex(usage.color.rgb);
    context.fillRect(x, y, 20, 20);
    context.strokeStyle = "rgba(27, 25, 23, 0.16)";
    context.strokeRect(x + 0.5, y + 0.5, 19, 19);

    context.fillStyle = "#1b1917";
    context.fillText(label, x + 28, y + 10);
  });
}

function drawCellCode(
  context: CanvasRenderingContext2D,
  cell: PatternCell,
  x: number,
  y: number,
  cellSize: number,
) {
  if (!cell.mappedColor || cellSize < 14) {
    return;
  }

  const code = cell.mappedColor.code;
  context.fillStyle = getReadableTextColor(cell.mappedColor.rgb);
  context.font = `${Math.max(8, Math.floor(cellSize * 0.38))}px "Bahnschrift", "Cascadia Code", monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(code, x + cellSize / 2, y + cellSize / 2 + 0.5);
}

function drawCoordinateLabels(
  context: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  viewport: GridViewport,
  cellSize: number,
  minorGridEvery: number,
) {
  context.fillStyle = "#5f5751";
  context.font = '500 12px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "middle";
  context.textAlign = "center";

  for (let columnOffset = 0; columnOffset < viewport.width; columnOffset += 1) {
    const globalColumn = viewport.startColumn + columnOffset;
    const labelColumn = globalColumn + 1;
    if (
      labelColumn !== 1 &&
      labelColumn !== viewport.startColumn + viewport.width &&
      labelColumn % minorGridEvery !== 0
    ) {
      continue;
    }

    const x = originX + columnOffset * cellSize + cellSize / 2;
    context.fillText(String(labelColumn), x, originY - 12);
    context.fillText(String(labelColumn), x, originY + viewport.height * cellSize + 12);
  }

  context.textAlign = "right";
  for (let rowOffset = 0; rowOffset < viewport.height; rowOffset += 1) {
    const globalRow = viewport.startRow + rowOffset;
    const labelRow = globalRow + 1;
    if (
      labelRow !== 1 &&
      labelRow !== viewport.startRow + viewport.height &&
      labelRow % minorGridEvery !== 0
    ) {
      continue;
    }

    const y = originY + rowOffset * cellSize + cellSize / 2;
    context.fillText(String(labelRow), originX - 8, y);
    context.textAlign = "left";
    context.fillText(String(labelRow), originX + viewport.width * cellSize + 8, y);
    context.textAlign = "right";
  }
}

function drawGridLines(
  context: CanvasRenderingContext2D,
  pattern: GeneratedPattern,
  originX: number,
  originY: number,
  viewport: GridViewport,
  cellSize: number,
  minorGridEvery: number,
) {
  const gridWidth = viewport.width * cellSize;
  const gridHeight = viewport.height * cellSize;

  context.strokeStyle = "rgba(69, 61, 54, 0.22)";
  context.lineWidth = 1;
  for (let column = 0; column <= viewport.width; column += 1) {
    const x = originX + column * cellSize + 0.5;
    context.beginPath();
    context.moveTo(x, originY);
    context.lineTo(x, originY + gridHeight);
    context.stroke();
  }
  for (let row = 0; row <= viewport.height; row += 1) {
    const y = originY + row * cellSize + 0.5;
    context.beginPath();
    context.moveTo(originX, y);
    context.lineTo(originX + gridWidth, y);
    context.stroke();
  }

  context.strokeStyle = "rgba(217, 88, 88, 0.82)";
  context.lineWidth = 2;
  for (let column = 0; column <= viewport.width; column += 1) {
    const globalColumn = viewport.startColumn + column;
    if (globalColumn === 0 || globalColumn % minorGridEvery === 0) {
      const x = originX + column * cellSize + 0.5;
      context.beginPath();
      context.moveTo(x, originY);
      context.lineTo(x, originY + gridHeight);
      context.stroke();
    }
  }
  for (let row = 0; row <= viewport.height; row += 1) {
    const globalRow = viewport.startRow + row;
    if (globalRow === 0 || globalRow % minorGridEvery === 0) {
      const y = originY + row * cellSize + 0.5;
      context.beginPath();
      context.moveTo(originX, y);
      context.lineTo(originX + gridWidth, y);
      context.stroke();
    }
  }

  context.strokeStyle = "rgba(26, 24, 22, 0.72)";
  context.lineWidth = 3;
  for (let column = 0; column <= viewport.width; column += 1) {
    const globalColumn = viewport.startColumn + column;
    if (isBoardBoundaryLine(column, viewport.width, globalColumn, pattern.settings.boardWidth)) {
      const x = originX + column * cellSize + 0.5;
      context.beginPath();
      context.moveTo(x, originY);
      context.lineTo(x, originY + gridHeight);
      context.stroke();
    }
  }
  for (let row = 0; row <= viewport.height; row += 1) {
    const globalRow = viewport.startRow + row;
    if (isBoardBoundaryLine(row, viewport.height, globalRow, pattern.settings.boardHeight)) {
      const y = originY + row * cellSize + 0.5;
      context.beginPath();
      context.moveTo(originX, y);
      context.lineTo(originX + gridWidth, y);
      context.stroke();
    }
  }
}

export function isBoardBoundaryLine(
  localLine: number,
  viewportSize: number,
  globalLine: number,
  boardSize: number,
) {
  return localLine === 0 || localLine === viewportSize || globalLine % boardSize === 0;
}

function drawPatternGrid(
  context: CanvasRenderingContext2D,
  pattern: GeneratedPattern,
  originX: number,
  originY: number,
  cellSize: number,
  options: ChartRenderOptions,
  viewport?: GridViewport,
) {
  const resolvedViewport = getGridViewport(pattern, viewport);
  const focusColorId = options.focusColorId ?? null;
  const mutedMode = options.mutedMode ?? "gray";
  const showCodes = options.showCodes ?? true;
  const minorGridEvery = options.minorGridEvery ?? 5;

  for (let y = resolvedViewport.startRow; y < resolvedViewport.startRow + resolvedViewport.height; y += 1) {
    for (let x = resolvedViewport.startColumn; x < resolvedViewport.startColumn + resolvedViewport.width; x += 1) {
      const cell = getPatternCell(pattern, x, y);
      if (!cell) {
        continue;
      }

      const drawX = originX + (x - resolvedViewport.startColumn) * cellSize;
      const drawY = originY + (y - resolvedViewport.startRow) * cellSize;

      if (!cell.mappedColor) {
        context.fillStyle = "#fffdfa";
        context.fillRect(drawX, drawY, cellSize, cellSize);
        continue;
      }

      const isFocused = !focusColorId || cell.mappedColor.id === focusColorId;
      if (isFocused) {
        context.fillStyle = rgbToHex(cell.mappedColor.rgb);
      } else if (mutedMode === "hidden") {
        context.fillStyle = "#fffdfa";
      } else if (mutedMode === "transparent") {
        context.fillStyle = `${rgbToHex(cell.mappedColor.rgb)}22`;
      } else {
        context.fillStyle = "#ebe5de";
      }

      context.fillRect(drawX, drawY, cellSize, cellSize);

      if (showCodes && cell.mappedColor && (isFocused || mutedMode !== "hidden")) {
        if (!isFocused && mutedMode === "gray") {
          context.fillStyle = "#8e857d";
          context.font = `${Math.max(8, Math.floor(cellSize * 0.38))}px "Bahnschrift", "Cascadia Code", monospace`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(cell.mappedColor.code, drawX + cellSize / 2, drawY + cellSize / 2 + 0.5);
        } else {
          drawCellCode(context, cell, drawX, drawY, cellSize);
        }
      }
    }
  }

  drawGridLines(context, pattern, originX, originY, resolvedViewport, cellSize, minorGridEvery);

  if (options.showCoordinates ?? true) {
    drawCoordinateLabels(context, originX, originY, resolvedViewport, cellSize, minorGridEvery);
  }
}

function getLegendHeight(usages: PatternColorUsage[], showLegend: boolean) {
  if (!showLegend || usages.length === 0) {
    return 0;
  }

  const rowCount = Math.ceil(usages.length / LEGEND_COLUMNS);
  return 24 + rowCount * LEGEND_ITEM_HEIGHT + Math.max(0, rowCount - 1) * LEGEND_ROW_GAP;
}

function buildPatternSubtitle(
  pattern: GeneratedPattern,
  subtitle: string | undefined,
  highlightedUsage: PatternColorUsage | undefined,
) {
  if (subtitle) {
    return subtitle;
  }

  const base = `${pattern.settings.brandId.toUpperCase()}  ${pattern.width}×${pattern.height} / ${pattern.statistics.actualColorCount} 色 / 共 ${pattern.statistics.filledCells} 颗`;
  if (!highlightedUsage) {
    return base;
  }

  return `${base}  ·  分色图 ${highlightedUsage.color.code}${highlightedUsage.color.nameZh ? ` ${highlightedUsage.color.nameZh}` : ""} / ${highlightedUsage.count} 颗`;
}

export function renderPatternChart(
  pattern: GeneratedPattern,
  options: ChartRenderOptions = {},
) {
  const cellSize = getCellSize(pattern);
  const viewport = getGridViewport(pattern);
  const showCoordinates = options.showCoordinates ?? true;
  const showLegend = options.showLegend ?? true;
  const highlightedUsage = options.focusColorId
    ? pattern.statistics.usages.find((usage) => usage.color.id === options.focusColorId)
    : undefined;

  const coordinateGutter = showCoordinates ? COORDINATE_GUTTER : 0;
  const legendHeight = getLegendHeight(pattern.statistics.usages, showLegend);
  const gridWidth = viewport.width * cellSize;
  const gridHeight = viewport.height * cellSize;
  const canvasWidth = PADDING * 2 + OUTER_GUTTER * 2 + coordinateGutter * 2 + gridWidth;
  const canvasHeight =
    HEADER_HEIGHT +
    PADDING * 2 +
    OUTER_GUTTER * 2 +
    coordinateGutter * 2 +
    gridHeight +
    legendHeight;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建图纸导出画布。");
  }

  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, canvasWidth, canvasHeight);

  drawHeader(
    context,
    canvasWidth,
    options.title ?? "BeadGrid 完整底稿",
    buildPatternSubtitle(pattern, options.subtitle, highlightedUsage),
  );

  const originX = PADDING + OUTER_GUTTER + coordinateGutter;
  const originY = HEADER_HEIGHT + PADDING + OUTER_GUTTER + coordinateGutter;

  drawPatternGrid(context, pattern, originX, originY, cellSize, options);

  if (showLegend) {
    drawLegend(
      context,
      pattern.statistics.usages,
      canvasWidth,
      originY + gridHeight + OUTER_GUTTER + coordinateGutter,
    );
  }

  return canvas;
}

export function renderPurchaseListPng(pattern: GeneratedPattern, reserveRatio: number) {
  const items = buildPurchaseList(pattern, reserveRatio);
  const rowHeight = 34;
  const width = 1120;
  const height = HEADER_HEIGHT + PADDING * 2 + 52 + items.length * rowHeight;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建采购清单画布。");
  }

  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, height);
  drawHeader(
    context,
    width,
    "BeadGrid 采购清单",
    `${pattern.settings.brandId.toUpperCase()}  ·  预留比例 ${Math.round(reserveRatio * 100)}%  ·  非空总数 ${pattern.statistics.filledCells}`,
  );

  const startY = HEADER_HEIGHT + PADDING;
  const columns = [
    { label: "色块", x: PADDING },
    { label: "色号", x: PADDING + 78 },
    { label: "中文名称", x: PADDING + 200 },
    { label: "实际数量", x: PADDING + 490 },
    { label: "建议准备", x: PADDING + 650 },
    { label: "品牌", x: PADDING + 830 },
  ];

  context.fillStyle = "#1b1917";
  context.font = '700 15px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "middle";
  columns.forEach((column) => context.fillText(column.label, column.x, startY + 12));

  context.strokeStyle = "#ddd3c9";
  context.beginPath();
  context.moveTo(PADDING, startY + 24);
  context.lineTo(width - PADDING, startY + 24);
  context.stroke();

  items.forEach((item, index) => {
    const rowY = startY + 48 + index * rowHeight;

    context.fillStyle = rgbToHex(item.color.rgb);
    context.fillRect(PADDING, rowY - 10, 20, 20);
    context.strokeStyle = "rgba(27, 25, 23, 0.15)";
    context.strokeRect(PADDING + 0.5, rowY - 9.5, 19, 19);

    context.fillStyle = "#1b1917";
    context.font = '500 15px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
    context.fillText(item.color.code, columns[1]!.x, rowY);
    context.fillText(item.color.nameZh ?? "-", columns[2]!.x, rowY);
    context.fillText(String(item.count), columns[3]!.x, rowY);
    context.fillText(String(item.recommendedCount), columns[4]!.x, rowY);
    context.fillText(item.color.brandId.toUpperCase(), columns[5]!.x, rowY);

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
  const coordinateGutter = COORDINATE_GUTTER;
  const gridWidth = viewport.width * cellSize;
  const gridHeight = viewport.height * cellSize;
  const width = PADDING * 2 + OUTER_GUTTER * 2 + coordinateGutter * 2 + gridWidth;
  const height = HEADER_HEIGHT + PADDING * 2 + OUTER_GUTTER * 2 + coordinateGutter * 2 + gridHeight;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法创建底板拆分图画布。");
  }

  context.fillStyle = "#fffaf4";
  context.fillRect(0, 0, width, height);
  drawHeader(context, width, title, subtitle);

  drawPatternGrid(
    context,
    pattern,
    PADDING + OUTER_GUTTER + coordinateGutter,
    HEADER_HEIGHT + PADDING + OUTER_GUTTER + coordinateGutter,
    cellSize,
    {
      showCodes: true,
      showLegend: false,
      showCoordinates: true,
      minorGridEvery: 5,
    },
    viewport,
  );

  return canvas;
}
