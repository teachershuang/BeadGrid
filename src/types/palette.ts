import type { LabColor, RgbColor } from "@/types/color";

export interface PaletteColor {
  id: string;
  brandId: string;
  seriesId: string;
  code: string;
  nameZh?: string;
  rgb: RgbColor;
  lab: LabColor;
}

export interface PaletteBrand {
  id: string;
  nameZh: string;
  description: string;
}

export interface BrandCodeMapRow {
  canonicalCode: string;
  brandCodes: Record<string, string | null>;
}

export interface BrandCodeMap {
  brands: PaletteBrand[];
  rows: BrandCodeMapRow[];
}

export interface BrandCoverageSummary {
  brandId: string;
  nameZh: string;
  mappedRows: number;
  missingRows: number;
}

