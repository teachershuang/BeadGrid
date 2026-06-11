import { useEffect, useRef } from "react";
import { rgbToHex } from "@/core/color/utils";
import type { GeneratedPattern } from "@/types/pattern";

interface PatternPreviewCanvasProps {
  pattern: GeneratedPattern | null;
  showGrid: boolean;
  showCodes: boolean;
  highlightedColorId: string | null;
  onColorPick: (colorId: string | null) => void;
}

export function PatternPreviewCanvas({
  pattern,
  showGrid,
  showCodes,
  highlightedColorId,
  onColorPick,
}: PatternPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f6efe5";
    context.fillRect(0, 0, width, height);

    if (!pattern) {
      context.fillStyle = "rgba(17, 33, 31, 0.6)";
      context.font = "16px Bahnschrift, sans-serif";
      context.textAlign = "center";
      context.fillText("生成后可查看拼豆图纸预览", width / 2, height / 2);
      return;
    }

    const margin = 24;
    const boardWidth = width - margin * 2;
    const boardHeight = height - margin * 2;
    const cellWidth = boardWidth / pattern.width;
    const cellHeight = boardHeight / pattern.height;

    context.save();
    context.translate(margin, margin);

    for (const cell of pattern.cells) {
      const x = cell.x * cellWidth;
      const y = cell.y * cellHeight;

      if (!cell.mappedColor) {
        context.fillStyle = "#fbf6ef";
      } else if (highlightedColorId && cell.mappedColor.id !== highlightedColorId) {
        context.fillStyle = "rgba(220, 220, 220, 0.28)";
      } else {
        context.fillStyle = rgbToHex(cell.mappedColor.rgb);
      }

      context.fillRect(x, y, cellWidth, cellHeight);

      if (showCodes && cell.mappedColor && Math.min(cellWidth, cellHeight) >= 18) {
        context.fillStyle = "rgba(17, 33, 31, 0.8)";
        context.font = `${Math.max(9, Math.floor(Math.min(cellWidth, cellHeight) * 0.34))}px Cascadia Code, monospace`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(cell.mappedColor.code, x + cellWidth / 2, y + cellHeight / 2);
      }
    }

    if (showGrid) {
      context.strokeStyle = "rgba(17, 33, 31, 0.14)";
      context.lineWidth = 1;
      for (let x = 0; x <= pattern.width; x += 1) {
        const position = x * cellWidth;
        context.beginPath();
        context.moveTo(position, 0);
        context.lineTo(position, boardHeight);
        context.stroke();
      }
      for (let y = 0; y <= pattern.height; y += 1) {
        const position = y * cellHeight;
        context.beginPath();
        context.moveTo(0, position);
        context.lineTo(boardWidth, position);
        context.stroke();
      }
    }

    context.strokeStyle = "rgba(17, 33, 31, 0.32)";
    context.strokeRect(0.5, 0.5, boardWidth - 1, boardHeight - 1);
    context.restore();
  }, [highlightedColorId, pattern, showCodes, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={560}
      className="preview-canvas"
      onClick={(event) => {
        if (!pattern) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const scaleX = event.currentTarget.width / rect.width;
        const scaleY = event.currentTarget.height / rect.height;
        const canvasX = (event.clientX - rect.left) * scaleX;
        const canvasY = (event.clientY - rect.top) * scaleY;
        const margin = 24;
        const boardWidth = event.currentTarget.width - margin * 2;
        const boardHeight = event.currentTarget.height - margin * 2;

        if (
          canvasX < margin ||
          canvasY < margin ||
          canvasX > margin + boardWidth ||
          canvasY > margin + boardHeight
        ) {
          return;
        }

        const cellX = Math.min(
          pattern.width - 1,
          Math.max(0, Math.floor(((canvasX - margin) / boardWidth) * pattern.width)),
        );
        const cellY = Math.min(
          pattern.height - 1,
          Math.max(0, Math.floor(((canvasY - margin) / boardHeight) * pattern.height)),
        );
        const cell = pattern.cells[cellY * pattern.width + cellX];
        onColorPick(cell?.mappedColor?.id ?? null);
      }}
    />
  );
}

