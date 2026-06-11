# BeadGrid

BeadGrid 是一个面向 Windows 的拼豆底稿生成工具，目标是把普通图片转换成更适合照图拼制的拼豆图纸。

当前仓库已完成的基础工作：

- 建立 React + TypeScript + Vite 项目骨架
- 建立颜色空间转换与 CIEDE2000 基础算法
- 接入色号映射 CSV 与 RGB 映射 JSON 资源
- 补齐基础单元测试、构建与 lint 流程
- 提供一个中文首页，用来展示当前数据接入状态和开发路线

当前还没有完成的关键能力：

- 图片导入、裁剪、缩放、旋转、翻转
- 单格区域采样与主导色提取
- 品牌色板匹配、最大颜色数限制、杂色清理
- Canvas 图纸预览、采购清单、分色图与底板拆分导出
- Tauri 桌面壳、Windows EXE 打包与 GitHub Release

## 本地开发

```bash
npm install
npm run dev
```

## 校验命令

```bash
npm run lint
npm run test
npm run build
```

## 资源文件

当前色板相关资源放在：

- [src/assets/palettes/brand-code-map.csv](/E:/coding/BeadGrid/src/assets/palettes/brand-code-map.csv:1)
- [src/assets/palettes/color-system-mapping.json](/E:/coding/BeadGrid/src/assets/palettes/color-system-mapping.json:1)

说明：

- `brand-code-map.csv` 是跨品牌色号对照表
- `color-system-mapping.json` 包含颜色十六进制值到各品牌色号的映射，可作为后续品牌色板构建的基础数据

## 当前阶段结论

这个仓库现在还处在“算法和桌面应用开发前的基础设施阶段”。  
目标仍然是本地 EXE，但应该在大部分核心功能完成后，再接 Tauri 打包、Release 与源码快速启动说明。
