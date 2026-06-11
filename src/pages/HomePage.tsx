import { startTransition, useEffect, useRef, useState } from "react";
import { Panel } from "@/components/Panel";
import { PatternPreviewCanvas } from "@/components/PatternPreviewCanvas";
import { SourcePreviewCanvas } from "@/components/SourcePreviewCanvas";
import demoSampleImageUrl from "@/assets/mvp-sample.png";
import {
  exportBoardSplitZip,
  exportFullPatternPng,
  exportPurchaseListCsv,
  exportPurchaseListPng,
  exportSeparatedSheetsZip,
} from "@/core/export/exportPattern";
import { parseHexColor, rgbToHex } from "@/core/color/utils";
import {
  disposeLoadedSourceImage,
  loadSourceImageFromFile,
  loadSourceImageFromUrl,
  type LoadedSourceImage,
} from "@/core/image/loadSourceImage";
import { loadBrandCodeMap, summarizeBrandCoverage } from "@/core/palette/brandCodeMap";
import { loadColorSystemMapping } from "@/core/palette/colorSystemMapping";
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

export function HomePage() {
  const activeTaskRef = useRef<PatternGenerationTask | null>(null);
  const [map, setMap] = useState<BrandCodeMap | null>(null);
  const [coverage, setCoverage] = useState<BrandCoverageSummary[]>([]);
  const [paletteLibrary, setPaletteLibrary] = useState<Map<string, PaletteColor[]> | null>(null);
  const [rgbSeedCount, setRgbSeedCount] = useState<number | null>(null);
  const [settings, setSettings] = useState<PatternSettings>(defaultSettings);
  const [sourceImage, setSourceImage] = useState<LoadedSourceImage | null>(null);
  const [pattern, setPattern] = useState<GeneratedPattern | null>(null);
  const [previewMode, setPreviewMode] = useState<"source" | "pattern">("source");
  const [showGrid, setShowGrid] = useState(true);
  const [showCodes, setShowCodes] = useState(false);
  const [highlightedColorId, setHighlightedColorId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<PatternGenerationProgress | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [purchaseReserveRatio, setPurchaseReserveRatio] = useState(0.05);
  const [error, setError] = useState<string | null>(null);

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

        const totalSeeds = Array.from(colorSystemMapping.values()).reduce(
          (sum, paletteColors) => sum + paletteColors.length,
          0,
        );
        setRgbSeedCount(totalSeeds);
      })
      .catch((loadError: unknown) => {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unknown palette loading error");
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
  const generationPercent = generationProgress ? Math.round(generationProgress.progress * 100) : 0;
  const generationStageLabel = generationProgress ? generationStageLabels[generationProgress.stage] : null;

  function cancelActiveGeneration() {
    activeTaskRef.current?.cancel();
    activeTaskRef.current = null;
    setIsGenerating(false);
    setGenerationProgress(null);
  }

  async function replaceSourceImage(nextImage: LoadedSourceImage) {
    cancelActiveGeneration();
    disposeLoadedSourceImage(sourceImage);
    setSourceImage(nextImage);
    setPattern(null);
    setPreviewMode("source");
    setHighlightedColorId(null);
  }

  async function handleFileSelected(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    try {
      const nextImage = await loadSourceImageFromFile(file);
      await replaceSourceImage(nextImage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "图片导入失败。");
    }
  }

  async function handleLoadSampleImage() {
    setError(null);
    try {
      const nextImage = await loadSourceImageFromUrl(demoSampleImageUrl, "mvp-sample.png");
      await replaceSourceImage(nextImage);
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
    setGenerationProgress({
      stage: "sampling",
      progress: 0,
    });

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
        setPattern(nextPattern);
        setPreviewMode("pattern");
        setHighlightedColorId(null);
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
    cancelActiveGeneration();
    setSettings((current) => ({
      ...current,
      ...patch,
    }));
    setPattern(null);
    setHighlightedColorId(null);
  }

  async function handleExportFullPattern() {
    if (!pattern) {
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      await exportFullPatternPng(pattern);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "完整底稿导出失败。");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportSeparatedSheets() {
    if (!pattern) {
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      await exportSeparatedSheetsZip(pattern);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "分色图导出失败。");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleExportPurchaseListPng() {
    if (!pattern) {
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      await exportPurchaseListPng(pattern, purchaseReserveRatio);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "采购清单 PNG 导出失败。");
    } finally {
      setIsExporting(false);
    }
  }

  function handleExportPurchaseListCsv() {
    if (!pattern) {
      return;
    }

    setError(null);
    try {
      exportPurchaseListCsv(pattern, purchaseReserveRatio);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "采购清单 CSV 导出失败。");
    }
  }

  async function handleExportBoardSplitZip() {
    if (!pattern) {
      return;
    }

    setIsExporting(true);
    setError(null);
    try {
      await exportBoardSplitZip(pattern);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "底板拆分图导出失败。");
    } finally {
      setIsExporting(false);
    }
  }

  function handleCancelGeneration() {
    cancelActiveGeneration();
  }

  const backgroundHex = rgbToHex(settings.backgroundRgb);

  return (
    <main className="shell">
      <div className="layout">
        <div className="stack">
          <section className="panel hero">
            <span className="eyebrow">BeadGrid / MVP 原型</span>
            <h1>现在已经可以导入图片、采样并生成第一版拼豆图纸。</h1>
            <p className="lede">
              当前版本已经连通了图片导入、裁剪参数、透明像素处理、主导色采样、品牌映射、限色、区域清理、
              预览和颜色统计。桌面 EXE、导出链路和 Worker 迁移还会继续补。
            </p>
            <div className="pill-row">
              <div className="pill">
                <strong>{map?.rows.length ?? "--"}</strong>
                <span>已接入的映射行数</span>
              </div>
              <div className="pill">
                <strong>5</strong>
                <span>当前识别到的品牌列</span>
              </div>
              <div className="pill">
                <strong>{rgbSeedCount ?? "--"}</strong>
                <span>已识别的 RGB 种子色条目</span>
              </div>
            </div>
          </section>

          <Panel title="生成参数" eyebrow="左侧">
            <div className="form-grid">
              <label className="field">
                <span>导入图片</span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                  onChange={(event) => void handleFileSelected(event.target.files?.[0] ?? null)}
                />
              </label>
              <button type="button" className="action-button secondary" onClick={() => void handleLoadSampleImage()}>
                加载测试样图
              </button>
              <div className="two-up">
                <label className="field">
                  <span>作品宽度</span>
                  <input
                    type="number"
                    min={8}
                    max={300}
                    value={settings.artworkWidth}
                    onChange={(event) => updateSettings({ artworkWidth: Number(event.target.value) || 8 })}
                  />
                </label>
                <label className="field">
                  <span>作品高度</span>
                  <input
                    type="number"
                    min={8}
                    max={300}
                    value={settings.artworkHeight}
                    onChange={(event) => updateSettings({ artworkHeight: Number(event.target.value) || 8 })}
                  />
                </label>
              </div>
              <div className="two-up">
                <label className="field">
                  <span>底板宽度</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={settings.boardWidth}
                    onChange={(event) => updateSettings({ boardWidth: Number(event.target.value) || 1 })}
                  />
                </label>
                <label className="field">
                  <span>底板高度</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={settings.boardHeight}
                    onChange={(event) => updateSettings({ boardHeight: Number(event.target.value) || 1 })}
                  />
                </label>
              </div>
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
                  <span>裁剪方式</span>
                  <select
                    value={settings.fitMode}
                    onChange={(event) => updateSettings({ fitMode: event.target.value as PatternSettings["fitMode"] })}
                  >
                    <option value="cover">填满裁剪</option>
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
              <div className="two-up">
                <label className="field">
                  <span>透明处理</span>
                  <select
                    value={settings.transparencyMode}
                    onChange={(event) =>
                      updateSettings({
                        transparencyMode: event.target.value as PatternSettings["transparencyMode"],
                      })
                    }
                  >
                    <option value="empty">透明区域作空豆</option>
                    <option value="blend">合成到背景色</option>
                  </select>
                </label>
                <label className="field">
                  <span>背景色</span>
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
              <div className="two-up">
                <label className="field">
                  <span>最大颜色数</span>
                  <input
                    type="number"
                    min={0}
                    max={64}
                    value={settings.maxColors}
                    onChange={(event) => updateSettings({ maxColors: Number(event.target.value) || 0 })}
                  />
                </label>
                <label className="field">
                  <span>杂色清理</span>
                  <select
                    value={settings.cleanupLevel}
                    onChange={(event) =>
                      updateSettings({ cleanupLevel: event.target.value as CleanupLevel })
                    }
                  >
                    <option value="off">关闭</option>
                    <option value="light">轻度</option>
                    <option value="medium">中度</option>
                    <option value="strong">强力</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span>单格采样密度 {settings.sampleGridSize}×{settings.sampleGridSize}</span>
                <input
                  type="range"
                  min={3}
                  max={7}
                  step={1}
                  value={settings.sampleGridSize}
                  onChange={(event) => updateSettings({ sampleGridSize: Number(event.target.value) })}
                />
              </label>
              <button
                type="button"
                className="action-button"
                onClick={() => void handleGenerate()}
                disabled={!sourceImage || currentPalette.length === 0 || isGenerating}
              >
                {isGenerating && generationStageLabel
                  ? `生成中 ${generationStageLabel} ${generationPercent}%`
                  : "生成拼豆图纸"}
              </button>
              {isGenerating ? (
                <button type="button" className="action-button secondary" onClick={handleCancelGeneration}>
                  取消生成
                </button>
              ) : null}
            </div>
          </Panel>

          <Panel title="当前输入状态" eyebrow="资源">
            <div className="metric-grid">
              <div className="metric">
                <strong>{sourceImage ? `${sourceImage.width} × ${sourceImage.height}` : "--"}</strong>
                <span>原图像素</span>
              </div>
              <div className="metric">
                <strong>{currentPalette.length || "--"}</strong>
                <span>当前品牌可用颜色</span>
              </div>
              <div className="metric">
                <strong>{sourceImage?.name ?? "--"}</strong>
                <span>当前图片</span>
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
            {error ? <div className="error-box" style={{ marginTop: "14px" }}>{error}</div> : null}
          </Panel>
        </div>

        <div className="stack">
          <Panel
            title="预览"
            eyebrow="中间"
            aside={
              <div className="inline-actions">
                <button
                  type="button"
                  className={`mini-button ${previewMode === "source" ? "is-active" : ""}`}
                  onClick={() => setPreviewMode("source")}
                >
                  原图
                </button>
                <button
                  type="button"
                  className={`mini-button ${previewMode === "pattern" ? "is-active" : ""}`}
                  onClick={() => setPreviewMode("pattern")}
                >
                  图纸
                </button>
              </div>
            }
          >
            <div className="preview-toolbar">
              <label className="checkbox-row compact">
                <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
                <span>显示网格</span>
              </label>
              <label className="checkbox-row compact">
                <input type="checkbox" checked={showCodes} onChange={(event) => setShowCodes(event.target.checked)} />
                <span>显示色号</span>
              </label>
            </div>
            <div className="preview-frame">
              {previewMode === "source" ? (
                <SourcePreviewCanvas sourceImage={sourceImage} settings={settings} />
              ) : (
                <PatternPreviewCanvas
                  pattern={pattern}
                  showGrid={showGrid}
                  showCodes={showCodes}
                  highlightedColorId={highlightedColorId}
                  onColorPick={setHighlightedColorId}
                />
              )}
            </div>
          </Panel>

          <Panel title="色板资源概况" eyebrow="右上">
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

          <Panel title="统计与颜色用量" eyebrow="右侧">
            {pattern ? (
              <>
                <div className="export-actions">
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => void handleExportFullPattern()}
                    disabled={isExporting}
                  >
                    {isExporting ? "导出中..." : "导出完整底稿 PNG"}
                  </button>
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={() => void handleExportSeparatedSheets()}
                    disabled={isExporting}
                  >
                    导出分色图 ZIP
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
                    onClick={() => void handleExportPurchaseListPng()}
                    disabled={isExporting}
                  >
                    导出采购清单 PNG
                  </button>
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={handleExportPurchaseListCsv}
                    disabled={isExporting}
                  >
                    导出采购清单 CSV
                  </button>
                  <button
                    type="button"
                    className="action-button secondary"
                    onClick={() => void handleExportBoardSplitZip()}
                    disabled={isExporting}
                  >
                    导出底板拆分图 ZIP
                  </button>
                </div>
                <div className="metric-grid">
                  <div className="metric">
                    <strong>{pattern.statistics.filledCells}</strong>
                    <span>非空格数</span>
                  </div>
                  <div className="metric">
                    <strong>{pattern.statistics.emptyCells}</strong>
                    <span>空豆数</span>
                  </div>
                  <div className="metric">
                    <strong>{pattern.statistics.actualColorCount}</strong>
                    <span>实际颜色数</span>
                  </div>
                </div>
                <div className="table-wrap" style={{ marginTop: "14px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>色块</th>
                        <th>色号</th>
                        <th>数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pattern.statistics.usages.map((usage) => (
                        <tr
                          key={usage.color.id}
                          className={highlightedColorId === usage.color.id ? "row-highlight" : ""}
                          onMouseEnter={() => setHighlightedColorId(usage.color.id)}
                          onMouseLeave={() => setHighlightedColorId(null)}
                        >
                          <td>
                            <span
                              className="swatch"
                              style={{ backgroundColor: rgbToHex(usage.color.rgb) }}
                              title={usage.color.code}
                            />
                          </td>
                          <td>{usage.color.code}</td>
                          <td>{usage.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="empty">导入图片并点击“生成拼豆图纸”后，这里会显示颜色统计。</div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  );
}
