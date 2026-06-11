import type { LabColor } from "@/types/color";

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function normalizeHue(hue: number) {
  if (hue < 0) {
    return hue + 360;
  }

  if (hue >= 360) {
    return hue - 360;
  }

  return hue;
}

export function deltaE00(lab1: LabColor, lab2: LabColor) {
  const kL = 1;
  const kC = 1;
  const kH = 1;

  const c1 = Math.sqrt(lab1.a ** 2 + lab1.b ** 2);
  const c2 = Math.sqrt(lab2.a ** 2 + lab2.b ** 2);
  const cBar = (c1 + c2) / 2;

  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + 25 ** 7)));

  const a1Prime = (1 + g) * lab1.a;
  const a2Prime = (1 + g) * lab2.a;
  const c1Prime = Math.sqrt(a1Prime ** 2 + lab1.b ** 2);
  const c2Prime = Math.sqrt(a2Prime ** 2 + lab2.b ** 2);

  const h1Prime = c1Prime === 0 ? 0 : normalizeHue(radiansToDegrees(Math.atan2(lab1.b, a1Prime)));
  const h2Prime = c2Prime === 0 ? 0 : normalizeHue(radiansToDegrees(Math.atan2(lab2.b, a2Prime)));

  const deltaLPrime = lab2.l - lab1.l;
  const deltaCPrime = c2Prime - c1Prime;

  let deltahPrime = 0;
  if (c1Prime !== 0 && c2Prime !== 0) {
    const hueDelta = h2Prime - h1Prime;

    if (Math.abs(hueDelta) <= 180) {
      deltahPrime = hueDelta;
    } else if (hueDelta > 180) {
      deltahPrime = hueDelta - 360;
    } else {
      deltahPrime = hueDelta + 360;
    }
  }

  const deltaHPrime =
    2 * Math.sqrt(c1Prime * c2Prime) * Math.sin(degreesToRadians(deltahPrime / 2));

  const lBarPrime = (lab1.l + lab2.l) / 2;
  const cBarPrime = (c1Prime + c2Prime) / 2;

  let hBarPrime = h1Prime + h2Prime;
  if (c1Prime !== 0 && c2Prime !== 0) {
    const hueSum = h1Prime + h2Prime;
    const hueDistance = Math.abs(h1Prime - h2Prime);

    if (hueDistance > 180) {
      hBarPrime = hueSum < 360 ? (hueSum + 360) / 2 : (hueSum - 360) / 2;
    } else {
      hBarPrime = hueSum / 2;
    }
  }

  const t =
    1 -
    0.17 * Math.cos(degreesToRadians(hBarPrime - 30)) +
    0.24 * Math.cos(degreesToRadians(2 * hBarPrime)) +
    0.32 * Math.cos(degreesToRadians(3 * hBarPrime + 6)) -
    0.2 * Math.cos(degreesToRadians(4 * hBarPrime - 63));

  const deltaTheta = 30 * Math.exp(-(((hBarPrime - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt((cBarPrime ** 7) / (cBarPrime ** 7 + 25 ** 7));
  const sl = 1 + (0.015 * ((lBarPrime - 50) ** 2)) / Math.sqrt(20 + ((lBarPrime - 50) ** 2));
  const sc = 1 + 0.045 * cBarPrime;
  const sh = 1 + 0.015 * cBarPrime * t;
  const rt = -Math.sin(degreesToRadians(2 * deltaTheta)) * rc;

  return Math.sqrt(
    (deltaLPrime / (kL * sl)) ** 2 +
      (deltaCPrime / (kC * sc)) ** 2 +
      (deltaHPrime / (kH * sh)) ** 2 +
      rt * (deltaCPrime / (kC * sc)) * (deltaHPrime / (kH * sh)),
  );
}

