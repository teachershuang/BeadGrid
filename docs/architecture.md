# BeadGrid 架构说明

## 核心链路

1. 浏览器解码原图并保留 RGBA 像素数据。
2. 根据裁切、缩放、旋转、翻转和透明策略，把每个拼豆格映射到原图区域。
3. 提取区域主导色，转换到 Lab 色彩空间并使用 CIEDE2000 匹配品牌色板。
4. 应用限色和连通区域杂色清理，在 Web Worker 中生成图纸与统计结果。
5. 当前图纸可继续手工修改；统计、采购清单和全部导出始终读取同一份结果。
6. `.beadgrid` 保存原图、参数、自动生成基线和当前图纸，PDF 使用 Canvas 页面避免中文字体缺失。

## 目录职责

```text
src/components/       Canvas 与通用界面组件
src/pages/            页面状态和用户流程编排
src/core/color/       RGB、XYZ、Lab 和 CIEDE2000
src/core/image/       原图解码、构图映射和区域采样
src/core/palette/     色板读取、校验和最近色匹配
src/core/quantization/颜色数量限制
src/core/cleanup/     连通区域杂色清理
src/core/pattern/     图纸生成与不可变编辑命令
src/core/project/     工程文件格式和原图编解码
src/core/statistics/  颜色与颗数统计
src/core/export/      PNG、PDF、CSV 和 ZIP 输出
src/workers/          后台生成任务、进度和取消协议
src/types/            领域类型
tests/unit/           确定性单元测试
```

## 数据边界

`GeneratedPattern` 是预览、统计和导出的唯一图纸来源。手工编辑通过不可变命令替换格子的 `mappedColor`，保留采样目标色，并在每次修改后重算统计。撤销和重做只保存发生变化的格子，不复制完整图纸。

工程文件当前版本为 `1`。载入时先校验格式版本、作品尺寸、格子数量和内嵌 PNG，全部成功后再替换工作区，避免损坏文件覆盖当前内容。
