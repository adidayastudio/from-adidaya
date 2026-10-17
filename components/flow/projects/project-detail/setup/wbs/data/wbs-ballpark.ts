import type { WBSItem } from "./wbs.types";
import { withIds, type WBSItemInput } from "./wbs.withIds";

/**
 * RAW BALLPARK TEMPLATE
 * - TANPA id (auto-injected)
 * - TANPA logic
 * - PURE DATA (mudah dirawat & di-extend)
 */
const RAW_WBS_BALLPARK: WBSItemInput[] = [
  {
    code: "S",
    nameEn: "Structure",
    nameId: "Struktur",
    children: [
      { code: "S.1", nameEn: "Preparation", nameId: "Persiapan" },
      { code: "S.2", nameEn: "Earthworks", nameId: "Tanah" },
      { code: "S.3", nameEn: "Foundations", nameId: "Fondasi" },
      { code: "S.4", nameEn: "Main Structure", nameId: "Struktur Utama" },
      { code: "S.5", nameEn: "Roof Structure", nameId: "Struktur Atap" },
    ],
  },

  {
    code: "A",
    nameEn: "Architecture",
    nameId: "Arsitektur",
    children: [
      { code: "A.1", nameEn: "Wall Construction", nameId: "Pasangan Dinding" },
      { code: "A.2", nameEn: "Wall Finishes", nameId: "Penutup Dinding" },
      { code: "A.3", nameEn: "Floor Finishes", nameId: "Penutup Lantai" },
      { code: "A.4", nameEn: "Ceiling", nameId: "Plafond" },
      { code: "A.5", nameEn: "Roof Covering", nameId: "Penutup Atap" },
      { code: "A.6", nameEn: "Painting", nameId: "Pengecatan" },
      { code: "A.7", nameEn: "Door, Window, & Glazing", nameId: "Kaca, Pintu, Jendela" },
      { code: "A.8", nameEn: "Façade", nameId: "Fasad" },
      { code: "A.9", nameEn: "Sanitary", nameId: "Sanitair" },
      { code: "A.10", nameEn: "Misc", nameId: "Lain-Lain" },
    ],
  },

  {
    code: "M",
    nameEn: "MEP",
    nameId: "MEP",
    children: [
      { code: "M.1", nameEn: "Plumbing", nameId: "Pemipaan" },
      { code: "M.2", nameEn: "Electrical", nameId: "Elektrikal" },
      { code: "M.3", nameEn: "Electronics & Low Current", nameId: "Elektronika" },
      { code: "M.4", nameEn: "HVAC", nameId: "HVAC" },
      { code: "M.5", nameEn: "Fire Protection", nameId: "Proteksi Kebakaran" },
      { code: "M.6", nameEn: "Lightning Protection", nameId: "Proteksi Petir" },
    ],
  },

  {
    code: "I",
    nameEn: "Interior",
    nameId: "Interior",
    children: [
      { code: "I.1", nameEn: "Special Interior", nameId: "Interior Khusus" },
      { code: "I.2", nameEn: "Special Materials", nameId: "Material Khusus" },
      { code: "I.3", nameEn: "Special Lighting", nameId: "Pencahayaan Khusus" },
    ],
  },

  {
    code: "L",
    nameEn: "Landscape",
    nameId: "Lansekap",
    children: [
      { code: "L.1", nameEn: "Hardscape", nameId: "Pekerasan" },
      { code: "L.2", nameEn: "Softscape", nameId: "Tanaman" },
      { code: "L.3", nameEn: "Special Elements", nameId: "Elemen Khusus" },
    ],
  },
];

/**
 * FINAL BALLPARK TREE (SSOT)
 * - Semua node punya id unik
 * - Aman untuk inline edit / add / remove / renumber
 */
export const WBS_BALLPARK: WBSItem[] = withIds(RAW_WBS_BALLPARK);
