/// <reference lib="webworker" />

import { generatePattern } from "@/core/pattern/generatePattern";
import { PatternGenerationAbortedError } from "@/types/patternGeneration";
import type { PatternWorkerRequest, PatternWorkerResponse } from "@/workers/patternWorkerProtocol";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<PatternWorkerRequest>) => {
  const message = event.data;
  if (message.type !== "generate") {
    return;
  }

  try {
    const pattern = generatePattern(message.image, message.settings, message.palette, {
      onProgress: (progress) => {
        const response: PatternWorkerResponse = {
          type: "progress",
          taskId: message.taskId,
          progress,
        };
        self.postMessage(response);
      },
    });

    const response: PatternWorkerResponse = {
      type: "success",
      taskId: message.taskId,
      pattern,
    };
    self.postMessage(response);
  } catch (error) {
    if (error instanceof PatternGenerationAbortedError) {
      return;
    }

    const response: PatternWorkerResponse = {
      type: "error",
      taskId: message.taskId,
      error: error instanceof Error ? error.message : "Unknown worker error",
    };
    self.postMessage(response);
  }
};

export {};
