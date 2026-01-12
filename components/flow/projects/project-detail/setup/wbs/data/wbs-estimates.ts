import { EstimatesDeltaItem } from "./wbs-inherit";

export const RAW_WBS_ESTIMATES_DELTA = [
  /* =========================
     STRUCTURE (S)
  ========================= */

  {
    parentCode: "S.1",
    items: [
      { code: "S.1.1", nameEn: "Surveying & Setting Out", nameId: "Pengukuran & Bouwplank", unit: "m1", unitPrice: 35000 },
      { code: "S.1.2", nameEn: "Site Clearing & Initial Leveling", nameId: "Pembersihan & Perataan Lahan", unit: "m2", unitPrice: 16000 },
      { code: "S.1.3", nameEn: "Temporary Access", nameId: "Akses Proyek Sementara", unit: "ls", unitPrice: 5000000 },
      { code: "S.1.4", nameEn: "Temporary Electricity Supply", nameId: "Listrik Kerja", unit: "month", unitPrice: 2500000 },
      { code: "S.1.5", nameEn: "Temporary Water Supply", nameId: "Air Kerja", unit: "month", unitPrice: 1250000 },
      { code: "S.1.6", nameEn: "Site Office & Temporary Storage", nameId: "Direksi Keet & Gudang Sementara", unit: "ls", unitPrice: 6000000 },
      { code: "S.1.7", nameEn: "HSE Equipment & Signage", nameId: "Perlengkapan K3", unit: "ls", unitPrice: 385000 },
      { code: "S.1.8", nameEn: "Heavy Demolition Works", nameId: "Pembongkaran Berat", unit: "m3", unitPrice: 250000 },
    ],
  },
  {
    parentCode: "S.2",
    items: [
      { code: "S.2.1", nameEn: "General Excavation", nameId: "Galian Umum", unit: "m3", unitPrice: 95000 },
      { code: "S.2.2", nameEn: "Foundation Excavation", nameId: "Galian Fondasi", unit: "m3", unitPrice: 150000 },
      { code: "S.2.3", nameEn: "Tie-Beam Excavation", nameId: "Galian Sloof", unit: "m3", unitPrice: 135000 },
      { code: "S.2.4", nameEn: "Backfilling & Compaction", nameId: "Urugan Kembali & Pemadatan", unit: "m3", unitPrice: 110000 },
      { code: "S.2.5", nameEn: "Excavated Soil Disposal", nameId: "Pembuangan Tanah", unit: "m3", unitPrice: 65000 },
    ],
  },
  {
    parentCode: "S.3",
    items: [
      { code: "S.3.1", nameEn: "Stone Masonry Foundation", nameId: "Fondasi Batu Kali", unit: "m3", unitPrice: 1250000 },
      { code: "S.3.2", nameEn: "Footplate Foundation", nameId: "Fondasi Telapak", unit: "m3", unitPrice: 4200000 },
      { code: "S.3.3", nameEn: "Pile Cap", nameId: "Pile Cap", unit: "m3", unitPrice: 4600000 },
      { code: "S.3.4", nameEn: "Pile Foundation", nameId: "Fondasi Dalam", unit: "m1", unitPrice: 380000 },
      { code: "S.3.5", nameEn: "Tie-Beam", nameId: "Sloof", unit: "m3", unitPrice: 4250000 },
    ],
  },
  {
    parentCode: "S.4",
    items: [
      { code: "S.4.1", nameEn: "Reinforced Concrete Columns", nameId: "Kolom Beton", unit: "m3", unitPrice: 4800000 },
      { code: "S.4.2", nameEn: "Reinforced Concrete Beams", nameId: "Balok Beton", unit: "m3", unitPrice: 4600000 },
      { code: "S.4.3", nameEn: "Reinforced Concrete Slabs", nameId: "Pelat Lantai Beton", unit: "m3", unitPrice: 4250000 },
      { code: "S.4.4", nameEn: "Reinforced Concrete Stairs", nameId: "Tangga Beton", unit: "m3", unitPrice: 4600000 },
      { code: "S.4.5", nameEn: "Structural Steel Columns", nameId: "Kolom Baja", unit: "kg", unitPrice: 28000 },
      { code: "S.4.6", nameEn: "Structural Steel Beams", nameId: "Balok Baja", unit: "kg", unitPrice: 27000 },
      { code: "S.4.7", nameEn: "Secondary Steel Framing", nameId: "Rangka Baja Sekunder", unit: "kg", unitPrice: 28000 },
      { code: "S.4.8", nameEn: "Structural Steel Stairs", nameId: "Tangga Baja", unit: "kg", unitPrice: 32000 },
    ],
  },
  {
    parentCode: "S.5",
    items: [
      { code: "S.5.1", nameEn: "Lightweight Steel Roof Framing", nameId: "Rangka Atap Baja Ringan", unit: "m2", unitPrice: 185000 },
      { code: "S.5.2", nameEn: "Structural Steel Roof Framing", nameId: "Rangka Atap Baja WF/Hollow", unit: "kg", unitPrice: 35000 },
    ],
  },

  /* =========================
     ARCHITECTURE (A)
  ========================= */

  {
    parentCode: "A.1",
    items: [
      { code: "A.1.1", nameEn: "Lightweight Block Wall", nameId: "Pasangan Dinding Bata Ringan", unit: "m2", unitPrice: 145000 },
      { code: "A.1.2", nameEn: "Brick Wall", nameId: "Pasangan Dinding Bata Merah", unit: "m2", unitPrice: 175000 },
      { code: "A.1.3", nameEn: "Concrete Wall", nameId: "Dinding Beton", unit: "m2", unitPrice: 850000 },
      { code: "A.1.4", nameEn: "Partition Wall", nameId: "Dinding Partisi", unit: "m2", unitPrice: 245000 },
      { code: "A.1.5", nameEn: "Breeze Block Wall", nameId: "Dinding Roster", unit: "m2", unitPrice: 325000 },
    ],
  },
  {
    parentCode: "A.2",
    items: [
      { code: "A.2.1", nameEn: "Wall Tiles", nameId: "Keramik Dinding", unit: "m2", unitPrice: 285000 },
      { code: "A.2.2", nameEn: "Natural Stone Wall Cladding", nameId: "Cladding Batu Alam", unit: "m2", unitPrice: 650000 },
      { code: "A.2.3", nameEn: "Timber/WPC Wall Cladding", nameId: "Cladding Kayu/WPC", unit: "m2", unitPrice: 750000 },
      { code: "A.2.4", nameEn: "ACP Wall Panel", nameId: "Panel ACP", unit: "m2", unitPrice: 650000 },
      { code: "A.2.5", nameEn: "HPL Wall Panel", nameId: "Panel HPL", unit: "m2", unitPrice: 550000 },
      { code: "A.2.6", nameEn: "Textured Wall", nameId: "Kamprot/Finishing Tekstur", unit: "m2", unitPrice: 95000 },
    ],
  },

  /* =========================
     A.3 Penutup Lantai
  ========================= */
  {
    parentCode: "A.3",
    items: [
      { code: "A.3.1", nameEn: "Standard Floor Tiles (60x60)", nameId: "Keramik Standar 60x60", unit: "m2", unitPrice: 225000 },
      { code: "A.3.2", nameEn: "Large Floor Tiles (60x120)", nameId: "Keramik Besar 60x120", unit: "m2", unitPrice: 425000 },
      { code: "A.3.3", nameEn: "Marble Flooring", nameId: "Marmer", unit: "m2", unitPrice: 1800000 },
      { code: "A.3.4", nameEn: "Parquet/Timber Flooring", nameId: "Parket/Kayu", unit: "m2", unitPrice: 550000 },
      { code: "A.3.5", nameEn: "Exposed/Polished Concrete Floor", nameId: "Beton Ekspos", unit: "m2", unitPrice: 185000 },
      { code: "A.3.6", nameEn: "Grass Block Paving", nameId: "Grass Block", unit: "m2", unitPrice: 175000 },
      { code: "A.3.7", nameEn: "Concrete Paving Block", nameId: "Paving Block", unit: "m2", unitPrice: 165000 },
      { code: "A.3.8", nameEn: "Epoxy Floor Coating", nameId: "Epoxy", unit: "m2", unitPrice: 285000 },
      { code: "A.3.9", nameEn: "Vinyl/SPC Flooring", nameId: "Vinyl/SPC", unit: "m2", unitPrice: 250000 },
      { code: "A.3.10", nameEn: "Rubber Flooring", nameId: "Rubber", unit: "m2", unitPrice: 350000 },
    ],
  },

  /* =========================
     A.4 Plafon
  ========================= */
  {
    parentCode: "A.4",
    items: [
      { code: "A.4.1", nameEn: "Standard Gypsum Ceiling", nameId: "Plafon Gypsum Standar", unit: "m2", unitPrice: 165000 },
      { code: "A.4.2", nameEn: "Water Resistant Gypsum Ceiling", nameId: "Plafon Gypsum WR", unit: "m2", unitPrice: 185000 },
      { code: "A.4.3", nameEn: "HPL Ceiling Panel", nameId: "Plafon HPL", unit: "m2", unitPrice: 550000 },
      { code: "A.4.4", nameEn: "WPC Ceiling Panel", nameId: "Plafon WPC", unit: "m2", unitPrice: 650000 },
    ],
  },

  /* =========================
     A.5 Penutup Atap
  ========================= */
  {
    parentCode: "A.5",
    items: [
      { code: "A.5.1", nameEn: "Roof Tiles", nameId: "Genteng", unit: "m2", unitPrice: 250000 },
      { code: "A.5.2", nameEn: "Metal Sheet Roofing", nameId: "Metal Sheet", unit: "m2", unitPrice: 220000 },
      { code: "A.5.3", nameEn: "UPVC Sheet Roofing", nameId: "Atap UPVC", unit: "m2", unitPrice: 280000 },
      { code: "A.5.4", nameEn: "Roof Deck Waterproofing", nameId: "Waterproofing Atap Dak", unit: "m2", unitPrice: 125000 },
    ],
  },

  /* =========================
     A.6 Pengecatan
  ========================= */
  {
    parentCode: "A.6",
    items: [
      { code: "A.6.1", nameEn: "Interior Wall Painting", nameId: "Cat Dinding Interior", unit: "m2", unitPrice: 45000 },
      { code: "A.6.2", nameEn: "Exterior Wall Painting", nameId: "Cat Dinding Eksterior", unit: "m2", unitPrice: 65000 },
      { code: "A.6.3", nameEn: "Interior Ceiling Painting", nameId: "Cat Plafon Interior", unit: "m2", unitPrice: 45000 },
      { code: "A.6.4", nameEn: "Exterior Ceiling Painting", nameId: "Cat Plafon Exterior", unit: "m2", unitPrice: 65000 },
      { code: "A.6.5", nameEn: "Special Interior Painting", nameId: "Cat Khusus Interior", unit: "m2", unitPrice: 125000 },
      { code: "A.6.6", nameEn: "Special Exterior Painting", nameId: "Cat Khusus Eksterior", unit: "m2", unitPrice: 145000 },
    ],
  },

  /* =========================
     A.7 Kaca, Pintu, Jendela
  ========================= */
  {
    parentCode: "A.7",
    items: [
      { code: "A.7.1", nameEn: "Timber Door", nameId: "Pintu Kayu", unit: "unit", unitPrice: 3500000 },
      { code: "A.7.2", nameEn: "Glass Door", nameId: "Pintu Kaca", unit: "unit", unitPrice: 4800000 },
      { code: "A.7.3", nameEn: "Aluminium Door", nameId: "Pintu Aluminium", unit: "unit", unitPrice: 3200000 },
      { code: "A.7.4", nameEn: "ACP Door", nameId: "Pintu ACP", unit: "unit", unitPrice: 3400000 },
      { code: "A.7.5", nameEn: "Fixed Window", nameId: "Jendela Mati", unit: "m2", unitPrice: 1250000 },
      { code: "A.7.6", nameEn: "Operable Window", nameId: "Jendela Hidup", unit: "m2", unitPrice: 1850000 },
      { code: "A.7.7", nameEn: "Frameless Glass", nameId: "Kaca Frameless", unit: "m2", unitPrice: 1500000 },
    ],
  },

  /* =========================
     A.8 Fasad
  ========================= */
  {
    parentCode: "A.8",
    items: [
      { code: "A.8.1", nameEn: "ACP Façade System", nameId: "Fasad ACP", unit: "m2", unitPrice: 850000 },
      { code: "A.8.2", nameEn: "Natural Stone Façade", nameId: "Fasad Batu Alam", unit: "m2", unitPrice: 1200000 },
      { code: "A.8.3", nameEn: "Timber/WPC Façade", nameId: "Fasad Kayu/WPC", unit: "m2", unitPrice: 1350000 },
      { code: "A.8.4", nameEn: "Secondary Skin Façade", nameId: "Secondary Skin", unit: "m2", unitPrice: 1450000 },
      { code: "A.8.5", nameEn: "Special Façade Elements", nameId: "Fasad Khusus", unit: "m2", unitPrice: 1850000 },
    ],
  },

  /* =========================
     A.9 Sanitair
  ========================= */
  {
    parentCode: "A.9",
    items: [
      { code: "A.9.1", nameEn: "Water Closet", nameId: "Closet", unit: "unit", unitPrice: 4500000 },
      { code: "A.9.2", nameEn: "Jetwasher", nameId: "Jetwasher", unit: "unit", unitPrice: 350000 },
      { code: "A.9.3", nameEn: "Wash Basin", nameId: "Wastafel", unit: "unit", unitPrice: 2200000 },
      { code: "A.9.4", nameEn: "Wash Basin Faucet", nameId: "Wastafel Faucet", unit: "unit", unitPrice: 850000 },
      { code: "A.9.5", nameEn: "Shower Set", nameId: "Shower Set", unit: "unit", unitPrice: 3500000 },
      { code: "A.9.6", nameEn: "Urinoir", nameId: "Urinal", unit: "unit", unitPrice: 3200000 },
      { code: "A.9.7", nameEn: "Tissue Holder", nameId: "Tissue Holder", unit: "unit", unitPrice: 150000 },
      { code: "A.9.8", nameEn: "Towel Bar", nameId: "Towel Bar", unit: "unit", unitPrice: 350000 },
      { code: "A.9.9", nameEn: "Wall Faucet", nameId: "Keran Dinding", unit: "unit", unitPrice: 250000 },
      { code: "A.9.10", nameEn: "Hook", nameId: "Hook", unit: "unit", unitPrice: 85000 },
    ],
  },

  /* =========================
     A.10 Lain-Lain
  ========================= */
  {
    parentCode: "A.10",
    items: [
      { code: "A.10.1", nameEn: "Mirror Installation", nameId: "Cermin", unit: "m2", unitPrice: 650000 },
      { code: "A.10.2", nameEn: "Railing & Handrail", nameId: "Railing & Handrail", unit: "m1", unitPrice: 850000 },
      { code: "A.10.3", nameEn: "Canopy", nameId: "Kanopi", unit: "m2", unitPrice: 1250000 },
      { code: "A.10.4", nameEn: "Signage & Wayfinding", nameId: "Signage & Wayfinding", unit: "set", unitPrice: 2500000 },
      { code: "A.10.5", nameEn: "Decorative Grill/Screen", nameId: "Grill, Screen, Kisi-kisi", unit: "m2", unitPrice: 1500000 },
      { code: "A.10.6", nameEn: "Catch-All", nameId: "Elemen Lainnya", unit: "ls", unitPrice: 15000000 },
    ],
  },

  /* =========================
     M.1 Pemipaan
  ========================= */
  {
    parentCode: "M.1",
    items: [
      { code: "M.1.1", nameEn: "Clean Water Piping", nameId: "Instalasi Pipa Air Bersih", unit: "m1", unitPrice: 65000 },
      { code: "M.1.2", nameEn: "Clean Ground Water Tank", nameId: "Tandon Tanam Air Bersih", unit: "m3", unitPrice: 2500000 },
      { code: "M.1.3", nameEn: "Clean Roof Water Tank", nameId: "Tandon Atap Air Bersih", unit: "m3", unitPrice: 1500000 },
      { code: "M.1.4", nameEn: "Clean Water Pump", nameId: "Pompa Air Bersih", unit: "unit", unitPrice: 3500000 },
      { code: "M.1.5", nameEn: "Waste Water Piping", nameId: "Instalasi Pipa Air Bekas", unit: "m1", unitPrice: 85000 },
      { code: "M.1.6", nameEn: "Inspection Chamber", nameId: "Bak Kontrol", unit: "unit", unitPrice: 850000 },
      { code: "M.1.7", nameEn: "Septic Tank", nameId: "Septic Tank", unit: "unit", unitPrice: 12500000 },
      { code: "M.1.8", nameEn: "Grease Trap", nameId: "Grease Trap", unit: "unit", unitPrice: 850000 },
      { code: "M.1.9", nameEn: "Rainwater Downpipe", nameId: "Instalasi Pipa Air Hujan", unit: "m1", unitPrice: 55000 },
      { code: "M.1.10", nameEn: "Infiltration Well", nameId: "Sumur Resapan", unit: "unit", unitPrice: 3500000 },
      { code: "M.1.11", nameEn: "Drainage Channel", nameId: "Saluran Drainase", unit: "m1", unitPrice: 450000 },
    ],
  },

  /* =========================
     M.2 Elektrikal
  ========================= */
  {
    parentCode: "M.2",
    items: [
      { code: "M.2.1", nameEn: "Installed Electrical Capacity", nameId: "Penyambungan Daya Listrik", unit: "kVA", unitPrice: 1500000 },
      { code: "M.2.2", nameEn: "Electrical Distribution Boards", nameId: "Panel Listrik", unit: "set", unitPrice: 5000000 }, // Est
      { code: "M.2.3", nameEn: "Generator Set", nameId: "Genset", unit: "unit", unitPrice: 150000000 }, // Est
      { code: "M.2.4", nameEn: "Interior Lighting", nameId: "Lampu Interior", unit: "titik", unitPrice: 250000 },
      { code: "M.2.5", nameEn: "Exterior Lighting", nameId: "Lampu Eksterior", unit: "titik", unitPrice: 350000 },
      { code: "M.2.6", nameEn: "General Power Outlets", nameId: "Stopkontak Umum", unit: "titik", unitPrice: 220000 },
      { code: "M.2.7", nameEn: "Dedicated Power Outlets", nameId: "Stopkontak Khusus", unit: "titik", unitPrice: 350000 },
    ],
  },

  /* =========================
     M.3 Elektronika
  ========================= */
  {
    parentCode: "M.3",
    items: [
      { code: "M.3.1", nameEn: "CCTV Surveillance System", nameId: "Sistem CCTV", unit: "titik", unitPrice: 1500000 },
      { code: "M.3.2", nameEn: "Access Control System", nameId: "Kontrol Akses", unit: "unit", unitPrice: 4500000 },
      { code: "M.3.3", nameEn: "Security Alarm", nameId: "Sistem Alarm", unit: "set", unitPrice: 8500000 },
      { code: "M.3.4", nameEn: "Data/LAN Points", nameId: "Titik Data/LAN", unit: "titik", unitPrice: 450000 },
      { code: "M.3.5", nameEn: "WiFi Access Point", nameId: "Poin Akses WiFi", unit: "unit", unitPrice: 2500000 },
      { code: "M.3.6", nameEn: "Sound System", nameId: "Tata Suara", unit: "ls", unitPrice: 15000000 },
      { code: "M.3.7", nameEn: "Display/Multimedia System", nameId: "Sistem Display/Multimedia", unit: "ls", unitPrice: 25000000 },
    ],
  },

  /* =========================
     M.4 HVAC
  ========================= */
  {
    parentCode: "M.4",
    items: [
      { code: "M.4.1", nameEn: "Wall Mounted AC", nameId: "AC Dinding", unit: "unit", unitPrice: 5500000 },
      { code: "M.4.2", nameEn: "Ceiling Cassette AC", nameId: "AC Plafon", unit: "unit", unitPrice: 12500000 }, // Est
      { code: "M.4.3", nameEn: "Floor Standing AC", nameId: "AC Standing", unit: "unit", unitPrice: 15000000 }, // Est
      { code: "M.4.4", nameEn: "Other AC Systems", nameId: "Sistem AC Lain", unit: "ls", unitPrice: 25000000 }, // Est
      { code: "M.4.5", nameEn: "Ceiling Fan", nameId: "Kipas Angin", unit: "unit", unitPrice: 2500000 }, // Est
      { code: "M.4.6", nameEn: "Exhaust Fan", nameId: "Exhaust Fan", unit: "unit", unitPrice: 650000 },
    ],
  },

  /* =========================
     M.5 Proteksi Kebakaran
  ========================= */
  {
    parentCode: "M.5",
    items: [
      { code: "M.5.1", nameEn: "Fire Sprinkler System", nameId: "Sistem Sprinkler", unit: "titik", unitPrice: 550000 },
      { code: "M.5.2", nameEn: "Fire Hydrant System", nameId: "Hydrant", unit: "titik", unitPrice: 15000000 },
      { code: "M.5.3", nameEn: "Fire Pump Set", nameId: "Pompa Kebakaran", unit: "set", unitPrice: 125000000 }, // Est
      { code: "M.5.4", nameEn: "Fire Extinguisher", nameId: "APAR", unit: "unit", unitPrice: 1750000 },
      { code: "M.5.5", nameEn: "Fire Alarm & Detector", nameId: "Alarm Kebakaran", unit: "titik", unitPrice: 850000 },
      { code: "M.5.6", nameEn: "Manual Call Point & Alarm Bell", nameId: "Bel Kebakaran", unit: "titik", unitPrice: 650000 },
    ],
  },

  /* =========================
     M.6 Proteksi Petir
  ========================= */
  {
    parentCode: "M.6",
    items: [
      { code: "M.6.1", nameEn: "Lightning Air Terminal", nameId: "Finial Petir", unit: "titik", unitPrice: 2500000 },
      { code: "M.6.2", nameEn: "Down Conductor", nameId: "Konduktor Turun", unit: "titik", unitPrice: 850000 },
      { code: "M.6.3", nameEn: "Grounding System", nameId: "Sistem Grounding", unit: "titik", unitPrice: 1500000 },
    ],
  },

  /* =========================
     I.1 Interior Khusus
  ========================= */
  {
    parentCode: "I.1",
    items: [
      { code: "I.1.1", nameEn: "Built-in Furniture", nameId: "Built-in Furniture", unit: "m1", unitPrice: 4500000 },
      { code: "I.1.2", nameEn: "Loose Furniture", nameId: "Loose Furniture", unit: "ls", unitPrice: 75000000 },      // Adjust as needed
      { code: "I.1.3", nameEn: "Custom Interior Partition", nameId: "Partisi Interior Khusus", unit: "m2", unitPrice: 1250000 },
    ],
  },

  /* =========================
     I.2 Material Khusus
  ========================= */
  {
    parentCode: "I.2",
    items: [
      { code: "I.2.1", nameEn: "Interior Wall Panel", nameId: "Panel Dinding Interior Khusus", unit: "m2", unitPrice: 950000 },
      { code: "I.2.2", nameEn: "Special Interior Flooring", nameId: "Lantai Interior Khusus", unit: "m2", unitPrice: 1250000 },
      { code: "I.2.3", nameEn: "Special Interior Ceiling", nameId: "Plafon Interior Khusus", unit: "m2", unitPrice: 850000 },
    ],
  },

  /* =========================
     I.3 Pencahayaan Khusus
  ========================= */
  {
    parentCode: "I.3",
    items: [
      { code: "I.3.1", nameEn: "Decorative Lighting", nameId: "Lampu Dekoratif", unit: "unit", unitPrice: 3500000 },
      { code: "I.3.2", nameEn: "Accent Lighting", nameId: "Lampu Aksen", unit: "unit", unitPrice: 850000 },
      { code: "I.3.3", nameEn: "Lighting Control System", nameId: "Sistem Kontrol Lampu", unit: "set", unitPrice: 15000000 },
    ],
  },

  /* =========================
     L.1 Pekerasan
  ========================= */
  {
    parentCode: "L.1",
    items: [
      { code: "L.1.1", nameEn: "Paving Block", nameId: "Paving Block", unit: "m2", unitPrice: 185000 },
      { code: "L.1.2", nameEn: "Grass Block", nameId: "Grass Block", unit: "m2", unitPrice: 225000 },
      { code: "L.1.3", nameEn: "Natural / Stepping Stone", nameId: "Batu Alam", unit: "m2", unitPrice: 350000 },
      { code: "L.1.4", nameEn: "Wood Decking", nameId: "Deck Kayu", unit: "m2", unitPrice: 850000 },
      { code: "L.1.5", nameEn: "Kerb / Border", nameId: "Kerb", unit: "m1", unitPrice: 125000 },
    ],
  },

  /* =========================
     L.2 Tanaman
  ========================= */
  {
    parentCode: "L.2",
    items: [
      { code: "L.2.1", nameEn: "Grass", nameId: "Rumput", unit: "m2", unitPrice: 65000 },
      { code: "L.2.2", nameEn: "Shrubs", nameId: "Tanaman Semak", unit: "unit", unitPrice: 35000 },
      { code: "L.2.3", nameEn: "Small–Medium Trees", nameId: "Pohon Kecil–Sedang", unit: "unit", unitPrice: 850000 },
      { code: "L.2.4", nameEn: "Large Trees", nameId: "Pohon Besar", unit: "unit", unitPrice: 3500000 },
    ],
  },

  /* =========================
     L.3 Elemen Khusus
  ========================= */
  {
    parentCode: "L.3",
    items: [
      { code: "L.3.1", nameEn: "Pergola / Gazebo", nameId: "Pergola/Gazebo", unit: "m2", unitPrice: 2500000 },
      { code: "L.3.2", nameEn: "Pond / Water Feature", nameId: "Kolam/Fitur Air", unit: "m2", unitPrice: 3500000 },
      { code: "L.3.3", nameEn: "Outdoor Furniture", nameId: "Furnitur Outdoor", unit: "ls", unitPrice: 15000000 },
      { code: "L.3.4", nameEn: "Decorative Landscape Lighting", nameId: "Lampu Taman", unit: "titik", unitPrice: 750000 },
      { code: "L.3.5", nameEn: "Other Landscape Elements", nameId: "Elemen Lainnya", unit: "ls", unitPrice: 5000000 },
    ],
  },


];
