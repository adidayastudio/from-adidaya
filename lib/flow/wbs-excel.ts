import * as XLSX from 'xlsx';

export interface ExcelWBSItem {
  code: string;
  nameId: string; // Mandatory Indonesian Name
  nameEn?: string; // Optional English Name
  level?: string;
}

/**
 * Parses Excel sheets back into WBS items.
 * If sheets are divided by discipline, we read from Rekapitulasi & other sheets,
 * or simply fallback to reading the first sheet if it's a flat format.
 */
export function parseWBSExcel(fileBuffer: ArrayBuffer): ExcelWBSItem[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const items: ExcelWBSItem[] = [];

  // Helper to parse a single worksheet
  const parseSheet = (worksheet: XLSX.WorkSheet) => {
    const rows = XLSX.utils.sheet_to_json<any>(worksheet);
    for (const row of rows) {
      const codeKey = Object.keys(row).find(k => k.toLowerCase().replace(/\s/g, '').includes('code') || k.toLowerCase().replace(/\s/g, '').includes('kode'));
      const nameIdKey = Object.keys(row).find(k => k.toLowerCase().includes('indonesia') || k.toLowerCase().includes('id') || k.toLowerCase().includes('nama'));
      const nameEnKey = Object.keys(row).find(k => k.toLowerCase().includes('english') || k.toLowerCase().includes('en') || k.toLowerCase().includes('inggris'));
      const levelKey = Object.keys(row).find(k => k.toLowerCase().includes('level') || k.toLowerCase().includes('tingkat'));

      if (codeKey && nameIdKey) {
        const code = String(row[codeKey]).trim();
        const nameId = String(row[nameIdKey]).trim();
        if (code && nameId) {
          items.push({
            code,
            nameId,
            nameEn: nameEnKey ? String(row[nameEnKey]).trim() : undefined,
            level: levelKey ? String(row[levelKey]).trim() : undefined
          });
        }
      }
    }
  };

  // If there are multiple sheets and one is "Rekapitulasi", let's parse Rekapitulasi + all other sheets except "Cover"
  const hasMultipleSheets = workbook.SheetNames.length > 1;
  const hasCover = workbook.SheetNames.some(name => name.toLowerCase().includes('cover'));

  if (hasMultipleSheets) {
    workbook.SheetNames.forEach(sheetName => {
      if (sheetName.toLowerCase().includes('cover')) {
        return; // Skip cover sheet
      }
      parseSheet(workbook.Sheets[sheetName]);
    });
  } else {
    // Single sheet fallback
    parseSheet(workbook.Sheets[workbook.SheetNames[0]]);
  }

  // Deduplicate and filter empty items
  const uniqueItems: ExcelWBSItem[] = [];
  const seenCodes = new Set<string>();
  for (const item of items) {
    if (!seenCodes.has(item.code)) {
      seenCodes.add(item.code);
      uniqueItems.push(item);
    }
  }

  return uniqueItems;
}

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) file.
 * Sheets:
 * 1. Cover (General info)
 * 2. Rekapitulasi (L1 Summary)
 * 3. Per-Discipline (Separate sheet for each L1 discipline containing details)
 */
export function exportWBSToExcel(items: any[], filename: string) {
  const workbook = XLSX.utils.book_new();

  // ============================================
  // SHEET 1: COVER
  // ============================================
  const coverData = [
    ["WORK BREAKDOWN STRUCTURE (WBS) TEMPLATE"],
    ["ADIDAYA STUDIO"],
    [],
    ["INFORMASI PROYEK GENERAL"],
    ["Nama Proyek", ": [Masukkan Nama Proyek Di Sini]"],
    ["Kode Proyek", ": [Masukkan Kode Proyek Di Sini]"],
    ["Lokasi", ": [Masukkan Lokasi Proyek Di Sini]"],
    ["Tahun", `: ${new Date().getFullYear()}`],
    [],
    ["Catatan:", "Silakan edit WBS pada sheet Rekapitulasi dan Sheet Disiplin masing-masing."],
  ];
  const wsCover = XLSX.utils.aoa_to_sheet(coverData);
  
  // Basic Cover styling/widths
  wsCover['!cols'] = [{ wch: 25 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(workbook, wsCover, '1. Cover');

  // ============================================
  // SHEET 2: REKAPITULASI
  // ============================================
  const rekapRows = [
    ["WBS Code", "Nama Disiplin (Indonesia)", "Nama Disiplin (Inggris)", "Level"]
  ];

  items.forEach(node => {
    // Only L1 goes to Rekapitulasi
    rekapRows.push([
      node.code || '',
      node.nameId || node.description || '',
      node.nameEn || node.name || '',
      'Level 1'
    ]);
  });

  const wsRekap = XLSX.utils.aoa_to_sheet(rekapRows);
  wsRekap['!cols'] = [
    { wch: 15 }, // WBS Code
    { wch: 40 }, // Nama Indonesia
    { wch: 30 }, // Nama Inggris
    { wch: 15 }  // Level
  ];
  XLSX.utils.book_append_sheet(workbook, wsRekap, '2. Rekapitulasi');

  // ============================================
  // SHEET 3+: PER DISIPLIN
  // ============================================
  items.forEach((disciplineNode, index) => {
    const disciplineName = (disciplineNode.nameId || disciplineNode.description || disciplineNode.name || `Discipline ${index + 1}`).substring(0, 30); // Excel sheet name limit is 31 chars
    
    // Clean name for excel sheet tab compatibility
    const cleanSheetName = disciplineName.replace(/[*?:\\/\[\]]/g, '');

    const discRows = [
      ["WBS Code", "Nama Pekerjaan (Indonesia)", "Nama Pekerjaan (Inggris)", "Level"]
    ];

    // We write the discipline node itself first
    discRows.push([
      disciplineNode.code || '',
      disciplineNode.nameId || disciplineNode.description || '',
      disciplineNode.nameEn || disciplineNode.name || '',
      'Level 1'
    ]);

    // Flatten all children/descendants of this discipline
    const flattenDescendants = (nodes: any[], levelNum: number = 2) => {
      nodes.forEach(node => {
        discRows.push([
          node.code || '',
          node.nameId || node.description || '',
          node.nameEn || node.name || '',
          `Level ${levelNum}`
        ]);
        if (node.children && node.children.length > 0) {
          flattenDescendants(node.children, levelNum + 1);
        }
      });
    };

    if (disciplineNode.children && disciplineNode.children.length > 0) {
      flattenDescendants(disciplineNode.children);
    }

    const wsDisc = XLSX.utils.aoa_to_sheet(discRows);
    wsDisc['!cols'] = [
      { wch: 15 }, // WBS Code
      { wch: 45 }, // Nama Indonesia
      { wch: 30 }, // Nama Inggris
      { wch: 15 }  // Level
    ];

    XLSX.utils.book_append_sheet(workbook, wsDisc, `${index + 3}. ${cleanSheetName}`);
  });

  // Write file
  XLSX.writeFile(workbook, filename);
}
