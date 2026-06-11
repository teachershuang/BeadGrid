# BeadGrid Architecture

## MVP feature list

- import PNG, JPG, JPEG, and WebP images
- configure artwork width and height independently from physical board size
- crop, scale, rotate, flip, and handle transparency correctly
- quantize each bead cell from source-region pixels instead of naive image downscaling
- remap target colors to brand palettes with CIELAB + CIEDE2000
- limit the final palette to a maximum color count
- clean isolated speckle regions by connectivity analysis
- preview the result on Canvas 2D
- export full charts, separated color sheets, board splits, and purchase lists

## Directory design

```text
src/
  components/      reusable UI shells
  pages/           screen-level composition
  stores/          future app state stores
  core/
    color/         RGB, XYZ, Lab, and DeltaE math
    image/         crop, transparency, and sampling pipeline
    palette/       palette loaders, validators, and matching
    quantization/  max-color selection logic
    cleanup/       connected-region cleanup
    statistics/    bead counts and summaries
    export/        PNG, CSV, ZIP output
  workers/         heavy processing off the UI thread
  types/           shared domain types
  constants/       static metadata and milestone definitions
public/
  palettes/        raw palette assets bundled with the app
tests/
  unit/            deterministic algorithm tests
  fixtures/        reusable sample inputs
docs/
```

## Core data structures

```ts
interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface LabColor {
  l: number;
  a: number;
  b: number;
}

interface PaletteColor {
  id: string;
  brandId: string;
  seriesId: string;
  code: string;
  nameZh?: string;
  rgb: RgbColor;
  lab: LabColor;
}

interface BrandCodeMapRow {
  canonicalCode: string;
  brandCodes: Record<string, string | null>;
}
```

## Image pipeline

1. decode original image into pixel data
2. apply crop, scale mode, rotation, flip, and transparency policy
3. map each bead cell to a source-image region
4. collect effective pixels for that region
5. derive a deterministic dominant target color
6. convert target colors to Lab
7. match against the active palette with CIEDE2000
8. apply optional max-color reduction
9. apply optional speckle cleanup
10. produce preview, statistics, and export artifacts

## Milestones

1. scaffold repository, docs, tests, and palette ingestion
2. implement color-space math and palette validation
3. add image import, crop state, and transparent-pixel handling
4. add cell-region sampling and dominant-color extraction
5. add palette matching and max-color reduction
6. add connectivity cleanup and worker orchestration
7. add canvas preview, statistics, and export paths
8. wire Tauri shell, GitHub Actions, and release packaging

## Current gap

The checked-in CSV is a cross-brand code mapping table, not a full palette. We still need RGB-backed palette files per brand before production color matching can be completed.

