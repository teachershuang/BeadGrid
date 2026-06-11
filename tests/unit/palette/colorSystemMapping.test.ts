import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseColorSystemMapping } from "@/core/palette/colorSystemMapping";

describe("color system mapping parser", () => {
  it("parses the checked-in RGB mapping json", () => {
    const json = readFileSync(resolve(process.cwd(), "src/assets/palettes/color-system-mapping.json"), "utf8");
    const mapping = parseColorSystemMapping(json);

    expect(mapping.size).toBe(5);
    expect(mapping.get("mard")?.length).toBeGreaterThan(100);
    expect(mapping.get("mard")?.[0]?.rgb.r).toBeGreaterThanOrEqual(0);
    expect(mapping.get("mard")?.[0]?.lab.l).toBeGreaterThan(0);
  });
});
