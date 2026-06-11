import JSZip from "jszip";
import { renderPatternChart } from "@/core/export/chartRenderer";
import { canvasToBlob, triggerDownload } from "@/core/export/download";
import { buildSeparatedSheetPlan } from "@/core/export/separatedSheetPlan";
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
