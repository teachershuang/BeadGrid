import type { PatternCell, PatternStatistics } from "@/types/pattern";

export function calculatePatternStatistics(
  width: number,
  height: number,
  cells: PatternCell[],
): PatternStatistics {
  const usageMap = new Map<string, { color: NonNullable<PatternCell["mappedColor"]>; count: number }>();
  let emptyCells = 0;

  for (const cell of cells) {
    if (!cell.mappedColor) {
      emptyCells += 1;
      continue;
    }

    const existing = usageMap.get(cell.mappedColor.id);
    if (existing) {
      existing.count += 1;
    } else {
      usageMap.set(cell.mappedColor.id, { color: cell.mappedColor, count: 1 });
    }
  }

  const usages = [...usageMap.values()]
    .sort((left, right) => {
      const countDelta = right.count - left.count;
      if (countDelta !== 0) {
        return countDelta;
      }

      return left.color.code.localeCompare(right.color.code);
    })
    .map((entry) => ({
      color: entry.color,
      count: entry.count,
    }));

  const totalCells = width * height;

  return {
    artworkWidth: width,
    artworkHeight: height,
    totalCells,
    emptyCells,
    filledCells: totalCells - emptyCells,
    actualColorCount: usages.length,
    usages,
  };
}

