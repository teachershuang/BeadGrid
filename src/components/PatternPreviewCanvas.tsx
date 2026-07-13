import { useEffect, useMemo, useRef, useState } from "react";
import { rgbToHex } from "@/core/color/utils";
import { resolvePatternCellIndex } from "@/components/patternPreviewGeometry";
import type { GeneratedPattern } from "@/types/pattern";

export interface HoveredPatternCell {
  x: number;
  y: number;
  code: string | null;
  nameZh: string | null;
}

interface PatternPreviewCanvasProps {
  pattern: GeneratedPattern | null;
  showGrid: boolean;
  showCodes: boolean;
  showFiveByFiveGrid: boolean;
  showBoardBoundaries: boolean;
  showCoordinates: boolean;
  highlightedColorId: string | null;
  editMode: boolean;
  onColorPick: (colorId: string | null) => void;
  onHoverChange: (hoveredCell: HoveredPatternCell | null) => void;
  onEditStrokeStart: (cellIndex: number) => void;
  onEditStrokeMove: (cellIndex: number) => void;
  onEditStrokeEnd: () => void;
}

const CANVAS_SIZE = 640;
const PADDING = 24;
const LABEL_GUTTER = 28;

export function PatternPreviewCanvas({
  pattern,
  showGrid,
  showCodes,
  showFiveByFiveGrid,
  showBoardBoundaries,
  showCoordinates,
  highlightedColorId,
  editMode,
  onColorPick,
  onHoverChange,
  onEditStrokeStart,
  onEditStrokeMove,
  onEditStrokeEnd,
}: PatternPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const editStrokeActiveRef = useRef(false);
  const lastEditedIndexRef = useRef<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const coordinateGutter = showCoordinates ? LABEL_GUTTER : 0;

  const layout = useMemo(() => {
    const available = CANVAS_SIZE - PADDING * 2 - coordinateGutter * 2;
    const gridWidth = pattern ? available / pattern.width : available;
    const gridHeight = pattern ? available / pattern.height : available;
    return {
      gridWidth: pattern ? gridWidth * pattern.width : available,
      gridHeight: pattern ? gridHeight * pattern.height : available,
      cellWidth: pattern ? gridWidth : 0,
      cellHeight: pattern ? gridHeight : 0,
      originX: PADDING + coordinateGutter,
      originY: PADDING + coordinateGutter,
    };
  }, [coordinateGutter, pattern]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#f6efe5";
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (!pattern) {
      context.fillStyle = "rgba(17, 33, 31, 0.6)";
      context.font = '16px "Bahnschrift", sans-serif';
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("生成后可在这里预览拼豆图纸", canvas.width / 2, canvas.height / 2);
      return;
    }

    const { originX, originY, cellWidth, cellHeight, gridWidth, gridHeight } = layout;

    for (const cell of pattern.cells) {
      const x = originX + cell.x * cellWidth;
      const y = originY + cell.y * cellHeight;

      if (!cell.mappedColor) {
        context.fillStyle = "#fffdf9";
      } else if (highlightedColorId && cell.mappedColor.id !== highlightedColorId) {
        context.fillStyle = "rgba(220, 220, 220, 0.42)";
      } else {
        context.fillStyle = rgbToHex(cell.mappedColor.rgb);
      }

      context.fillRect(x, y, cellWidth, cellHeight);

      if (showCodes && cell.mappedColor && Math.min(cellWidth, cellHeight) >= 18) {
        const luminance =
          (0.299 * cell.mappedColor.rgb.r +
            0.587 * cell.mappedColor.rgb.g +
            0.114 * cell.mappedColor.rgb.b) /
          255;
        context.fillStyle = luminance > 0.63 ? "#1b1917" : "#f9f6f1";
        context.font = `${Math.max(8, Math.floor(Math.min(cellWidth, cellHeight) * 0.36))}px "Bahnschrift", "Cascadia Code", monospace`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(cell.mappedColor.code, x + cellWidth / 2, y + cellHeight / 2);
      }
    }

    drawGrid(context, pattern, layout, {
      showGrid,
      showFiveByFiveGrid,
      showBoardBoundaries,
    });

    if (showCoordinates) {
      drawCoordinates(context, pattern, layout);
    }

    if (hoveredIndex !== null) {
      const cell = pattern.cells[hoveredIndex];
      if (cell) {
        context.strokeStyle = "#1b1917";
        context.lineWidth = 2;
        context.strokeRect(
          originX + cell.x * cellWidth + 1,
          originY + cell.y * cellHeight + 1,
          cellWidth - 2,
          cellHeight - 2,
        );
      }
    }

    context.strokeStyle = "rgba(17, 33, 31, 0.32)";
    context.lineWidth = 1.5;
    context.strokeRect(originX + 0.5, originY + 0.5, gridWidth - 1, gridHeight - 1);
  }, [
    highlightedColorId,
    hoveredIndex,
    layout,
    onHoverChange,
    pattern,
    showBoardBoundaries,
    showCodes,
    showCoordinates,
    showFiveByFiveGrid,
    showGrid,
  ]);

  useEffect(() => {
    if (!pattern || hoveredIndex === null) {
      onHoverChange(null);
      return;
    }

    const cell = pattern.cells[hoveredIndex];
    onHoverChange(
      cell
        ? {
            x: cell.x,
            y: cell.y,
            code: cell.mappedColor?.code ?? null,
            nameZh: cell.mappedColor?.nameZh ?? null,
          }
        : null,
    );
  }, [hoveredIndex, onHoverChange, pattern]);

  function resolveCellFromPointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || !pattern) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return resolvePatternCellIndex(x, y, pattern.width, pattern.height, layout);
  }

  function finishEditStroke() {
    if (!editStrokeActiveRef.current) {
      return;
    }

    editStrokeActiveRef.current = false;
    lastEditedIndexRef.current = null;
    onEditStrokeEnd();
  }

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className={`preview-canvas ${editMode ? "is-editing" : ""}`}
      onClick={(event) => {
        if (editMode) {
          return;
        }

        const index = resolveCellFromPointer(event.clientX, event.clientY);
        if (index === null || !pattern) {
          return;
        }

        const cell = pattern.cells[index];
        onColorPick(cell?.mappedColor?.id ?? null);
      }}
      onPointerDown={(event) => {
        if (!editMode) {
          return;
        }

        const index = resolveCellFromPointer(event.clientX, event.clientY);
        if (index === null) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        editStrokeActiveRef.current = true;
        lastEditedIndexRef.current = index;
        onEditStrokeStart(index);
      }}
      onPointerMove={(event) => {
        const index = resolveCellFromPointer(event.clientX, event.clientY);
        setHoveredIndex(index);

        if (
          !editMode ||
          !editStrokeActiveRef.current ||
          index === null ||
          index === lastEditedIndexRef.current
        ) {
          return;
        }

        lastEditedIndexRef.current = index;
        onEditStrokeMove(index);
      }}
      onPointerUp={finishEditStroke}
      onPointerCancel={finishEditStroke}
      onLostPointerCapture={finishEditStroke}
      onMouseMove={(event) => {
        if (!editMode) {
          setHoveredIndex(resolveCellFromPointer(event.clientX, event.clientY));
        }
      }}
      onMouseLeave={() => {
        setHoveredIndex(null);
        onHoverChange(null);
      }}
    />
  );
}

