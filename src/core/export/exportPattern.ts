import JSZip from "jszip";
import { renderBoardSplitChart, renderPatternChart, renderPurchaseListPng } from "@/core/export/chartRenderer";
import { canvasToBlob, triggerDownload } from "@/core/export/download";
import { buildSeparatedSheetPlan } from "@/core/export/separatedSheetPlan";
import { buildPurchaseListCsv } from "@/core/export/purchaseList";
import { buildBoardSplitPlan } from "@/core/export/boardSplitPlan";
import type { GeneratedPattern } from "@/types/pattern";

export async function exportFullPatternPng(pattern: GeneratedPattern) {
  const canvas = renderPatternChart(pattern, {
    title: "BeadGrid 完整底稿",
    showCodes: true,
    showLegend: true,
  });

  const blob = await canvasToBlob(canvas);
  triggerDownload(blob, `BeadGrid_${pattern.width}x${pattern.height}_完整底稿.png`);
}

export async function exportSeparatedSheetsZip(pattern: GeneratedPattern) {
  const zip = new JSZip();
  const plan = buildSeparatedSheetPlan(pattern);

  for (const item of plan) {
    const canvas = renderPatternChart(pattern, {
      title: `BeadGrid 分色图 ${item.color.code}`,
      showCodes: true,
      showLegend: false,
      focusColorId: item.color.id,
      mutedMode: "gray",
    });
    const blob = await canvasToBlob(canvas);
    zip.file(item.filename, blob);
  }

  const readme = plan
    .map((item) => `${String(item.index + 1).padStart(2, "0")}. ${item.color.code} - ${item.count}`)
    .join("\n");
  zip.file("README.txt", `分色图已按用量从多到少排序：\n${readme}\n`);

  const archive = await zip.generateAsync({ type: "blob" });
  triggerDownload(archive, `BeadGrid_${pattern.width}x${pattern.height}_分色图.zip`);
}

export async function exportPurchaseListPng(pattern: GeneratedPattern, reserveRatio: number) {
  const canvas = renderPurchaseListPng(pattern, reserveRatio);
  const blob = await canvasToBlob(canvas);
  triggerDownload(
    blob,
    `BeadGrid_${pattern.width}x${pattern.height}_采购清单_${Math.round(reserveRatio * 100)}pct.png`,
  );
}

export function exportPurchaseListCsv(pattern: GeneratedPattern, reserveRatio: number) {
  const csv = buildPurchaseListCsv(pattern, reserveRatio);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(
    blob,
    `BeadGrid_${pattern.width}x${pattern.height}_采购清单_${Math.round(reserveRatio * 100)}pct.csv`,
  );
}

export async function exportBoardSplitZip(pattern: GeneratedPattern) {
  const zip = new JSZip();
  const plan = buildBoardSplitPlan(pattern);

  for (const item of plan) {
    const subtitle = `全局行 ${item.viewport.startRow + 1}-${item.viewport.startRow + item.viewport.height} / 列 ${item.viewport.startColumn + 1}-${item.viewport.startColumn + item.viewport.width}`;
    const canvas = renderBoardSplitChart(
      pattern,
      item.viewport,
      `BeadGrid 底板拆分 R${item.rowIndex + 1} C${item.columnIndex + 1}`,
      subtitle,
    );
    const blob = await canvasToBlob(canvas);
    zip.file(item.filename, blob);
  }

  zip.file(
    "README.txt",
    plan
      .map((item) => `${item.filename}: rows ${item.viewport.startRow + 1}-${item.viewport.startRow + item.viewport.height}, cols ${item.viewport.startColumn + 1}-${item.viewport.startColumn + item.viewport.width}`)
      .join("\n"),
  );

  const archive = await zip.generateAsync({ type: "blob" });
  triggerDownload(archive, `BeadGrid_${pattern.width}x${pattern.height}_底板拆分图.zip`);
}
