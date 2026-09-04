import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

export interface DownloadFilter {
  name: string;
  extensions: string[];
}

export async function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("导出 PNG 失败。"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export async function saveBlobFile(
  blob: Blob,
  filename: string,
  filters: DownloadFilter[],
): Promise<boolean> {
  if (isTauri()) {
    const selectedPath = await save({
      title: "保存导出文件",
      defaultPath: filename,
      filters,
    });

    if (!selectedPath) {
      return false;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    await writeFile(selectedPath, bytes);
    return true;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Tauri / Chromium 下载管理器对极短生命周期的 blob URL 偶发保存损坏，延迟释放更稳妥。
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
