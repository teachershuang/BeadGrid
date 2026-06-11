import { deltaE00 } from "@/core/color/ciede2000";
import type { LabColor } from "@/types/color";
import type { PaletteColor } from "@/types/palette";
import { throwIfPatternGenerationAborted } from "@/types/patternGeneration";

interface TargetGroup {
  key: string;
  lab: LabColor;
  count: number;
}

function buildTargetGroups(targetLabs: (LabColor | null)[]) {
  const groups = new Map<string, TargetGroup>();

  targetLabs.forEach((lab) => {
    if (!lab) {
      return;
    }

    const key = `${lab.l.toFixed(3)}:${lab.a.toFixed(3)}:${lab.b.toFixed(3)}`;
    const group = groups.get(key);

    if (group) {
      group.count += 1;
      return;
    }

    groups.set(key, { key, lab, count: 1 });
  });

  return [...groups.values()];
}

export function reducePaletteSelections(
  targetLabs: (LabColor | null)[],
  palette: PaletteColor[],
  maxColors: number,
  options: {
    onProgress?: (progress: number) => void;
    shouldAbort?: () => boolean;
  } = {},
) {
  if (maxColors <= 0 || palette.length <= maxColors) {
    options.onProgress?.(1);
    return palette;
  }

  const groups = buildTargetGroups(targetLabs);
  if (groups.length === 0) {
    options.onProgress?.(1);
    return [];
  }

  const selected: PaletteColor[] = [];
  const bestDistances = new Map<string, number>(
    groups.map((group) => [group.key, Number.POSITIVE_INFINITY]),
  );

  while (selected.length < maxColors) {
    throwIfPatternGenerationAborted(options.shouldAbort);

    let bestCandidate: PaletteColor | null = null;
    let bestCost = Number.POSITIVE_INFINITY;

    for (const candidate of palette) {
      if (selected.some((selectedColor) => selectedColor.id === candidate.id)) {
        continue;
      }

      let cost = 0;
      for (const group of groups) {
        const currentBest = bestDistances.get(group.key) ?? Number.POSITIVE_INFINITY;
        const candidateDistance = deltaE00(group.lab, candidate.lab);
        cost += Math.min(currentBest, candidateDistance) * group.count;
      }

      if (
        cost < bestCost ||
        (cost === bestCost && bestCandidate && candidate.code.localeCompare(bestCandidate.code) < 0)
      ) {
        bestCandidate = candidate;
        bestCost = cost;
      }
    }

    if (!bestCandidate) {
      break;
    }

    selected.push(bestCandidate);
    options.onProgress?.(selected.length / maxColors);

    for (const group of groups) {
      const currentBest = bestDistances.get(group.key) ?? Number.POSITIVE_INFINITY;
      const candidateDistance = deltaE00(group.lab, bestCandidate.lab);
      bestDistances.set(group.key, Math.min(currentBest, candidateDistance));
    }
  }

  options.onProgress?.(1);
  return selected;
}
