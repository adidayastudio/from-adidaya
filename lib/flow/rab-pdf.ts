import { RABProjectContext } from "./rab-excel";

// Add status to RABProjectContext
export interface RABPDFContext extends RABProjectContext {
  status: string;
}

/**
 * Generates the clean HTML string used by Puppeteer route to print the RAB PDF.
 * Formatted to match Adidaya Studio report standards.
 */
export function generateRABPDFHTML(
  items: any[],
  context: RABPDFContext,
  totalCost: number,
  mode: string
): string {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);

  const formatPercent = (val: number) => (val * 100).toFixed(2) + "%";

  // Helper to calculate node total recursively
  const calculateNodeTotal = (node: any): number => {
    if (!node.children || node.children.length === 0) {
      return (node.volume || 0) * (node.unitPrice || 0);
    }
    return node.children.reduce((sum: number, child: any) => sum + calculateNodeTotal(child), 0);
  };

  // 1. Sort L1 items according to SAMIL order
  const SAMIL_ORDER = ["S", "A", "M", "I", "L"];
  const getSamilIndex = (code: string) => {
    const prefix = code.split('.')[0].toUpperCase();
    const idx = SAMIL_ORDER.indexOf(prefix);
    return idx === -1 ? 99 : idx;
  };

  const sortedL1 = [...items].sort((a, b) => getSamilIndex(a.code) - getSamilIndex(b.code));

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

  // Determine Revision number: "00" on submitted, otherwise "00"
  const revisionString = context.status === "submitted" ? "00" : "00";
  const dateFormatted = new Date().toLocaleDateString("id-ID", {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  }).replace(/\./g, '');

  // Render HTML structure
  let pagesHTML = "";

  // ================= PAGE 1: REKAPITULASI =================
  const rekapRows = sortedL1.map(item => {
    const itemTotal = calculateNodeTotal(item);
    const weight = totalCost > 0 ? itemTotal / totalCost : 0;
    return `
      <tr style="background-color: #f3f4f6; font-weight: 700; color: #111827;">
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; font-family: monospace; font-size: 11px;">${item.code}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; padding-left: 10px;">
          ${item.nameEn || item.name || item.description || "Pekerjaan"}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; text-align: right; font-family: monospace;"></td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; text-align: center;"></td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; text-align: right; font-family: monospace;"></td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(itemTotal)}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #d1d5db; text-align: right; font-family: monospace; color: #111827;">${formatPercent(weight)}</td>
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
              <span class="info-value-text">${context.province}${context.city ? ', ' + context.city : ''}</span>
            </div>
            <div class="info-group">
              <span class="info-label">LEVEL ESTIMASI RAB</span>
              <span class="info-value-text font-bold" style="color: #ef4444;">${mode}</span>
            </div>
          </div>
        </div>

        <div class="header-code-card">
          <div class="card-top-section">
            <div class="card-large-module">CST</div>
            <div class="card-sub-en">BUDGET PLAN SUMMARY</div>
            <div class="card-sub-id">Rekapitulasi Rencana Anggaran Biaya</div>
          </div>
          <div class="card-divider"></div>
          <div class="card-code">CST-00-01</div>
          <div class="card-divider"></div>
          <div class="card-footer-section">
            <div class="footer-col-left">
              <div class="footer-label">TGL LAPORAN</div>
              <div class="footer-val">${dateFormatted}</div>
            </div>
            <div class="footer-col-right">
              <div class="footer-label">REV</div>
              <div class="footer-val">${revisionString}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- PREMIUM METRICS ROW -->
      <div class="metrics-container">
        <div class="metric-card">
          <span class="metric-label">TOTAL RAB</span>
          <span class="metric-value font-red">${formatCurrency(totalCost)}</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">LUASAN</span>
          <span class="metric-value">${context.area} m²</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">RAB PER M²</span>
          <span class="metric-value">${formatCurrency(context.area > 0 ? totalCost / context.area : 0)} / m²</span>
        </div>
      </div>

      <!-- TABLE -->
      <table class="rab-table">
        <thead>
          <tr>
            <th style="width: 12%;">WBS Code</th>
            <th style="width: 43%;">Uraian Pekerjaan</th>
            <th style="width: 8%; text-align: right;">Volume</th>
            <th style="width: 7%; text-align: center;">Satuan</th>
            <th style="width: 13%; text-align: right;">Harga Satuan</th>
            <th style="width: 14%; text-align: right;">Jumlah Harga</th>
            <th style="width: 8%; text-align: right;">Bobot</th>
          </tr>
        </thead>
        <tbody>
          <!-- GRAND TOTAL ROW AT THE TOP OF SUMMARY -->
          <tr style="background-color: #111827; font-weight: 800; color: #ffffff;">
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; font-family: monospace; font-size: 11px;">TOTAL</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; padding-left: 10px;">TOTAL RAB PROYEK</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right;"></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: center;"></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right;"></td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right; font-family: monospace;">${formatCurrency(totalCost)}</td>
            <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right; font-family: monospace;">100.00%</td>
          </tr>
          ${rekapRows}
        </tbody>
      </table>
    </div>
  `;

  // ================= PAGE 2+: PER DISIPLIN DETAIL =================
  sortedL1.forEach((discipline, discIdx) => {
    const discNumStr = String(discIdx + 1).padStart(2, '0');
    const flatDiscItems = flattenChildren(discipline);
    const disciplineTotal = calculateNodeTotal(discipline);

    const discRows = flatDiscItems.map(item => {
      const indent = 15 * item.depth;
      const isParent = item.hasChildren;
      const itemTotal = calculateNodeTotal(item);
      const weight = totalCost > 0 ? itemTotal / totalCost : 0;

      // Determine level colors: Grey -> Light Grey -> Very Light Grey -> transparent
      let rowBg = "transparent";
      let rowColor = "#374151";
      let isBold = "normal";
      let borderStyle = "1px solid #e5e7eb";

      if (item.depth === 1) {
        rowBg = "#f3f4f6"; // Grey
        rowColor = "#111827";
        isBold = "700";
        borderStyle = "1px solid #d1d5db";
      } else if (item.depth === 2) {
        rowBg = "#fafafa"; // Light grey
        rowColor = "#111827";
        isBold = "700";
      } else if (isParent) {
        // Parent below L2
        rowBg = "transparent";
        rowColor = "#111827";
        isBold = "700";
      } else {
        // Leaf lowest level
        rowBg = "transparent";
        rowColor = "#4b5563";
        isBold = "normal";
      }

      return `
        <tr style="background-color: ${rowBg}; font-weight: ${isBold}; color: ${rowColor};">
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; font-family: monospace; font-size: 11px;">${item.code}</td>
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; padding-left: ${10 + indent}px;">
            <div>${item.nameEn || item.name || item.description || "Pekerjaan"}</div>
            ${item.notes ? `<div style="font-size: 8px; color: #7f8c8d; font-style: italic; margin-top: 2px;">${item.notes}</div>` : ''}
          </td>
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; text-align: right; font-family: monospace;">${isParent ? '' : (item.volume || 0)}</td>
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; text-align: center;">${isParent ? '' : (item.unit || 'ls')}</td>
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; text-align: right; font-family: monospace;">${isParent ? '' : formatCurrency(item.unitPrice || 0)}</td>
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; text-align: right; font-family: monospace; font-weight: ${isParent ? '700' : '500'}">${formatCurrency(itemTotal)}</td>
          <td style="padding: 8px 10px; border-bottom: ${borderStyle}; text-align: right; font-family: monospace; color: #6b7280;">${formatPercent(weight)}</td>
        </tr>
      `;
    }).join('');

    const discNameEn = discipline.nameEn || discipline.name || "Discipline Detail";
    const discNameId = discipline.nameId || discipline.description || "Detail Disiplin";

    pagesHTML += `
      <div class="pdf-page" style="page-break-before: always;">
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
                <span class="info-value-text">${context.province}${context.city ? ', ' + context.city : ''}</span>
              </div>
              <div class="info-group">
                <span class="info-label">LEVEL ESTIMASI RAB</span>
                <span class="info-value-text font-bold" style="color: #ef4444;">${mode}</span>
              </div>
            </div>
          </div>

          <div class="header-code-card">
            <div class="card-top-section">
              <div class="card-large-module">CST</div>
              <div class="card-sub-en">BUDGET PLAN - ${discNameEn.toUpperCase()}</div>
              <div class="card-sub-id">Rencana Anggaran Biaya - ${discNameId}</div>
            </div>
            <div class="card-divider"></div>
            <div class="card-code">CST-${discNumStr}-01</div>
            <div class="card-divider"></div>
            <div class="card-footer-section">
              <div class="footer-col-left">
                <div class="footer-label">TGL LAPORAN</div>
                <div class="footer-val">${dateFormatted}</div>
              </div>
              <div class="footer-col-right">
                <div class="footer-label">REV</div>
                <div class="footer-val">${revisionString}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- PREMIUM METRICS ROW -->
        <div class="metrics-container">
          <div class="metric-card">
            <span class="metric-label">TOTAL DISIPLIN</span>
            <span class="metric-value font-red">${formatCurrency(disciplineTotal)}</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">LUASAN</span>
            <span class="metric-value">${context.area} m²</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">BIAYA PER M²</span>
            <span class="metric-value">${formatCurrency(context.area > 0 ? disciplineTotal / context.area : 0)} / m²</span>
          </div>
        </div>

        <!-- TABLE -->
        <table class="rab-table">
          <thead>
            <tr>
              <th style="width: 12%;">WBS Code</th>
              <th style="width: 43%;">Uraian Pekerjaan</th>
              <th style="width: 8%; text-align: right;">Volume</th>
              <th style="width: 7%; text-align: center;">Satuan</th>
              <th style="width: 13%; text-align: right;">Harga Satuan</th>
              <th style="width: 14%; text-align: right;">Jumlah Harga</th>
              <th style="width: 8%; text-align: right;">Bobot</th>
            </tr>
          </thead>
          <tbody>
            <!-- DISCIPLINE ROW ALWAYS AT THE VERY TOP OF DETAIL TABLE -->
            <tr style="background-color: #111827; font-weight: 800; color: #ffffff;">
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; font-family: monospace; font-size: 11px;">${discipline.code}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; padding-left: 10px;">${discNameEn.toUpperCase()}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right;"></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: center;"></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right;"></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right; font-family: monospace;">${formatCurrency(disciplineTotal)}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #111827; text-align: right; font-family: monospace;">${formatPercent(totalCost > 0 ? disciplineTotal / totalCost : 0)}</td>
            </tr>
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
      <title>RAB - ${context.projectName}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          color: #1f2937;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 3px solid #111827;
          padding-bottom: 12px;
          margin-bottom: 25px;
          display: flex;
          justify-content: space-between;
          align-items: stretch;
        }
        .header-left-group {
          display: flex;
          align-items: center;
          flex-grow: 1;
        }
        .logo-container {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .logo-svg {
          width: 42px;
          height: 42px;
        }
        .logo-path {
          fill: #111827;
        }
        .header-divider {
          width: 1px;
          background-color: #d1d5db;
          align-self: stretch;
          margin-right: 15px;
        }
        .header-info {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }
        .info-group {
          margin-bottom: 6px;
        }
        .info-group:last-child {
          margin-bottom: 0;
        }
        .info-label {
          display: block;
          font-size: 7px;
          font-weight: 700;
          color: #9ca3af;
          letter-spacing: 1px;
          margin-bottom: 1px;
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
          font-size: 8px;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 3px;
          text-transform: uppercase;
        }
        .project-name-text {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          text-transform: uppercase;
        }
        .info-value-text {
          font-size: 9px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
        }
        .font-bold {
          font-weight: 700;
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
        .card-middle-section {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          text-align: center;
          padding: 10px 0;
          letter-spacing: 0.5px;
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
          margin-bottom: 25px;
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
        .font-red {
          color: #ef4444;
        }

        .meta-table {
          display: none; /* Replaced by metrics-container row */
        }
        table.rab-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          margin-top: 15px;
        }
        table.rab-table th {
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
    </body>
    </html>
  `;
}
