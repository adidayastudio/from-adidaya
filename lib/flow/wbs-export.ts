import * as XLSX from "xlsx";

export interface WBSProjectContext {
  projectName: string;
  projectNo: string;
  projectCode: string;
  stage: string;
  versionName: string;
  versionCode: string;
  province?: string;
  city?: string;
  status?: string;
}

/**
 * Generates and downloads a native Excel (.xlsx) file for WBS.
 */
export function exportWBSToExcel(
  items: any[],
  context: WBSProjectContext,
  filename: string
) {
  const workbook = XLSX.utils.book_new();

  // ============================================
  // SHEET 1: COVER / INFORMASI PROYEK
  // ============================================
  const coverRows: any[] = [
    ["WORK BREAKDOWN STRUCTURE (WBS)"],
    ["ADIDAYA STUDIO"],
    [],
    ["INFORMASI PROYEK"],
    ["Nama Proyek", context.projectName],
    ["Nomor Proyek", context.projectNo],
    ["Kode Proyek", context.projectCode],
    ["Tahapan WBS", context.stage],
    ["Versi WBS", `${context.versionCode} - ${context.versionName}`],
    ["Provinsi", context.province || "DKI Jakarta"],
    ["Kabupaten/Kota", context.city || "Jakarta Selatan"],
    [],
    ["RINGKASAN EKSPOR"],
    ["Total Item WBS", items.length],
    ["Tanggal Ekspor", new Date().toLocaleDateString("id-ID")]
  ];

  const wsCover = XLSX.utils.aoa_to_sheet([]);

  coverRows.forEach((row, rIdx) => {
    row.forEach((val: any, cIdx: number) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (typeof val === "number") {
        wsCover[cellRef] = { t: "n", v: val };
      } else {
        wsCover[cellRef] = { t: "s", v: String(val) };
      }
    });
  });

  wsCover["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: coverRows.length - 1, c: 2 } });
  wsCover["!cols"] = [{ wch: 25 }, { wch: 45 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, wsCover, "1. Cover");

  // ============================================
  // SHEET 2: WBS BREAKDOWN
  // ============================================
  const flatItems: any[] = [];
  const flatten = (nodes: any[], depth: number) => {
    if (!Array.isArray(nodes)) return;
    nodes.forEach((node) => {
      flatItems.push({ ...node, depth });
      if (node.children && node.children.length > 0) {
        flatten(node.children, depth + 1);
      }
    });
  };
  flatten(items, 0);

  const headers = ["WBS Code", "Uraian Pekerjaan (EN)", "Uraian Pekerjaan (ID)", "Level", "Catatan"];
  const dataRows: any[] = [headers];

  flatItems.forEach((item) => {
    const indent = " ".repeat(item.depth * 2);
    dataRows.push([
      item.code || "",
      `${indent}${item.nameEn || item.name || ""}`,
      item.nameId || "",
      item.depth + 1,
      item.notes || ""
    ]);
  });

  const wsBreakdown = XLSX.utils.aoa_to_sheet([]);
  dataRows.forEach((row, rIdx) => {
    row.forEach((val: any, cIdx: number) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      wsBreakdown[cellRef] = { t: typeof val === "number" ? "n" : "s", v: val };
    });
  });

  wsBreakdown["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: dataRows.length - 1, c: 4 } });
  wsBreakdown["!cols"] = [{ wch: 15 }, { wch: 45 }, { wch: 35 }, { wch: 10 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, wsBreakdown, "2. WBS Breakdown");

  XLSX.writeFile(workbook, filename);
}

/**
 * Generates official corporate PDF HTML representation 100% IDENTICAL to RAB PDF standards.
 */
export function generateWBSPDFHTML(
  items: any[],
  context: WBSProjectContext
): string {
  const dateFormatted = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "2-digit"
  }).replace(/\./g, "");

  const countLeafs = (nodes: any[]): number => {
    let count = 0;
    if (!Array.isArray(nodes)) return 0;
    for (const n of nodes) {
      if (!n) continue;
      if (!n.children || n.children.length === 0) count++;
      else count += countLeafs(n.children);
    }
    return count;
  };

  const totalLeafs = countLeafs(items);

  // Helper to flatten children for a discipline
  const flattenChildren = (node: any) => {
    const flat: any[] = [];
    const recurse = (n: any, depth: number) => {
      const hasChildren = !!(n.children && n.children.length > 0);
      flat.push({ ...n, depth, hasChildren });
      if (hasChildren) {
        n.children.forEach((c: any) => recurse(c, depth + 1));
      }
    };
    if (node.children) {
      node.children.forEach((c: any) => recurse(c, 1));
    }
    return flat;
  };

  // 1. Sort L1 items according to SAMIL order
  const SAMIL_ORDER = ["S", "A", "M", "I", "L"];
  const getSamilIndex = (code: string) => {
    const prefix = (code || "").split('.')[0].toUpperCase();
    const idx = SAMIL_ORDER.indexOf(prefix);
    return idx === -1 ? 99 : idx;
  };

  const sortedL1 = [...items].sort((a, b) => getSamilIndex(a.code) - getSamilIndex(b.code));

  let pagesHTML = "";

  // ================= PAGE 1: REKAPITULASI (SUMMARY) =================
  const rekapRows = sortedL1.map(item => {
    return `
      <tr style="background-color: #f3f4f6; font-weight: 700; color: #111827;">
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; font-family: monospace; font-size: 11px;">${item.code || ""}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; padding-left: 10px;">
          ${item.nameEn || item.name || item.title || "Pekerjaan"}
          ${item.nameId ? `<div style="font-size: 9px; color: #6b7280; font-style: italic; font-weight: 400;">${item.nameId}</div>` : ""}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; text-align: center; font-size: 11px;">Level 1</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; font-size: 10px; color: #6b7280;">-</td>
      </tr>
    `;
  }).join('');

  pagesHTML += `
    <div class="pdf-page">
      <!-- HEADER -->
      <div class="header">
        <div class="header-left-group">
          <div class="logo-container">
            <svg viewBox="0 0 964.35 1080" class="logo-svg">
              <path class="logo-path" d="M594.49,903.79h-228.27c-11.87,13.85-19.27,29.88-26.63,46.08-11.98,26.37-24.48,52.51-37.04,78.61-22.58,46.93-92.55,66.66-141.78,37.26-51.77-30.92-62.49-101.56-34.65-143.17,16.71-24.96,35.58-48.51,54.05-72.25,37.65-48.36,75.68-96.42,113.57-144.59,20.65-26.26,41.66-52.24,61.86-78.84,9.22-12.15,20.39-23.37,25.76-41.41-7.42.78-12.75.84-17.85,1.94-71.85,15.58-143.67,31.34-215.51,46.95-10.89,2.37-21.82,4.98-32.87,6.08-41.21,4.08-74.44-10.21-97.88-44.9-21.18-31.34-21.71-64.89-7.9-98.88,11.5-28.31,51.09-63.38,96.47-60.16,19.97,1.42,39.82,4.76,59.67,7.65,66.15,9.65,132.27,19.54,198.44,29.14,3.89.56,8.02-.59,14.77-1.18-6-16.1-16.08-26.52-24.76-37.56-50.95-64.85-102.22-129.45-153.28-194.21-17.93-22.74-35.35-45.89-53.44-68.5-26.39-32.97-30.18-70.02-13.69-106.91C149.95,28.25,180.6,5.83,221.41.97c51.94-6.19,90.43,17.48,111.64,66.07,45.48,104.18,91.23,208.23,137.04,312.26,3.47,7.87,8.37,15.1,12.23,21.96,12.77-.89,12.84-10.49,15.35-17.01,18.38-47.86,36.05-95.99,54.36-143.87,5.96-15.59,12.23-31.21,20.01-45.94,25.26-47.81,87.64-63.42,136.08-38.72,66.49,33.91,75.74,119,23.52,168.74-45.18,43.04-88.7,87.84-132.79,132.02-5.13,5.14-9.27,11.28-16.71,20.45,12.45-1.28,20.14-1.48,27.58-2.93,68.85-13.48,137.65-27.24,206.49-40.77,10.92-2.15,21.98-3.58,32.98-5.31,73.62-11.54,137.51,59.72,107.62,139.6-13.97,37.34-42.32,59.67-82.74,63.4-14.24,1.31-29.06.14-43.23-2.23-70.31-11.77-140.47-24.39-210.72-36.51-10.65-1.84-21.5-5.24-32.2-.68-2.31,11.33,6.02,17.05,11.23,23.59,58.33,73.23,116.98,146.19,175.58,219.2,16.04,19.98,32.84,39.4,48.06,59.99,9.2,12.44,18.2,25.81,23.57,40.15,18.31,48.88-1.16,100.05-46.49,126.29-17.4,10.07-34.7,19.33-56.07,19.27-41.55-.11-73.93-16.3-93.5-53.06-13.57-25.49-23.87-52.72-35.72-79.13-6.33-14.11-12.84-28.13-20.11-44.02ZM482.56,651.15c-2.42,1.41-5.27,2.05-6.02,3.66-23.27,50.31-46.39,100.7-69.27,151.19-1.2,2.65-.15,6.32-.15,10.03,3.26.81,6.3,2.24,9.35,2.24,44.36-.06,88.73-.31,133.09-.58,1.03,0,2.27-.54,3.03-1.25.7-.64.89-1.85,2.17-4.79-17.94-51.94-43.44-102.41-65.3-154.37-1.1-2.61-4.64-4.2-6.89-6.13Z"/>
            </svg>
          </div>
          <div class="header-divider"></div>
          <div class="header-info">
            <div class="info-group">
              <span class="info-label">PROYEK</span>
              <div class="info-value-project">
                <span class="project-code-badge">${context.projectCode || "PRG"}</span>
                <span class="project-name-text">${context.projectName}</span>
              </div>
            </div>
            <div class="info-group">
              <span class="info-label">LOKASI</span>
              <span class="info-value-text">${context.province || "DKI Jakarta"}${context.city ? ', ' + context.city : ''}</span>
            </div>
            <div class="info-group">
              <span class="info-label">TAHAPAN WBS</span>
              <span class="info-value-text font-bold" style="color: #2563eb;">${context.stage}</span>
            </div>
          </div>
        </div>

        <div class="header-code-card">
          <div class="card-top-section">
            <div class="card-large-module">WBS</div>
            <div class="card-sub-en">WORK BREAKDOWN STRUCTURE</div>
            <div class="card-sub-id">Struktur Rincian Pekerjaan</div>
          </div>
          <div class="card-divider"></div>
          <div class="card-code">WBS-00-01</div>
          <div class="card-divider"></div>
          <div class="card-footer-section">
            <div class="footer-col-left">
              <div class="footer-label">TGL LAPORAN</div>
              <div class="footer-val">${dateFormatted}</div>
            </div>
            <div class="footer-col-right">
              <div class="footer-label">REV</div>
              <div class="footer-val">00</div>
            </div>
          </div>
        </div>
      </div>

      <!-- PREMIUM METRICS ROW -->
      <div class="metrics-container">
        <div class="metric-card">
          <span class="metric-label">VERSI AKTIF</span>
          <span class="metric-value font-blue">${context.versionCode} - ${context.versionName}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">TOTAL URAIAN WORK ITEMS</span>
          <span class="metric-value">${totalLeafs} Items</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">STATUS DOKUMEN</span>
          <span class="metric-value font-green">${context.status || "Baseline"}</span>
        </div>
      </div>

      <!-- TABLE -->
      <table class="wbs-table">
        <thead>
          <tr>
            <th style="width: 15%;">WBS Code</th>
            <th style="width: 55%;">Uraian Pekerjaan</th>
            <th style="width: 12%; text-align: center;">Level</th>
            <th style="width: 18%;">Catatan / Spec</th>
          </tr>
        </thead>
        <tbody>
          ${rekapRows}
        </tbody>
      </table>
    </div>
  `;

  // ================= PAGE 2+: PER DISIPLIN DETAIL =================
  sortedL1.forEach((discipline, discIdx) => {
    const discNumStr = String(discIdx + 1).padStart(2, '0');
    const flatDiscItems = flattenChildren(discipline);

    const discRows = flatDiscItems.map(item => {
      const indent = 15 * item.depth;
      const isParent = item.hasChildren;

      let rowBg = "transparent";
      let rowColor = "#374151";
      let isBold = "normal";
      let borderStyle = "1px solid #e5e7eb";

      if (item.depth === 1) {
        rowBg = "#f3f4f6";
        rowColor = "#111827";
        isBold = "700";
        borderStyle = "1px solid #d1d5db";
      } else if (item.depth === 2) {
        rowBg = "#fafafa";
        rowColor = "#111827";
        isBold = "700";
      } else if (isParent) {
        rowBg = "transparent";
        rowColor = "#111827";
        isBold = "700";
      }

      return `
        <tr style="background-color: ${rowBg}; font-weight: ${isBold}; color: ${rowColor};">
          <td style="padding: 6px 10px; border-bottom: ${borderStyle}; font-family: monospace; font-size: 10px;">${item.code || ""}</td>
          <td style="padding: 6px 10px; border-bottom: ${borderStyle}; padding-left: ${indent}px;">
            ${item.nameEn || item.name || item.description || "Pekerjaan"}
            ${item.nameId ? `<div style="font-size: 9px; color: #6b7280; font-style: italic; font-weight: 400;">${item.nameId}</div>` : ""}
          </td>
          <td style="padding: 6px 10px; border-bottom: ${borderStyle}; text-align: center; font-size: 10px;">Level ${item.depth + 1}</td>
          <td style="padding: 6px 10px; border-bottom: ${borderStyle}; font-size: 9px; color: #6b7280;">${item.notes || "-"}</td>
        </tr>
      `;
    }).join('');

    pagesHTML += `
      <div class="pdf-page page-break">
        <!-- HEADER -->
        <div class="header">
          <div class="header-left-group">
            <div class="logo-container">
              <svg viewBox="0 0 964.35 1080" class="logo-svg">
                <path class="logo-path" d="M594.49,903.79h-228.27c-11.87,13.85-19.27,29.88-26.63,46.08-11.98,26.37-24.48,52.51-37.04,78.61-22.58,46.93-92.55,66.66-141.78,37.26-51.77-30.92-62.49-101.56-34.65-143.17,16.71-24.96,35.58-48.51,54.05-72.25,37.65-48.36,75.68-96.42,113.57-144.59,20.65-26.26,41.66-52.24,61.86-78.84,9.22-12.15,20.39-23.37,25.76-41.41-7.42.78-12.75.84-17.85,1.94-71.85,15.58-143.67,31.34-215.51,46.95-10.89,2.37-21.82,4.98-32.87,6.08-41.21,4.08-74.44-10.21-97.88-44.9-21.18-31.34-21.71-64.89-7.9-98.88,11.5-28.31,51.09-63.38,96.47-60.16,19.97,1.42,39.82,4.76,59.67,7.65,66.15,9.65,132.27,19.54,198.44,29.14,3.89.56,8.02-.59,14.77-1.18-6-16.1-16.08-26.52-24.76-37.56-50.95-64.85-102.22-129.45-153.28-194.21-17.93-22.74-35.35-45.89-53.44-68.5-26.39-32.97-30.18-70.02-13.69-106.91C149.95,28.25,180.6,5.83,221.41.97c51.94-6.19,90.43,17.48,111.64,66.07,45.48,104.18,91.23,208.23,137.04,312.26,3.47,7.87,8.37,15.1,12.23,21.96,12.77-.89,12.84-10.49,15.35-17.01,18.38-47.86,36.05-95.99,54.36-143.87,5.96-15.59,12.23-31.21,20.01-45.94,25.26-47.81,87.64-63.42,136.08-38.72,66.49,33.91,75.74,119,23.52,168.74-45.18,43.04-88.7,87.84-132.79,132.02-5.13,5.14-9.27,11.28-16.71,20.45,12.45-1.28,20.14-1.48,27.58-2.93,68.85-13.48,137.65-27.24,206.49-40.77,10.92-2.15,21.98-3.58,32.98-5.31,73.62-11.54,137.51,59.72,107.62,139.6-13.97,37.34-42.32,59.67-82.74,63.4-14.24,1.31-29.06.14-43.23-2.23-70.31-11.77-140.47-24.39-210.72-36.51-10.65-1.84-21.5-5.24-32.2-.68-2.31,11.33,6.02,17.05,11.23,23.59,58.33,73.23,116.98,146.19,175.58,219.2,16.04,19.98,32.84,39.4,48.06,59.99,9.2,12.44,18.2,25.81,23.57,40.15,18.31,48.88-1.16,100.05-46.49,126.29-17.4,10.07-34.7,19.33-56.07,19.27-41.55-.11-73.93-16.3-93.5-53.06-13.57-25.49-23.87-52.72-35.72-79.13-6.33-14.11-12.84-28.13-20.11-44.02ZM482.56,651.15c-2.42,1.41-5.27,2.05-6.02,3.66-23.27,50.31-46.39,100.7-69.27,151.19-1.2,2.65-.15,6.32-.15,10.03,3.26.81,6.3,2.24,9.35,2.24,44.36-.06,88.73-.31,133.09-.58,1.03,0,2.27-.54,3.03-1.25.7-.64.89-1.85,2.17-4.79-17.94-51.94-43.44-102.41-65.3-154.37-1.1-2.61-4.64-4.2-6.89-6.13Z"/>
              </svg>
            </div>
            <div class="header-divider"></div>
            <div class="header-info">
              <div class="info-group">
                <span class="info-label">PROYEK</span>
                <div class="info-value-project">
                  <span class="project-code-badge">${context.projectCode || "PRG"}</span>
                  <span class="project-name-text">${context.projectName}</span>
                </div>
              </div>
              <div class="info-group">
                <span class="info-label">LOKASI</span>
                <span class="info-value-text">${context.province || "DKI Jakarta"}${context.city ? ', ' + context.city : ''}</span>
              </div>
              <div class="info-group">
                <span class="info-label">TAHAPAN WBS</span>
                <span class="info-value-text font-bold" style="color: #2563eb;">${context.stage}</span>
              </div>
            </div>
          </div>

          <div class="header-code-card">
            <div class="card-top-section">
              <div class="card-large-module">WBS</div>
              <div class="card-sub-en">WORK BREAKDOWN STRUCTURE</div>
              <div class="card-sub-id">Rincian Pekerjaan - ${discipline.nameEn || discipline.name || 'Disiplin'}</div>
            </div>
            <div class="card-divider"></div>
            <div class="card-code">WBS-${discNumStr}-01</div>
            <div class="card-divider"></div>
            <div class="card-footer-section">
              <div class="footer-col-left">
                <div class="footer-label">TGL LAPORAN</div>
                <div class="footer-val">${dateFormatted}</div>
              </div>
              <div class="footer-col-right">
                <div class="footer-label">REV</div>
                <div class="footer-val">00</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PREMIUM METRICS ROW -->
        <div class="metrics-container">
          <div class="metric-card">
            <span class="metric-label">TOTAL DISIPLIN</span>
            <span class="metric-value font-blue">${discipline.code} - ${discipline.nameEn || discipline.name}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">SUB-ITEMS</span>
            <span class="metric-value">${flatDiscItems.length} Items</span>
          </div>
        </div>

        <!-- TABLE -->
        <table class="wbs-table">
          <thead>
            <tr style="background-color: #111827; color: #ffffff;">
              <th style="width: 15%; color: #ffffff;">WBS Code</th>
              <th style="width: 55%; color: #ffffff;">${(discipline.code || '') + ' ' + (discipline.nameEn || discipline.name || '').toUpperCase()}</th>
              <th style="width: 12%; text-align: center; color: #ffffff;">Level</th>
              <th style="width: 18%; color: #ffffff;">Catatan / Spec</th>
            </tr>
          </thead>
          <tbody>
            ${discRows}
          </tbody>
        </table>
      </div>
    `;
  });

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>WBS Export - ${context.projectCode}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm;
        }
        @media print {
          .page-break { page-break-before: always; }
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #111827;
          background-color: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .pdf-page {
          width: 100%;
          box-sizing: border-box;
        }

        /* HEADER CONTAINER */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
          border-bottom: 2px solid #111827;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .header-left-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .logo-container {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-svg {
          width: 44px;
          height: 44px;
        }
        .logo-path {
          fill: #111827;
        }
        .header-divider {
          width: 1px;
          height: 42px;
          background-color: #ef4444;
        }
        .header-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .info-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-label {
          font-size: 7px;
          font-weight: 750;
          color: #9ca3af;
          width: 85px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .info-value-project {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .project-code-badge {
          background-color: #111827;
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 3px;
          font-family: monospace;
        }
        .project-name-text {
          font-size: 11px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
        }
        .info-value-text {
          font-size: 9px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
        }
        .font-bold {
          font-weight: 800;
        }
        
        /* Code Card (Right side Box) */
        .header-code-card {
          width: 170px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          overflow: hidden;
          background-color: #ffffff;
          flex-shrink: 0;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        .card-top-section {
          padding: 8px 0 10px 0;
          text-align: center;
        }
        .card-large-module {
          font-size: 32px;
          font-weight: 800;
          color: #111827;
          line-height: 1.1;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .card-sub-en {
          font-size: 8px;
          font-weight: 800;
          color: #111827;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .card-sub-id {
          font-size: 8px;
          font-weight: 600;
          color: #6b7280;
        }
        .card-divider {
          height: 1px;
          background-color: #e5e7eb;
          margin: 0 8px;
        }
        .card-code {
          font-size: 11px;
          font-weight: 800;
          color: #111827;
          text-align: center;
          padding: 4px 0;
          letter-spacing: 0.5px;
          font-family: monospace;
        }
        .card-footer-section {
          padding: 6px 10px 8px 10px;
          display: flex;
          justify-content: space-between;
        }
        .footer-col-left {
          text-align: left;
        }
        .footer-col-right {
          text-align: right;
        }
        .footer-label {
          font-size: 6px;
          font-weight: 750;
          color: #9ca3af;
          margin-bottom: 2px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .footer-val {
          font-size: 9px;
          font-weight: 700;
          color: #111827;
        }

        /* Metric Grid Row */
        .metrics-container {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .metric-card {
          flex: 1;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 8px 12px;
          background-color: #f9fafb;
          display: flex;
          flex-direction: column;
        }
        .metric-label {
          font-size: 7px;
          font-weight: 700;
          color: #9ca3af;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
          text-transform: uppercase;
        }
        .metric-value {
          font-size: 13px;
          font-weight: 800;
          color: #111827;
        }
        .font-blue {
          color: #2563eb;
        }
        .font-green {
          color: #16a34a;
        }

        table.wbs-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 10px;
        }
        table.wbs-table th {
          background-color: #f3f4f6;
          color: #374151;
          font-weight: 700;
          padding: 8px 10px;
          border-top: 1px solid #d1d5db;
          border-bottom: 2px solid #d1d5db;
          text-align: left;
        }
        tr {
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      ${pagesHTML}
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `;
}
