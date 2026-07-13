export interface PatternCanvasLayout {
  originX: number;
  originY: number;
  cellWidth: number;
  cellHeight: number;
  gridWidth: number;
  gridHeight: number;
}

export function resolvePatternCellIndex(
  x: number,
  y: number,
  patternWidth: number,
  patternHeight: number,
  layout: PatternCanvasLayout,
) {
  const { originX, originY, gridWidth, gridHeight, cellWidth, cellHeight } = layout;
  if (
    x < originX ||
    y < originY ||
    x >= originX + gridWidth ||
    y >= originY + gridHeight
  ) {
    return null;
  }

  const cellX = Math.floor((x - originX) / cellWidth);
  const cellY = Math.floor((y - originY) / cellHeight);
  if (cellX < 0 || cellX >= patternWidth || cellY < 0 || cellY >= patternHeight) {
    return null;
  }

  return cellY * patternWidth + cellX;
}
