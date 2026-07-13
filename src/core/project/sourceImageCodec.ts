import {
  loadSourceImageFromBlob,
  type LoadedSourceImage,
} from "@/core/image/loadSourceImage";
import type { BeadGridProjectDocumentV1 } from "@/core/project/projectFile";

type CanvasFactory = () => HTMLCanvasElement;
type SourceImageLoader = (blob: Blob, name: string) => Promise<LoadedSourceImage>;

export function encodeSourceImageAsPngDataUrl(
  image: LoadedSourceImage,
  createCanvas: CanvasFactory = () => document.createElement("canvas"),
) {
  const canvas = createCanvas();
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("无法创建原图编码画布。");
  }

  const imageData = context.createImageData(image.width, image.height);
  imageData.data.set(image.data);
  context.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function decodeProjectSourceImage(
  source: BeadGridProjectDocumentV1["source"],
  fetchImpl: typeof fetch = fetch,
  loadImage: SourceImageLoader = loadSourceImageFromBlob,
) {
  const response = await fetchImpl(source.pngDataUrl);
  if (!response.ok) {
    throw new Error("工程文件中的原图数据无法读取。");
  }

  return loadImage(await response.blob(), source.name);
}
