export const mvpFeatures = [
  "图片导入、裁剪、旋转、翻转与透明像素处理",
  "按拼豆格区域采样并提取确定性的主导色",
  "基于 Lab + CIEDE2000 的品牌色匹配",
  "最大颜色数量限制与杂色清理",
  "Canvas 2D 预览与颜色高亮",
  "颜色统计、采购清单、分色图与底板拆分导出",
];

export const milestonePlan = [
  {
    title: "阶段 1",
    detail: "仓库脚手架、文档、测试基座、色号映射表接入",
  },
  {
    title: "阶段 2",
    detail: "颜色空间转换、色差算法、色板校验与真实 RGB 色板格式",
  },
  {
    title: "阶段 3",
    detail: "图片导入、裁剪状态、透明像素策略与采样准备",
  },
  {
    title: "阶段 4",
    detail: "单格区域采样、主导色提取、品牌映射、颜色数量限制",
  },
  {
    title: "阶段 5",
    detail: "BFS 杂色清理、Worker 管线、预览、统计、导出和 Tauri 壳",
  },
];

export const architectureTracks = [
  {
    label: "领域类型",
    code: "src/types/*",
  },
  {
    label: "颜色数学",
    code: "src/core/color/*",
  },
  {
    label: "色板读取",
    code: "src/core/palette/*",
  },
  {
    label: "界面组织",
    code: "src/pages + src/components",
  },
];
