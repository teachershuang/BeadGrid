import { cleanupPatternCells } from "@/core/cleanup/cleanupRegions";
import { generateTargetCells } from "@/core/image/sampler";
import { findNearestPaletteColor } from "@/core/palette/matcher";
import { reducePaletteSelections } from "@/core/quantization/maxColors";
import { calculatePatternStatistics } from "@/core/statistics/patternStatistics";
import type { PixelSourceImage, PatternSettings } from "@/types/image";
import type { GeneratedPattern, PatternCell } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export function generatePattern(
  image: PixelSourceImage,
  settings: PatternSettings,
  palette: PaletteColor[],
): GeneratedPattern {
  const targets = generateTargetCells(
    image,
    settings.artworkWidth,
    settings.artworkHeight,
    settings,
    settings,
  );

  const selectedPalette =
    settings.maxColors > 0
      ? reducePaletteSelections(
          targets.map((target) => target.lab),
          palette,
          settings.maxColors,
        )
      : palette;

  const cells: PatternCell[] = targets.map((target) => ({
    x: target.x,
    y: target.y,
    targetRgb: target.rgb,
    targetLab: target.lab,
    mappedColor: target.lab ? findNearestPaletteColor(target.lab, selectedPalette) : null,
  }));

  const cleanedCells = cleanupPatternCells(
    settings.artworkWidth,
    settings.artworkHeight,
    cells,
    settings.cleanupLevel,
  );

  return {
    width: settings.artworkWidth,
    height: settings.artworkHeight,
    cells: cleanedCells,
    targets,
    settings,
    statistics: calculatePatternStatistics(settings.artworkWidth, settings.artworkHeight, cleanedCells),
  };
}
