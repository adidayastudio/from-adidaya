import * as XLSX from 'xlsx';

export interface RABProjectContext {
  projectName: string;
  projectNo: string;
  projectCode: string;
  buildingClass: string;
  area: number;
  province: string;
  city: string;
  rf: number;
  df: number;
  adjustmentFactor: number;
}

/**
 * Generates and downloads a beautifully formatted, formula-driven Excel (.xlsx) file for RAB.
 */
export function exportRABToExcel(
  items: any[],
  context: RABProjectContext,
  mode: "BALLPARK" | "ESTIMATES" | "DETAIL",
  filename: string
) {
  const workbook = XLSX.utils.book_new();

  // Helper to format currency values for Excel cells
  const numberFormat = '"Rp"#,##0';
  const percentFormat = '0.00%';

  // ============================================
  // SHEET 1: COVER
  // ============================================
  const coverRows: any[] = [
    ["RENCANA ANGGARAN BIAYA (RAB)"],
    ["ADIDAYA STUDIO"],
    [],
    ["INFORMASI PROYEK"],
    ["Nama Proyek", context.projectName],
    ["Nomor Proyek", context.projectNo],
    ["Kode Proyek", context.projectCode],
    ["Kelas Bangunan", `${context.buildingClass} (${context.buildingClass === "A" ? "Luxury" : context.buildingClass === "B" ? "Premium" : context.buildingClass === "C" ? "Standard" : "Basic"})`],
    ["Luas Bangunan", context.area, "m²"],
    ["Provinsi", context.province],
    ["Kabupaten/Kota", context.city || "-"],
    ["Regional Factor (RF)", context.rf],
    ["Difficulty Factor (DF)", context.df],
    ["Faktor Penyesuaian", `${context.adjustmentFactor}%`],
    [],
    ["RINGKASAN ESTIMASI BIAYA"],
    ["Estimasi Mode", mode],
    ["Tanggal Export", new Date().toLocaleDateString("id-ID")]
  ];

  const wsCover = XLSX.utils.aoa_to_sheet([]);
  
  // Populating Cover with values and formatting area/numbers
  coverRows.forEach((row, rIdx) => {
    row.forEach((val: any, cIdx: number) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (typeof val === 'number') {
        wsCover[cellRef] = { t: 'n', v: val };
        if (row[0] === "Luas Bangunan" && cIdx === 1) {
          wsCover[cellRef].z = '#,##0';
        }
      } else {
        wsCover[cellRef] = { t: 's', v: String(val) };
      }
    });
  });

  wsCover['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: coverRows.length - 1, c: 2 } });
  wsCover['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(workbook, wsCover, '1. Cover');

  // ============================================
  // FLATTEN TREE FOR TABLES
  // ============================================
  const flatItems: any[] = [];
  const flatten = (nodes: any[], depth: number, parentCode?: string) => {
    nodes.forEach(node => {
      const hasChildren = !!(node.children && node.children.length > 0);
      flatItems.push({
        ...node,
        depth,
        hasChildren,
        parentCode
      });
      if (hasChildren) {
        flatten(node.children, depth + 1, node.code);
      }
    });
  };
  flatten(items, 0);

  // ============================================
  // SHEET 2: REKAPITULASI (SUMMARY)
  // ============================================
  const summaryHeaders = ["WBS Code", "Uraian Pekerjaan", "Jumlah Harga", "Harga / m²", "Bobot (%)"];
  const summaryRows: any[] = [
    ["REKAPITULASI RENCANA ANGGARAN BIAYA"],
    [`Proyek: ${context.projectName} (${context.projectCode})`],
    [],
    summaryHeaders
  ];

  const l1Items = flatItems.filter(item => item.depth === 0);
  const startRowSummary = 4; // Headers are at row index 3 (1-based: row 4)
  
  l1Items.forEach((item, idx) => {
    summaryRows.push([
      item.code,
      item.nameEn || item.name || item.description || "Discipline",
      0, // Will replace with Excel formula/value
      0, // Will replace with Excel formula/value
      0  // Will replace with Excel formula/value
    ]);
  });

  // Add Grand Total row
  const grandTotalRowIdx = summaryRows.length;
  summaryRows.push([
    "TOTAL",
    "TOTAL ESTIMASI BIAYA KONSTRUKSI",
    0,
    0,
    0
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet([]);

  // Populate data
  summaryRows.forEach((row, rIdx) => {
    row.forEach((val: any, cIdx: number) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      wsSummary[cellRef] = { t: 's', v: String(val) };
    });
  });

  // Apply Formulas & Formatting to Summary
  // Let's find detail sheet reference: we'll call sheet 3 "3. Rencana Anggaran Biaya"
  // For each L1 item, we will sum the prices of its children in sheet 3 using SUMIF or a direct formula.
  // Wait, easier and more robust in standard Excel: 
  // Let's link it to the Detail Sheet. Since the Detail Sheet has all items, we can write:
  // `=SUMIF('3. Detail RAB'!A:A, A{row}&".*", '3. Detail RAB'!F:F)`
  // Yes! In Excel, `SUMIF` with wildcard `A{row}&"*"` will sum all sub-items starting with that prefix!
  // This is incredibly smart! Let's do that!
  
  l1Items.forEach((item, idx) => {
    const rIdx = startRowSummary + idx; // row index in 0-based array
    const cellRefTotal = XLSX.utils.encode_cell({ r: rIdx, c: 2 });
    const cellRefPricePerM2 = XLSX.utils.encode_cell({ r: rIdx, c: 3 });
    const cellRefWeight = XLSX.utils.encode_cell({ r: rIdx, c: 4 });

    // Formula for Total of this discipline: SUMIF on '3. Detail RAB' for code prefix
    // Row numbers in Excel are 1-based, so it is rIdx + 1
    const excelRow = rIdx + 1;
    wsSummary[cellRefTotal] = {
      t: 'n',
      f: `SUMIF('3. Detail RAB'!A:A, A${excelRow}&"*", '3. Detail RAB'!F:F)`,
      z: numberFormat
    };

    // Price per m2 formula: Total / Area
    wsSummary[cellRefPricePerM2] = {
      t: 'n',
      f: `${XLSX.utils.encode_cell({ r: rIdx, c: 2 })}/'1. Cover'!B9`,
      z: numberFormat
    };

    // Weight formula: Total / Grand Total Total
    // Grand Total is at row grandTotalRowIdx + 1
    wsSummary[cellRefWeight] = {
      t: 'n',
      f: `${XLSX.utils.encode_cell({ r: rIdx, c: 2 })}/${XLSX.utils.encode_cell({ r: grandTotalRowIdx, c: 2 })}`,
      z: percentFormat
    };
  });

  // Grand Total formulas
  const grandTotalExcelRow = grandTotalRowIdx + 1;
  const sumRange = `C${startRowSummary + 1}:C${grandTotalRowIdx}`;
  wsSummary[XLSX.utils.encode_cell({ r: grandTotalRowIdx, c: 2 })] = {
    t: 'n',
    f: `SUM(${sumRange})`,
    z: numberFormat
  };
  wsSummary[XLSX.utils.encode_cell({ r: grandTotalRowIdx, c: 3 })] = {
    t: 'n',
    f: `C${grandTotalExcelRow}/'1. Cover'!B9`,
    z: numberFormat
  };
  wsSummary[XLSX.utils.encode_cell({ r: grandTotalRowIdx, c: 4 })] = {
    t: 'n',
    f: `SUM(E${startRowSummary + 1}:E${grandTotalRowIdx})`,
    z: percentFormat
  };

  wsSummary['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: summaryRows.length - 1, c: 4 } });
  wsSummary['!cols'] = [{ wch: 15 }, { wch: 45 }, { wch: 20 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(workbook, wsSummary, '2. Rekapitulasi');


  // ============================================
  // SHEET 3: DETAIL RAB
  // ============================================
  const detailHeaders = ["WBS Code", "Uraian Pekerjaan", "Volume", "Satuan", "Harga Satuan (Rp)", "Jumlah Harga (Rp)", "Bobot (%)"];
  const detailRows: any[] = [
    ["DAFTAR RINCIAN RENCANA ANGGARAN BIAYA (RAB)"],
    [`Proyek: ${context.projectName} (${context.projectCode})`],
    [],
    detailHeaders
  ];

  const startRowDetail = 4; // Headers at row 3 (0-based)
  
  flatItems.forEach((item) => {
    // Determine level-based indent space
    const indent = "  ".repeat(item.depth);
    detailRows.push([
      item.code,
      indent + (item.nameEn || item.name || item.description || "Item"),
      item.hasChildren ? "" : (item.volume || 0),
      item.hasChildren ? "" : (item.unit || "ls"),
      item.hasChildren ? "" : (item.unitPrice || 0),
      0, // Formula for Volume * Unit Price
      0  // Formula for Total / Grand Total
    ]);
  });

  const wsDetail = XLSX.utils.aoa_to_sheet([]);

  // Populate data
  detailRows.forEach((row, rIdx) => {
    row.forEach((val: any, cIdx: number) => {
      const cellRef = XLSX.utils.encode_cell({ r: rIdx, c: cIdx });
      if (typeof val === 'number') {
        wsDetail[cellRef] = { t: 'n', v: val };
      } else {
        wsDetail[cellRef] = { t: 's', v: String(val) };
      }
    });
  });

  // Apply Formulas & Formatting to Detail
  flatItems.forEach((item, idx) => {
    const rIdx = startRowDetail + idx;
    const excelRow = rIdx + 1;

    const cellRefVolume = XLSX.utils.encode_cell({ r: rIdx, c: 2 });
    const cellRefUnitPrice = XLSX.utils.encode_cell({ r: rIdx, c: 4 });
    const cellRefTotal = XLSX.utils.encode_cell({ r: rIdx, c: 5 });
    const cellRefWeight = XLSX.utils.encode_cell({ r: rIdx, c: 6 });

    if (item.hasChildren) {
      // For parent items, calculate sum of child items that belong directly/indirectly to it
      // Standard SUMIF on all child rows of this parent
      wsDetail[cellRefTotal] = {
        t: 'n',
        f: `SUMIF(A:A, A${excelRow}&".*", F:F)`,
        z: numberFormat
      };
      
      // Clear volume and unit price values so they don't display zero
      delete wsDetail[cellRefVolume];
      delete wsDetail[cellRefUnitPrice];
    } else {
      // For leaf items: Total = Volume * Unit Price
      wsDetail[cellRefTotal] = {
        t: 'n',
        f: `C${excelRow}*E${excelRow}`,
        z: numberFormat
      };
      wsDetail[cellRefUnitPrice] = {
        t: 'n',
        v: item.unitPrice || 0,
        z: numberFormat
      };
      wsDetail[cellRefVolume] = {
        t: 'n',
        v: item.volume || 0,
        z: '#,##0.00'
      };
    }

    // Weight formula: Total / Grand Total of Rekapitulasi
    // Rekapitulasi Grand Total is at cell C{grandTotalExcelRow} on '2. Rekapitulasi'
    wsDetail[cellRefWeight] = {
      t: 'n',
      f: `F${excelRow}/'2. Rekapitulasi'!C${grandTotalExcelRow}`,
      z: percentFormat
    };
  });

  wsDetail['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: detailRows.length - 1, c: 6 } });
  wsDetail['!cols'] = [
    { wch: 15 }, // WBS Code
    { wch: 55 }, // Description
    { wch: 12 }, // Volume
    { wch: 10 }, // Unit
    { wch: 20 }, // Unit Price
    { wch: 22 }, // Total Price
    { wch: 12 }  // Weight
  ];
  XLSX.utils.book_append_sheet(workbook, wsDetail, '3. Detail RAB');

  // ============================================
  // WRITE AND SAVE FILE
  // ============================================
  XLSX.writeFile(workbook, filename);
}
