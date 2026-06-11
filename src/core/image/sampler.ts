import { rgbToLab } from "@/core/color/conversion";
import { compositeRgb, quantizeRgb, rgbDistanceSquared, rgbToHex } from "@/core/color/utils";
import type { LabColor, RgbColor } from "@/types/color";
import type { CropSettings, PixelSourceImage, SamplingSettings, TargetCell } from "@/types/image";

interface SamplePoint {
  rgb: RgbColor;
  lab: LabColor;
}

export interface ImagePlacement {
  scale: number;
  panX: number;
  panY: number;
  rotatedWidth: number;
  rotatedHeight: number;
}

function getRotatedDimensions(image: PixelSourceImage, rotation: CropSettings["rotation"]) {
  if (rotation === 90 || rotation === 270) {
    return { width: image.height, height: image.width };
  }

  return { width: image.width, height: image.height };
}

export function getImagePlacement(
  image: PixelSourceImage,
  artworkWidth: number,
  artworkHeight: number,
  settings: CropSettings,
): ImagePlacement {
  const rotated = getRotatedDimensions(image, settings.rotation);
  const fitScale =
    settings.fitMode === "cover"
      ? Math.max(artworkWidth / rotated.width, artworkHeight / rotated.height)
      : Math.min(artworkWidth / rotated.width, artworkHeight / rotated.height);

  return {
    scale: fitScale * settings.zoom,
    panX: settings.offsetX * artworkWidth * 0.5,
    panY: settings.offsetY * artworkHeight * 0.5,
    rotatedWidth: rotated.width,
    rotatedHeight: rotated.height,
  };
}

function readPixel(image: PixelSourceImage, x: number, y: number) {
  const clampedX = Math.min(image.width - 1, Math.max(0, x));
  const clampedY = Math.min(image.height - 1, Math.max(0, y));
  const index = (clampedY * image.width + clampedX) * 4;

  return {
    r: image.data[index] ?? 0,
    g: image.data[index + 1] ?? 0,
    b: image.data[index + 2] ?? 0,
    a: image.data[index + 3] ?? 0,
  };
}

function bilinearSample(image: PixelSourceImage, x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(image.width - 1, x0 + 1);
  const y1 = Math.min(image.height - 1, y0 + 1);
  const dx = x - x0;
  const dy = y - y0;

  const topLeft = readPixel(image, x0, y0);
  const topRight = readPixel(image, x1, y0);
  const bottomLeft = readPixel(image, x0, y1);
  const bottomRight = readPixel(image, x1, y1);

  const mix = (a: number, b: number, factor: number) => a + (b - a) * factor;
  const top = {
    r: mix(topLeft.r, topRight.r, dx),
    g: mix(topLeft.g, topRight.g, dx),
    b: mix(topLeft.b, topRight.b, dx),
    a: mix(topLeft.a, topRight.a, dx),
  };
  const bottom = {
    r: mix(bottomLeft.r, bottomRight.r, dx),
    g: mix(bottomLeft.g, bottomRight.g, dx),
    b: mix(bottomLeft.b, bottomRight.b, dx),
    a: mix(bottomLeft.a, bottomRight.a, dx),
  };

  return {
    r: mix(top.r, bottom.r, dy),
    g: mix(top.g, bottom.g, dy),
    b: mix(top.b, bottom.b, dy),
    a: mix(top.a, bottom.a, dy),
  };
}

function rotatePoint(x: number, y: number, rotation: CropSettings["rotation"]) {
  switch (rotation) {
    case 90:
      return { x: y, y: -x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: -y, y: x };
    default:
      return { x, y };
  }
}

function inverseRotatePoint(x: number, y: number, rotation: CropSettings["rotation"]) {
  switch (rotation) {
    case 90:
      return { x: -y, y: x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: y, y: -x };
    default:
      return { x, y };
  }
}

export function mapArtworkPointToSource(
  image: PixelSourceImage,
  artworkWidth: number,
  artworkHeight: number,
  settings: CropSettings,
  artworkX: number,
  artworkY: number,
) {
  const placement = getImagePlacement(image, artworkWidth, artworkHeight, settings);
  const centeredX = artworkX - artworkWidth / 2 - placement.panX;
  const centeredY = artworkY - artworkHeight / 2 - placement.panY;
  const scaledX = centeredX / placement.scale;
  const scaledY = centeredY / placement.scale;
  const unrotated = inverseRotatePoint(scaledX, scaledY, settings.rotation);
  const sourceCenteredX = settings.flipHorizontal ? -unrotated.x : unrotated.x;
  const sourceCenteredY = unrotated.y;

  return {
    x: sourceCenteredX + image.width / 2,
    y: sourceCenteredY + image.height / 2,
  };
}

