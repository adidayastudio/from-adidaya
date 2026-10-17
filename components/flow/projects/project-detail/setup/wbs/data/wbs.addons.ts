import type { WBSItem } from "./wbs.types";
import { withIds, type WBSItemInput } from "./wbs.withIds";

const RAW_WBS_ADDONS: WBSItemInput[] = [
{
    code: "I",
    nameEn: "Interior",
    nameId: "Interior",
    children: [
      { code: "I.1", nameEn: "Custom Interior", nameId: "Interior Khusus" },
      { code: "I.2", nameEn: "Special Material", nameId: "Material Khusus" },
      { code: "I.3", nameEn: "Special Lighting", nameId: "Pencahayaan Khusus" },
    ],
  },

  {
    code: "L",
    nameEn: "Landscape",
    nameId: "Landscape",
    children: [
      { code: "L.1", nameEn: "Hardscape", nameId: "Pekerasan" },
      { code: "L.2", nameEn: "Softscape & Planting", nameId: "Tanaman" },
      { code: "L.3", nameEn: "Special Features", nameId: "Elemen Khusus" },
    ],
  },
];

export const WBS_ADDONS: WBSItem[] = withIds(RAW_WBS_ADDONS);
