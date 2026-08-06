import { createClient } from "@supabase/supabase-js";
import { WBS_BALLPARK } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildDetailFromEstimates } from "../components/flow/projects/project-detail/setup/wbs/data/wbs-detail";

const url = "https://fmgcvwximerhgjgctpsp.supabase.co";
const key = "sb_publishable_xG7rkz6EztqCnJhSxOxVow_mtP-udQQ";
const client = createClient(url, key);

const fksId = "ff641830-cdea-4a30-b1bd-92a228e82d49";

// ========================================================================
// PDF ITEMS - exact data from user's PDF files for GYM (Massa A) only
// These override or extend SAMIL template items under A.*
// ========================================================================

// Structure PDF items (under A.S)
// The PDF uses flat Indonesian titles. We keep them as title (Indonesian)
// and provide English translations as title_en.
const pdfStructure = [
  { code: "S.1", nameId: "Pekerjaan Tanah dan Fondasi", nameEn: "Earthwork & Foundation", children: [
    { code: "S.1.1", nameId: "Pekerjaan Galian Tanah", nameEn: "Soil Excavation", children: [
      { code: "S.1.1.1", nameId: "Sloof", nameEn: "Tie-Beam Excavation" }
    ]},
    { code: "S.1.2", nameId: "Pengurugan Tanah Subur Tanaman", nameEn: "Topsoil Backfilling" },
    { code: "S.1.3", nameId: "Pengurugan Pasir Urug t=5 cm", nameEn: "Sand Bedding t=5cm" },
    { code: "S.1.9", nameId: "PBG, SLF, & Permitting", nameEn: "PBG, SLF, & Permitting" }
  ]},
  { code: "S.2", nameId: "Pekerjaan Beton", nameEn: "Concrete Works", children: [
    { code: "S.2.1", nameId: "Gym Lantai 1", nameEn: "Gym Floor 1", children: [
      { code: "S.2.1.1", nameId: "Pekerjaan Sloof SL2 20x30", nameEn: "Tie-Beam SL2 20x30", children: [
        { code: "S.2.1.1.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.1.1.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.1.1.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]},
      { code: "S.2.1.2", nameId: "Pekerjaan Sloof SL3 15x30", nameEn: "Tie-Beam SL3 15x30", children: [
        { code: "S.2.1.2.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.1.2.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.1.2.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]},
      { code: "S.2.1.3", nameId: "Pekerjaan Kolom Praktis KP Eksterior", nameEn: "Practical Column KP Exterior", children: [
        { code: "S.2.1.3.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.1.3.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.1.3.3", nameId: "Pengecoran Beton", nameEn: "Concrete Pouring" }
      ]},
      { code: "S.2.1.6", nameId: "Pekerjaan Balok Latei Eksterior", nameEn: "Exterior Lintel Beam", children: [
        { code: "S.2.1.6.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.1.6.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.1.6.3", nameId: "Pengecoran Beton Mutu", nameEn: "Concrete Pouring" }
      ]},
      { code: "S.2.1.7", nameId: "Pekerjaan Plat Beton Lantai 1", nameEn: "Floor 1 Concrete Slab", children: [
        { code: "S.2.1.7.1", nameId: "Plastik Cor", nameEn: "Casting Plastic" },
        { code: "S.2.1.7.2", nameId: "Wiremesh M10", nameEn: "Wiremesh M10" },
        { code: "S.2.1.7.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]}
    ]},
    { code: "S.2.2", nameId: "Gym Lantai 2", nameEn: "Gym Floor 2", children: [
      { code: "S.2.2.1", nameId: "Pekerjaan Kolom Praktis KP Eksterior", nameEn: "Practical Column KP Exterior", children: [
        { code: "S.2.2.1.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.2.1.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.2.1.3", nameId: "Pengecoran Beton", nameEn: "Concrete Pouring" }
      ]},
      { code: "S.2.2.4", nameId: "Pekerjaan Balok Latei Eksterior", nameEn: "Exterior Lintel Beam", children: [
        { code: "S.2.2.4.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.2.4.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.2.4.3", nameId: "Pengecoran Beton", nameEn: "Concrete Pouring" }
      ]},
      { code: "S.2.2.5", nameId: "Pekerjaan Tangga Lantai 2-3", nameEn: "Staircase Floor 2-3", children: [
        { code: "S.2.2.5.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.2.5.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.2.5.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]}
    ]},
    { code: "S.2.3", nameId: "Gym Lantai 3", nameEn: "Gym Floor 3", children: [
      { code: "S.2.3.1", nameId: "Pekerjaan Kolom Praktis KP Eksterior", nameEn: "Practical Column KP Exterior", children: [
        { code: "S.2.3.1.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.3.1.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.3.1.3", nameId: "Pengecoran Beton", nameEn: "Concrete Pouring" }
      ]},
      { code: "S.2.3.3", nameId: "Pekerjaan Kolom K2 60x60", nameEn: "Column K2 60x60", children: [
        { code: "S.2.3.3.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.3.3.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.3.3.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]},
      { code: "S.2.3.4", nameId: "Pekerjaan Kolom K3 45x45", nameEn: "Column K3 45x45", children: [
        { code: "S.2.3.4.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.3.4.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.3.4.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]},
      { code: "S.2.3.5", nameId: "Pekerjaan Ring Balk BA-1 20x45", nameEn: "Ring Beam BA-1 20x45", children: [
        { code: "S.2.3.5.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.3.5.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.3.5.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]},
      { code: "S.2.3.6", nameId: "Pekerjaan Ring Balk BA-2 20x30", nameEn: "Ring Beam BA-2 20x30", children: [
        { code: "S.2.3.6.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.3.6.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.3.6.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
      ]},
      { code: "S.2.3.7", nameId: "Pekerjaan Balok Latei Eksterior", nameEn: "Exterior Lintel Beam", children: [
        { code: "S.2.3.7.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
        { code: "S.2.3.7.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
        { code: "S.2.3.7.3", nameId: "Pengecoran Beton", nameEn: "Concrete Pouring" }
      ]}
    ]}
  ]},
  { code: "S.3", nameId: "Pekerjaan Rangka Atap", nameEn: "Roof Framing Works", children: [
    { code: "S.3.1", nameId: "Pekerjaan Rangka Baja Ringan", nameEn: "Lightweight Steel Roof Framing" }
  ]}
];

// Architecture PDF items (under A.A)
const pdfArchitecture = [
  { code: "A.1", nameId: "Pekerjaan Pasangan Dinding", nameEn: "Wall Masonry Works", children: [
    { code: "A.1.1", nameId: "Pemasangan 1 m2 Dinding Bata Ringan", nameEn: "Lightweight Block Wall 1m2", children: [
      { code: "A.1.1.1", nameId: "Lantai 1 Eksterior", nameEn: "Floor 1 Exterior" },
      { code: "A.1.1.3", nameId: "Lantai 2 Eksterior", nameEn: "Floor 2 Exterior" },
      { code: "A.1.1.5", nameId: "Lantai 3 Eksterior", nameEn: "Floor 3 Exterior" }
    ]},
    { code: "A.1.2", nameId: "Pemasangan 1 m2 Plesteran", nameEn: "Wall Plastering 1m2" },
    { code: "A.1.3", nameId: "Pemasangan 1 m2 Acian", nameEn: "Skim Coating 1m2" }
  ]},
  { code: "A.2", nameId: "Pekerjaan Penutup Dinding Eksterior", nameEn: "Exterior Wall Finishes", children: [
    { code: "A.2.1", nameId: "Pemasangan Tali Air Aluminium 2mm", nameEn: "Aluminium Groove Line 2mm" }
  ]},
  { code: "A.3", nameId: "Pekerjaan Plafon Eksterior", nameEn: "Exterior Ceiling Works", children: [
    { code: "A.3.1", nameId: "Pekerjaan Plafon Eksterior Termasuk Rangka", nameEn: "Exterior Ceiling inc. Frame" }
  ]},
  { code: "A.4", nameId: "Pekerjaan Penutup Atap", nameEn: "Roof Covering Works", children: [
    { code: "A.4.1", nameId: "Pekerjaan 1 m2 Penutup Atap uPVC Sheet", nameEn: "uPVC Roofing Sheet 1m2" },
    { code: "A.4.2", nameId: "Pekerjaan Talang Galvalum", nameEn: "Galvalume Gutter" },
    { code: "A.4.3", nameId: "Pekerjaan Aluminium Foil Bubble", nameEn: "Aluminium Foil Insulation" },
    { code: "A.4.4", nameId: "Pekerjaan Nok, Flashing, dan Aksesoris", nameEn: "Ridge Capping, Flashing & Acc" }
  ]},
  { code: "A.5", nameId: "Pekerjaan Pengecatan Eksterior", nameEn: "Exterior Painting Works", children: [
    { code: "A.5.1", nameId: "Pengecatan 1 m2 Dinding Eksterior", nameEn: "Exterior Wall Painting 1m2" },
    { code: "A.5.4", nameId: "Pengecatan 1 m2 Plafon Eksterior", nameEn: "Exterior Ceiling Painting 1m2" }
  ]},
  { code: "A.6", nameId: "Pekerjaan Kaca, Pintu, Jendela Eksterior", nameEn: "Exterior Door, Window & Glazing", children: [
    { code: "A.6.1", nameId: "Lantai 1", nameEn: "Floor 1", children: [
      { code: "A.6.1.1", nameId: "Pemasangan Pintu Jendela PJ01 (4400x2400) (1 set) - Pintu Jendela Utama", nameEn: "Door Window PJ01 (4400x2400) - Main Entry", children: [
        { code: "A.6.1.1.1", nameId: "Pemasangan 1 m2 Daun Pintu Tempered Glass 12mm", nameEn: "Tempered Glass Door Leaf 12mm 1m2" },
        { code: "A.6.1.1.2", nameId: "Pemasangan 1 m2 Jendela Mati Tempered Glass 12mm", nameEn: "Fixed Window Tempered Glass 12mm 1m2" },
        { code: "A.6.1.1.3", nameId: "Pemasangan 1 set Sensor Otomatis Pintu", nameEn: "Automatic Door Sensor 1 set" }
      ]},
      { code: "A.6.1.2", nameId: "Pemasangan Pintu Utama PJ02 (4400x2400) (1 set) - Pintu Arah Kolam Jendela Double Swing", nameEn: "Main Door PJ02 (4400x2400) - Pool Side Double Swing", children: [
        { code: "A.6.1.2.1", nameId: "Pemasangan 1 m2 Daun Pintu Tempered Glass 12mm", nameEn: "Tempered Glass Door Leaf 12mm 1m2" },
        { code: "A.6.1.2.2", nameId: "Pemasangan 1 m2 Jendela Mati Tempered Glass 12mm", nameEn: "Fixed Window Tempered Glass 12mm 1m2" },
        { code: "A.6.1.2.3", nameId: "Pemasangan 1 set Engsel Pintu Pivot dan Patch Fitting Pintu Kaca", nameEn: "Pivot Hinge & Patch Fitting 1 set" },
        { code: "A.6.1.2.4", nameId: "Pemasangan 1 bh Handle Pintu Kaca", nameEn: "Glass Door Handle 1 pc" }
      ]},
      { code: "A.6.1.3", nameId: "Pemasangan Pintu Utama PJ03 (4200x2400) (1 set) - Pintu Arah Kolam Jendela Single Swing", nameEn: "Main Door PJ03 (4200x2400) - Pool Side Single Swing", children: [
        { code: "A.6.1.3.1", nameId: "Pemasangan 1 m2 Daun Pintu Tempered Glass 12mm", nameEn: "Tempered Glass Door Leaf 12mm 1m2" },
        { code: "A.6.1.3.2", nameId: "Pemasangan 1 m2 Jendela Mati Tempered Glass 12mm", nameEn: "Fixed Window Tempered Glass 12mm 1m2" },
        { code: "A.6.1.3.3", nameId: "Pemasangan 1 set Engsel Pintu Pivot dan Patch Fitting Pintu Kaca", nameEn: "Pivot Hinge & Patch Fitting 1 set" },
        { code: "A.6.1.3.4", nameId: "Pemasangan 1 bh Handle Pintu Kaca", nameEn: "Glass Door Handle 1 pc" }
      ]},
      { code: "A.6.1.4", nameId: "Pemasangan Jendela Kaca Mati Tempered J01 (4400x2400) (5 set)", nameEn: "Fixed Tempered Window J01 (4400x2400) 5 sets" },
      { code: "A.6.1.5", nameId: "Pemasangan Jendela Kaca Mati Tempered J02 (4300x2400) (1 set)", nameEn: "Fixed Tempered Window J02 (4300x2400) 1 set" },
      { code: "A.6.1.6", nameId: "Pemasangan Jendela Kaca Mati Tempered J03 (4200x2400) (1 set)", nameEn: "Fixed Tempered Window J03 (4200x2400) 1 set" },
      { code: "A.6.1.7", nameId: "Pemasangan Jendela Kaca Mati Tempered J04 (4100x2400) (1 set)", nameEn: "Fixed Tempered Window J04 (4100x2400) 1 set" },
      { code: "A.6.1.8", nameId: "Pemasangan Bouvenlight BV01, BV02, BV03A-D (13 set)", nameEn: "Bouvenlight BV01-BV03A-D 13 sets", children: [
        { code: "A.6.1.8.1", nameId: "Pemasangan 1 m2 Jendela Zigzag Clear Glass 8mm", nameEn: "Zigzag Clear Glass Window 8mm 1m2" },
        { code: "A.6.1.8.2", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\"", nameEn: "Black Aluminium Frame 3\" 1m1" }
      ]}
    ]},
    { code: "A.6.2", nameId: "Lantai 2", nameEn: "Floor 2", children: [
      { code: "A.6.2.1", nameId: "Pemasangan Jendela Kaca Mati Tempered J01 (4400x2400) (2 set)", nameEn: "Fixed Tempered Window J01 (4400x2400) 2 sets" },
      { code: "A.6.2.2", nameId: "Pemasangan Jendela Kaca Mati Tempered J09 (4400x1500) (4 set)", nameEn: "Fixed Tempered Window J09 (4400x1500) 4 sets" },
      { code: "A.6.2.3", nameId: "Pemasangan Jendela Kaca Mati Tempered J10A (1715x2400) (1 set)", nameEn: "Fixed Tempered Window J10A (1715x2400) 1 set" },
      { code: "A.6.2.4", nameId: "Pemasangan Jendela Kaca Mati Tempered J10B (2435x2400) (1 set)", nameEn: "Fixed Tempered Window J10B (2435x2400) 1 set" },
      { code: "A.6.2.5", nameId: "Pemasangan Jendela Kaca Mati Tempered J11 (4200x2400) (3 set)", nameEn: "Fixed Tempered Window J11 (4200x2400) 3 sets" },
      { code: "A.6.2.6", nameId: "Pemasangan Jendela Kaca Mati Tempered J12 (4100x2400) (2 set)", nameEn: "Fixed Tempered Window J12 (4100x2400) 2 sets" },
      { code: "A.6.2.7", nameId: "Pemasangan Jendela Kaca Mati Tempered J13 (4000x2400) (4 set)", nameEn: "Fixed Tempered Window J13 (4000x2400) 4 sets" },
      { code: "A.6.2.8", nameId: "Pemasangan Jendela J14 (2600x2400) (1 set)", nameEn: "Window J14 (2600x2400) 1 set", children: [
        { code: "A.6.2.8.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.2.8.2", nameId: "Pemasangan 1 m2 Tempered Glass 8 mm Ex. Asahimas", nameEn: "Tempered Glass 8mm Asahimas 1m2" },
        { code: "A.6.2.8.3", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.2.8.4", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]},
      { code: "A.6.2.9", nameId: "Pemasangan Jendela Kaca Mati Tempered J15 (1300x1500) (1 set)", nameEn: "Fixed Tempered Window J15 (1300x1500) 1 set" }
    ]},
    { code: "A.6.3", nameId: "Lantai 3", nameEn: "Floor 3", children: [
      { code: "A.6.3.1", nameId: "Pemasangan Jendela Kaca Mati Tempered J01 (4400x2400) (2 set)", nameEn: "Fixed Tempered Window J01 (4400x2400) 2 sets" },
      { code: "A.6.3.2", nameId: "Pemasangan Jendela Kaca Mati Tempered J09 (4400x1500) (1 set)", nameEn: "Fixed Tempered Window J09 (4400x1500) 1 set" },
      { code: "A.6.3.3", nameId: "Pemasangan Jendela Kaca Mati Tempered J14 (2600x2400) (1 set)", nameEn: "Fixed Tempered Window J14 (2600x2400) 1 set", children: [
        { code: "A.6.3.3.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.3.3.2", nameId: "Pemasangan 1 m2 Tempered Glass 8 mm Ex. Asahimas", nameEn: "Tempered Glass 8mm Asahimas 1m2" },
        { code: "A.6.3.3.3", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.3.3.4", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]},
      { code: "A.6.3.4", nameId: "Pemasangan Jendela Kaca Mati Tempered J15 (1300x1500) (1 set)", nameEn: "Fixed Tempered Window J15 (1300x1500) 1 set" },
      { code: "A.6.3.5", nameId: "Pemasangan Jendela J26 (4400x1500) (4 set)", nameEn: "Window J26 (4400x1500) 4 sets", children: [
        { code: "A.6.3.5.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.3.5.2", nameId: "Pemasangan 1 m2 Daun Jendela Top Hung Clear Glass 8 mm Frame Alumunium", nameEn: "Top Hung Clear Glass 8mm Aluminium Frame 1m2" },
        { code: "A.6.3.5.3", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.3.5.4", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]},
      { code: "A.6.3.6", nameId: "Pemasangan Jendela J27 (1800x2400 mm) 4 unit", nameEn: "Window J27 (1800x2400) 4 units", children: [
        { code: "A.6.3.6.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.3.6.2", nameId: "Pemasangan 1 m2 Clear Glass 8 mm Ex. Asahimas", nameEn: "Clear Glass 8mm Asahimas 1m2" },
        { code: "A.6.3.6.3", nameId: "Pemasangan 1 m2 Daun Jendela Top Hung Clear Glass 8 mm Frame Alumunium", nameEn: "Top Hung Clear Glass 8mm Aluminium Frame 1m2" },
        { code: "A.6.3.6.4", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.3.6.5", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]},
      { code: "A.6.3.7", nameId: "Pemasangan Jendela J28 (900x2400 mm) 4 unit", nameEn: "Window J28 (900x2400) 4 units", children: [
        { code: "A.6.3.7.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.3.7.2", nameId: "Pemasangan 1 m2 Clear Glass 8 mm Ex. Asahimas", nameEn: "Clear Glass 8mm Asahimas 1m2" },
        { code: "A.6.3.7.3", nameId: "Pemasangan 1 m2 Daun Jendela Top Hung Clear Glass 8 mm Frame Alumunium", nameEn: "Top Hung Clear Glass 8mm Aluminium Frame 1m2" },
        { code: "A.6.3.7.4", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.3.7.5", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]},
      { code: "A.6.3.8", nameId: "Pemasangan Jendela J29 (900x1500 mm) 6 unit", nameEn: "Window J29 (900x1500) 6 units", children: [
        { code: "A.6.3.8.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.3.8.2", nameId: "Pemasangan 1 m2 Daun Jendela Top Hung Clear Glass 8 mm Frame Alumunium", nameEn: "Top Hung Clear Glass 8mm Aluminium Frame 1m2" },
        { code: "A.6.3.8.3", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.3.8.4", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]},
      { code: "A.6.3.9", nameId: "Pemasangan Jendela J30 (1800x2400 mm) 4 unit", nameEn: "Window J30 (1800x2400) 4 units", children: [
        { code: "A.6.3.9.1", nameId: "Pemasangan 1 m1 Kusen Alumunium Hitam 3\" Ex. YKK/Alexindo", nameEn: "Black Aluminium Frame 3\" YKK/Alexindo 1m1" },
        { code: "A.6.3.9.2", nameId: "Pemasangan 1 m2 Clear Glass 8 mm Ex. Asahimas", nameEn: "Clear Glass 8mm Asahimas 1m2" },
        { code: "A.6.3.9.3", nameId: "Pemasangan 1 m2 Daun Jendela Top Hung Clear Glass 8 mm Frame Alumunium", nameEn: "Top Hung Clear Glass 8mm Aluminium Frame 1m2" },
        { code: "A.6.3.9.4", nameId: "Pemasangan 1 m1 Engsel Ex. Dekkson", nameEn: "Hinge Dekkson 1m1" },
        { code: "A.6.3.9.5", nameId: "Pemasangan 1 psg Handle dan Slot Ex. Dekkson", nameEn: "Handle & Slot Dekkson 1 pair" }
      ]}
    ]}
  ]},
  { code: "A.7", nameId: "Pekerjaan Fasad", nameEn: "Façade Works", children: [
    { code: "A.7.1", nameId: "Pekerjaan Façade Kisi-kisi Kayu", nameEn: "Wooden Louvre Façade" },
    { code: "A.7.2", nameId: "Pekerjaan Lampu Logo Facade Gym", nameEn: "Gym Facade Backlit Logo Light" }
  ]}
];

// MEP PDF items (under A.M)
const pdfMEP = [
  { code: "M.1", nameId: "Pekerjaan Pemipaan Umum", nameEn: "General Plumbing Works", children: [
    { code: "M.1.1", nameId: "Pekerjaan Pemipaan Air Bersih", nameEn: "Clean Water Plumbing", children: [
      { code: "M.1.1.1", nameId: "Pekerjaan Penunjang Air Bersih", nameEn: "Clean Water Support Works", children: [
        { code: "M.1.1.1.3", nameId: "Pompa Transfer Multistage (GWT ke Roof Tank)", nameEn: "Multistage Transfer Pump (GWT to Roof Tank)" },
        { code: "M.1.1.1.4", nameId: "Pompa Booster Roof Tank ke Distribusi", nameEn: "Booster Pump Roof Tank to Distribution" },
        { code: "M.1.1.1.5", nameId: "Pekerjaan Struktur GWT", nameEn: "GWT Structure Works", children: [
          { code: "M.1.1.1.5.1", nameId: "Pekerjaan Galian Tanah", nameEn: "Soil Excavation" },
          { code: "M.1.1.1.5.2", nameId: "Pekerjaan Pembongkaran Pondasi", nameEn: "Foundation Demolition" },
          { code: "M.1.1.1.5.3", nameId: "Pekerjaan Pondasi GWT", nameEn: "GWT Foundation" },
          { code: "M.1.1.1.5.4", nameId: "Pekerjaan Pasangan Dinding GWT", nameEn: "GWT Wall Masonry" },
          { code: "M.1.1.1.5.5", nameId: "Pekerjaan Waterproofing", nameEn: "Waterproofing" },
          { code: "M.1.1.1.5.6", nameId: "Pekerjaan Struktur Beton GWT", nameEn: "GWT Concrete Structure" },
          { code: "M.1.1.1.5.7", nameId: "Pekerjaan Plat Lantai Beton GWT", nameEn: "GWT Concrete Floor Slab" },
          { code: "M.1.1.1.5.8", nameId: "Pekerjaan Tangga", nameEn: "Staircase" },
          { code: "M.1.1.1.5.9", nameId: "Pekerjaan Finishing Lantai", nameEn: "Floor Finishing" },
          { code: "M.1.1.1.5.10", nameId: "Pekerjaan Finishing Dinding", nameEn: "Wall Finishing" },
          { code: "M.1.1.1.5.11", nameId: "Pekerjaan Pintu dan Jendela", nameEn: "Door & Window" }
        ]},
        { code: "M.1.1.1.6", nameId: "Pembuatan Sumur Bor", nameEn: "Bore Well Drilling" },
        { code: "M.1.1.1.7", nameId: "Pompa Sumur Submersible", nameEn: "Submersible Well Pump" }
      ]},
      { code: "M.1.1.2", nameId: "Pekerjaan Air Bersih", nameEn: "Clean Water Works", children: [
        { code: "M.1.1.2.1", nameId: "Pekerjaan Pipa Utama dan Pipa Tegak Air Bersih Dingin", nameEn: "Cold Water Main & Riser Pipes", children: [
          { code: "M.1.1.2.1.1", nameId: "Pipa PPR PN 10 dia. 100 mm", nameEn: "PPR PN 10 Pipe dia. 100mm" },
          { code: "M.1.1.2.1.2", nameId: "Pipa PPR PN 10 dia.1 1/2\" 32 mm", nameEn: "PPR PN 10 Pipe dia. 1½\" 32mm" },
          { code: "M.1.1.2.1.3", nameId: "Pipa PPR PN 10 dia. 1\" 25 mm", nameEn: "PPR PN 10 Pipe dia. 1\" 25mm" },
          { code: "M.1.1.2.1.4", nameId: "Pipa PPR PN 10 dia. 3/4\" 20 mm", nameEn: "PPR PN 10 Pipe dia. ¾\" 20mm" },
          { code: "M.1.1.2.1.5", nameId: "Pemasangan Stop Valve dia. 100 mm", nameEn: "Stop Valve dia. 100mm" },
          { code: "M.1.1.2.1.6", nameId: "Pemasangan Stop Valve dia.1 1/2\" 32", nameEn: "Stop Valve dia. 1½\" 32" },
          { code: "M.1.1.2.1.7", nameId: "Fitting dan Accesories", nameEn: "Fittings & Accessories" },
          { code: "M.1.1.2.1.8", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" }
        ]},
        { code: "M.1.1.2.2", nameId: "Pekerjaan Pipa Utama dan Pipa Tegak Air Bersih Panas", nameEn: "Hot Water Main & Riser Pipes", children: [
          { code: "M.1.1.2.2.1", nameId: "Pipa PPR PN 10 dia. 100 mm", nameEn: "PPR PN 10 Pipe dia. 100mm" },
          { code: "M.1.1.2.2.2", nameId: "Pipa PPR PN 10dia.1 1/2\" 32 mm", nameEn: "PPR PN 10 Pipe dia. 1½\" 32mm" },
          { code: "M.1.1.2.2.3", nameId: "Pipa PPR PN 10 dia. 1\" 25 mm", nameEn: "PPR PN 10 Pipe dia. 1\" 25mm" },
          { code: "M.1.1.2.2.4", nameId: "Pemasangan Stop Valve dia. 100mm", nameEn: "Stop Valve dia. 100mm" },
          { code: "M.1.1.2.2.5", nameId: "Stop Valve PPR dia 32 mm", nameEn: "PPR Stop Valve dia. 32mm" },
          { code: "M.1.1.2.2.6", nameId: "Fitting dan Accesories", nameEn: "Fittings & Accessories" },
          { code: "M.1.1.2.2.7", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" }
        ]},
        { code: "M.1.1.2.3", nameId: "Pekerjaan Pipa Tegak dari Sumur ke Roof Tank", nameEn: "Riser Pipe from Well to Roof Tank", children: [
          { code: "M.1.1.2.3.1", nameId: "Pipa PPR PN 10 dia. 2\" 50 mm", nameEn: "PPR PN 10 Pipe dia. 2\" 50mm" },
          { code: "M.1.1.2.3.2", nameId: "Pemasangan Stop Valve dia. 2\"50 mm", nameEn: "Stop Valve dia. 2\" 50mm" }
        ]}
      ]}
    ]},
    { code: "M.1.2", nameId: "Pekerjaan Pemipaan Air Hujan, Air Kotor, dan Air Bekas", nameEn: "Storm, Waste & Grey Water Plumbing", children: [
      { code: "M.1.2.1", nameId: "Pekerjaan Penunjang Air Kotor", nameEn: "Waste Water Support Works", children: [
        { code: "M.1.2.1.1", nameId: "Pengadaan dan Pemasangan Bio Septic Tank 12.000 liter/hari", nameEn: "Bio Septic Tank 12,000 L/day" },
        { code: "M.1.2.1.2", nameId: "Pengadaan dan Pemasangan Bio Septic Tank 2.000 liter/hari", nameEn: "Bio Septic Tank 2,000 L/day" }
      ]},
      { code: "M.1.2.2", nameId: "Pekerjaan Instalasi Air Hujan, Air Kotor, dan Air Bekas", nameEn: "Storm, Waste & Grey Water Installation", children: [
        { code: "M.1.2.2.1", nameId: "Instalasi Air Hujan", nameEn: "Storm Water Installation", children: [
          { code: "M.1.2.2.1.1", nameId: "Pipa Tegak dan Horizontal", nameEn: "Riser & Horizontal Pipes", children: [
            { code: "M.1.2.2.1.1.1", nameId: "PVC AW dia. 4\"", nameEn: "PVC AW dia. 4\"" },
            { code: "M.1.2.2.1.1.2", nameId: "PVC AW dia. 3\" Tegak", nameEn: "PVC AW dia. 3\" Riser" },
            { code: "M.1.2.2.1.1.3", nameId: "Fitting dan Aksesoris", nameEn: "Fittings & Accessories" },
            { code: "M.1.2.2.1.1.4", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" },
            { code: "M.1.2.2.1.1.5", nameId: "Cast Iron Floor Drain dia. 4\"", nameEn: "Cast Iron Floor Drain dia. 4\"" },
            { code: "M.1.2.2.1.1.6", nameId: "Grouting dan Coring", nameEn: "Grouting & Coring" }
          ]}
        ]},
        { code: "M.1.2.2.2", nameId: "Instalasi Air Kotor Padat/AKP dan Air Kotor Cair/AKC", nameEn: "Solid & Liquid Waste Water Installation", children: [
          { code: "M.1.2.2.2.1", nameId: "Lantai 1", nameEn: "Floor 1", children: [
            { code: "M.1.2.2.2.1.1", nameId: "PVC AW dia. 4\"", nameEn: "PVC AW dia. 4\"" },
            { code: "M.1.2.2.2.1.2", nameId: "PVC AW dia. 3\"", nameEn: "PVC AW dia. 3\"" },
            { code: "M.1.2.2.2.1.3", nameId: "PVC AW dia. 2\"", nameEn: "PVC AW dia. 2\"" },
            { code: "M.1.2.2.2.1.4", nameId: "Fitting dan Aksesoris", nameEn: "Fittings & Accessories" },
            { code: "M.1.2.2.2.1.5", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" }
          ]},
          { code: "M.1.2.2.2.2", nameId: "Lantai 2", nameEn: "Floor 2", children: [
            { code: "M.1.2.2.2.2.1", nameId: "PVC AW dia. 4\"", nameEn: "PVC AW dia. 4\"" },
            { code: "M.1.2.2.2.2.2", nameId: "PVC AW dia. 3\"", nameEn: "PVC AW dia. 3\"" },
            { code: "M.1.2.2.2.2.3", nameId: "PVC AW dia. 2\"", nameEn: "PVC AW dia. 2\"" },
            { code: "M.1.2.2.2.2.4", nameId: "Fitting dan Aksesoris", nameEn: "Fittings & Accessories" },
            { code: "M.1.2.2.2.2.5", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" },
            { code: "M.1.2.2.2.2.6", nameId: "Cast Iron Floor Drain dia. 5\"", nameEn: "Cast Iron Floor Drain dia. 5\"" },
            { code: "M.1.2.2.2.2.7", nameId: "Cast Iron Floor Drain dia. 4\"", nameEn: "Cast Iron Floor Drain dia. 4\"" },
            { code: "M.1.2.2.2.2.8", nameId: "Cast Iron Floor Drain dia. 3\"", nameEn: "Cast Iron Floor Drain dia. 3\"" },
            { code: "M.1.2.2.2.2.9", nameId: "Grouting dan Coring", nameEn: "Grouting & Coring" }
          ]},
          { code: "M.1.2.2.2.3", nameId: "Lantai 3", nameEn: "Floor 3", children: [
            { code: "M.1.2.2.2.3.1", nameId: "PVC AW dia. 4\"", nameEn: "PVC AW dia. 4\"" },
            { code: "M.1.2.2.2.3.2", nameId: "PVC AW dia. 3\"", nameEn: "PVC AW dia. 3\"" },
            { code: "M.1.2.2.2.3.3", nameId: "PVC AW dia. 2\"", nameEn: "PVC AW dia. 2\"" },
            { code: "M.1.2.2.2.3.4", nameId: "Fitting dan Aksesoris", nameEn: "Fittings & Accessories" },
            { code: "M.1.2.2.2.3.5", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" },
            { code: "M.1.2.2.2.3.6", nameId: "Cast Iron Floor Drain dia. 5\"", nameEn: "Cast Iron Floor Drain dia. 5\"" },
            { code: "M.1.2.2.2.3.7", nameId: "Cast Iron Floor Drain dia. 4\"", nameEn: "Cast Iron Floor Drain dia. 4\"" },
            { code: "M.1.2.2.2.3.8", nameId: "Cast Iron Floor Drain dia. 3\"", nameEn: "Cast Iron Floor Drain dia. 3\"" },
            { code: "M.1.2.2.2.3.9", nameId: "Grouting dan Coring", nameEn: "Grouting & Coring" }
          ]}
        ]}
      ]}
    ]}
  ]},
  { code: "M.4", nameId: "Pekerjaan Elektrikal Umum", nameEn: "General Electrical Works", children: [
    { code: "M.4.1", nameId: "Pekerjaan Kabel Toefuur", nameEn: "Cable Supply Works", children: [
      { code: "M.4.1.1", nameId: "Pekerjaan Pengadaan dan Pemasangan Kabel Feeder", nameEn: "Feeder Cable Supply & Installation", children: [
        { code: "M.4.1.1.1", nameId: "Panel PLN ke Main LVMDP", nameEn: "PLN Panel to Main LVMDP" },
        { code: "M.4.1.1.2", nameId: "Main LVMDP ke MDP Gym", nameEn: "Main LVMDP to Gym MDP" },
        { code: "M.4.1.1.3", nameId: "Main LVMDP ke MDP Kolam", nameEn: "Main LVMDP to Pool MDP" },
        { code: "M.4.1.1.4", nameId: "Main LVMDP ke MDP Kafe", nameEn: "Main LVMDP to Cafe MDP" },
        { code: "M.4.1.1.5", nameId: "Main LVMDP ke MDP Outdoor", nameEn: "Main LVMDP to Outdoor MDP" }
      ]},
      { code: "M.4.1.2", nameId: "Pekerjaan Pengadaan dan Pemasangan Kabel Distribusi Utama", nameEn: "Main Distribution Cable Supply & Installation", children: [
        { code: "M.4.1.2.1", nameId: "MDP Gym ke SDP/PP/LP Lantai 1", nameEn: "Gym MDP to SDP/PP/LP Floor 1" },
        { code: "M.4.1.2.2", nameId: "MDP Gym ke SDP/PP/LP Lantai 2", nameEn: "Gym MDP to SDP/PP/LP Floor 2" },
        { code: "M.4.1.2.3", nameId: "MDP Gym Lantai 2 ke Lantai 3", nameEn: "Gym MDP Floor 2 to Floor 3" }
      ]},
      { code: "M.4.1.3", nameId: "Pekerjaan dan Pengadaan Kabel Grounding", nameEn: "Grounding Cable Supply", children: [
        { code: "M.4.1.3.1", nameId: "Pengadaan Kabel Grounding BC", nameEn: "BC Grounding Cable" },
        { code: "M.4.1.3.2", nameId: "Pembuatan Titik Grounding Elektrikal", nameEn: "Electrical Grounding Point" },
        { code: "M.4.1.3.3", nameId: "Pembuatan Titik Grounding Elektronika", nameEn: "Electronics Grounding Point" }
      ]}
    ]},
    { code: "M.4.2", nameId: "Pekerjaan Panel", nameEn: "Panel Works", children: [
      { code: "M.4.2.1", nameId: "Main LVMDP", nameEn: "Main LVMDP" },
      { code: "M.4.2.2", nameId: "MDP Gym", nameEn: "Gym MDP" },
      { code: "M.4.2.3", nameId: "SDP/PP/LP Gym Lantai 1", nameEn: "SDP/PP/LP Gym Floor 1", children: [
        { code: "M.4.2.3.1", nameId: "Lighting Panel 3 Fasa (MCCB 3P 32 A)", nameEn: "Lighting Panel 3 Phase (MCCB 3P 32A)" },
        { code: "M.4.2.3.2", nameId: "Air Conditioning Panel 3 Fasa (MCCB 3P 400 A)", nameEn: "AC Panel 3 Phase (MCCB 3P 400A)" },
        { code: "M.4.2.3.3", nameId: "Power Panel 3 Fasa (MCCB 3P 63 A)", nameEn: "Power Panel 3 Phase (MCCB 3P 63A)" }
      ]},
      { code: "M.4.2.4", nameId: "SDP/PP/LP Gym Lantai 2", nameEn: "SDP/PP/LP Gym Floor 2", children: [
        { code: "M.4.2.4.1", nameId: "Lighting Panel 3 Fasa (MCCB 3P 32 A)", nameEn: "Lighting Panel 3 Phase (MCCB 3P 32A)" },
        { code: "M.4.2.4.2", nameId: "Air Conditioning Panel 3 Fasa (MCCB 3P 400 A)", nameEn: "AC Panel 3 Phase (MCCB 3P 400A)" },
        { code: "M.4.2.4.3", nameId: "Power Panel 3 Fasa (MCCB 3P 63 A)", nameEn: "Power Panel 3 Phase (MCCB 3P 63A)" }
      ]},
      { code: "M.4.2.5", nameId: "SDP/PP/LP Gym Lantai 3", nameEn: "SDP/PP/LP Gym Floor 3", children: [
        { code: "M.4.2.5.1", nameId: "Lighting Panel 3 Fasa (MCCB 3P 32 A)", nameEn: "Lighting Panel 3 Phase (MCCB 3P 32A)" },
        { code: "M.4.2.5.2", nameId: "Air Conditioning Panel 3 Fasa (MCCB 3P 400 A)", nameEn: "AC Panel 3 Phase (MCCB 3P 400A)" },
        { code: "M.4.2.5.3", nameId: "Power Panel 3 Fasa (MCCB 3P 63 A)", nameEn: "Power Panel 3 Phase (MCCB 3P 63A)" }
      ]},
      { code: "M.4.2.6", nameId: "Fire Fighting Panel 3 Fasa (MCCB 3P 125 A)", nameEn: "Fire Fighting Panel 3 Phase (MCCB 3P 125A)" },
      { code: "M.4.2.7", nameId: "ELV Panel 1 Fasa (MCB 1P 16 A)", nameEn: "ELV Panel 1 Phase (MCB 1P 16A)" }
    ]},
    { code: "M.4.3", nameId: "Pekerjaan Penyambungan PLN (termasuk JF, KL, KJ)", nameEn: "PLN Connection (inc. JF, KL, KJ)", children: [
      { code: "M.4.3.1", nameId: "Biaya Penyambungan PLN", nameEn: "PLN Connection Fee", children: [
        { code: "M.4.3.1.1", nameId: "Gym", nameEn: "Gym" },
        { code: "M.4.3.1.2", nameId: "Kafe dan Kolam", nameEn: "Cafe & Pool" }
      ]},
      { code: "M.4.3.2", nameId: "Biaya SLO, NIDI, dan Pajak & Administrasi", nameEn: "SLO, NIDI, Tax & Admin Fee" }
    ]}
  ]},
  { code: "M.6", nameId: "Pekerjaan HVAC", nameEn: "HVAC Works", children: [
    { code: "M.6.3", nameId: "Pekerjaan Exhaust Fan dan Ceiling Fan", nameEn: "Exhaust Fan & Ceiling Fan Works", children: [
      { code: "M.6.3.1", nameId: "Pengadaan dan Instalasi Exhaust Fan", nameEn: "Exhaust Fan Supply & Installation" },
      { code: "M.6.3.2", nameId: "Pengadaan dan Instalasi Ceiling Fan", nameEn: "Ceiling Fan Supply & Installation" }
    ]}
  ]},
  { code: "M.9", nameId: "Pekerjaan Proteksi Kebakaran Umum", nameEn: "General Fire Protection Works", children: [
    { code: "M.9.1", nameId: "APAR CO2 6kg", nameEn: "CO2 Fire Extinguisher 6kg" },
    { code: "M.9.2", nameId: "Pemasangan 1 unit Sprinkler Head Pendant", nameEn: "Pendant Sprinkler Head 1 unit" },
    { code: "M.9.3", nameId: "Pemasangan 1 unit Smoke Detector Konvensional", nameEn: "Conventional Smoke Detector 1 unit" },
    { code: "M.9.4", nameId: "Pemasangan 1 unit Hydrant Pillar", nameEn: "Hydrant Pillar 1 unit" },
    { code: "M.9.5", nameId: "Pemasangan 1 unit Indoor Hydrant Box (IHB)", nameEn: "Indoor Hydrant Box 1 unit" },
    { code: "M.9.6", nameId: "Pompa Kebakaran dll", nameEn: "Fire Pump etc." }
  ]},
  { code: "M.10", nameId: "Pekerjaan Proteksi Petir Umum", nameEn: "General Lightning Protection", children: [
    { code: "M.10.1", nameId: "Pengadaan dan Pemasangan Air Terminal Franklin 4 unit", nameEn: "Franklin Air Terminal 4 units" }
  ]}
];

// Kolam PDF items (under B.S)
const pdfKolamStructure = [
  {
    code: "S.3", nameId: "Pekerjaan Dak Beton", nameEn: "Concrete Slab Works", children: [
      {
        code: "S.3.1", nameId: "Pekerjaan Dak Beton di Atas Kolam Tebal 12 cm", nameEn: "Concrete Slab Above Pool 12cm Thick", children: [
          { code: "S.3.1.1", nameId: "Pekerjaan Bekisting", nameEn: "Formwork" },
          { code: "S.3.1.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
          { code: "S.3.1.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
        ]
      },
      {
        code: "S.3.2", nameId: "Pekerjaan Balok B1", nameEn: "Beam B1 Works", children: [
          { code: "S.3.2.1", nameId: "Bekisting", nameEn: "Formwork" },
          { code: "S.3.2.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
          { code: "S.3.2.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
        ]
      },
      {
        code: "S.3.3", nameId: "Pekerjaan Balok B3", nameEn: "Beam B3 Works", children: [
          { code: "S.3.3.1", nameId: "Bekisting", nameEn: "Formwork" },
          { code: "S.3.3.2", nameId: "Pekerjaan Pembesian", nameEn: "Reinforcement" },
          { code: "S.3.3.3", nameId: "Pengecoran Beton Mutu K-300", nameEn: "Concrete K-300 Pouring" }
        ]
      }
    ]
  },
  {
    code: "S.4", nameId: "Pekerjaan Baja", nameEn: "Steel Works", children: [
      {
        code: "S.4.1", nameId: "Pekerjaan Rangka Utama Atap", nameEn: "Main Roof Framing Works", children: [
          { code: "S.4.1.1", nameId: "Batang Atas 2L 60x60x6", nameEn: "Top Chord 2L 60x60x6" },
          { code: "S.4.1.2", nameId: "Batang Bawah 2L 65x65x9", nameEn: "Bottom Chord 2L 65x65x9" },
          { code: "S.4.1.3", nameId: "Batang Tegak 2L 50x50x5", nameEn: "Vertical Member 2L 50x50x5" },
          { code: "S.4.1.4", nameId: "Batang Diagonal 2L 50x50x5", nameEn: "Diagonal Member 2L 50x50x5" },
          { code: "S.4.1.5", nameId: "Gusset Plate Seluruh Simpul", nameEn: "Gusset Plate All Nodes" },
          { code: "S.4.1.6", nameId: "Batten/Spacer Plate Batang 2L", nameEn: "Batten/Spacer Plate 2L" },
          { code: "S.4.1.7", nameId: "Seat Plate, End Plate, Plat Tumpuan", nameEn: "Seat Plate, End Plate, Bearing Plate" },
          { code: "S.4.1.8", nameId: "Stiffener dan Plat Sambungan Tambahan", nameEn: "Stiffener & Additional Connection Plate" },
          { code: "S.4.1.9", nameId: "Allowance Waste", nameEn: "Allowance Waste" }
        ]
      },
      {
        code: "S.4.2", nameId: "Pekerjaan Struktur Sekunder Atap", nameEn: "Secondary Roof Structure", children: [
          { code: "S.4.2.1", nameId: "Gording CNP 125x50x20x2,3 mm", nameEn: "Purlin CNP 125x50x20x2.3mm" },
          { code: "S.4.2.2", nameId: "Ikatan Angin Bidang Atap", nameEn: "Roof Plane Wind Bracing" },
          { code: "S.4.2.3", nameId: "Ikatan Angin Vertikal Antarrangka", nameEn: "Vertical Wind Bracing Between Frames" },
          { code: "S.4.2.4", nameId: "Sagrod", nameEn: "Sagrod" },
          { code: "S.4.2.5", nameId: "Cleat, Bracket, dan Plat Sambungan Gording", nameEn: "Cleat, Bracket & Purlin Connection Plate" },
          { code: "S.4.2.6", nameId: "Baut M16-M20 (Include Mur dan Washer)", nameEn: "Bolt M16-M20 (inc. Nut & Washer)" },
          { code: "S.4.2.7", nameId: "Anchor Bolt M20-M24 (Include Mur, Washer, Template)", nameEn: "Anchor Bolt M20-M24 (inc. Nut, Washer, Template)" },
          { code: "S.4.2.8", nameId: "Allowance Waste", nameEn: "Allowance Waste" }
        ]
      },
      { code: "S.4.3", nameId: "Mobilisasi, Alat Angkat, dan Rangka Erection", nameEn: "Mobilization, Lifting Equipment & Frame Erection" }
    ]
  }
];

// Kolam Architecture PDF items (under B.A)
const pdfKolamArchitecture = [
  {
    code: "A.1", nameId: "Pekerjaan Pasangan Dinding", nameEn: "Wall Masonry Works", children: [
      { code: "A.1.1", nameId: "Pemasangan 1 m2 Roster", nameEn: "Breeze Block Installation 1m2" }
    ]
  },
  {
    code: "A.4", nameId: "Pekerjaan Penutup Atap", nameEn: "Roof Covering Works", children: [
      { code: "A.4.1", nameId: "Pekerjaan 1 m2 Penutup Atap PVC Sheet Ex. Alderon Double Twin Wall", nameEn: "PVC Roofing Sheet Alderon Double Twin Wall 1m2" },
      { code: "A.4.2", nameId: "Pekerjaan Talang", nameEn: "Gutter Works" },
      { code: "A.4.3", nameId: "Pekerjaan Aluminium Foil Bubble", nameEn: "Aluminium Foil Insulation" },
      { code: "A.4.4", nameId: "Pekerjaan Nok, Flashing, dan Aksesoris", nameEn: "Ridge Capping, Flashing & Accessories" }
    ]
  }
];

// Kolam MEP PDF items (under B.M)
const pdfKolamMEP = [
  {
    code: "M.1", nameId: "Pekerjaan Pemipaan Umum", nameEn: "General Plumbing Works", children: [
      {
        code: "M.1.1", nameId: "Pekerjaan Pemipaan Air Hujan", nameEn: "Storm Water Plumbing Works", children: [
          {
            code: "M.1.1.1", nameId: "Instalasi Air Hujan", nameEn: "Storm Water Installation", children: [
              { code: "M.1.1.1.1", nameId: "Pipa Tegak dan Horizontal", nameEn: "Riser & Horizontal Pipes" },
              { code: "M.1.1.1.2", nameId: "PVC AW dia. 4\"", nameEn: "PVC AW dia. 4\"" },
              { code: "M.1.1.1.3", nameId: "PVC AW dia. 3\" Horizontal", nameEn: "PVC AW dia. 3\" Horizontal" },
              { code: "M.1.1.1.4", nameId: "PVC AW dia. 3\" Tegak", nameEn: "PVC AW dia. 3\" Riser" },
              { code: "M.1.1.1.5", nameId: "Fitting dan Aksesoris", nameEn: "Fittings & Accessories" },
              { code: "M.1.1.1.6", nameId: "Hanger dan Bracket", nameEn: "Hangers & Brackets" },
              { code: "M.1.1.1.7", nameId: "Cast Iron Floor Drain dia. 4\"", nameEn: "Cast Iron Floor Drain dia. 4\"" },
              { code: "M.1.1.1.8", nameId: "Grouting dan Coring", nameEn: "Grouting & Coring" }
            ]
          }
        ]
      }
    ]
  },
  {
    code: "M.3", nameId: "Pekerjaan Elektrikal Umum", nameEn: "General Electrical Works", children: [
      {
        code: "M.3.1", nameId: "Pekerjaan Kabel Toefuur", nameEn: "Cable Supply Works", children: [
          {
            code: "M.3.1.1", nameId: "Pekerjaan Pengadaan dan Pemasangan Kabel Distribusi Utama", nameEn: "Main Distribution Cable Supply & Installation", children: [
              { code: "M.3.1.1.1", nameId: "MDP Kolam ke PP Kolam", nameEn: "Pool MDP to Pool PP" },
              { code: "M.3.1.1.2", nameId: "MDP Kolam ke LP Kolam", nameEn: "Pool MDP to Pool LP" }
            ]
          },
          {
            code: "M.3.1.2", nameId: "Pekerjaan dan Pengadaan Kabel Grounding", nameEn: "Grounding Cable Supply", children: [
              { code: "M.3.1.2.1", nameId: "Pengadaan Kabel Grounding BC", nameEn: "BC Grounding Cable" },
              { code: "M.3.1.2.2", nameId: "Pembuatan Titik Grounding Elektrikal", nameEn: "Electrical Grounding Point" },
              { code: "M.3.1.2.3", nameId: "Pembuatan Titik Grounding Elektronika", nameEn: "Electronics Grounding Point" }
            ]
          }
        ]
      }
    ]
  }
];

// PDF overrides map by mass code & discipline letter
const pdfByMassAndDiscipline: Record<string, Record<string, any[]>> = {
  "A": {
    "S": pdfStructure,
    "A": pdfArchitecture,
    "M": pdfMEP
  },
  "B": {
    "S": pdfKolamStructure,
    "A": pdfKolamArchitecture,
    "M": pdfKolamMEP
  }
};

// ========================================================================
// HELPER: normalize SAMIL template codes (remove doubled prefix like S.S.1.1 -> S.1.1)
// ========================================================================
function normalizeSamilCode(code: string): string {
  // The SAMIL template generates codes like S.S.1.1, A.A.1.1, M.M.1.1
  // We need to strip the doubled discipline letter
  return code.replace(/^([SAMIL])\.([SAMIL])\./, "$1.");
}

// ========================================================================
// HELPER: Build flat PDF code lookup
// ========================================================================
function buildPdfLookup(items: any[], lookup: Map<string, any> = new Map()): Map<string, any> {
  items.forEach(item => {
    lookup.set(item.code, item);
    if (item.children) buildPdfLookup(item.children, lookup);
  });
  return lookup;
}

// ========================================================================
// MAIN: Merge SAMIL template + PDF for Gym, pure SAMIL for others
// ========================================================================
const masses = [
  { code: "A", name: "Gym" },
  { code: "B", name: "Kolam" },
  { code: "C", name: "Cafe" },
  { code: "D", name: "Pekerjaan Luar & Infrastruktur (Site Work)" }
];

async function run() {
  console.log("=== STARTING SAMIL + PDF MERGE POPULATION ===\n");
  
  const samilTree = buildDetailFromEstimates(buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA));
  
  const projectRows: any[] = [];
  
  for (const [mIdx, mass] of masses.entries()) {
    const prefix = mass.code;
    const massId = crypto.randomUUID();
    
    // Building Mass Root
    projectRows.push({
      id: massId,
      project_id: fksId,
      wbs_code: prefix,
      title: `${prefix}. ${mass.name}`,
      title_en: null,
      parent_id: null,
      level: 0,
      position: mIdx + 1,
      is_leaf: false
    });
    
    // For each SAMIL discipline (S, A, M, I, L)
    for (const [dIdx, discNode] of samilTree.entries()) {
      const discLetter = discNode.code; // "S", "A", "M", "I", "L"
      const discId = crypto.randomUUID();
      const discWbsCode = `${prefix}.${discLetter}`;
      
      projectRows.push({
        id: discId,
        project_id: fksId,
        wbs_code: discWbsCode,
        title: discNode.nameEn,  // English main
        title_en: discNode.nameId !== discNode.nameEn ? discNode.nameId : null,  // Indonesian subtitle
        parent_id: massId,
        level: 1,
        position: dIdx + 1,
        is_leaf: false
      });
      
      // Build PDF lookup for this discipline (if available for this mass)
      const pdfItems = pdfByMassAndDiscipline[prefix]?.[discLetter];
      const hasPdf = !!pdfItems;
      const pdfLookup = hasPdf ? buildPdfLookup(pdfItems) : new Map();
      
      // Traverse SAMIL children of this discipline
      function traverseSamil(samilNodes: any[] | undefined, parentId: string, level: number) {
        if (!samilNodes) return;
        
        samilNodes.forEach((samilNode, pos) => {
          const id = crypto.randomUUID();
          // Normalize the SAMIL code (strip doubled prefix like S.S.1.1 -> S.1.1)
          const normalizedCode = normalizeSamilCode(samilNode.code);
          const fullCode = `${prefix}.${normalizedCode}`;
          
          let title = samilNode.nameEn;
          let titleEn = samilNode.nameId;
          
          // Check if PDF has an override for this code
          if (hasPdf && pdfLookup.has(normalizedCode)) {
            const pdfItem = pdfLookup.get(normalizedCode)!;
            title = pdfItem.nameEn;    // English
            titleEn = pdfItem.nameId;  // Indonesian
          }
          
          projectRows.push({
            id,
            project_id: fksId,
            wbs_code: fullCode,
            title,
            title_en: titleEn !== title ? titleEn : null,
            parent_id: parentId,
            level,
            position: pos + 1,
            is_leaf: !samilNode.children || samilNode.children.length === 0,
            unit: samilNode.unit || null
          });
          
          // If PDF has deeper children that SAMIL doesn't have, add them
          if (hasPdf && pdfLookup.has(normalizedCode)) {
            const pdfItem = pdfLookup.get(normalizedCode)!;
            if (pdfItem.children && (!samilNode.children || samilNode.children.length === 0)) {
              // PDF has children but SAMIL leaf → insert PDF children
              traversePdf(pdfItem.children, id, level + 1, prefix);
              return; // don't recurse into SAMIL (no SAMIL children)
            }
          }
          
          traverseSamil(samilNode.children, id, level + 1);
        });
      }
      
      // Traverse pure PDF nodes (for items deeper than SAMIL)
      function traversePdf(pdfNodes: any[], parentId: string, level: number, massPrefix: string) {
        pdfNodes.forEach((pdfNode, pos) => {
          const id = crypto.randomUUID();
          const fullCode = `${massPrefix}.${pdfNode.code}`;
          
          projectRows.push({
            id,
            project_id: fksId,
            wbs_code: fullCode,
            title: pdfNode.nameEn,
            title_en: pdfNode.nameId !== pdfNode.nameEn ? pdfNode.nameId : null,
            parent_id: parentId,
            level,
            position: pos + 1,
            is_leaf: !pdfNode.children || pdfNode.children.length === 0,
          });
          
          if (pdfNode.children) {
            traversePdf(pdfNode.children, id, level + 1, massPrefix);
          }
        });
      }
      
      // Also add PDF items that are NOT in SAMIL template 
      // (PDF items with codes that don't exist in SAMIL)
      if (hasPdf && pdfItems) {
        // First, collect all normalized SAMIL codes for this discipline
        const samilCodes = new Set<string>();
        function collectSamilCodes(nodes: any[] | undefined) {
          if (!nodes) return;
          nodes.forEach(n => {
            samilCodes.add(normalizeSamilCode(n.code));
            collectSamilCodes(n.children);
          });
        }
        collectSamilCodes(discNode.children);
        
        // Insert SAMIL children first
        traverseSamil(discNode.children, discId, 2);
        
        // Now add PDF top-level items that don't match any SAMIL code
        // (These are entirely new categories from the PDF)
        const existingL2Codes = new Set(
          (discNode.children || []).map((c: any) => normalizeSamilCode(c.code))
        );
        
        pdfItems.forEach((pdfTopItem, pos) => {
          if (!existingL2Codes.has(pdfTopItem.code)) {
            // This PDF level-2 item doesn't exist in SAMIL template → add it entirely from PDF
            const id = crypto.randomUUID();
            const fullCode = `${prefix}.${pdfTopItem.code}`;
            
            projectRows.push({
              id,
              project_id: fksId,
              wbs_code: fullCode,
              title: pdfTopItem.nameEn,
              title_en: pdfTopItem.nameId !== pdfTopItem.nameEn ? pdfTopItem.nameId : null,
              parent_id: discId,
              level: 2,
              position: 100 + pos,
              is_leaf: !pdfTopItem.children || pdfTopItem.children.length === 0,
            });
            
            if (pdfTopItem.children) {
              traversePdf(pdfTopItem.children, id, 3, prefix);
            }
          }
        });
      } else {
        // Non-Gym: just use SAMIL template as-is
        traverseSamil(discNode.children, discId, 2);
      }
    }
  }
  
  console.log(`Total rows to insert: ${projectRows.length}`);
  
  // Delete old and insert new
  await client.from("project_wbs_items").delete().eq("project_id", fksId);
  
  // Insert in batches of 500
  for (let i = 0; i < projectRows.length; i += 500) {
    const batch = projectRows.slice(i, i + 500);
    const { error } = await client.from("project_wbs_items").insert(batch);
    if (error) {
      console.error(`Insert error at batch ${i}:`, error);
      return;
    }
  }
  
  console.log("SUCCESS! All rows inserted.");
  
  // Verify
  const { data } = await client.from("project_wbs_items").select("wbs_code, title, title_en").eq("project_id", fksId);
  
  // Verify SAMIL for each mass
  for (const m of masses) {
    const discs = data!.filter((d: any) => d.wbs_code.match(new RegExp(`^${m.code}\\.[SAMIL]$`)));
    console.log(`\n[${m.code}. ${m.name}] SAMIL:`);
    discs.forEach((d: any) => console.log(`  ${d.wbs_code} → "${d.title}" / "${d.title_en}"`));
  }
  
  // Verify PBG
  const pbg = data!.find((d: any) => d.wbs_code === "A.S.1.9");
  console.log("\nPBG item:", pbg);
  
  // Verify a PDF-specific item
  const pj01 = data!.find((d: any) => d.wbs_code === "A.A.6.1.1");
  console.log("PJ01 item:", pj01);
}

run();
