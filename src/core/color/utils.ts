import type { RgbColor } from "@/types/color";

function clampChannel(channel: number) {
  return Math.min(255, Math.max(0, Math.round(channel)));
}

export function rgbToHex(rgb: RgbColor) {
  const toHex = (channel: number) => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
}

export function compositeRgb(foreground: RgbColor, alpha: number, background: RgbColor): RgbColor {
  const normalizedAlpha = Math.min(1, Math.max(0, alpha));

  return {
    r: foreground.r * normalizedAlpha + background.r * (1 - normalizedAlpha),
    g: foreground.g * normalizedAlpha + background.g * (1 - normalizedAlpha),
    b: foreground.b * normalizedAlpha + background.b * (1 - normalizedAlpha),
  };
}

export function quantizeRgb(rgb: RgbColor) {
  return {
    r: Math.round(rgb.r / 8) * 8,
    g: Math.round(rgb.g / 8) * 8,
    b: Math.round(rgb.b / 8) * 8,
  };
}

export function rgbDistanceSquared(a: RgbColor, b: RgbColor) {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

export function parseHexColor(hex: string): RgbColor {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

