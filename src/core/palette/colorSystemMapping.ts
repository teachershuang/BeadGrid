import { rgbToLab } from "@/core/color/conversion";
import { paletteBrands } from "@/core/palette/brands";
import type { PaletteColor } from "@/types/palette";

type RawColorSystemMapping = Record<string, Record<string, string>>;
const colorSystemMappingUrl = new URL("../../assets/palettes/color-system-mapping.json", import.meta.url).href;

function parseHexColor(hex: string) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    throw new Error(`Invalid hex color key: ${hex}`);
  }

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

export function parseColorSystemMapping(text: string) {
  const parsed = JSON.parse(text) as RawColorSystemMapping;

  const colorsByBrand = new Map<string, PaletteColor[]>(
    paletteBrands.map((brand) => [brand.id, []]),
  );

  for (const [hex, codeMap] of Object.entries(parsed)) {
    const rgb = parseHexColor(hex);
    const lab = rgbToLab(rgb);

    for (const brand of paletteBrands) {
      const rawCode = codeMap[brand.nameZh] ?? codeMap[brand.nameZh.trim()];
      const code = typeof rawCode === "string" ? rawCode.trim() : "";

      if (!code || code === "-") {
        continue;
      }

      colorsByBrand.get(brand.id)!.push({
        id: `${brand.id}:${code}`,
        brandId: brand.id,
        seriesId: "default",
        code,
        rgb,
        lab,
      });
    }
  }

  return colorsByBrand;
}

export async function loadColorSystemMapping(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(colorSystemMappingUrl);

  if (!response.ok) {
    throw new Error(`Failed to load color system mapping JSON: ${response.status} ${response.statusText}`);
  }

  return parseColorSystemMapping(await response.text());
}
