/**
 * Utility functions for WBS CSV export and import.
 */

export interface CSVWBSItem {
  code: string;
  nameId: string; // Mandatory Indonesian Name
  nameEn?: string; // Optional English Name
  level?: string;
}

/**
 * Parses raw CSV text into a structured array of WBS items.
 */
export function parseWBSCSV(csvText: string): CSVWBSItem[] {
  const lines = parseCSV(csvText);
  if (lines.length < 2) return [];

  // Identify headers
  const headers = lines[0].map(h => h.toLowerCase().trim());
  
  // Find column indices
  const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('kode'));
  const nameIdIdx = headers.findIndex(h => h.includes('indonesia') || h.includes('id') || h.includes('nama'));
  const nameEnIdx = headers.findIndex(h => h.includes('english') || h.includes('en') || h.includes('inggris'));
  const levelIdx = headers.findIndex(h => h.includes('level') || h.includes('tingkat'));

  if (codeIdx === -1 || nameIdIdx === -1) {
    throw new Error("CSV must contain at least 'WBS Code' and 'Nama Indonesia' columns.");
  }

  const items: CSVWBSItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || !row[codeIdx]) continue;

    items.push({
      code: row[codeIdx].trim(),
      nameId: row[nameIdIdx]?.trim() || "",
      nameEn: nameEnIdx !== -1 ? row[nameEnIdx]?.trim() : undefined,
      level: levelIdx !== -1 ? row[levelIdx]?.trim() : undefined,
    });
  }

  return items.filter(item => item.code && item.nameId);
}

/**
 * Standard CSV Parser handling quotes and commas.
 */
function parseCSV(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          cell += '"';
          i++; 
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++; 
        }
        row.push(cell.trim());
        if (row.length > 1 || row[0] !== '') {
          result.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
  }
  if (row.length > 0 || cell !== '') {
    row.push(cell.trim());
    result.push(row);
  }
  return result;
}

/**
 * Escapes cells for CSV format.
 */
function escapeCSVCell(val: string): string {
  if (!val) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts tree/flat WBS items into CSV download content.
 */
export function generateWBSCSV(items: any[]): string {
  const csvRows: string[] = [];
  
  // Headers
  csvRows.push(['WBS Code', 'Nama Indonesia', 'Nama Inggris', 'Level'].map(escapeCSVCell).join(','));

  // Flatten the tree for export
  const flatten = (nodes: any[], levelNum: number = 1) => {
    nodes.forEach(node => {
      const code = node.code || '';
      const nameId = node.nameId || node.description || '';
      const nameEn = node.nameEn || node.name || '';
      const level = node.level || `L${levelNum}`;
      
      csvRows.push([code, nameId, nameEn, level].map(escapeCSVCell).join(','));
      
      if (node.children && node.children.length > 0) {
        flatten(node.children, levelNum + 1);
      }
    });
  };

  flatten(items);
  return csvRows.join('\n');
}
