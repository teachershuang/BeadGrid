import { jsPDF } from "jspdf";
import { renderBoardSplitChart } from "@/core/export/chartRenderer";
import { saveBlobFile } from "@/core/export/download";
import { buildPrintPlan } from "@/core/export/printPlan";
import type { GeneratedPattern } from "@/types/pattern";

const PAGE_MARGIN_MM = 12;

export async function exportPrintPdf(pattern: GeneratedPattern) {
  const pages = buildPrintPlan(pattern);
  if (pages.length === 0) {
    throw new Error("当前图纸没有可打印的底板页面。");
  }

  const document = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      document.addPage("a4", "portrait");
    }

    const canvas = renderBoardSplitChart(
      pattern,
      page.viewport,
      page.title,
      page.subtitle,
    );
    const pageWidth = document.internal.pageSize.getWidth();
    const pageHeight = document.internal.pageSize.getHeight();
    const availableWidth = pageWidth - PAGE_MARGIN_MM * 2;
    const availableHeight = pageHeight - PAGE_MARGIN_MM * 2;
    const scale = Math.min(availableWidth / canvas.width, availableHeight / canvas.height);
    const width = canvas.width * scale;
    const height = canvas.height * scale;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    document.addImage(canvas.toDataURL("image/png"), "PNG", x, y, width, height, undefined, "FAST");
  });

  await saveBlobFile(
    document.output("blob"),
    `BeadGrid_${pattern.width}x${pattern.height}_打印版.pdf`,
    [{ name: "PDF 文档", extensions: ["pdf"] }],
  );
}
