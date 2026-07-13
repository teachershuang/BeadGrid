# BeadGrid 封版功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成手工修图、`.beadgrid` 工程保存/恢复、A4 PDF 打印版导出，并把 README 收口为低频维护的稳定项目说明。

**Architecture:** 把图纸编辑、工程文档和 PDF 页面计划放在独立纯函数模块，页面只负责状态编排，Canvas 组件只负责绘制和指针坐标解析。所有导出读取同一个当前图纸，工程文件同时保存自动生成基线与当前修图结果。

**Tech Stack:** React 19、TypeScript 6、Vitest、Canvas 2D、jsPDF、Tauri 2

## Global Constraints

- 工程文件版本固定为 `1`，扩展名为 `.beadgrid`。
- 撤销历史最多保留 100 条，一次拖动是一条历史记录。
- PDF 使用 A4 纵向、一块底板一页，中文内容先画到 Canvas 再嵌入 PDF。
- 所有界面、错误提示、README 和提交信息使用中文。
- 不上传 `项目mvp.md`。
- 直接提交并推送到 `main`。

---

### Task 1: 图纸编辑核心

**Files:**
- Create: `src/core/pattern/patternEditor.ts`
- Create: `tests/unit/pattern/patternEditor.test.ts`

**Interfaces:**
- Produces: `applyPatternCellChanges(pattern, changes): GeneratedPattern`
- Produces: `createPatternEditCommand(pattern, updates): PatternEditCommand | null`
- Produces: `applyPatternEditCommand(pattern, command, direction): GeneratedPattern`

- [ ] **Step 1: 写失败测试**

覆盖涂色、擦除、批量修改只重算一次统计、重复颜色返回 `null`、撤销恢复原颜色以及用量按数量降序。

```ts
const command = createPatternEditCommand(pattern, [
  { index: 0, mappedColor: blue },
  { index: 1, mappedColor: null },
]);
expect(command?.changes).toHaveLength(2);
expect(applyPatternEditCommand(pattern, command!, "forward").statistics.filledCells).toBe(1);
expect(applyPatternEditCommand(edited, command!, "backward").cells).toEqual(pattern.cells);
```

- [ ] **Step 2: 验证测试因模块不存在而失败**

Run: `npm run test -- tests/unit/pattern/patternEditor.test.ts`
Expected: FAIL，无法解析 `patternEditor`。

- [ ] **Step 3: 实现最小纯函数**

命令只保存变化格子的索引、修改前颜色和修改后颜色；应用时克隆 `cells` 和被修改的格子，最后调用 `calculatePatternStatistics`。

```ts
export interface PatternCellChange {
  index: number;
  before: PaletteColor | null;
  after: PaletteColor | null;
}

export interface PatternEditCommand {
  changes: PatternCellChange[];
}
```

- [ ] **Step 4: 运行单测并提交**

Run: `npm run test -- tests/unit/pattern/patternEditor.test.ts`
Expected: PASS。

Commit: `feat: 增加图纸手工编辑核心`

### Task 2: 工程文件格式与原图编码

**Files:**
- Create: `src/core/project/projectFile.ts`
- Create: `src/core/project/sourceImageCodec.ts`
- Create: `tests/unit/project/projectFile.test.ts`

**Interfaces:**
- Produces: `BeadGridProjectDocumentV1`
- Produces: `serializeProjectDocument(input): string`
- Produces: `parseProjectDocument(raw): BeadGridProjectDocumentV1`
- Produces: `encodeSourceImageAsPngDataUrl(image): string`
- Produces: `decodeProjectSourceImage(source): Promise<LoadedSourceImage>`

- [ ] **Step 1: 写失败测试**

构造最小工程，验证 JSON 往返、无图纸工程、格式版本不是 `1`、图纸格子数量错误、无效 JSON 均有确定结果。

```ts
const restored = parseProjectDocument(serializeProjectDocument(project));
expect(restored.version).toBe(1);
expect(restored.currentPattern?.cells[0]?.mappedColor?.code).toBe("A1");
expect(() => parseProjectDocument('{"version":2}')).toThrow("不支持的工程文件版本");
```

- [ ] **Step 2: 验证测试失败**

Run: `npm run test -- tests/unit/project/projectFile.test.ts`
Expected: FAIL，无法解析 `projectFile`。

- [ ] **Step 3: 实现工程格式和严格校验**

文档字段固定为：

```ts
interface BeadGridProjectDocumentV1 {
  kind: "beadgrid-project";
  version: 1;
  savedAt: string;
  source: { name: string; pngDataUrl: string };
  settings: PatternSettings;
  basePattern: GeneratedPattern | null;
  currentPattern: GeneratedPattern | null;
}
```

先完整校验顶层、设置尺寸、图纸宽高和 `cells.length === width * height`，成功后才返回；Data URL 必须以 `data:image/png;base64,` 开头。

- [ ] **Step 4: 实现 DOM 图像编码适配器**

把 `LoadedSourceImage.data` 放入临时 Canvas 并调用 `toDataURL("image/png")`；恢复时 `fetch(dataUrl)` 后复用 `loadSourceImageFromBlob`。

- [ ] **Step 5: 运行测试并提交**

Run: `npm run test -- tests/unit/project/projectFile.test.ts`
Expected: PASS。

Commit: `feat: 支持工程文件保存与恢复`

