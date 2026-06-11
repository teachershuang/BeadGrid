import type { GeneratedPattern } from "@/types/pattern";

export interface GridViewport {
  startColumn: number;
  startRow: number;
  width: number;
  height: number;
}

export interface BoardSplitPlanItem {
  rowIndex: number;
  columnIndex: number;
  viewport: GridViewport;
  filename: string;
}

export function buildBoardSplitPlan(pattern: GeneratedPattern): BoardSplitPlanItem[] {
  const plans: BoardSplitPlanItem[] = [];
  const boardWidth = Math.max(1, pattern.settings.boardWidth);
  const boardHeight = Math.max(1, pattern.settings.boardHeight);
  const rowCount = Math.ceil(pattern.height / boardHeight);
  const columnCount = Math.ceil(pattern.width / boardWidth);

  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column < columnCount; column += 1) {
      const startRow = row * boardHeight;
      const startColumn = column * boardWidth;
      const viewport = {
        startRow,
        startColumn,
        width: Math.min(boardWidth, pattern.width - startColumn),
        height: Math.min(boardHeight, pattern.height - startRow),
      };

      plans.push({
        rowIndex: row,
        columnIndex: column,
        viewport,
        filename: `board_R${String(row + 1).padStart(2, "0")}_C${String(column + 1).padStart(2, "0")}.png`,
      });
    }
  }

  return plans;
}
