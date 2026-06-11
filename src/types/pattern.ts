import type { LabColor, RgbColor } from "@/types/color";
import type { PatternSettings, TargetCell } from "@/types/image";
import type { PaletteColor } from "@/types/palette";

export interface PatternCell {
  x: number;
  y: number;
  targetRgb: RgbColor | null;
  targetLab: LabColor | null;
  mappedColor: PaletteColor | null;
}

export interface PatternColorUsage {
  color: PaletteColor;
  count: number;
}

export interface PatternStatistics {
  artworkWidth: number;
  artworkHeight: number;
  filledCells: number;
  emptyCells: number;
  totalCells: number;
  actualColorCount: number;
  usages: PatternColorUsage[];
}

export interface GeneratedPattern {
  width: number;
  height: number;
  cells: PatternCell[];
  targets: TargetCell[];
  settings: PatternSettings;
  statistics: PatternStatistics;
}

