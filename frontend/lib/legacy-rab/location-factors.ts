export type LocationFactor = {
  province: string;
  city?: string;
  regionalFactor: number;
  difficultyFactor: number;
};

export const LOCATION_FACTORS: LocationFactor[] = [
  /* =======================
     DKI JAKARTA
  ======================= */
  { province: "DKI Jakarta", regionalFactor: 0.97, difficultyFactor: 1.05 },
  { province: "DKI Jakarta", city: "Jakarta Pusat", regionalFactor: 1.0, difficultyFactor: 1.0 },
  { province: "DKI Jakarta", city: "Jakarta Selatan", regionalFactor: 0.99, difficultyFactor: 1.0 },
  { province: "DKI Jakarta", city: "Jakarta Barat", regionalFactor: 0.98, difficultyFactor: 1.0 },
  { province: "DKI Jakarta", city: "Jakarta Utara", regionalFactor: 0.97, difficultyFactor: 1.0 },
  { province: "DKI Jakarta", city: "Jakarta Timur", regionalFactor: 0.96, difficultyFactor: 1.0 },
  { province: "DKI Jakarta", city: "Kepulauan Seribu", regionalFactor: 0.95, difficultyFactor: 1.15 },

  /* =======================
     BANTEN
  ======================= */
  { province: "Banten", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Banten", city: "Tangerang Kota", regionalFactor: 0.95, difficultyFactor: 1.0 },
  { province: "Banten", city: "Tangerang Selatan", regionalFactor: 0.96, difficultyFactor: 1.05 },
  { province: "Banten", city: "Tangerang Kab", regionalFactor: 0.94, difficultyFactor: 1.0 },
  { province: "Banten", city: "Serang Kota", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Banten", city: "Serang Kab", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Banten", city: "Lebak", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Banten", city: "Cilegon", regionalFactor: 0.92, difficultyFactor: 1.05 },
  { province: "Banten", city: "Pandeglang", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Banten", city: "BSD/Alam Sutera", regionalFactor: 0.97, difficultyFactor: 1.05 },
  { province: "Banten", city: "Karawaci/Lippo", regionalFactor: 0.96, difficultyFactor: 1.05 },
  { province: "Banten", city: "Industri Merak", regionalFactor: 0.93, difficultyFactor: 1.0 },
  { province: "Banten", city: "Wisata Pantai Pandeglang", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Banten", city: "Lebak Selatan", regionalFactor: 0.83, difficultyFactor: 1.20 },

  /* =======================
     JAWA BARAT
  ======================= */
  { province: "Jawa Barat", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Bekasi Kota", regionalFactor: 0.95, difficultyFactor: 1.0 },
  { province: "Jawa Barat", city: "Bekasi Kab", regionalFactor: 0.94, difficultyFactor: 1.0 },
  { province: "Jawa Barat", city: "Depok", regionalFactor: 0.95, difficultyFactor: 1.0 },
  { province: "Jawa Barat", city: "Bogor Kota", regionalFactor: 0.94, difficultyFactor: 1.0 },
  { province: "Jawa Barat", city: "Bogor Kab", regionalFactor: 0.92, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Bandung Kota", regionalFactor: 0.92, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Bandung Kab", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Bandung Barat", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Cimahi", regionalFactor: 0.91, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Sukabumi Kota", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Sukabumi Kab", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Cirebon Kota", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Cirebon Kab", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Tasikmalaya Kota", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Tasikmalaya Kab", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Banjar Kota", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Cianjur", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Indramayu", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Sumedang", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Subang", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Karawang", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Purwakarta", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Jawa Barat", city: "Kuningan", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Garut", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Barat", city: "Pangandaran", regionalFactor: 0.87, difficultyFactor: 1.10 },

  /* =======================
     JAWA TENGAH
  ======================= */
  { province: "Jawa Tengah", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Semarang Kota", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Semarang Kab", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Surakarta Kota", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Salatiga Kota", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Banyumas", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Purworejo", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Magelang Kota", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Magelang Kab", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Pekalongan Kota", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Pekalongan Kab", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Tegal Kota", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Tegal Kab", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Boyolali", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Sukoharjo", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Karanganyar", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Klaten", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Sragen", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Wonogiri", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Kebumen", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Wonosobo", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Temanggung", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Banjarnegara", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Purbalingga", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Cilacap", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Brebes", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Pemalang", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Batang", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Kendal", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Demak", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Kudus", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Jepara", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Pati", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Tengah", city: "Rembang", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Tengah", city: "Blora", regionalFactor: 0.83, difficultyFactor: 1.20 },

  /* =======================
     DI YOGYAKARTA
  ======================= */
  { province: "DI Yogyakarta", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "DI Yogyakarta", city: "Yogyakarta Kota", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "DI Yogyakarta", city: "Sleman", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "DI Yogyakarta", city: "Bantul", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "DI Yogyakarta", city: "Kulon Progo", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "DI Yogyakarta", city: "Gunungkidul", regionalFactor: 0.83, difficultyFactor: 1.20 },

  /* =======================
     JAWA TIMUR
  ======================= */
  { province: "Jawa Timur", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Surabaya", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Jawa Timur", city: "Malang Kota", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Malang Kab", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Madiun Kota", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Madiun Kab", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Batu Kota", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Mojokerto Kota", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Mojokerto Kab", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Pasuruan Kota", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Pasuruan Kab", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Probolinggo Kota", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Probolinggo Kab", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Kediri Kota", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Kediri Kab", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Blitar Kota", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Blitar Kab", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Sidoarjo", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Jawa Timur", city: "Gresik", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Jawa Timur", city: "Jombang", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Nganjuk", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Tulungagung", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Lamongan", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Bojonegoro", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Tuban", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Magetan", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Ngawi", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Ponorogo", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Pacitan", regionalFactor: 0.82, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Lumajang", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Jember", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Bondowoso", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Situbondo", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Banyuwangi", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Jawa Timur", city: "Bangkalan", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Sampang", regionalFactor: 0.82, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Pamekasan", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Jawa Timur", city: "Sumenep", regionalFactor: 0.82, difficultyFactor: 1.20 },

  /* =======================
     BALI
  ======================= */
  { province: "Bali", regionalFactor: 0.92, difficultyFactor: 1.05 },
  { province: "Bali", city: "Denpasar", regionalFactor: 0.93, difficultyFactor: 1.0 },
  { province: "Bali", city: "Badung", regionalFactor: 0.95, difficultyFactor: 1.0 },
  { province: "Bali", city: "Gianyar", regionalFactor: 0.94, difficultyFactor: 1.0 },
  { province: "Bali", city: "Tabanan", regionalFactor: 0.92, difficultyFactor: 1.05 },
  { province: "Bali", city: "Bangli", regionalFactor: 0.91, difficultyFactor: 1.05 },
  { province: "Bali", city: "Buleleng", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Bali", city: "Karangasem", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Bali", city: "Klungkung", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Bali", city: "Jembrana", regionalFactor: 0.89, difficultyFactor: 1.05 },

  /* =======================
     NTB
  ======================= */
  { province: "NTB", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "NTB", city: "Mataram", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "NTB", city: "Lombok", regionalFactor: 0.88, difficultyFactor: 1.10 },

  /* =======================
     NTT
  ======================= */
  { province: "NTT", regionalFactor: 0.82, difficultyFactor: 1.20 },
  { province: "NTT", city: "Kupang", regionalFactor: 0.83, difficultyFactor: 1.20 },

  /* =======================
     ACEH
  ======================= */
  { province: "Aceh", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Aceh", city: "Banda Aceh", regionalFactor: 0.85, difficultyFactor: 1.10 },

  /* =======================
     SUMATERA UTARA
  ======================= */
  { province: "Sumatera Utara", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Sumatera Utara", city: "Medan", regionalFactor: 0.90, difficultyFactor: 1.05 },

  /* =======================
     SUMATERA BARAT
  ======================= */
  { province: "Sumatera Barat", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Sumatera Barat", city: "Padang", regionalFactor: 0.87, difficultyFactor: 1.10 },

  /* =======================
     RIAU
  ======================= */
  { province: "Riau", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Riau", city: "Pekanbaru", regionalFactor: 0.90, difficultyFactor: 1.05 },

  /* =======================
     KEP. RIAU
  ======================= */
  { province: "Kep. Riau", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Kep. Riau", city: "Tanjung Pinang", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Kep. Riau", city: "Batam", regionalFactor: 0.92, difficultyFactor: 1.05 },

  /* =======================
     JAMBI
  ======================= */
  { province: "Jambi", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Jambi", city: "Jambi", regionalFactor: 0.86, difficultyFactor: 1.10 },

  /* =======================
     SUMATERA SELATAN
  ======================= */
  { province: "Sumatera Selatan", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Sumatera Selatan", city: "Palembang", regionalFactor: 0.88, difficultyFactor: 1.10 },

  /* =======================
     BENGKULU
  ======================= */
  { province: "Bengkulu", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Bengkulu", city: "Bengkulu", regionalFactor: 0.85, difficultyFactor: 1.10 },

  /* =======================
     KEP. BANGKA BELITUNG
  ======================= */
  { province: "Kep. Bangka Belitung", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Kep. Bangka Belitung", city: "Pangkalpinang", regionalFactor: 0.87, difficultyFactor: 1.10 },

  /* =======================
     LAMPUNG
  ======================= */
  { province: "Lampung", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Lampung", city: "Bandar Lampung", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Lampung", city: "Lampung Barat", regionalFactor: 0.82, difficultyFactor: 1.20 },

  /* =======================
     KALIMANTAN BARAT
  ======================= */
  { province: "Kalimantan Barat", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Kalimantan Barat", city: "Pontianak", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Kalimantan Barat", city: "Singkawang", regionalFactor: 0.90, difficultyFactor: 1.05 },

  /* =======================
     KALIMANTAN TENGAH
  ======================= */
  { province: "Kalimantan Tengah", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Kalimantan Tengah", city: "Palangka Raya", regionalFactor: 0.88, difficultyFactor: 1.10 },

  /* =======================
     KALIMANTAN SELATAN
  ======================= */
  { province: "Kalimantan Selatan", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Kalimantan Selatan", city: "Banjarmasin", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Kalimantan Selatan", city: "Banjarbaru", regionalFactor: 0.89, difficultyFactor: 1.05 },

  /* =======================
     KALIMANTAN TIMUR
  ======================= */
  { province: "Kalimantan Timur", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Kalimantan Timur", city: "Samarinda", regionalFactor: 0.91, difficultyFactor: 1.05 },
  { province: "Kalimantan Timur", city: "Balikpapan", regionalFactor: 0.93, difficultyFactor: 1.0 },
  { province: "Kalimantan Timur", city: "IKN", regionalFactor: 0.95, difficultyFactor: 1.25 },

  /* =======================
     KALIMANTAN UTARA
  ======================= */
  { province: "Kalimantan Utara", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Kalimantan Utara", city: "Tanjung Selor", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Kalimantan Utara", city: "Tarakan", regionalFactor: 0.91, difficultyFactor: 1.05 },

  /* =======================
     SULAWESI UTARA
  ======================= */
  { province: "Sulawesi Utara", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Sulawesi Utara", city: "Manado", regionalFactor: 0.91, difficultyFactor: 1.05 },
  { province: "Sulawesi Utara", city: "Bitung", regionalFactor: 0.92, difficultyFactor: 1.05 },

  /* =======================
     GORONTALO
  ======================= */
  { province: "Gorontalo", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Gorontalo", city: "Gorontalo", regionalFactor: 0.87, difficultyFactor: 1.10 },

  /* =======================
     SULAWESI TENGAH
  ======================= */
  { province: "Sulawesi Tengah", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Sulawesi Tengah", city: "Palu", regionalFactor: 0.88, difficultyFactor: 1.10 },
  { province: "Sulawesi Tengah", city: "Luwuk", regionalFactor: 0.89, difficultyFactor: 1.05 },

  /* =======================
     SULAWESI BARAT
  ======================= */
  { province: "Sulawesi Barat", regionalFactor: 0.85, difficultyFactor: 1.10 },
  { province: "Sulawesi Barat", city: "Mamuju", regionalFactor: 0.86, difficultyFactor: 1.10 },

  /* =======================
     SULAWESI SELATAN
  ======================= */
  { province: "Sulawesi Selatan", regionalFactor: 0.89, difficultyFactor: 1.05 },
  { province: "Sulawesi Selatan", city: "Makassar", regionalFactor: 0.91, difficultyFactor: 1.05 },
  { province: "Sulawesi Selatan", city: "Parepare", regionalFactor: 0.90, difficultyFactor: 1.05 },
  { province: "Sulawesi Selatan", city: "Palopo", regionalFactor: 0.89, difficultyFactor: 1.05 },

  /* =======================
     SULAWESI TENGGARA
  ======================= */
  { province: "Sulawesi Tenggara", regionalFactor: 0.86, difficultyFactor: 1.10 },
  { province: "Sulawesi Tenggara", city: "Kendari", regionalFactor: 0.87, difficultyFactor: 1.10 },
  { province: "Sulawesi Tenggara", city: "Baubau", regionalFactor: 0.88, difficultyFactor: 1.10 },

  /* =======================
     MALUKU
  ======================= */
  { province: "Maluku", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Maluku", city: "Ambon", regionalFactor: 0.84, difficultyFactor: 1.20 },

  /* =======================
     MALUKU UTARA
  ======================= */
  { province: "Maluku Utara", regionalFactor: 0.84, difficultyFactor: 1.20 },
  { province: "Maluku Utara", city: "Sofifi", regionalFactor: 0.83, difficultyFactor: 1.20 },
  { province: "Maluku Utara", city: "Ternate", regionalFactor: 0.86, difficultyFactor: 1.20 },

  /* =======================
     PAPUA
  ======================= */
  { province: "Papua", regionalFactor: 0.80, difficultyFactor: 1.20 },
  { province: "Papua", city: "Jayapura", regionalFactor: 0.82, difficultyFactor: 1.25 },

  /* =======================
     PAPUA BARAT
  ======================= */
  { province: "Papua Barat", regionalFactor: 0.81, difficultyFactor: 1.20 },
  { province: "Papua Barat", city: "Manokwari", regionalFactor: 0.82, difficultyFactor: 1.20 },

  /* =======================
     PAPUA BARAT DAYA
  ======================= */
  { province: "Papua Barat Daya", regionalFactor: 0.82, difficultyFactor: 1.20 },
  { province: "Papua Barat Daya", city: "Sorong", regionalFactor: 0.85, difficultyFactor: 1.25 },

  /* =======================
     PAPUA TENGAH
  ======================= */
  { province: "Papua Tengah", regionalFactor: 0.78, difficultyFactor: 1.35 },
  { province: "Papua Tengah", city: "Nabire", regionalFactor: 0.80, difficultyFactor: 1.20 },

  /* =======================
     PAPUA PEGUNUNGAN
  ======================= */
  { province: "Papua Pegunungan", regionalFactor: 0.76, difficultyFactor: 1.35 },
  { province: "Papua Pegunungan", city: "Wamena", regionalFactor: 0.78, difficultyFactor: 1.40 },

  /* =======================
     PAPUA SELATAN
  ======================= */
  { province: "Papua Selatan", regionalFactor: 0.79, difficultyFactor: 1.35 },
  { province: "Papua Selatan", city: "Merauke", regionalFactor: 0.81, difficultyFactor: 1.20 },
];

// ALIAS — biar kompatibel dengan import lama
export const getLocationFactor = LOCATION_FACTORS;
