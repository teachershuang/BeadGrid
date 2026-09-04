# BeadGrid

BeadGrid 是一款面向 Windows 的离线拼豆图纸工具，可以把普通图片转换为带色号、坐标和底板分界的拼豆底稿。本项目最初是为女朋友做拼豆而开发，现在将完整功能和源代码公开，供有相同需求的人使用。

[直接下载 Windows 便携版 EXE](https://github.com/teachershuang/BeadGrid/releases/latest/download/BeadGrid-x64.exe) · [查看全部发布版本](https://github.com/teachershuang/BeadGrid/releases) · [提交问题或建议](https://github.com/teachershuang/BeadGrid/issues/new/choose)

> 当前版本功能已经稳定，短期内进入低频维护，不设固定更新周期。如果遇到错误、色号问题或有新的功能需求，请提交 [Issue](https://github.com/teachershuang/BeadGrid/issues)。

## 快速使用

1. 下载并运行 `BeadGrid-x64.exe`，无需安装。
2. 拖入 `PNG / JPG / JPEG / WebP` 图片，调整尺寸、构图和品牌色板。
3. 点击生成图纸，检查色号、坐标、`5×5` 小格和底板分界。
4. 切换到修图模式，点击或拖动修正错色，可随时撤销、重做或恢复自动结果。
5. 按 `Ctrl+S` 保存 `.beadgrid` 工程，或导出 PNG、PDF、CSV 和 ZIP 文件开始拼豆。

Windows 首次运行未签名的便携版时，系统可能显示安全提醒，请确认文件来自本仓库的 Release 页面后再运行。

## 主要功能

- 按目标格数生成拼豆图，不是简单缩小成像素图。
- 支持裁切方式、缩放、偏移、旋转、水平翻转和透明像素处理。
- 使用 `Lab + CIEDE2000` 匹配品牌色号，支持限制颜色数量和清理零散杂色。
- 提供完整品牌色板，可查看实际颜色数量和每种颜色的用量。
- 图纸预览支持 `1×1` 网格、`5×5` 分界、底板边界、坐标、色号、悬停读数和同色高亮。
- 支持选择色号后单击或拖动修图、空珠橡皮、100 步撤销与重做。
- `.beadgrid` 工程文件会保存原图、生成参数、自动结果和手工修改，换一台电脑也能继续编辑。
- 工程区会提示未保存状态；换图、打开其他工程、调整会清空图纸的参数或关闭窗口前会保护当前修改。
- 计算任务在 Web Worker 中运行，生成时可查看进度并取消。
- 所有图片和图纸都在本机处理，不上传到服务器。
- 超大原图会在导入时按比例优化到适合制图的分辨率，降低内存占用，不改变构图比例。

## 导出文件

| 文件 | 用途 |
| --- | --- |
| 完整底稿 `PNG` | 查看或分享整张带色号图纸 |
| 打印版 `PDF` | A4 纵向、一块底板一页，直接打印使用 |
| 分色图 `ZIP` | 按用量从多到少排列，每种颜色一张图 |
| 采购清单 `PNG / CSV` | 汇总实际颗数，并可增加 0%、5% 或 10% 预留 |
| 底板拆分图 `ZIP` | 按实际底板尺寸拆分，适合逐板拼制 |
| 工程文件 `.beadgrid` | 保存当前工作，之后继续修图和导出 |

所有图纸导出都会包含色块内色号、坐标、`5×5` 红色辅助线和底板分界。手工修图后的统计、采购清单和导出文件会同步更新。

## 色板数据

品牌色号和颜色映射资源位于：

- [`src/assets/palettes/brand-code-map.csv`](src/assets/palettes/brand-code-map.csv)
- [`src/assets/palettes/color-system-mapping.json`](src/assets/palettes/color-system-mapping.json)

不同批次拼豆可能存在轻微色差。如果发现色号映射错误，请在 Issue 中写明品牌、色号和建议颜色；有实物对比照片时也可以一并提供。

## 本地开发

需要 Node.js 20 或更高版本：

```bash
npm ci
npm run dev
```

浏览器开发地址为 `http://127.0.0.1:4173`。

运行完整检查：

```bash
npm run lint
npm run test
npm run build
```

构建 Windows 桌面版还需要 Rust、Visual Studio Build Tools 2022、MSVC v143 和 Windows 10/11 SDK：

```bash
npm run tauri:dev
npm run tauri:build
```

便携版程序默认生成在 `src-tauri/target/release/beadgrid.exe`。

## 项目结构

```text
src/                  React 页面、Canvas 组件和核心算法
src/assets/palettes/  品牌色号与 RGB 映射资源
src/core/             颜色、采样、图纸编辑、工程文件和导出逻辑
src/workers/          图纸生成 Web Worker
src-tauri/            Tauri Windows 桌面壳
tests/unit/           算法与文件格式单元测试
.github/workflows/    Windows Release 自动构建
```

## 反馈与维护

本仓库短期内以修复明确问题和接受色板纠错为主，不主动扩展大型功能。请先搜索已有 Issue，再提交可复现的问题说明：原图格式、作品尺寸、底板尺寸、品牌、操作步骤和错误截图都能帮助定位。

- [报告错误](https://github.com/teachershuang/BeadGrid/issues/new)
- [提出功能建议](https://github.com/teachershuang/BeadGrid/issues/new)
- [查看源代码](https://github.com/teachershuang/BeadGrid)