function drawGrid(
  context: CanvasRenderingContext2D,
  pattern: GeneratedPattern,
  layout: {
    originX: number;
    originY: number;
    cellWidth: number;
    cellHeight: number;
    gridWidth: number;
    gridHeight: number;
  },
  options: {
    showGrid: boolean;
    showFiveByFiveGrid: boolean;
    showBoardBoundaries: boolean;
  },
) {
  const { originX, originY, cellWidth, cellHeight, gridWidth, gridHeight } = layout;

  if (options.showGrid) {
    context.strokeStyle = "rgba(17, 33, 31, 0.15)";
    context.lineWidth = 1;
    for (let x = 0; x <= pattern.width; x += 1) {
      const position = originX + x * cellWidth + 0.5;
      context.beginPath();
      context.moveTo(position, originY);
      context.lineTo(position, originY + gridHeight);
      context.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 1) {
      const position = originY + y * cellHeight + 0.5;
      context.beginPath();
      context.moveTo(originX, position);
      context.lineTo(originX + gridWidth, position);
      context.stroke();
    }
  }

  if (options.showFiveByFiveGrid) {
    context.strokeStyle = "rgba(220, 78, 78, 0.78)";
    context.lineWidth = 1.8;
    for (let x = 0; x <= pattern.width; x += 1) {
      if (x !== 0 && x % 5 !== 0) {
        continue;
      }
      const position = originX + x * cellWidth + 0.5;
      context.beginPath();
      context.moveTo(position, originY);
      context.lineTo(position, originY + gridHeight);
      context.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 1) {
      if (y !== 0 && y % 5 !== 0) {
        continue;
      }
      const position = originY + y * cellHeight + 0.5;
      context.beginPath();
      context.moveTo(originX, position);
      context.lineTo(originX + gridWidth, position);
      context.stroke();
    }
  }

  if (options.showBoardBoundaries) {
    context.strokeStyle = "rgba(17, 33, 31, 0.66)";
    context.lineWidth = 2.6;
    for (let x = 0; x <= pattern.width; x += 1) {
      if (x !== 0 && x % pattern.settings.boardWidth !== 0) {
        continue;
      }
      const position = originX + x * cellWidth + 0.5;
      context.beginPath();
      context.moveTo(position, originY);
      context.lineTo(position, originY + gridHeight);
      context.stroke();
    }
    for (let y = 0; y <= pattern.height; y += 1) {
      if (y !== 0 && y % pattern.settings.boardHeight !== 0) {
        continue;
      }
      const position = originY + y * cellHeight + 0.5;
      context.beginPath();
      context.moveTo(originX, position);
      context.lineTo(originX + gridWidth, position);
      context.stroke();
    }
  }
}

function drawCoordinates(
  context: CanvasRenderingContext2D,
  pattern: GeneratedPattern,
  layout: {
    originX: number;
    originY: number;
    cellWidth: number;
    cellHeight: number;
    gridWidth: number;
    gridHeight: number;
  },
) {
  const { originX, originY, cellWidth, cellHeight, gridWidth, gridHeight } = layout;
  context.fillStyle = "#5f5751";
  context.font = '500 12px "Bahnschrift", "Microsoft YaHei UI", sans-serif';
  context.textBaseline = "middle";
  context.textAlign = "center";

  for (let x = 0; x < pattern.width; x += 1) {
    const value = x + 1;
    if (value !== 1 && value !== pattern.width && value % 5 !== 0) {
      continue;
    }
    const labelX = originX + x * cellWidth + cellWidth / 2;
    context.fillText(String(value), labelX, originY - 12);
    context.fillText(String(value), labelX, originY + gridHeight + 12);
  }

  context.textAlign = "right";
  for (let y = 0; y < pattern.height; y += 1) {
    const value = y + 1;
    if (value !== 1 && value !== pattern.height && value % 5 !== 0) {
      continue;
    }
    const labelY = originY + y * cellHeight + cellHeight / 2;
    context.fillText(String(value), originX - 8, labelY);
    context.textAlign = "left";
    context.fillText(String(value), originX + gridWidth + 8, labelY);
    context.textAlign = "right";
  }
}
