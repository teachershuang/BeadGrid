import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";

export interface SeparatedSheetPlanItem {
  index: number;
  color: PaletteColor;
  count: number;
  filename: string;
}

export function buildSeparatedSheetPlan(pattern: GeneratedPattern): SeparatedSheetPlanItem[] {
  return pattern.statistics.usages.map((usage, index) => ({
    index,
    color: usage.color,
    count: usage.count,
    filename: `${String(index + 1).padStart(2, "0")}_${usage.color.code}_${usage.count}.png`,
  }));
}

