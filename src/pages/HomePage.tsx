import { startTransition, useEffect, useEffectEvent, useRef, useState, type DragEvent } from "react";
import demoSampleImageUrl from "@/assets/demo-cat-garden.png";
import { Panel } from "@/components/Panel";
import {
  PatternPreviewCanvas,
  type HoveredPatternCell,
} from "@/components/PatternPreviewCanvas";
import { SourcePreviewCanvas } from "@/components/SourcePreviewCanvas";
import { parseHexColor, rgbToHex } from "@/core/color/utils";
import {
  exportBoardSplitZip,
  exportFullPatternPng,
  exportPurchaseListCsv,
  exportPurchaseListPng,
  exportSeparatedSheetsZip,
} from "@/core/export/exportPattern";
import { exportPrintPdf } from "@/core/export/exportPdf";
import { saveBlobFile } from "@/core/export/download";
import {
  disposeLoadedSourceImage,
  loadSourceImageFromFile,
  loadSourceImageFromUrl,
  type LoadedSourceImage,
} from "@/core/image/loadSourceImage";
import { loadBrandCodeMap, summarizeBrandCoverage } from "@/core/palette/brandCodeMap";
import { loadColorSystemMapping } from "@/core/palette/colorSystemMapping";
import {
  applyPatternEditCommand,
  createPatternEditCommand,
  type PatternCellUpdate,
  type PatternEditCommand,
} from "@/core/pattern/patternEditor";
import {
  createProjectDocument,
  parseProjectDocument,
  serializeProjectDocument,
} from "@/core/project/projectFile";
import {
  decodeProjectSourceImage,
  encodeSourceImageAsPngDataUrl,
} from "@/core/project/sourceImageCodec";
import { clampIntegerInput, patternSettingLimits } from "@/core/settings/patternSettings";
import type { CleanupLevel, PatternSettings } from "@/types/image";
import type { GeneratedPattern } from "@/types/pattern";
import type { BrandCodeMap, BrandCoverageSummary, PaletteColor } from "@/types/palette";
import {
  PatternGenerationAbortedError,
  type PatternGenerationProgress,
  type PatternGenerationStage,
} from "@/types/patternGeneration";
import { startPatternGenerationTask, type PatternGenerationTask } from "@/workers/patternWorkerClient";

const defaultSettings: PatternSettings = {
  artworkWidth: 48,
  artworkHeight: 48,
  boardWidth: 29,
  boardHeight: 29,
  brandId: "mard",
  maxColors: 0,
  cleanupLevel: "off",
  fitMode: "cover",
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipHorizontal: false,
  alphaThreshold: 0.08,
  transparencyMode: "empty",
  backgroundRgb: { r: 248, g: 241, b: 230 },
  sampleGridSize: 5,
};

const generationStageLabels: Record<PatternGenerationStage, string> = {
  sampling: "单格采样",
  "max-colors": "限色筛选",
  matching: "色号匹配",
  cleanup: "杂色清理",
  statistics: "统计汇总",
};

const supportedImageExtensions = [".png", ".jpg", ".jpeg", ".webp"];
const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const boardPresetMultipliers = [1, 2, 3, 4];
const commonArtworkPresets = [
  { label: "48 × 48", width: 48, height: 48, hint: "适合头像与贴纸" },
  { label: "72 × 72", width: 72, height: 72, hint: "细节更完整" },
  { label: "100 × 100", width: 100, height: 100, hint: "适合完整立绘" },
  { label: "128 × 128", width: 128, height: 128, hint: "适合大图测试" },
] as const;
const editHistoryLimit = 100;

interface ActiveEditStroke {
  basePattern: GeneratedPattern;
  mappedColor: PaletteColor | null;
  updates: Map<number, PatternCellUpdate>;
}

