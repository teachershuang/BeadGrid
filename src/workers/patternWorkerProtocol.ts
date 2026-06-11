import type { PixelSourceImage, PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";
import type { PaletteColor } from "@/types/palette";
import type { PatternGenerationProgress } from "@/types/patternGeneration";

export interface PatternWorkerGenerateRequest {
  type: "generate";
  taskId: string;
  image: PixelSourceImage;
  settings: PatternSettings;
  palette: PaletteColor[];
}

export type PatternWorkerRequest = PatternWorkerGenerateRequest;

export interface PatternWorkerProgressResponse {
  type: "progress";
  taskId: string;
  progress: PatternGenerationProgress;
}

export interface PatternWorkerSuccessResponse {
  type: "success";
  taskId: string;
  pattern: GeneratedPattern;
}

export interface PatternWorkerErrorResponse {
  type: "error";
  taskId: string;
  error: string;
}

export type PatternWorkerResponse =
  | PatternWorkerProgressResponse
  | PatternWorkerSuccessResponse
  | PatternWorkerErrorResponse;
