# BeadGrid

BeadGrid is a Windows-first bead pattern generator for turning images into cleaner, color-matched fuse bead charts.

Current progress in this repository:

- project architecture and MVP scope documented
- React + TypeScript + Vite workspace scaffolded
- brand code mapping table wired into the app
- palette ingestion, validation, color-space conversion, and baseline tests added

Current environment blocker:

- Tauri and desktop packaging are not wired yet because Rust tooling is not installed on this machine

## Local development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run test
npm run build
```

## Source data

The current repository includes a brand cross-reference CSV at [public/palettes/brand-code-map.csv](/E:/coding/BeadGrid/public/palettes/brand-code-map.csv:1).

This file does not yet contain RGB values, so the app currently treats it as a seed mapping dataset rather than a final production palette.

