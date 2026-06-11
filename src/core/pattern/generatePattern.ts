import { cleanupPatternCells } from "@/core/cleanup/cleanupRegions";
import { generateTargetCells } from "@/core/image/sampler";
import { findNearestPaletteColor } from "@/core/palette/matcher";
import { reducePaletteSelections } from "@/core/quantization/maxColors";
import { calculatePatternStatistics } from "@/core/statistics/patternStatistics";
import type { PixelSourceImage, PatternSettings } from "@/types/image";
import type { GeneratedPattern, PatternCell } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";
import {
  throwIfPatternGenerationAborted,
  type PatternGenerationOptions,
  type PatternGenerationStage,
} from "@/types/patternGeneration";

function reportProgress(
  options: PatternGenerationOptions,
  stage: PatternGenerationStage,
  progress: number,
) {
  options.onProgress?.({
    stage,
    progress: Math.max(0, Math.min(1, progress)),
  });
}

export function generatePattern(
  image: PixelSourceImage,
  settings: PatternSettings,
  palette: PaletteColor[],
  options: PatternGenerationOptions = {},
): GeneratedPattern {
  reportProgress(options, "sampling", 0);
  const targets = generateTargetCells(
    image,
    settings.artworkWidth,
    settings.artworkHeight,
    settings,
    settings,
    {
      shouldAbort: options.shouldAbort,
      onProgress: (progress) => reportProgress(options, "sampling", progress),
    },
  );

  throwIfPatternGenerationAborted(options.shouldAbort);
  reportProgress(options, "max-colors", 0);
  const selectedPalette =
    settings.maxColors > 0
      ? reducePaletteSelections(
          targets.map((target) => target.lab),
          palette,
          settings.maxColors,
          {
            shouldAbort: options.shouldAbort,
            onProgress: (progress) => reportProgress(options, "max-colors", progress),
          },
        )
      : palette;

  reportProgress(options, "max-colors", 1);
  reportProgress(options, "matching", 0);
  const cells: PatternCell[] = [];

  for (let index = 0; index < targets.length; index += 1) {
    throwIfPatternGenerationAborted(options.shouldAbort);

    const target = targets[index]!;
    cells.push({
      x: target.x,
      y: target.y,
      targetRgb: target.rgb,
      targetLab: target.lab,
      mappedColor: target.lab ? findNearestPaletteColor(target.lab, selectedPalette) : null,
    });

    if ((index + 1) % settings.artworkWidth === 0 || index === targets.length - 1) {
      reportProgress(options, "matching", (index + 1) / targets.length);
    }
  }

  reportProgress(options, "cleanup", 0);
  const cleanedCells = cleanupPatternCells(
    settings.artworkWidth,
    settings.artworkHeight,
    cells,
    settings.cleanupLevel,
    {
      shouldAbort: options.shouldAbort,
      onProgress: (progress) => reportProgress(options, "cleanup", progress),
    },
  );

  throwIfPatternGenerationAborted(options.shouldAbort);
  reportProgress(options, "statistics", 0);
  const statistics = calculatePatternStatistics(settings.artworkWidth, settings.artworkHeight, cleanedCells);
  reportProgress(options, "statistics", 1);

  return {
    width: settings.artworkWidth,
    height: settings.artworkHeight,
    cells: cleanedCells,
    targets,
    settings,
    statistics,
  };
}
