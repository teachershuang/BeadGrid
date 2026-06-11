import type { PixelSourceImage } from "@/types/image";

export interface LoadedSourceImage extends PixelSourceImage {
  name: string;
  previewUrl: string;
}

async function loadHtmlImage(url: string) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return image;
}

export async function loadSourceImageFromBlob(blob: Blob, name: string): Promise<LoadedSourceImage> {
  const previewUrl = URL.createObjectURL(blob);

  try {
    const image = await loadHtmlImage(previewUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Unable to create canvas context for image decoding.");
    }

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    return {
      name,
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
      previewUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

export async function loadSourceImageFromFile(file: File) {
  return loadSourceImageFromBlob(file, file.name);
}

export async function loadSourceImageFromUrl(url: string, name: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sample image: ${response.status} ${response.statusText}`);
  }

  return loadSourceImageFromBlob(await response.blob(), name);
}

export function disposeLoadedSourceImage(image: LoadedSourceImage | null) {
  if (image) {
    URL.revokeObjectURL(image.previewUrl);
  }
}

