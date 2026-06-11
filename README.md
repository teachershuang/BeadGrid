# BeadGrid

BeadGrid 是一个面向 Windows 的拼豆底稿生成工具。目标用户不是开发者，而是想把普通图片快速转成更适合照图拼豆的用户。

当前版本已经具备这些能力：

- 导入 `PNG / JPG / JPEG / WebP`
- 调整作品尺寸、底板尺寸、裁剪方式、缩放、偏移、旋转、水平翻转
- 正确处理透明像素，支持空豆或合成背景色
- 基于区域采样生成拼豆目标色，而不是简单缩图取像素
- 用 `Lab + CIEDE2000` 做品牌色号匹配
- 支持限色与杂色清理
- 预览拼豆图纸，显示 `1×1` 网格、`5×5` 小格、底板分界、坐标和色号
- 统计颜色用量并导出：
  - 完整底稿 `PNG`
  - 分色图 `ZIP`
  - 采购清单 `PNG / CSV`
  - 底板拆分图 `ZIP`
- 生成链路已迁移到 `Web Worker`，支持阶段进度与取消任务
- 已接入 `Tauri 2` 桌面壳与 Windows Release workflow

## 本地开发

```bash
npm install
npm run dev
```

打开浏览器访问 `http://127.0.0.1:4173`。

## 本地校验

```bash
npm run lint
npm run test
npm run build
```

## Tauri 桌面端

```bash
npm run tauri:dev
npm run tauri:build
```

说明：

- `tauri:dev` 会启动桌面开发版
- `tauri:build` 当前输出 Windows `NSIS` 安装包
- 导出文件在浏览器环境下会直接下载，在 Tauri 环境下会弹出保存对话框

## GitHub Release

仓库已经配置了 Windows 发布工作流：

- 触发方式：推送 `v*` tag，例如 `v0.1.0`
- 流程内容：
  - 安装依赖
  - 执行 `lint`
  - 执行 `test`
  - 执行前端构建
  - 执行 `tauri build`
  - 生成：
    - `BeadGrid-Setup-x64.exe`
    - `BeadGrid-Portable-x64.zip`
    - `SHA256SUMS.txt`
  - 自动上传到 GitHub Release

## 关键资源

- [brand-code-map.csv](/E:/coding/BeadGrid/src/assets/palettes/brand-code-map.csv:1)
- [color-system-mapping.json](/E:/coding/BeadGrid/src/assets/palettes/color-system-mapping.json:1)
- [demo-cat-garden.png](/E:/coding/BeadGrid/src/assets/demo-cat-garden.png)

## 当前限制

- 当前环境尚未完成本机 Tauri 实际打包验证的话，通常是因为本机缺少 Rust 或 Windows C++ 构建工具
- 当前界面仍偏调试页，后续可以继续压缩用户操作面板
- 分色图在高颜色数、大尺寸作品下导出时间会明显增长，后续还可以继续做性能优化
