import { describe, expect, it, vi } from "vitest";
import {
  decodeProjectSourceImage,
  encodeSourceImageAsPngDataUrl,
} from "@/core/project/sourceImageCodec";
import type { LoadedSourceImage } from "@/core/image/loadSourceImage";

describe("sourceImageCodec", () => {
  it("encodes source pixels as a PNG data URL", () => {
    const putImageData = vi.fn();
    const imageData = { data: new Uint8ClampedArray(4) } as ImageData;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        createImageData: () => imageData,
        putImageData,
      }),
      toDataURL: (type: string) => `data:${type};base64,AA==`,
    } as unknown as HTMLCanvasElement;

    const result = encodeSourceImageAsPngDataUrl(
      {
        name: "source.jpg",
        width: 1,
        height: 1,
        data: new Uint8ClampedArray([255, 0, 0, 255]),
        previewUrl: "blob:source",
      },
      () => canvas,
    );

    expect(result).toBe("data:image/png;base64,AA==");
    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1);
    expect(putImageData).toHaveBeenCalledOnce();
    expect([...imageData.data]).toEqual([255, 0, 0, 255]);
  });

  it("decodes the embedded source through the shared image loader", async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });
    const loaded = {
      name: "portrait.png",
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([0, 0, 0, 255]),
      previewUrl: "blob:restored",
    } satisfies LoadedSourceImage;
    const fetchImpl = vi.fn(async () =>
      ({
        ok: true,
        blob: async () => blob,
      }) as Response,
    ) as unknown as typeof fetch;
    const loadImage = vi.fn(async () => loaded);

    const result = await decodeProjectSourceImage(
      { name: "portrait.png", pngDataUrl: "data:image/png;base64,AQID" },
      fetchImpl,
      loadImage,
    );

    expect(result).toBe(loaded);
    expect(loadImage).toHaveBeenCalledWith(expect.any(Blob), "portrait.png");
  });
});
