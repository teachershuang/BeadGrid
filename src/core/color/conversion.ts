import type { LabColor, RgbColor, XyzColor } from "@/types/color";

const D65_REFERENCE_WHITE: XyzColor = {
  x: 95.047,
  y: 100,
  z: 108.883,
};

function clampRgbChannel(value: number) {
  return Math.min(255, Math.max(0, value));
}

export function srgbChannelToLinear(channel: number) {
  const normalized = clampRgbChannel(channel) / 255;

  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }

  return ((normalized + 0.055) / 1.055) ** 2.4;
}

export function rgbToLinearRgb(rgb: RgbColor): RgbColor {
  return {
    r: srgbChannelToLinear(rgb.r),
    g: srgbChannelToLinear(rgb.g),
    b: srgbChannelToLinear(rgb.b),
  };
}

export function linearRgbToXyz(rgb: RgbColor): XyzColor {
  const x = rgb.r * 0.4124564 + rgb.g * 0.3575761 + rgb.b * 0.1804375;
  const y = rgb.r * 0.2126729 + rgb.g * 0.7151522 + rgb.b * 0.072175;
  const z = rgb.r * 0.0193339 + rgb.g * 0.119192 + rgb.b * 0.9503041;

  return {
    x: x * 100,
    y: y * 100,
    z: z * 100,
  };
}

function xyzToLabPivot(value: number) {
  const epsilon = 216 / 24389;
  const kappa = 24389 / 27;

  if (value > epsilon) {
    return Math.cbrt(value);
  }

  return (kappa * value + 16) / 116;
}

export function xyzToLab(xyz: XyzColor): LabColor {
  const xr = xyz.x / D65_REFERENCE_WHITE.x;
  const yr = xyz.y / D65_REFERENCE_WHITE.y;
  const zr = xyz.z / D65_REFERENCE_WHITE.z;

  const fx = xyzToLabPivot(xr);
  const fy = xyzToLabPivot(yr);
  const fz = xyzToLabPivot(zr);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

export function rgbToLab(rgb: RgbColor): LabColor {
  return xyzToLab(linearRgbToXyz(rgbToLinearRgb(rgb)));
}

