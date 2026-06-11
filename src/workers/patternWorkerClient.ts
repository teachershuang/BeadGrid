import type { PixelSourceImage, PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";
import { PatternGenerationAbortedError, type PatternGenerationProgress } from "@/types/patternGeneration";
import type { PatternWorkerGenerateRequest, PatternWorkerResponse } from "@/workers/patternWorkerProtocol";

export interface PatternGenerationTask {
  taskId: string;
  promise: Promise<GeneratedPattern>;
  cancel: () => void;
}

interface StartPatternGenerationTaskOptions {
  onProgress?: (progress: PatternGenerationProgress) => void;
}

let taskSequence = 0;

export function startPatternGenerationTask(
  image: PixelSourceImage,
  settings: PatternSettings,
  palette: PaletteColor[],
  options: StartPatternGenerationTaskOptions = {},
): PatternGenerationTask {
  const taskId = `pattern-task-${Date.now()}-${taskSequence += 1}`;
  const worker = new Worker(new URL("./patternWorker.ts", import.meta.url), { type: "module" });
  let settled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<GeneratedPattern>((resolve, reject) => {
    rejectPromise = reject;

    worker.onmessage = (event: MessageEvent<PatternWorkerResponse>) => {
      const message = event.data;
      if (message.taskId !== taskId) {
        return;
      }

      if (message.type === "progress") {
        options.onProgress?.(message.progress);
        return;
      }

      settled = true;
      worker.terminate();

      if (message.type === "success") {
        resolve(message.pattern);
        return;
      }

      reject(new Error(message.error));
    };

    worker.onerror = (event) => {
      if (settled) {
        return;
      }

      settled = true;
      worker.terminate();
      reject(new Error(event.message || "Pattern worker crashed."));
    };

    const request: PatternWorkerGenerateRequest = {
      type: "generate",
      taskId,
      image: {
        width: image.width,
        height: image.height,
        data: new Uint8ClampedArray(image.data),
      },
      settings,
      palette,
    };

    worker.postMessage(request);
  });

  return {
    taskId,
    promise,
    cancel: () => {
      if (settled) {
        return;
      }

      settled = true;
      worker.terminate();
      rejectPromise?.(new PatternGenerationAbortedError());
    },
  };
}
