import { deltaE00 } from "@/core/color/ciede2000";
import type { CleanupLevel } from "@/types/image";
import type { PatternCell } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";
import { throwIfPatternGenerationAborted } from "@/types/patternGeneration";

interface CleanupConfig {
  minRegionSize: number;
  maxIterations: number;
  maxAverageDelta: number;
}

const cleanupConfigs: Record<CleanupLevel, CleanupConfig> = {
  off: { minRegionSize: 0, maxIterations: 0, maxAverageDelta: 0 },
  light: { minRegionSize: 2, maxIterations: 1, maxAverageDelta: 12 },
  medium: { minRegionSize: 4, maxIterations: 2, maxAverageDelta: 16 },
  strong: { minRegionSize: 6, maxIterations: 3, maxAverageDelta: 20 },
};

function getNeighbors(index: number, width: number, height: number) {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors: number[] = [];

  if (x > 0) {
    neighbors.push(index - 1);
  }
  if (x < width - 1) {
    neighbors.push(index + 1);
  }
  if (y > 0) {
    neighbors.push(index - width);
  }
  if (y < height - 1) {
    neighbors.push(index + width);
  }

  return neighbors;
}

export function cleanupPatternCells(
  width: number,
  height: number,
  cells: PatternCell[],
  level: CleanupLevel,
  options: {
    onProgress?: (progress: number) => void;
    shouldAbort?: () => boolean;
  } = {},
) {
  const config = cleanupConfigs[level];
  if (config.maxIterations === 0 || config.minRegionSize <= 1) {
    options.onProgress?.(1);
    return cells;
  }

  const nextCells = [...cells];

  for (let iteration = 0; iteration < config.maxIterations; iteration += 1) {
    throwIfPatternGenerationAborted(options.shouldAbort);

    let changed = false;
    const visited = new Array(nextCells.length).fill(false);

    for (let index = 0; index < nextCells.length; index += 1) {
      if (visited[index] || !nextCells[index]?.mappedColor) {
        continue;
      }

      const region: number[] = [];
      const queue = [index];
      const regionColorId = nextCells[index]?.mappedColor?.id;

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited[current]) {
          continue;
        }

        visited[current] = true;
        if (nextCells[current]?.mappedColor?.id !== regionColorId) {
          continue;
        }

        region.push(current);

        for (const neighbor of getNeighbors(current, width, height)) {
          if (!visited[neighbor]) {
            queue.push(neighbor);
          }
        }
      }

      if (region.length >= config.minRegionSize) {
        continue;
      }

      const candidateMap = new Map<
        string,
        {
          color: PaletteColor;
          boundary: number;
          totalDelta: number;
        }
      >();

      for (const regionIndex of region) {
        for (const neighbor of getNeighbors(regionIndex, width, height)) {
          const neighborColor = nextCells[neighbor]?.mappedColor;
          const targetLab = nextCells[regionIndex]?.targetLab;

          if (!neighborColor || neighborColor.id === regionColorId || !targetLab) {
            continue;
          }

          const entry =
            candidateMap.get(neighborColor.id) ??
            { color: neighborColor, boundary: 0, totalDelta: 0 };

          entry.boundary += 1;
          entry.totalDelta += deltaE00(targetLab, neighborColor.lab);
          candidateMap.set(neighborColor.id, entry);
        }
      }

      const bestCandidate = [...candidateMap.values()].sort((left, right) => {
        const leftAverage = left.totalDelta / region.length;
        const rightAverage = right.totalDelta / region.length;
        if (leftAverage !== rightAverage) {
          return leftAverage - rightAverage;
        }

        if (left.boundary !== right.boundary) {
          return right.boundary - left.boundary;
        }

        return left.color.code.localeCompare(right.color.code);
      })[0];

      if (!bestCandidate) {
        continue;
      }

      const averageDelta = bestCandidate.totalDelta / region.length;
      if (averageDelta > config.maxAverageDelta) {
        continue;
      }

      for (const regionIndex of region) {
        nextCells[regionIndex] = {
          ...nextCells[regionIndex],
          mappedColor: bestCandidate.color,
        };
      }

      changed = true;
    }

    if (!changed) {
      options.onProgress?.(1);
      break;
    }

    options.onProgress?.((iteration + 1) / config.maxIterations);
  }

  options.onProgress?.(1);
  return nextCells;
}