export function HomePage() {
  const activeTaskRef = useRef<PatternGenerationTask | null>(null);
  const activeEditStrokeRef = useRef<ActiveEditStroke | null>(null);
  const dragDepthRef = useRef(0);
  const [map, setMap] = useState<BrandCodeMap | null>(null);
  const [coverage, setCoverage] = useState<BrandCoverageSummary[]>([]);
  const [paletteLibrary, setPaletteLibrary] = useState<Map<string, PaletteColor[]> | null>(null);
  const [rgbSeedCount, setRgbSeedCount] = useState<number | null>(null);
  const [settings, setSettings] = useState<PatternSettings>(defaultSettings);
  const [sourceImage, setSourceImage] = useState<LoadedSourceImage | null>(null);
  const [basePattern, setBasePattern] = useState<GeneratedPattern | null>(null);
  const [pattern, setPattern] = useState<GeneratedPattern | null>(null);
  const [previewMode, setPreviewMode] = useState<"source" | "pattern">("source");
  const [showGrid, setShowGrid] = useState(true);
  const [showCodes, setShowCodes] = useState(true);
  const [showFiveByFiveGrid, setShowFiveByFiveGrid] = useState(true);
  const [showBoardBoundaries, setShowBoardBoundaries] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);
  const [highlightedColorId, setHighlightedColorId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [brushColorId, setBrushColorId] = useState<string | null>(null);
  const [eraseMode, setEraseMode] = useState(false);
  const [undoStack, setUndoStack] = useState<PatternEditCommand[]>([]);
  const [redoStack, setRedoStack] = useState<PatternEditCommand[]>([]);
  const [hoveredCell, setHoveredCell] = useState<HoveredPatternCell | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<PatternGenerationProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [purchaseReserveRatio, setPurchaseReserveRatio] = useState(0.05);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([loadBrandCodeMap(), loadColorSystemMapping()])
      .then(([loadedMap, colorSystemMapping]) => {
        if (!active) {
          return;
        }

        setMap(loadedMap);
        setCoverage(summarizeBrandCoverage(loadedMap));
        setPaletteLibrary(colorSystemMapping);
        setRgbSeedCount(
          Array.from(colorSystemMapping.values()).reduce(
            (sum, paletteColors) => sum + paletteColors.length,
            0,
          ),
        );
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "色板加载失败。");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      disposeLoadedSourceImage(sourceImage);
    };
  }, [sourceImage]);

  useEffect(() => {
    return () => {
      activeTaskRef.current?.cancel();
    };
  }, []);

  const currentPalette = paletteLibrary?.get(settings.brandId) ?? [];
  const selectedBrushColor =
    currentPalette.find((color) => color.id === brushColorId) ?? currentPalette[0] ?? null;
  const generationPercent = generationProgress ? Math.round(generationProgress.progress * 100) : 0;
  const generationStageLabel = generationProgress ? generationStageLabels[generationProgress.stage] : null;
  const backgroundHex = rgbToHex(settings.backgroundRgb);
  const currentBrandName =
    map?.brands.find((brand) => brand.id === settings.brandId)?.nameZh ?? settings.brandId.toUpperCase();
  const boardColumns = Math.ceil(settings.artworkWidth / settings.boardWidth);
  const boardRows = Math.ceil(settings.artworkHeight / settings.boardHeight);
  const sizePresetMap = new Map<
    string,
    { label: string; width: number; height: number; hint: string }
  >();

  for (const multiplier of boardPresetMultipliers) {
    const width = settings.boardWidth * multiplier;
    const height = settings.boardHeight * multiplier;
    const key = `${width}x${height}`;
    sizePresetMap.set(key, {
      label: `${multiplier} × ${multiplier} 板`,
      width,
      height,
      hint: `${width} × ${height}`,
    });
  }

  for (const preset of commonArtworkPresets) {
    const key = `${preset.width}x${preset.height}`;
    if (!sizePresetMap.has(key)) {
      sizePresetMap.set(key, preset);
    }
  }

  const sizePresets = Array.from(sizePresetMap.values());
  const isCustomArtworkSize = !sizePresets.some(
    (preset) => preset.width === settings.artworkWidth && preset.height === settings.artworkHeight,
  );
  const selectedUsage =
    pattern && highlightedColorId
      ? pattern.statistics.usages.find((usage) => usage.color.id === highlightedColorId) ?? null
      : null;
  const hasPatternEdits = Boolean(
    pattern &&
    basePattern &&
    pattern.cells.some(
      (cell, index) => cell.mappedColor?.id !== basePattern.cells[index]?.mappedColor?.id,
    ),
  );

  function cancelActiveGeneration() {
    activeTaskRef.current?.cancel();
    activeTaskRef.current = null;
    setIsGenerating(false);
    setGenerationProgress(null);
  }

  function resetEditSession() {
    activeEditStrokeRef.current = null;
    setEditMode(false);
    setEraseMode(false);
    setUndoStack([]);
    setRedoStack([]);
  }

  function confirmDiscardUnsavedWork(message: string) {
    return !sourceImage || !hasUnsavedChanges || window.confirm(message);
  }

  async function replaceSourceImage(nextImage: LoadedSourceImage) {
    if (!confirmDiscardUnsavedWork("当前工程有未保存的修改。继续换图将丢失这些修改，是否继续？")) {
      disposeLoadedSourceImage(nextImage);
      return false;
    }

    cancelActiveGeneration();
    disposeLoadedSourceImage(sourceImage);
    setSourceImage(nextImage);
    setBasePattern(null);
    setPattern(null);
    setPreviewMode("source");
    setHighlightedColorId(null);
    setHoveredCell(null);
    resetEditSession();
    setHasUnsavedChanges(true);
    return true;
  }

  async function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    try {
      await replaceSourceImage(await loadSourceImageFromFile(file));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "图片导入失败。");
    }
  }

  function isSupportedImageFile(file: File) {
    const lowerName = file.name.toLowerCase();
    return (
      supportedImageTypes.has(file.type) ||
      supportedImageExtensions.some((extension) => lowerName.endsWith(extension))
    );
  }

  function hasDraggingFiles(event: DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function resetDragState() {
    dragDepthRef.current = 0;
    setIsDraggingFile(false);
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    if (!hasDraggingFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingFile(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!hasDraggingFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!hasDraggingFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingFile(false);
    }
  }

  async function handleDrop(event: DragEvent<HTMLElement>) {
    if (!hasDraggingFiles(event)) {
      return;
    }

    event.preventDefault();
    resetDragState();

    const file = Array.from(event.dataTransfer.files).find(isSupportedImageFile) ?? null;
    if (!file) {
      setError("请拖入 PNG、JPG、JPEG 或 WebP 图片。");
      return;
    }

    await handleFileSelected(file);
  }

  async function handleLoadSampleImage() {
    setError(null);
    try {
      await replaceSourceImage(await loadSourceImageFromUrl(demoSampleImageUrl, "demo-cat-garden.png"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "样图加载失败。");
    }
  }

  async function handleGenerate() {
    if (!sourceImage || currentPalette.length === 0) {
      return;
    }

    cancelActiveGeneration();
    setIsGenerating(true);
    setError(null);
    setGenerationProgress({ stage: "sampling", progress: 0 });

    const task = startPatternGenerationTask(sourceImage, settings, currentPalette, {
      onProgress: setGenerationProgress,
    });
    activeTaskRef.current = task;

    try {
      const nextPattern = await task.promise;
      if (activeTaskRef.current?.taskId !== task.taskId) {
        return;
      }

      startTransition(() => {
        setBasePattern(nextPattern);
        setPattern(nextPattern);
        setPreviewMode("pattern");
        setBrushColorId(nextPattern.statistics.usages[0]?.color.id ?? currentPalette[0]?.id ?? null);
        setHighlightedColorId(null);
        setHoveredCell(null);
        resetEditSession();
        setHasUnsavedChanges(true);
      });
    } catch (generationError) {
      if (activeTaskRef.current?.taskId !== task.taskId) {
        return;
      }

      if (generationError instanceof PatternGenerationAbortedError) {
        return;
      }

      setError(generationError instanceof Error ? generationError.message : "生成失败。");
    } finally {
      if (activeTaskRef.current?.taskId === task.taskId) {
        activeTaskRef.current = null;
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    }
  }

  function updateSettings(patch: Partial<PatternSettings>) {
    if (pattern && !window.confirm("调整生成参数会清空当前图纸及手工修图，是否继续？")) {
      return;
    }

    cancelActiveGeneration();
    setSettings((current) => ({ ...current, ...patch }));
    setBasePattern(null);
    setPattern(null);
    setHighlightedColorId(null);
    setHoveredCell(null);
    resetEditSession();
    if (sourceImage) {
      setHasUnsavedChanges(true);
    }
  }

  function applyArtworkPreset(width: number, height: number) {
    updateSettings({ artworkWidth: width, artworkHeight: height });
  }

  function pushUndoCommand(command: PatternEditCommand) {
    setUndoStack((current) => [...current, command].slice(-editHistoryLimit));
    setRedoStack([]);
  }

  function applyActiveStrokeCell(cellIndex: number) {
    const stroke = activeEditStrokeRef.current;
    if (!stroke) {
      return;
    }

    stroke.updates.set(cellIndex, {
      index: cellIndex,
      mappedColor: stroke.mappedColor,
    });
    const command = createPatternEditCommand(stroke.basePattern, [...stroke.updates.values()]);
    setPattern(command ? applyPatternEditCommand(stroke.basePattern, command, "forward") : stroke.basePattern);
  }

  function handleEditStrokeStart(cellIndex: number) {
    if (!pattern || (!eraseMode && !selectedBrushColor)) {
      return;
    }

    activeEditStrokeRef.current = {
      basePattern: pattern,
      mappedColor: eraseMode ? null : selectedBrushColor,
      updates: new Map(),
    };
    applyActiveStrokeCell(cellIndex);
  }

  function handleEditStrokeEnd() {
    const stroke = activeEditStrokeRef.current;
    activeEditStrokeRef.current = null;
    if (!stroke) {
      return;
    }

    const command = createPatternEditCommand(stroke.basePattern, [...stroke.updates.values()]);
    if (command) {
      pushUndoCommand(command);
      setHasUnsavedChanges(true);
    }
  }

  function handleUndo() {
    const command = undoStack.at(-1);
    if (!pattern || !command) {
      return;
    }

    setPattern(applyPatternEditCommand(pattern, command, "backward"));
    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, command].slice(-editHistoryLimit));
    setHasUnsavedChanges(true);
  }

  function handleRedo() {
    const command = redoStack.at(-1);
    if (!pattern || !command) {
      return;
    }

    setPattern(applyPatternEditCommand(pattern, command, "forward"));
    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, command].slice(-editHistoryLimit));
    setHasUnsavedChanges(true);
  }

  function handleRestoreGeneratedPattern() {
    if (!pattern || !basePattern) {
      return;
    }

    const updates = basePattern.cells.map((cell, index) => ({
      index,
      mappedColor: cell.mappedColor,
    }));
    const command = createPatternEditCommand(pattern, updates);
    if (!command) {
      return;
    }

    setPattern(applyPatternEditCommand(pattern, command, "forward"));
    pushUndoCommand(command);
    setHasUnsavedChanges(true);
  }

  async function saveProjectFile() {
    if (!sourceImage) {
      return;
    }

    const project = createProjectDocument({
      sourceName: sourceImage.name,
      pngDataUrl: encodeSourceImageAsPngDataUrl(sourceImage),
      settings,
      basePattern,
      currentPattern: pattern,
    });
    const sourceBaseName = sourceImage.name.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*]+/g, "_");
    const saved = await saveBlobFile(
      new Blob([serializeProjectDocument(project)], { type: "application/json;charset=utf-8" }),
      `${sourceBaseName || "BeadGrid工程"}.beadgrid`,
      [{ name: "BeadGrid 工程", extensions: ["beadgrid"] }],
    );
    if (saved) {
      setHasUnsavedChanges(false);
    }
  }

  async function handleProjectSelected(file: File | null) {
    if (!file) {
      return;
    }
    if (!confirmDiscardUnsavedWork("当前工程有未保存的修改。继续打开其他工程将丢失这些修改，是否继续？")) {
      return;
    }

    setError(null);
    try {
      const project = parseProjectDocument(await file.text());
      const restoredSourceImage = await decodeProjectSourceImage(project.source);

      cancelActiveGeneration();
      disposeLoadedSourceImage(sourceImage);
      setSourceImage(restoredSourceImage);
      setSettings(project.settings);
      setBasePattern(project.basePattern);
      setPattern(project.currentPattern);
      setPreviewMode(project.currentPattern ? "pattern" : "source");
      setBrushColorId(project.currentPattern?.statistics.usages[0]?.color.id ?? null);
      setHighlightedColorId(null);
      setHoveredCell(null);
      resetEditSession();
      setHasUnsavedChanges(false);
    } catch (projectError) {
      setError(projectError instanceof Error ? projectError.message : "工程文件打开失败。");
    }
  }

  async function runExport(action: () => Promise<void>, fallbackMessage: string) {
    setIsExporting(true);
    setError(null);
    try {
      await action();
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : fallbackMessage);
    } finally {
      setIsExporting(false);
    }
  }

  const handleKeyboardShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === "s") {
      event.preventDefault();
      if (sourceImage && !isExporting) {
        void runExport(saveProjectFile, "工程文件保存失败。");
      }
      return;
    }

    if (!editMode) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) {
      return;
    }

    const command = key === "y" || (key === "z" && event.shiftKey) ? redoStack.at(-1) : undoStack.at(-1);
    const direction = key === "y" || (key === "z" && event.shiftKey) ? "forward" : "backward";
    if ((key !== "z" && key !== "y") || !pattern || !command) {
      return;
    }

    event.preventDefault();
    setPattern(applyPatternEditCommand(pattern, command, direction));
    setHasUnsavedChanges(true);
    if (direction === "forward") {
      setRedoStack((current) => current.slice(0, -1));
      setUndoStack((current) => [...current, command].slice(-editHistoryLimit));
    } else {
      setUndoStack((current) => current.slice(0, -1));
      setRedoStack((current) => [...current, command].slice(-editHistoryLimit));
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <main className="shell">
      <div
        className={`app-window ${isDraggingFile ? "is-dragging-file" : ""}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => void handleDrop(event)}
      >
        <div className="drop-overlay" aria-hidden={!isDraggingFile}>
          <div className="drop-overlay-card">
            <strong>松开导入图片</strong>
            <span>支持 PNG、JPG、JPEG、WebP</span>
          </div>
        </div>
        <header className="app-topbar">
          <div className="app-topbar-main">
            <div className="window-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <div className="app-name-row">
                <strong>BeadGrid</strong>
                <span className="app-badge">Windows 桌面版</span>
              </div>
              <p className="app-subtitle">把普通图片整理成适合照图拼豆的桌面工作台。</p>
            </div>
          </div>
          <div className="app-topbar-status">
            <div className="app-chip">
              <strong>{sourceImage ? `${sourceImage.width} × ${sourceImage.height}` : "--"}</strong>
              <span>当前图片</span>
            </div>
            <div className="app-chip">
              <strong>{currentBrandName}</strong>
              <span>品牌色板</span>
            </div>
            <div className="app-chip">
              <strong>{pattern?.statistics.actualColorCount ?? "--"}</strong>
              <span>实际颜色</span>
            </div>
          </div>
        </header>

        <div className="workspace">
          <div className="left-rail">
            <Panel title="输入与生成" eyebrow="项目" className="control-panel">
              <div className="form-grid">
                <div className="control-section">
                  <div className="section-kicker">图片来源</div>
                  <div className="drop-hint">
                    <strong>拖入图片即可开始</strong>
                    <span>也可以点击下方文件按钮选择图片。</span>
                  </div>
                  <div className="two-up project-actions">
                    <label className="action-button secondary file-action">
                      <span>打开工程</span>
                      <input
                        className="visually-hidden"
                        type="file"
                        accept=".beadgrid,application/json"
                        onChange={(event) => {
                          void handleProjectSelected(event.target.files?.[0] ?? null);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="action-button secondary"
                      disabled={!sourceImage || isExporting}
                      onClick={() => void runExport(saveProjectFile, "工程文件保存失败。")}
                    >
                      保存工程
                    </button>
                  </div>
                  {sourceImage ? (
                    <div
                      className={`project-save-status ${hasUnsavedChanges ? "is-unsaved" : "is-saved"}`}
                      role="status"
                    >
                      <span aria-hidden="true" />
                      {hasUnsavedChanges ? "有未保存修改" : "工程已保存"}
                      <kbd>Ctrl+S</kbd>
                    </div>
                  ) : null}
                  <label className="field">
                    <span>导入图片</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                      onChange={(event) => {
                        void handleFileSelected(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <div className="two-up">
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => void handleLoadSampleImage()}
                    >
                      加载测试图
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => setPreviewMode("source")}
                      disabled={!sourceImage}
                    >
                      查看原图
                    </button>
                  </div>
                </div>

                <div className="control-section">
                  <div className="section-kicker">输出尺寸</div>
                  <div className="two-up">
                    <label className="field">
                      <span>作品宽度</span>
                      <input
                        type="number"
                        min={8}
                        max={300}
                        value={settings.artworkWidth}
                        onChange={(event) => updateSettings({
                          artworkWidth: clampIntegerInput(
                            event.target.value,
                            patternSettingLimits.artworkWidth.min,
                            patternSettingLimits.artworkWidth.max,
                            settings.artworkWidth,
                          ),
                        })}
                      />
                    </label>
                    <label className="field">
                      <span>作品高度</span>
                      <input
                        type="number"
                        min={8}
                        max={300}
                        value={settings.artworkHeight}
                        onChange={(event) => updateSettings({
                          artworkHeight: clampIntegerInput(
                            event.target.value,
                            patternSettingLimits.artworkHeight.min,
                            patternSettingLimits.artworkHeight.max,
                            settings.artworkHeight,
                          ),
                        })}
                      />
                    </label>
                  </div>
                  <div className="field">
                    <span>常用尺寸预设</span>
                    <div className="preset-grid" role="list" aria-label="常用尺寸预设">
                      {sizePresets.map((preset) => {
                        const isActive =
                          preset.width === settings.artworkWidth && preset.height === settings.artworkHeight;

                        return (
                          <button
                            key={`${preset.width}x${preset.height}`}
                            type="button"
                            className={`preset-button ${isActive ? "is-active" : ""}`}
                            onClick={() => applyArtworkPreset(preset.width, preset.height)}
                            aria-pressed={isActive}
                          >
                            <strong>{preset.label}</strong>
                            <span>{preset.hint}</span>
                          </button>
                        );
                      })}
                      <div className={`preset-button is-static ${isCustomArtworkSize ? "is-active" : ""}`}>
                        <strong>自定义</strong>
                        <span>{settings.artworkWidth} × {settings.artworkHeight}</span>
                      </div>
                    </div>
                  </div>
                  <div className="size-summary">
                    预计占用 {boardColumns} × {boardRows} 块底板，共 {boardColumns * boardRows} 块。
                  </div>
                  <div className="two-up">
                    <label className="field">
                      <span>底板宽度</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={settings.boardWidth}
                        onChange={(event) => updateSettings({
                          boardWidth: clampIntegerInput(
                            event.target.value,
                            patternSettingLimits.boardWidth.min,
                            patternSettingLimits.boardWidth.max,
                            settings.boardWidth,
                          ),
                        })}
                      />
                    </label>
                    <label className="field">
                      <span>底板高度</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={settings.boardHeight}
                        onChange={(event) => updateSettings({
                          boardHeight: clampIntegerInput(
                            event.target.value,
                            patternSettingLimits.boardHeight.min,
                            patternSettingLimits.boardHeight.max,
                            settings.boardHeight,
                          ),
                        })}
                      />
                    </label>
                  </div>
                </div>

                <div className="control-section">
                  <div className="section-kicker">颜色策略</div>
                  <label className="field">
                    <span>品牌</span>
                    <select value={settings.brandId} onChange={(event) => updateSettings({ brandId: event.target.value })}>
                      {map?.brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.nameZh}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="two-up">
                    <label className="field">
                      <span>最大颜色数</span>
                      <input
                        type="number"
                        min={0}
                        max={64}
                        value={settings.maxColors}
                        onChange={(event) => updateSettings({
                          maxColors: clampIntegerInput(
                            event.target.value,
                            patternSettingLimits.maxColors.min,
                            patternSettingLimits.maxColors.max,
                            settings.maxColors,
                          ),
                        })}
                      />
                    </label>
                    <label className="field">
                      <span>杂色清理</span>
                      <select
                        value={settings.cleanupLevel}
                        onChange={(event) => updateSettings({ cleanupLevel: event.target.value as CleanupLevel })}
                      >
                        <option value="off">关闭</option>
                        <option value="light">轻度</option>
                        <option value="medium">中度</option>
                        <option value="strong">强力</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>
                      单格采样密度 {settings.sampleGridSize}×{settings.sampleGridSize}
                    </span>
                    <input
                      type="range"
                      min={3}
                      max={7}
                      step={1}
                      value={settings.sampleGridSize}
                      onChange={(event) => updateSettings({ sampleGridSize: Number(event.target.value) })}
                    />
                  </label>
                </div>

                <div className="control-section">
                  <div className="section-kicker">构图微调</div>
                  <div className="two-up">
                    <label className="field">
                      <span>裁切方式</span>
                      <select
                        value={settings.fitMode}
                        onChange={(event) => updateSettings({ fitMode: event.target.value as PatternSettings["fitMode"] })}
                      >
                        <option value="cover">填满裁切</option>
                        <option value="contain">完整显示</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>旋转</span>
                      <select
                        value={settings.rotation}
                        onChange={(event) =>
                          updateSettings({
                            rotation: Number(event.target.value) as PatternSettings["rotation"],
                          })
                        }
                      >
                        <option value={0}>0°</option>
                        <option value={90}>90°</option>
                        <option value={180}>180°</option>
                        <option value={270}>270°</option>
                      </select>
                    </label>
                  </div>
                  <label className="field">
                    <span>缩放 {settings.zoom.toFixed(2)}x</span>
                    <input
                      type="range"
                      min={0.5}
                      max={3}
                      step={0.01}
                      value={settings.zoom}
                      onChange={(event) => updateSettings({ zoom: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>水平偏移 {settings.offsetX.toFixed(2)}</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={settings.offsetX}
                      onChange={(event) => updateSettings({ offsetX: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field">
                    <span>垂直偏移 {settings.offsetY.toFixed(2)}</span>
                    <input
                      type="range"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={settings.offsetY}
                      onChange={(event) => updateSettings({ offsetY: Number(event.target.value) })}
                    />
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={settings.flipHorizontal}
                      onChange={(event) => updateSettings({ flipHorizontal: event.target.checked })}
                    />
                    <span>水平翻转</span>
                  </label>
                </div>

                <div className="control-section">
                  <div className="section-kicker">透明处理</div>
                  <div className="two-up">
                    <label className="field">
                      <span>透明策略</span>
                      <select
                        value={settings.transparencyMode}
                        onChange={(event) =>
                          updateSettings({
                            transparencyMode: event.target.value as PatternSettings["transparencyMode"],
                          })
                        }
                      >
                        <option value="empty">透明区域作空珠</option>
                        <option value="blend">合成到背景色</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>背景颜色</span>
                      <input
                        type="color"
                        value={backgroundHex}
                        onChange={(event) => updateSettings({ backgroundRgb: parseHexColor(event.target.value) })}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>透明阈值 {settings.alphaThreshold.toFixed(2)}</span>
                    <input
                      type="range"
                      min={0}
                      max={0.8}
                      step={0.01}
                      value={settings.alphaThreshold}
                      onChange={(event) => updateSettings({ alphaThreshold: Number(event.target.value) })}
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="action-button primary-large"
                  onClick={() => void handleGenerate()}
                  disabled={!sourceImage || currentPalette.length === 0 || isGenerating}
                >
                  {isGenerating && generationStageLabel
                    ? `生成中 · ${generationStageLabel} ${generationPercent}%`
                    : "生成拼豆图纸"}
                </button>
                {isGenerating ? (
                  <button type="button" className="action-button secondary" onClick={cancelActiveGeneration}>
                    取消当前任务
                  </button>
                ) : null}
              </div>
            </Panel>

            <Panel title="当前状态" eyebrow="输入" className="secondary-panel">
              <div className="metric-grid">
                <div className="metric">
                  <strong>{sourceImage ? `${sourceImage.width} × ${sourceImage.height}` : "--"}</strong>
                  <span>原图像素</span>
                </div>
                <div className="metric">
                  <strong>{currentPalette.length || "--"}</strong>
                  <span>可用颜色</span>
                </div>
                <div className="metric">
                  <strong>{sourceImage?.name ?? "--"}</strong>
                  <span>当前文件</span>
                </div>
                <div className="metric">
                  <strong>
                    {boardColumns} × {boardRows}
                  </strong>
                  <span>底板拆分</span>
                </div>
              </div>
              {isGenerating && generationStageLabel ? (
                <div className="progress-box">
                  <div className="progress-copy">
                    <strong>{generationStageLabel}</strong>
                    <span>{generationPercent}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${generationPercent}%` }} />
                  </div>
                </div>
              ) : null}
              {error ? <div className="error-box">{error}</div> : null}
            </Panel>
          </div>

          <div className="center-stage">
            <Panel
              title="图纸预览"
              eyebrow="画布"
              className="preview-panel"
              aside={
                <div className="inline-actions">
                  <button
                    type="button"
                    className={`mini-button ${previewMode === "source" ? "is-active" : ""}`}
                    onClick={() => setPreviewMode("source")}
                  >
                    原图预览
                  </button>
                  <button
                    type="button"
                    className={`mini-button ${previewMode === "pattern" ? "is-active" : ""}`}
                    onClick={() => setPreviewMode("pattern")}
                    disabled={!pattern}
                  >
                    图纸预览
                  </button>
                </div>
              }
            >
              <div className="preview-intro">
                <div>
                  <strong>{previewMode === "source" ? "构图预览" : "拼豆图纸"}</strong>
                  <span>
                    {previewMode === "source"
                      ? "先确认裁切和主体位置，再生成图纸。"
                      : editMode
                        ? "选择色号后点击或拖动格子，修改会同步到统计和导出。"
                        : "支持色号、5×5 小格、底板边界、坐标和悬停读数。"}
                  </span>
                </div>
                <div className="preview-stamp">
                  {pattern ? `${pattern.width} × ${pattern.height}` : `${settings.artworkWidth} × ${settings.artworkHeight}`}
                </div>
              </div>

              {previewMode === "pattern" && pattern ? (
                <div className="edit-workbench">
                  <div className="edit-mode-switch" aria-label="图纸模式">
                    <button
                      type="button"
                      className={`mini-button ${!editMode ? "is-active" : ""}`}
                      aria-pressed={!editMode}
                      onClick={() => {
                        handleEditStrokeEnd();
                        setEditMode(false);
                      }}
                    >
                      查看
                    </button>
                    <button
                      type="button"
                      className={`mini-button ${editMode ? "is-active" : ""}`}
                      aria-pressed={editMode}
                      onClick={() => {
                        setHighlightedColorId(null);
                        setEditMode(true);
                      }}
                    >
                      修图
                    </button>
                  </div>

                  {editMode ? (
                    <>
                      <label className="brush-picker">
                        <span
                          className="brush-swatch"
                          style={{
                            backgroundColor: eraseMode || !selectedBrushColor
                              ? "transparent"
                              : rgbToHex(selectedBrushColor.rgb),
                          }}
                        />
                        <select
                          aria-label="画笔色号"
                          value={selectedBrushColor?.id ?? ""}
                          disabled={eraseMode}
                          onChange={(event) => {
                            setBrushColorId(event.target.value);
                            setEraseMode(false);
                          }}
                        >
                          {currentPalette.map((color) => (
                            <option key={color.id} value={color.id}>
                              {color.code}{color.nameZh ? ` · ${color.nameZh}` : ""}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className={`mini-button ${eraseMode ? "is-active" : ""}`}
                        aria-pressed={eraseMode}
                        onClick={() => setEraseMode((current) => !current)}
                      >
                        空珠橡皮
                      </button>
                      <span className="edit-divider" aria-hidden="true" />
                      <button type="button" className="mini-button" disabled={undoStack.length === 0} onClick={handleUndo}>
                        撤销
                      </button>
                      <button type="button" className="mini-button" disabled={redoStack.length === 0} onClick={handleRedo}>
                        重做
                      </button>
                      <button
                        type="button"
                        className="mini-button"
                        disabled={!hasPatternEdits}
                        onClick={handleRestoreGeneratedPattern}
                      >
                        恢复自动结果
                      </button>
                      <span className="history-count">{undoStack.length} 次修改</span>
                    </>
                  ) : (
                    <span className="edit-hint">切换到修图后，可直接在格子上涂改。</span>
                  )}
                </div>
              ) : null}

              <div className="preview-toolbar segmented-toolbar">
                <label className="checkbox-row compact">
                  <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
                  <span>1×1 网格</span>
                </label>
                <label className="checkbox-row compact">
                  <input
                    type="checkbox"
                    checked={showFiveByFiveGrid}
                    onChange={(event) => setShowFiveByFiveGrid(event.target.checked)}
                  />
                  <span>5×5 小格</span>
                </label>
                <label className="checkbox-row compact">
                  <input
                    type="checkbox"
                    checked={showBoardBoundaries}
                    onChange={(event) => setShowBoardBoundaries(event.target.checked)}
                  />
                  <span>底板分界</span>
                </label>
                <label className="checkbox-row compact">
                  <input type="checkbox" checked={showCodes} onChange={(event) => setShowCodes(event.target.checked)} />
                  <span>显示色号</span>
                </label>
                <label className="checkbox-row compact">
                  <input
                    type="checkbox"
                    checked={showCoordinates}
                    onChange={(event) => setShowCoordinates(event.target.checked)}
                  />
                  <span>显示坐标</span>
                </label>
              </div>

              <div className="preview-frame preview-frame-large">
                {previewMode === "source" ? (
                  <SourcePreviewCanvas sourceImage={sourceImage} settings={settings} />
                ) : (
                  <PatternPreviewCanvas
                    pattern={pattern}
                    showGrid={showGrid}
                    showCodes={showCodes}
                    showFiveByFiveGrid={showFiveByFiveGrid}
                    showBoardBoundaries={showBoardBoundaries}
                    showCoordinates={showCoordinates}
                    highlightedColorId={highlightedColorId}
                    editMode={editMode}
                    onColorPick={setHighlightedColorId}
                    onHoverChange={setHoveredCell}
                    onEditStrokeStart={handleEditStrokeStart}
                    onEditStrokeMove={applyActiveStrokeCell}
                    onEditStrokeEnd={handleEditStrokeEnd}
                  />
                )}
              </div>

              <div className="preview-meta">
                <div className="preview-chip">
                  <strong>悬停坐标</strong>
                  <span>{hoveredCell ? `${hoveredCell.x + 1}, ${hoveredCell.y + 1}` : "移动到图纸上查看"}</span>
                </div>
                <div className="preview-chip">
                  <strong>悬停色号</strong>
                  <span>{hoveredCell?.code ?? "-"}</span>
                </div>
                <div className="preview-chip">
                  <strong>颜色名称</strong>
                  <span>{hoveredCell?.nameZh ?? "-"}</span>
                </div>
                <div className="preview-chip preview-chip-wide">
                  <strong>当前高亮</strong>
                  <span>
                    {selectedUsage
                      ? `${selectedUsage.color.code}${selectedUsage.color.nameZh ? ` · ${selectedUsage.color.nameZh}` : ""} · ${selectedUsage.count} 颗`
                      : "点击图纸或右侧颜色行，即可高亮同色区域。"}
                  </span>
                </div>
              </div>
            </Panel>
          </div>

          <div className="right-rail">
            <Panel title="结果与导出" eyebrow="输出" className="stats-panel">
              {pattern ? (
                <>
                  <div className="metric-grid compact-metrics">
                    <div className="metric">
                      <strong>{pattern.statistics.filledCells}</strong>
                      <span>非空格数</span>
                    </div>
                    <div className="metric">
                      <strong>{pattern.statistics.emptyCells}</strong>
                      <span>空珠数量</span>
                    </div>
                    <div className="metric">
                      <strong>{pattern.statistics.actualColorCount}</strong>
                      <span>实际颜色</span>
                    </div>
                    <div className="metric">
                      <strong>
                        {boardColumns} × {boardRows}
                      </strong>
                      <span>底板布局</span>
                    </div>
                  </div>

                  <div className="export-actions">
                    <button
                      type="button"
                      className="action-button"
                      onClick={() => void runExport(() => exportFullPatternPng(pattern), "完整底稿导出失败。")}
                      disabled={isExporting}
                    >
                      {isExporting ? "导出中..." : "导出完整底稿 PNG"}
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => void runExport(() => exportSeparatedSheetsZip(pattern), "分色图导出失败。")}
                      disabled={isExporting}
                    >
                      导出分色图 ZIP
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => void runExport(() => exportPrintPdf(pattern), "打印版 PDF 导出失败。")}
                      disabled={isExporting}
                    >
                      导出打印版 PDF
                    </button>
                    <div className="field">
                      <span>采购预留比例</span>
                      <select
                        value={String(purchaseReserveRatio)}
                        onChange={(event) => setPurchaseReserveRatio(Number(event.target.value))}
                      >
                        <option value="0">0%</option>
                        <option value="0.05">5%</option>
                        <option value="0.1">10%</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() =>
                        void runExport(
                          () => exportPurchaseListPng(pattern, purchaseReserveRatio),
                          "采购清单 PNG 导出失败。",
                        )
                      }
                      disabled={isExporting}
                    >
                      导出采购清单 PNG
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() =>
                        void runExport(
                          () => exportPurchaseListCsv(pattern, purchaseReserveRatio),
                          "采购清单 CSV 导出失败。",
                        )
                      }
                      disabled={isExporting}
                    >
                      导出采购清单 CSV
                    </button>
                    <button
                      type="button"
                      className="action-button secondary"
                      onClick={() => void runExport(() => exportBoardSplitZip(pattern), "底板拆分图导出失败。")}
                      disabled={isExporting}
                    >
                      导出底板拆分 ZIP
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty">导入图片并生成后，这里会显示统计信息和导出入口。</div>
              )}
            </Panel>

            <Panel title="颜色清单" eyebrow="用量" className="table-panel">
              {pattern ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>色块</th>
                        <th>色号</th>
                        <th>名称</th>
                        <th>数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pattern.statistics.usages.map((usage) => (
                        <tr
                          key={usage.color.id}
                          className={[
                            highlightedColorId === usage.color.id ? "row-highlight" : "",
                            editMode && !eraseMode && selectedBrushColor?.id === usage.color.id ? "row-brush" : "",
                          ].filter(Boolean).join(" ")}
                          onClick={() => {
                            if (editMode) {
                              setBrushColorId(usage.color.id);
                              setEraseMode(false);
                            }
                          }}
                          onMouseEnter={() => {
                            if (!editMode) {
                              setHighlightedColorId(usage.color.id);
                            }
                          }}
                          onMouseLeave={() => {
                            if (!editMode) {
                              setHighlightedColorId(null);
                            }
                          }}
                        >
                          <td>
                            <span
                              className="swatch"
                              style={{ backgroundColor: rgbToHex(usage.color.rgb) }}
                              title={usage.color.code}
                            />
                          </td>
                          <td>{usage.color.code}</td>
                          <td>{usage.color.nameZh ?? "-"}</td>
                          <td>{usage.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">生成图纸后，这里会按用量从多到少列出颜色。</div>
              )}
            </Panel>

            <Panel title="色板映射概况" eyebrow="映射" className="secondary-panel">
              <div className="metric-strip">
                <div className="metric-inline">
                  <strong>{currentPalette.length}</strong>
                  <span>{currentBrandName} 颜色数</span>
                </div>
                <div className="metric-inline">
                  <strong>{rgbSeedCount ?? "--"}</strong>
                  <span>系统映射色数</span>
                </div>
              </div>
              <div className="table-wrap">
                {coverage.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>品牌</th>
                        <th>已映射</th>
                        <th>缺失</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coverage.map((item) => (
                        <tr key={item.brandId}>
                          <td>{item.nameZh}</td>
                          <td>{item.mappedRows}</td>
                          <td>{item.missingRows}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty">正在读取色板数据。</div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}