export function sampleArtworkPoint(
  image: PixelSourceImage,
  artworkWidth: number,
  artworkHeight: number,
  cropSettings: CropSettings,
  samplingSettings: SamplingSettings,
  artworkX: number,
  artworkY: number,
): SamplePoint | null {
  const sourcePoint = mapArtworkPointToSource(
    image,
    artworkWidth,
    artworkHeight,
    cropSettings,
    artworkX,
    artworkY,
  );

  if (
    sourcePoint.x < 0 ||
    sourcePoint.y < 0 ||
    sourcePoint.x >= image.width ||
    sourcePoint.y >= image.height
  ) {
    return samplingSettings.transparencyMode === "blend"
      ? {
          rgb: samplingSettings.backgroundRgb,
          lab: rgbToLab(samplingSettings.backgroundRgb),
        }
      : null;
  }

  const sampled = bilinearSample(image, sourcePoint.x, sourcePoint.y);
  const alpha = sampled.a / 255;

  if (alpha <= samplingSettings.alphaThreshold) {
    return samplingSettings.transparencyMode === "blend"
      ? {
          rgb: samplingSettings.backgroundRgb,
          lab: rgbToLab(samplingSettings.backgroundRgb),
        }
      : null;
  }

  const compositedRgb = compositeRgb(
    { r: sampled.r, g: sampled.g, b: sampled.b },
    alpha,
    samplingSettings.backgroundRgb,
  );

  return {
    rgb: compositedRgb,
    lab: rgbToLab(compositedRgb),
  };
}

function extractDominantColor(samples: SamplePoint[]) {
  if (samples.length === 0) {
    return null;
  }

  const clusters = new Map<
    string,
    {
      samples: SamplePoint[];
      totalR: number;
      totalG: number;
      totalB: number;
    }
  >();

  for (const sample of samples) {
    const quantized = quantizeRgb(sample.rgb);
    const key = rgbToHex(quantized);
    const cluster =
      clusters.get(key) ??
      {
        samples: [],
        totalR: 0,
        totalG: 0,
        totalB: 0,
      };

    cluster.samples.push(sample);
    cluster.totalR += sample.rgb.r;
    cluster.totalG += sample.rgb.g;
    cluster.totalB += sample.rgb.b;
    clusters.set(key, cluster);
  }

  const dominant = [...clusters.entries()]
    .sort((left, right) => {
      const countDelta = right[1].samples.length - left[1].samples.length;
      if (countDelta !== 0) {
        return countDelta;
      }

      return left[0].localeCompare(right[0]);
    })[0]?.[1];

  if (!dominant) {
    return null;
  }

  const average = {
    r: dominant.totalR / dominant.samples.length,
    g: dominant.totalG / dominant.samples.length,
    b: dominant.totalB / dominant.samples.length,
  };

  const representative = [...dominant.samples].sort((left, right) => {
    const distanceDelta =
      rgbDistanceSquared(left.rgb, average) - rgbDistanceSquared(right.rgb, average);
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    return rgbToHex(left.rgb).localeCompare(rgbToHex(right.rgb));
  })[0];

  return representative ?? null;
}

export function sampleTargetCell(
  image: PixelSourceImage,
  artworkWidth: number,
  artworkHeight: number,
  cropSettings: CropSettings,
  samplingSettings: SamplingSettings,
  cellX: number,
  cellY: number,
) {
  const samples: SamplePoint[] = [];
  const grid = Math.max(2, samplingSettings.sampleGridSize);

  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const artworkX = cellX + (column + 0.5) / grid;
      const artworkY = cellY + (row + 0.5) / grid;
      const sampled = sampleArtworkPoint(
        image,
        artworkWidth,
        artworkHeight,
        cropSettings,
        samplingSettings,
        artworkX,
        artworkY,
      );

      if (sampled) {
        samples.push(sampled);
      }
    }
  }

  return extractDominantColor(samples);
}

export function generateTargetCells(
  image: PixelSourceImage,
  artworkWidth: number,
  artworkHeight: number,
  cropSettings: CropSettings,
  samplingSettings: SamplingSettings,
): TargetCell[] {
  const cells: TargetCell[] = [];

  for (let y = 0; y < artworkHeight; y += 1) {
    for (let x = 0; x < artworkWidth; x += 1) {
      const dominant = sampleTargetCell(
        image,
        artworkWidth,
        artworkHeight,
        cropSettings,
        samplingSettings,
        x,
        y,
      );

      cells.push({
        x,
        y,
        rgb: dominant?.rgb ?? null,
        lab: dominant?.lab ?? null,
      });
    }
  }

  return cells;
}

export function mapSourcePointToArtwork(
  image: PixelSourceImage,
  artworkWidth: number,
  artworkHeight: number,
  settings: CropSettings,
  sourceX: number,
  sourceY: number,
) {
  const placement = getImagePlacement(image, artworkWidth, artworkHeight, settings);
  const centeredX = sourceX - image.width / 2;
  const centeredY = sourceY - image.height / 2;
  const flippedX = settings.flipHorizontal ? -centeredX : centeredX;
  const rotated = rotatePoint(flippedX, centeredY, settings.rotation);

  return {
    x: rotated.x * placement.scale + artworkWidth / 2 + placement.panX,
    y: rotated.y * placement.scale + artworkHeight / 2 + placement.panY,
  };
}
