/**
 * Converts a number to its Indonesian word representation (terbilang).
 * Supports up to triliun (10^12).
 *
 * Example: 239_007_000_000 → "Dua Ratus Tiga Puluh Sembilan Miliar Tujuh Juta Rupiah"
 */

const SATUAN = [
  "",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
];

function terbilangRaw(n: number): string {
  if (n < 0) return "Minus " + terbilangRaw(-n);
  if (n === 0) return "";

  if (n < 10) return SATUAN[n];

  if (n === 10) return "Sepuluh";
  if (n === 11) return "Sebelas";
  if (n < 20) return SATUAN[n - 10] + " Belas";

  if (n < 100) {
    const puluhan = Math.floor(n / 10);
    const sisa = n % 10;
    return SATUAN[puluhan] + " Puluh" + (sisa ? " " + SATUAN[sisa] : "");
  }

  if (n < 200) return "Seratus" + (n % 100 ? " " + terbilangRaw(n % 100) : "");
  if (n < 1_000) {
    const ratusan = Math.floor(n / 100);
    const sisa = n % 100;
    return SATUAN[ratusan] + " Ratus" + (sisa ? " " + terbilangRaw(sisa) : "");
  }

  if (n < 2_000) return "Seribu" + (n % 1_000 ? " " + terbilangRaw(n % 1_000) : "");
  if (n < 1_000_000) {
    const ribuan = Math.floor(n / 1_000);
    const sisa = n % 1_000;
    return terbilangRaw(ribuan) + " Ribu" + (sisa ? " " + terbilangRaw(sisa) : "");
  }

  if (n < 1_000_000_000) {
    const jutaan = Math.floor(n / 1_000_000);
    const sisa = n % 1_000_000;
    return terbilangRaw(jutaan) + " Juta" + (sisa ? " " + terbilangRaw(sisa) : "");
  }

  if (n < 1_000_000_000_000) {
    const miliaran = Math.floor(n / 1_000_000_000);
    const sisa = n % 1_000_000_000;
    return terbilangRaw(miliaran) + " Miliar" + (sisa ? " " + terbilangRaw(sisa) : "");
  }

  // Triliun
  const triliunan = Math.floor(n / 1_000_000_000_000);
  const sisa = n % 1_000_000_000_000;
  return terbilangRaw(triliunan) + " Triliun" + (sisa ? " " + terbilangRaw(sisa) : "");
}

/**
 * Public API: Convert a number to Indonesian terbilang + " Rupiah".
 * Rounds to the nearest integer first.
 */
export function terbilang(n: number): string {
  const rounded = Math.round(Math.abs(n));
  if (rounded === 0) return "Nol Rupiah";

  const prefix = n < 0 ? "Minus " : "";
  return prefix + terbilangRaw(rounded).trim() + " Rupiah";
}
