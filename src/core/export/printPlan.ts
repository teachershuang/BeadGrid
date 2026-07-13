import { buildBoardSplitPlan, type GridViewport } from "@/core/export/boardSplitPlan";
import type { GeneratedPattern } from "@/types/pattern";

export interface PrintPagePlan {
  rowIndex: number;
  columnIndex: number;
  viewport: GridViewport;
  title: string;
  subtitle: string;
}

export function buildPrintPlan(pattern: GeneratedPattern): PrintPagePlan[] {
  return buildBoardSplitPlan(pattern).map((board) => ({
    rowIndex: board.rowIndex,
    columnIndex: board.columnIndex,
    viewport: board.viewport,
    title: `BeadGrid 底板 R${String(board.rowIndex + 1).padStart(2, "0")} C${String(board.columnIndex + 1).padStart(2, "0")}`,
    subtitle: `${pattern.settings.brandId.toUpperCase()} · 全图 ${pattern.width}×${pattern.height} · 本页 ${board.viewport.width}×${board.viewport.height}`,
  }));
}
