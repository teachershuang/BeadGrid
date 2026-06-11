import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseBrandCodeMapCsv, summarizeBrandCoverage } from "@/core/palette/brandCodeMap";

describe("brand code map parser", () => {
  it("parses the checked-in mapping csv", () => {
    const csv = readFileSync(resolve(process.cwd(), "src/assets/palettes/brand-code-map.csv"), "utf8");
    const map = parseBrandCodeMapCsv(csv);

    expect(map.brands).toHaveLength(5);
    expect(map.rows.length).toBeGreaterThan(100);
    expect(map.rows[0]?.canonicalCode).toBe("A01");
    expect(map.rows[0]?.brandCodes.mard).toBe("A01");
  });

  it("converts dash placeholders to null coverage", () => {
    const csv = "MARD,COCO,漫漫,盼盼,咪小窝\nR13,L13,-,152,152";
    const map = parseBrandCodeMapCsv(csv);

    expect(map.rows[0]?.brandCodes.manman).toBeNull();
  });

  it("summarizes coverage by brand", () => {
    const csv = readFileSync(resolve(process.cwd(), "src/assets/palettes/brand-code-map.csv"), "utf8");
    const map = parseBrandCodeMapCsv(csv);
    const coverage = summarizeBrandCoverage(map);

    expect(coverage).toHaveLength(5);
    expect(coverage[0]?.mappedRows).toBe(map.rows.length);
  });
});
