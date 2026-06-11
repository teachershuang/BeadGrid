export type PatternGenerationStage =
  | "sampling"
  | "max-colors"
  | "matching"
  | "cleanup"
  | "statistics";

export interface PatternGenerationProgress {
  stage: PatternGenerationStage;
  progress: number;
}

export interface PatternGenerationOptions {
  onProgress?: (progress: PatternGenerationProgress) => void;
  shouldAbort?: () => boolean;
}

export class PatternGenerationAbortedError extends Error {
  constructor() {
    super("Pattern generation aborted.");
    this.name = "PatternGenerationAbortedError";
  }
}

export function throwIfPatternGenerationAborted(shouldAbort?: () => boolean) {
  if (shouldAbort?.()) {
    throw new PatternGenerationAbortedError();
  }
}
