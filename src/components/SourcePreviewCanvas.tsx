import { useEffect, useRef } from "react";
import { mapSourcePointToArtwork } from "@/core/image/sampler";
import type { LoadedSourceImage } from "@/core/image/loadSourceImage";
import type { PatternSettings } from "@/types/image";

interface SourcePreviewCanvasProps {
  sourceImage: LoadedSourceImage | null;
  settings: PatternSettings;
}

function drawCheckerboard(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
) {
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      context.fillStyle = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0 ? "#f7f2eb" : "#efe8de";
      context.fillRect(x, y, cellSize, cellSize);
    }
  }
}

export function SourcePreviewCanvas({ sourceImage, settings }: SourcePreviewCanvasProps) {
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
    drawCheckerboard(context, width, height, 24);

    if (!sourceImage) {
      context.fillStyle = "rgba(17, 33, 31, 0.6)";
      context.font = "16px Bahnschrift, sans-serif";
      context.textAlign = "center";
      context.fillText("导入图片后可预览裁剪结果", width / 2, height / 2);
      return;
    }

    const imageData = new ImageData(
      new Uint8ClampedArray(sourceImage.data),
      sourceImage.width,
      sourceImage.height,
    );
    const offscreen = document.createElement("canvas");
    offscreen.width = sourceImage.width;
    offscreen.height = sourceImage.height;

    const offscreenContext = offscreen.getContext("2d");
    if (!offscreenContext) {
      return;
    }

    offscreenContext.putImageData(imageData, 0, 0);

    const margin = 24;
    const boardWidth = width - margin * 2;
    const boardHeight = height - margin * 2;

    context.save();
    context.translate(margin, margin);
    context.fillStyle = "#fffaf4";
    context.fillRect(0, 0, boardWidth, boardHeight);

    const topLeft = mapSourcePointToArtwork(
      sourceImage,
      settings.artworkWidth,
      settings.artworkHeight,
      settings,
      0,
      0,
    );
    const topRight = mapSourcePointToArtwork(
      sourceImage,
      settings.artworkWidth,
      settings.artworkHeight,
      settings,
      sourceImage.width,
      0,
    );
    const bottomLeft = mapSourcePointToArtwork(
      sourceImage,
      settings.artworkWidth,
      settings.artworkHeight,
      settings,
      0,
      sourceImage.height,
    );

    const scaleX = boardWidth / settings.artworkWidth;
    const scaleY = boardHeight / settings.artworkHeight;

    context.translate(topLeft.x * scaleX, topLeft.y * scaleY);
    context.transform(
      (topRight.x - topLeft.x) / sourceImage.width * scaleX,
      (topRight.y - topLeft.y) / sourceImage.width * scaleY,
      (bottomLeft.x - topLeft.x) / sourceImage.height * scaleX,
      (bottomLeft.y - topLeft.y) / sourceImage.height * scaleY,
      0,
      0,
    );
    context.imageSmoothingEnabled = true;
    context.drawImage(offscreen, 0, 0);
    context.restore();

    context.save();
    context.translate(margin, margin);
    context.strokeStyle = "rgba(17, 33, 31, 0.28)";
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, boardWidth - 1, boardHeight - 1);

    const cellWidth = boardWidth / settings.artworkWidth;
    const cellHeight = boardHeight / settings.artworkHeight;
    const step = Math.max(1, Math.floor(Math.max(settings.artworkWidth, settings.artworkHeight) / 24));

    context.strokeStyle = "rgba(17, 33, 31, 0.1)";
    for (let x = 0; x <= settings.artworkWidth; x += step) {
      const position = x * cellWidth;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, boardHeight);
      context.stroke();
    }
    for (let y = 0; y <= settings.artworkHeight; y += step) {
      const position = y * cellHeight;
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(boardWidth, position);
      context.stroke();
    }

    context.restore();
  }, [settings, sourceImage]);

  return <canvas ref={canvasRef} width={560} height={560} className="preview-canvas" />;
}
