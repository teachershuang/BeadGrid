import type { PaletteBrand } from "@/types/palette";

export const paletteBrands: PaletteBrand[] = [
  {
    id: "mard",
    nameZh: "MARD",
    description: "色号映射表中的主参考品牌列。",
  },
  {
    id: "coco",
    nameZh: "COCO",
    description: "映射表中的 COCO 对应列。",
  },
  {
    id: "manman",
    nameZh: "漫漫",
    description: "映射表中的漫漫品牌列。",
  },
  {
    id: "panpan",
    nameZh: "盼盼",
    description: "映射表中的盼盼品牌列。",
  },
  {
    id: "mixiaowo",
    nameZh: "咪小窝",
    description: "映射表中的咪小窝品牌列。",
  },
];

export const expectedBrandHeader = paletteBrands.map((brand) => brand.nameZh);