### Task 3: PDF 页面计划与导出器

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/core/export/printPlan.ts`
- Create: `src/core/export/exportPdf.ts`
- Create: `tests/unit/export/printPlan.test.ts`
- Modify: `src/core/export/chartRenderer.ts`

**Interfaces:**
- Consumes: `buildBoardSplitPlan(pattern)`、`renderBoardSplitChart(...)`、`saveBlobFile(...)`
- Produces: `buildPrintPlan(pattern): PrintPagePlan[]`
- Produces: `exportPrintPdf(pattern): Promise<void>`

- [ ] **Step 1: 写失败测试**

对 `65×60` 图纸和 `29×29` 底板验证 9 页、行优先顺序、末页 `7×2`，标题包含 `R03 C03`。

```ts
const pages = buildPrintPlan(pattern);
expect(pages).toHaveLength(9);
expect(pages[8]?.viewport).toMatchObject({ startColumn: 58, startRow: 58, width: 7, height: 2 });
expect(pages[8]?.title).toContain("R03 C03");
```

- [ ] **Step 2: 验证测试失败**

Run: `npm run test -- tests/unit/export/printPlan.test.ts`
Expected: FAIL，无法解析 `printPlan`。

- [ ] **Step 3: 实现页面计划并安装 jsPDF**

Run: `npm install jspdf`

页面计划直接映射现有底板拆分计划，副标题包含全图尺寸、当前底板实际尺寸和品牌。

- [ ] **Step 4: 实现 PDF 导出**

为每页调用 `renderBoardSplitChart`，将 Canvas PNG 按 12 mm 页边距等比缩放到 A4 可用区域，调用 `doc.output("blob")` 后通过 `saveBlobFile` 保存为 `.pdf`。

- [ ] **Step 5: 运行测试并提交**

Run: `npm run test -- tests/unit/export/printPlan.test.ts`
Expected: PASS。

Commit: `feat: 增加底板分页 PDF 导出`

### Task 4: 修图交互与页面编排

**Files:**
- Modify: `src/components/PatternPreviewCanvas.tsx`
- Modify: `src/pages/HomePage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: Tasks 1-3 的编辑、工程和 PDF 接口。
- Produces: 查看/修图模式、连续笔画、撤销重做、工程打开保存和 PDF 按钮。

- [ ] **Step 1: 扩展 Canvas 指针接口**

新增 `editMode`、`onEditStrokeStart(index)`、`onEditStrokeMove(index)`、`onEditStrokeEnd()`；查看模式仍触发 `onColorPick`，修图模式使用 Pointer Events 和 pointer capture。

- [ ] **Step 2: 编排修图状态**

页面维护 `basePattern`、`brushColorId`、`isEraseMode`、`undoStack`、`redoStack` 和活动笔画引用。活动笔画去重索引，抬起时合并为一条命令；撤销栈截取最后 100 条。

- [ ] **Step 3: 接入工程打开与保存**

左侧项目区增加打开 `.beadgrid` 和保存工程按钮。打开成功后一次性替换原图、设置、基线和当前图纸；保存文件名使用原图名去扩展名后加 `.beadgrid`。

- [ ] **Step 4: 接入 PDF 与修图工具栏**

预览区加入查看/修图切换、完整色板选择、橡皮擦、撤销、重做、恢复自动结果；右侧导出区加入打印版 PDF。

- [ ] **Step 5: 完成无障碍和视觉状态**

编辑画布显示十字光标；按钮有禁用态、`aria-pressed` 和中文提示；工具栏在窄窗口换行，不改变既有米白和青绿色视觉语言。

- [ ] **Step 6: 运行静态检查并提交**

Run: `npm run lint && npm run build`
Expected: 两条命令 exit 0。

Commit: `feat: 完成修图与工程工作流`

### Task 5: 终版 README 与发布配置清理

**Files:**
- Modify: `README.md`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src/constants/projectPlan.ts` or remove it if unused

**Interfaces:**
- Produces: 与实际功能一致、无阶段性描述的中文项目首页。

- [ ] **Step 1: 重写 README**

首屏提供用途、Release 下载链接和五步使用流程；列出完整功能、`.beadgrid`、PDF、开发构建和数据隐私；维护状态明确“短期低频维护，请提 Issue”。删除本机绝对路径和 MVP 措辞。

- [ ] **Step 2: 修正桌面元数据乱码**

把 Tauri `shortDescription`、`longDescription` 改为合法 UTF-8 中文，并确保 JSON 可解析。

- [ ] **Step 3: 清理阶段性常量**

用 `rg` 确认 `projectPlan.ts` 是否无引用；无引用则删除，避免终版仓库保留阶段计划。

- [ ] **Step 4: 运行检查并提交**

Run: `npm run lint && npm run test && npm run build`
Expected: 全部 exit 0，Vitest 0 failures。

Commit: `docs: 完善终版项目说明`

### Task 6: 完整验证与发布

**Files:**
- Modify only if verification exposes a regression.

**Interfaces:**
- Produces: 浏览器与 Windows 桌面构建证据、远端 `main` 同步提交。

- [ ] **Step 1: 浏览器端完整流程**

运行 `npm run dev`，加载测试图并生成；涂改至少两个格子；验证撤销、重做和统计变化；保存工程后重新打开；导出 PDF 并确认文件头为 `%PDF`、页数与底板数一致。

- [ ] **Step 2: 全量自动验证**

Run: `npm run lint`
Run: `npm run test`
Run: `npm run build`
Expected: 全部 exit 0。

- [ ] **Step 3: Windows 桌面构建**

Run: `npm run tauri:build`
Expected: 生成 `src-tauri/target/release/beadgrid.exe` 和 NSIS 产物。

- [ ] **Step 4: 检查提交和远端同步**

Run: `git status --short --branch`
Run: `git log -6 --oneline`
Run: `git push origin main`
Expected: 工作树干净，推送成功，远端 `main` 与本地 HEAD 相同。
