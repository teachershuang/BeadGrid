# BeadGrid

BeadGrid 是一个面向 Windows 的拼豆图纸生成工具，用来把普通图片转换成更适合照图拼豆的底稿、分色图和采购清单。

项目目标不是提供一个“像素画编辑器”，而是提供一条更适合实际拼豆流程的转换链路：导入图片、调整构图、限制颜色、映射品牌色号、生成图纸、导出可直接使用的结果文件。

## 功能特性

- 导入 `PNG / JPG / JPEG / WebP`
- 调整作品尺寸、底板尺寸、裁切方式、缩放、偏移、旋转、水平翻转
- 支持透明像素处理，可选择空珠或合成背景色
- 基于区域采样生成目标颜色，而不是简单按像素缩图
- 使用 `Lab + CIEDE2000` 做品牌色号匹配
- 支持限色与杂色清理
- 预览拼豆图纸，支持：
  - `1×1` 网格
  - `5×5` 小格
  - 底板分界
  - 坐标显示
  - 色号显示
  - 悬停读数与颜色高亮
- 导出结果文件：
  - 完整底稿 `PNG`
  - 分色图 `ZIP`
  - 采购清单 `PNG / CSV`
  - 底板拆分图 `ZIP`
- 生成链路已迁移到 `Web Worker`，支持阶段进度和任务取消
- 已接入 `Tauri 2`，可构建 Windows 桌面版

## 界面与使用方向

BeadGrid 当前采用三栏式桌面工作台布局：

- 左侧用于导入图片和设置生成参数
- 中间用于查看原图预览和图纸预览
- 右侧用于查看统计结果、颜色清单和导出文件

整体设计优先服务真实拼豆流程，而不是展示算法参数。

## 本地开发

```bash
npm install
npm run dev
```

启动后访问：

```text
http://127.0.0.1:4173
```

## 质量检查

```bash
npm run lint
npm run test
npm run build
```

## 桌面版运行与构建

开发模式：

```bash
npm run tauri:dev
```

生产构建：

```bash
npm run tauri:build
```

构建成功后可直接运行的 Windows 可执行文件默认位于：

```text
src-tauri/target/release/beadgrid.exe
```

## 环境要求

前端开发：

- Node.js 20+
- npm

Windows 桌面构建：

- Rust 工具链
- Visual Studio Build Tools 2022
- `MSVC v143 - VS 2022 C++ x64/x86 build tools`
- Windows 10/11 SDK

## 项目结构

```text
src/                  前端页面、组件、核心逻辑
src/assets/           样图与色板映射资源
src-tauri/            Tauri 桌面壳与 Rust 入口
.github/workflows/    GitHub Actions 工作流
```

## 关键资源

- [brand-code-map.csv](/E:/coding/BeadGrid/src/assets/palettes/brand-code-map.csv:1)
- [color-system-mapping.json](/E:/coding/BeadGrid/src/assets/palettes/color-system-mapping.json:1)
- [demo-cat-garden.png](/E:/coding/BeadGrid/src/assets/demo-cat-garden.png:1)

## 开源说明

这个仓库当前以“可持续完善的实用工具”为目标推进，优先完成实际拼豆用户真正需要的导图、预览和导出能力。

如果你在使用中发现图纸版式、颜色映射、导出格式或桌面端体验上的问题，欢迎继续提交 issue 或直接参与改进。
