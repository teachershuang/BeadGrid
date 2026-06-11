import { deltaE00 } from "@/core/color/ciede2000";
import { rgbToLab } from "@/core/color/conversion";
import { rgbToHex } from "@/core/color/utils";
import type { LabColor, RgbColor } from "@/types/color";
import type { PaletteColor } from "@/types/palette";

export function findNearestPaletteColor(targetLab: LabColor, palette: PaletteColor[]) {
  return [...palette].sort((left, right) => {
    const distanceDelta = deltaE00(targetLab, left.lab) - deltaE00(targetLab, right.lab);
    if (distanceDelta !== 0) {
      return distanceDelta;
    }

    return left.code.localeCompare(right.code);
  })[0] ?? null;
}

export function mapTargetRgbsToPalette(targetRgbs: (RgbColor | null)[], palette: PaletteColor[]) {
  const cache = new Map<string, PaletteColor | null>();

  return targetRgbs.map((targetRgb) => {
    if (!targetRgb) {
      return null;
    }

    const key = rgbToHex(targetRgb);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const nearest = findNearestPaletteColor(rgbToLab(targetRgb), palette);
    cache.set(key, nearest);
    return nearest;
  });
}

