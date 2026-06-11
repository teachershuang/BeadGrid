import type { LabColor, RgbColor } from "@/types/color";

export interface PixelSourceImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export type FitMode = "cover" | "contain";
export type TransparencyMode = "empty" | "blend";
export type CleanupLevel = "off" | "light" | "medium" | "strong";

export interface CropSettings {
  fitMode: FitMode;
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
}

export interface SamplingSettings {
  alphaThreshold: number;
  transparencyMode: TransparencyMode;
  backgroundRgb: RgbColor;
  sampleGridSize: number;
}

export interface PatternSettings extends CropSettings, SamplingSettings {
  artworkWidth: number;
  artworkHeight: number;
  boardWidth: number;
  boardHeight: number;
  brandId: string;
  maxColors: number;
  cleanupLevel: CleanupLevel;
}

export interface TargetCell {
  x: number;
  y: number;
  rgb: RgbColor | null;
  lab: LabColor | null;
}

