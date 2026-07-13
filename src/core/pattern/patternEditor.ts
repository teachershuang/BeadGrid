import { calculatePatternStatistics } from "@/core/statistics/patternStatistics";
import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export interface PatternCellUpdate {
  index: number;
  mappedColor: PaletteColor | null;
}

export interface PatternCellChange {
  index: number;
  before: PaletteColor | null;
  after: PaletteColor | null;
}

export interface PatternEditCommand {
  changes: PatternCellChange[];
}

function isSameColor(left: PaletteColor | null, right: PaletteColor | null) {
  return left?.id === right?.id;
}

export function createPatternEditCommand(
  pattern: GeneratedPattern,
  updates: PatternCellUpdate[],
): PatternEditCommand | null {
  const changesByIndex = new Map<number, PatternCellChange>();

  for (const update of updates) {
    const cell = pattern.cells[update.index];
    if (!cell) {
      throw new Error("图纸格子索引超出范围。");
    }

    const existing = changesByIndex.get(update.index);
    const before = existing?.before ?? cell.mappedColor;
    if (isSameColor(before, update.mappedColor)) {
      changesByIndex.delete(update.index);
      continue;
    }

    changesByIndex.set(update.index, {
      index: update.index,
      before,
      after: update.mappedColor,
    });
  }

  const changes = [...changesByIndex.values()];
  return changes.length > 0 ? { changes } : null;
}

export function applyPatternCellChanges(
  pattern: GeneratedPattern,
  changes: PatternCellChange[],
  direction: "forward" | "backward" = "forward",
): GeneratedPattern {
  if (changes.length === 0) {
    return pattern;
  }

  const cells = [...pattern.cells];
  for (const change of changes) {
    const cell = cells[change.index];
    if (!cell) {
      throw new Error("图纸格子索引超出范围。");
    }

    cells[change.index] = {
      ...cell,
      mappedColor: direction === "forward" ? change.after : change.before,
    };
  }

  return {
    ...pattern,
    cells,
    statistics: calculatePatternStatistics(pattern.width, pattern.height, cells),
  };
}

export function applyPatternEditCommand(
  pattern: GeneratedPattern,
  command: PatternEditCommand,
  direction: "forward" | "backward",
) {
  return applyPatternCellChanges(pattern, command.changes, direction);
}
