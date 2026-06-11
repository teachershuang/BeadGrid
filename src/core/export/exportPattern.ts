import JSZip from "jszip";
import { renderBoardSplitChart, renderPatternChart, renderPurchaseListPng } from "@/core/export/chartRenderer";
import { buildBoardSplitPlan } from "@/core/export/boardSplitPlan";
import { canvasToBlob, saveBlobFile } from "@/core/export/download";
import { buildPurchaseListCsv } from "@/core/export/purchaseList";
import { buildSeparatedSheetPlan } from "@/core/export/separatedSheetPlan";
import type { GeneratedPattern } from "@/types/pattern";

export async function exportFullPatternPng(pattern: GeneratedPattern) {
  const canvas = renderPatternChart(pattern, {
    title: "BeadGrid 完整底稿",
    showCodes: true,
    showCoordinates: true,
    showLegend: true,
    minorGridEvery: 5,
  });

  const blob = await canvasToBlob(canvas);
  await saveBlobFile(blob, buildFileName(pattern, "完整底稿", "png"), [
    { name: "PNG 图片", extensions: ["png"] },
  ]);
}

export async function exportSeparatedSheetsZip(pattern: GeneratedPattern) {
  const zip = new JSZip();
  const plan = buildSeparatedSheetPlan(pattern);

  for (const item of plan) {
    const canvas = renderPatternChart(pattern, {
      title: `BeadGrid 分色图 ${item.color.code}`,
      subtitle: `${pattern.settings.brandId.toUpperCase()}  ·  ${item.color.nameZh ?? "未命名"}  ·  当前颜色 ${item.count} 颗`,
      showCodes: true,
      showCoordinates: true,
      showLegend: true,
      focusColorId: item.color.id,
      mutedMode: "gray",
      minorGridEvery: 5,
    });
    zip.file(item.filename, await canvasToBlob(canvas));
  }

  const readme = plan
    .map((item) => `${String(item.index + 1).padStart(2, "0")}. ${item.color.code} ${item.color.nameZh ?? ""} - ${item.count}`)
    .join("\n");
  zip.file("README.txt", `分色图已按用量从多到少排序：\n${readme}\n`);

  const archive = await zip.generateAsync({ type: "blob" });
  await saveBlobFile(archive, buildFileName(pattern, "分色图", "zip"), [
    { name: "ZIP 压缩包", extensions: ["zip"] },
  ]);
}

export async function exportPurchaseListPng(pattern: GeneratedPattern, reserveRatio: number) {
  const canvas = renderPurchaseListPng(pattern, reserveRatio);
  const blob = await canvasToBlob(canvas);
  await saveBlobFile(
    blob,
    buildFileName(pattern, `采购清单_${Math.round(reserveRatio * 100)}pct`, "png"),
    [{ name: "PNG 图片", extensions: ["png"] }],
  );
}

export async function exportPurchaseListCsv(pattern: GeneratedPattern, reserveRatio: number) {
  const csv = buildPurchaseListCsv(pattern, reserveRatio);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  await saveBlobFile(
    blob,
    buildFileName(pattern, `采购清单_${Math.round(reserveRatio * 100)}pct`, "csv"),
    [{ name: "CSV 表格", extensions: ["csv"] }],
  );
}

export async function exportBoardSplitZip(pattern: GeneratedPattern) {
  const zip = new JSZip();
  const plan = buildBoardSplitPlan(pattern);

  for (const item of plan) {
    const subtitle = `全局行 ${item.viewport.startRow + 1}-${item.viewport.startRow + item.viewport.height} / 全局列 ${item.viewport.startColumn + 1}-${item.viewport.startColumn + item.viewport.width}`;
    const canvas = renderBoardSplitChart(
      pattern,
      item.viewport,
      `BeadGrid 底板拆分 R${String(item.rowIndex + 1).padStart(2, "0")} C${String(item.columnIndex + 1).padStart(2, "0")}`,
      subtitle,
    );
    zip.file(item.filename, await canvasToBlob(canvas));
  }

  zip.file(
    "README.txt",
    plan
      .map(
        (item) =>
          `${item.filename}: rows ${item.viewport.startRow + 1}-${item.viewport.startRow + item.viewport.height}, cols ${item.viewport.startColumn + 1}-${item.viewport.startColumn + item.viewport.width}`,
      )
      .join("\n"),
  );

  const archive = await zip.generateAsync({ type: "blob" });
  await saveBlobFile(archive, buildFileName(pattern, "底板拆分图", "zip"), [
    { name: "ZIP 压缩包", extensions: ["zip"] },
  ]);
}

function buildFileName(pattern: GeneratedPattern, suffix: string, extension: string) {
  return `BeadGrid_${pattern.width}x${pattern.height}_${suffix}.${extension}`;
}
