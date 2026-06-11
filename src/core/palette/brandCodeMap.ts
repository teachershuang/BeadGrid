import { paletteBrands } from "@/core/palette/brands";
import type { BrandCodeMap, BrandCodeMapRow, BrandCoverageSummary } from "@/types/palette";

function stripBom(input: string) {
  return input.replace(/^\uFEFF/, "");
}

function normalizeCell(cell: string) {
  const trimmed = cell.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseCsvLine(line: string) {
  return line.split(",").map((cell) => cell.trim());
}

function normalizeBrandCode(code: string | null) {
  if (code === null || code === "-") {
    return null;
  }

  return code;
}

export function parseBrandCodeMapCsv(csv: string): BrandCodeMap {
  const lines = stripBom(csv)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Palette mapping CSV must contain a header and at least one data row.");
  }

  const header = parseCsvLine(lines[0]);
  const expectedHeader = paletteBrands.map((brand) => brand.nameZh);

  if (header.length !== expectedHeader.length) {
    throw new Error(`Unexpected palette mapping header width: received ${header.length}.`);
  }

  expectedHeader.forEach((name, index) => {
    if (header[index] !== name) {
      throw new Error(`Unexpected header at column ${index + 1}: expected ${name}, received ${header[index]}.`);
    }
  });

  const seenCanonicalCodes = new Set<string>();
  const rows: BrandCodeMapRow[] = lines.slice(1).map((line, rowIndex) => {
    const columns = parseCsvLine(line);
    if (columns.length !== expectedHeader.length) {
      throw new Error(`Row ${rowIndex + 2} has ${columns.length} columns, expected ${expectedHeader.length}.`);
    }

    const canonicalCode = normalizeCell(columns[0]);
    if (!canonicalCode) {
      throw new Error(`Row ${rowIndex + 2} is missing a canonical code.`);
    }

    if (seenCanonicalCodes.has(canonicalCode)) {
      throw new Error(`Duplicate canonical code detected: ${canonicalCode}.`);
    }

    seenCanonicalCodes.add(canonicalCode);

    const brandCodes = Object.fromEntries(
      paletteBrands.map((brand, brandIndex) => [brand.id, normalizeBrandCode(normalizeCell(columns[brandIndex]))]),
    );

    return {
      canonicalCode,
      brandCodes,
    };
  });

  return {
    brands: paletteBrands,
    rows,
  };
}

export function summarizeBrandCoverage(map: BrandCodeMap): BrandCoverageSummary[] {
  return map.brands.map((brand) => {
    const mappedRows = map.rows.filter((row) => row.brandCodes[brand.id] !== null).length;

    return {
      brandId: brand.id,
      nameZh: brand.nameZh,
      mappedRows,
      missingRows: map.rows.length - mappedRows,
    };
  });
}

export async function loadBrandCodeMap(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl("/palettes/brand-code-map.csv");

  if (!response.ok) {
    throw new Error(`Failed to load palette mapping CSV: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  return parseBrandCodeMapCsv(csv);
}

