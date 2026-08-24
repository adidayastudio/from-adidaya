import { WBS_BALLPARK } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-ballpark";
import { RAW_WBS_ESTIMATES_DELTA } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-estimates";
import { buildEstimatesFromBallpark } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-inherit";
import { buildRABEstimates } from "@/components/flow/projects/project-detail/setup/rab/ballpark/data/rab-estimates-builder";
import { pruneToDepth } from "@/components/flow/projects/project-detail/setup/wbs/data/wbs-tree";
import type { RABRowData, ProjectV3Info } from "../RABV3StructuredExcel";

export interface DisciplineTabInfo {
  id: string;
  code: string;
  label: string;
}

/**
 * Safe helper to clean title without ever stripping normal words (like Persiapan, Pengukuran).
 */
function cleanTitleText(rawTitle: string): string {
  if (!rawTitle) return "";
  let str = String(rawTitle).trim();
  str = str.replace(/^PEKERJAAN\s+/i, "");
  str = str.replace(/^[A-Z]\d*(\.\d+)*\.\s+/, "");
  return str.trim();
}

/**
 * Builds RAB tree matching selected WBS stage.
 * BALLPARK = Pure WBS Ballpark ONLY (WBS_BALLPARK, Level 1-2 only, zero estimates delta mixing).
 * ESTIMATES = WBS Ballpark + Estimates Delta.
 * DETAIL = Full Detail WBS.
 */
export function getFullWBSTree(projectInfo?: ProjectV3Info) {
  const stage = projectInfo?.stage || "BALLPARK";

  let rawTree: any[] = [];
  if (projectInfo?.wbsTree && projectInfo.wbsTree.length > 0) {
    rawTree = projectInfo.wbsTree;
  } else {
    if (stage === "BALLPARK") {
      rawTree = WBS_BALLPARK;
    } else {
      rawTree = buildEstimatesFromBallpark(WBS_BALLPARK, RAW_WBS_ESTIMATES_DELTA as any);
    }
  }

  const area = projectInfo?.buildingArea || 1000;
  const rabClass = projectInfo?.buildingClass || "B";

  const estimatesTree = buildRABEstimates(
    rawTree,
    projectInfo?.estimateValues || {},
    {
      rabClass: rabClass,
      rf: 1,
      df: 1,
      adjustmentFactor: 100,
    }
  );

  const baseTree = estimatesTree && estimatesTree.length > 0 ? estimatesTree : rawTree;

  // Prune tree depth based on selected WBS stage (BALLPARK = max depth 2, ESTIMATES = max depth 3, DETAIL = max depth 5)
  const maxDepth = stage === "BALLPARK" ? 2 : stage === "ESTIMATES" ? 3 : 5;
  return pruneToDepth(baseTree, maxDepth);
}

/**
 * Reads real calculated volume & unit price from RAB V1 calculation engine & DB nodes.
 */
function getItemVolAndUnit(item: any) {
  const unit = item.unit || "m²";

  const rawVol = item.volume ?? item.quantity ?? item.vol;
  const vol = typeof rawVol === "number" && !isNaN(rawVol) ? parseFloat(rawVol.toFixed(2)) : 0;

  const rawPrice = item.unitPrice ?? item.price;
  const price = typeof rawPrice === "number" && !isNaN(rawPrice) ? Math.round(rawPrice) : 0;

  return { vol, unit, price };
}

/**
 * Dynamically extracts discipline tabs strictly per Main Discipline (S, A, M, I, L) or per Building Discipline (A.S, B.S).
 */
export function getDisciplineTabs(projectInfo?: ProjectV3Info): DisciplineTabInfo[] {
  const fullTree = getFullWBSTree(projectInfo);

  const DISCIPLINE_NAME_MAP: Record<string, string> = {
    S: "Struktur",
    A: "Arsitektur",
    M: "MEP",
    I: "Interior",
    L: "Lanskap",
  };

  const isMultiBuilding = fullTree.some(
    (root: any) => root.children && root.children.some((child: any) => {
      const code = child.code || "";
      return /^[A-Z]\.[SMAIL]$/.test(code) || (code.includes(".") && !/\d/.test(code));
    })
  );

  if (isMultiBuilding) {
    const tabs: DisciplineTabInfo[] = [];
    fullTree.forEach((buildingRoot: any) => {
      const buildingName = cleanTitleText(buildingRoot.nameId || buildingRoot.nameEn || buildingRoot.title || buildingRoot.code);
      const bChildren = buildingRoot.children || [];

      bChildren.forEach((discChild: any) => {
        const code = discChild.code || "";
        const mainDiscCode = code.match(/^[A-Z]\.[A-Z]/)?.[0] || code;
        const discLetter = mainDiscCode.split(".")[1] || mainDiscCode;
        const discName = DISCIPLINE_NAME_MAP[discLetter] || cleanTitleText(discChild.nameId || discChild.nameEn || discChild.title);

        if (!tabs.some(t => t.code === mainDiscCode)) {
          tabs.push({
            id: `disc_${mainDiscCode}`,
            code: mainDiscCode,
            label: `${mainDiscCode} ${buildingName} ${discName}`,
          });
        }
      });
    });
    return tabs;
  }

  // Single building project: ALWAYS EXACTLY 5 MAIN DIVISI TABS (S, A, M, I, L)
  return [
    { id: "disc_S", code: "S", label: "S Struktur" },
    { id: "disc_A", code: "A", label: "A Arsitektur" },
    { id: "disc_M", code: "M", label: "M MEP" },
    { id: "disc_I", code: "I", label: "I Interior" },
    { id: "disc_L", code: "L", label: "L Lanskap" },
  ];
}

/**
 * 1. Level 1 Rekap Rows (Level 1 main divisions with "Kode dulu baru nama")
 */
export function generateLevel1RekapRows(projectInfo?: ProjectV3Info): RABRowData[] {
  const fullTree = getFullWBSTree(projectInfo);

  const resultRows: RABRowData[] = [];
  let currentRowIdx = 7;

  const pCode = projectInfo?.projectCode || "PRJ";

  resultRows.push({
    id: "sec_rekap_1",
    rowIdx: currentRowIdx++,
    no: "1.0",
    code: pCode,
    title: "REKAPITULASI UMUM",
    volume: 0,
    unit: "ls",
    unitPrice: 0,
    isSection: true,
  });

  const DISCIPLINE_NAME_MAP: Record<string, string> = {
    S: "Struktur",
    A: "Arsitektur",
    M: "MEP",
    I: "Interior",
    L: "Lanskap",
  };

  fullTree.forEach((sec: any, secIdx: number) => {
    const secNo = `1.${secIdx + 1}`;
    const secId = `item_rekap_${sec.code || secIdx}`;
    const code = sec.code || `DIV-0${secIdx + 1}`;
    const rawTitle = sec.nameId || sec.nameEn || sec.title || sec.code;
    const cleanTitle = DISCIPLINE_NAME_MAP[code] || cleanTitleText(rawTitle);
    const formattedTitle = `${code} ${cleanTitle}`;

    let totalSecCost = 0;
    const calcCost = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n.children && n.children.length > 0) {
          calcCost(n.children);
        } else {
          const { vol, price } = getItemVolAndUnit(n);
          totalSecCost += vol * price;
        }
      });
    };
    if (sec.children) calcCost(sec.children);

    resultRows.push({
      id: secId,
      rowIdx: currentRowIdx++,
      no: secNo,
      code: code,
      title: `Pekerjaan ${formattedTitle}`,
      volume: 1,
      unit: "ls",
      unitPrice: totalSecCost,
    });
  });

  return resultRows;
}

/**
 * 2. Level 2 Detail Rows (Level 1 + Level 2 sub-disciplines ONLY)
 */
export function generateLevel2DetailRows(projectInfo?: ProjectV3Info): RABRowData[] {
  const fullTree = getFullWBSTree(projectInfo);

  const resultRows: RABRowData[] = [];
  let currentRowIdx = 7;

  const DISCIPLINE_NAME_MAP: Record<string, string> = {
    S: "Struktur",
    A: "Arsitektur",
    M: "MEP",
    I: "Interior",
    L: "Lanskap",
  };

  fullTree.forEach((sec: any, secIdx: number) => {
    const secNo = `${secIdx + 1}.0`;
    const secId = `sec_lvl1_${sec.code || secIdx}`;
    const code = sec.code || `WBS-0${secIdx + 1}`;
    const rawTitle = sec.nameId || sec.nameEn || sec.title || sec.code;
    const cleanTitle = DISCIPLINE_NAME_MAP[code] || cleanTitleText(rawTitle);
    const secTitle = `${code} ${cleanTitle}`;

    // Level 1 Section Header ("Kode dulu baru nama")
    resultRows.push({
      id: secId,
      rowIdx: currentRowIdx++,
      no: secNo,
      code: code,
      title: String(secTitle).toUpperCase(),
      volume: 0,
      unit: "ls",
      unitPrice: 0,
      isSection: true,
    });

    const level2Children = sec.children || [];
    level2Children.forEach((l2Child: any, l2Idx: number) => {
      const itemNo = `${secIdx + 1}.${l2Idx + 1}`;
      const itemId = `item_lvl2_${l2Child.code || `${secIdx + 1}_${l2Idx + 1}`}`;
      const rawItemTitle = l2Child.nameId || l2Child.nameEn || l2Child.title || l2Child.code;
      const cleanItemTitle = cleanTitleText(rawItemTitle);
      const formattedItemTitle = `${l2Child.code} ${cleanItemTitle}`;

      let l2TotalCost = 0;
      if (l2Child.children && l2Child.children.length > 0) {
        const sumLeaves = (nodes: any[]) => {
          nodes.forEach((n) => {
            if (n.children && n.children.length > 0) {
              sumLeaves(n.children);
            } else {
              const { vol, price } = getItemVolAndUnit(n);
              l2TotalCost += vol * price;
            }
          });
        };
        sumLeaves(l2Child.children);
      } else {
        const { vol, price } = getItemVolAndUnit(l2Child);
        l2TotalCost = vol * price;
      }

      resultRows.push({
        id: itemId,
        rowIdx: currentRowIdx++,
        no: itemNo,
        code: l2Child.code || `WBS-0${secIdx + 1}.${l2Idx + 1}`,
        title: formattedItemTitle,
        volume: 1,
        unit: "ls",
        unitPrice: l2TotalCost,
      });
    });
  });

  return resultRows;
}

/**
 * 3. Specific Discipline Rows (Matching selected stage depth: BALLPARK = Level 1-2 only, ESTIMATES/DETAIL = Level 3-5)
 */
export function generateDisciplineRows(discCode: string, projectInfo?: ProjectV3Info): RABRowData[] {
  const fullTree = getFullWBSTree(projectInfo);
  const stage = projectInfo?.stage || "BALLPARK";

  // Match all root/sub-root nodes that belong to this main discipline code (e.g. "S" or "A.S")
  const matchingRoots = fullTree.filter((r: any) => {
    const code = r.code || "";
    if (code === discCode) return true;
    if (code.startsWith(`${discCode}.`) || code.startsWith(`${discCode}`)) return true;
    return false;
  });

  const resultRows: RABRowData[] = [];
  let currentRowIdx = 7;

  // In BALLPARK stage: strictly render Level 1 Section Header + Level 2 Actionable Rows ONLY
  if (stage === "BALLPARK") {
    matchingRoots.forEach((sec: any, secIdx: number) => {
      const secNo = `${secIdx + 1}.0`;
      const secId = `disc_sec_${sec.code || secIdx}`;
      const rawTitle = sec.nameId || sec.nameEn || sec.title || sec.code;
      const cleanTitle = cleanTitleText(rawTitle);
      const secTitle = `${sec.code} ${cleanTitle}`;

      // Level 1 Section Header
      resultRows.push({
        id: secId,
        rowIdx: currentRowIdx++,
        no: secNo,
        code: sec.code || `DIV-0${secIdx + 1}`,
        title: String(secTitle).toUpperCase(),
        volume: 0,
        unit: "ls",
        unitPrice: 0,
        isSection: true,
      });

      const level2Children = sec.children || [];
      level2Children.forEach((l2Child: any, l2Idx: number) => {
        const itemNo = `${secIdx + 1}.${l2Idx + 1}`;
        const itemId = `disc_item_l2_${l2Child.code || `${secIdx + 1}_${l2Idx + 1}`}`;
        const rawItemTitle = l2Child.nameId || l2Child.nameEn || l2Child.title || l2Child.code;
        const cleanItemTitle = cleanTitleText(rawItemTitle);
        const formattedItemTitle = `${l2Child.code} ${cleanItemTitle}`;

        let l2TotalCost = 0;
        if (l2Child.children && l2Child.children.length > 0) {
          const sumLeaves = (nodes: any[]) => {
            nodes.forEach((n) => {
              if (n.children && n.children.length > 0) {
                sumLeaves(n.children);
              } else {
                const { vol, price } = getItemVolAndUnit(n);
                l2TotalCost += vol * price;
              }
            });
          };
          sumLeaves(l2Child.children);
        } else {
          const { vol, price } = getItemVolAndUnit(l2Child);
          l2TotalCost = vol * price;
        }

        resultRows.push({
          id: itemId,
          rowIdx: currentRowIdx++,
          no: itemNo,
          code: l2Child.code || `WBS-0${secIdx + 1}.${l2Idx + 1}`,
          title: formattedItemTitle,
          volume: 1,
          unit: "ls",
          unitPrice: l2TotalCost,
        });
      });
    });

    return resultRows;
  }

  // ESTIMATES & DETAIL STAGES: Expand down to Level 3/4/5 detail sub-items
  const flattenNode = (node: any, parentNo: string, depth: number) => {
    const rawTitle = node.nameId || node.nameEn || node.title || node.code;
    const code = node.code || "";
    const cleanTitle = cleanTitleText(rawTitle);

    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    const formattedTitle = hasChildren ? `${code} ${cleanTitle}` : rawTitle;

    if (hasChildren) {
      resultRows.push({
        id: `disc_sec_${code}_${currentRowIdx}`,
        rowIdx: currentRowIdx++,
        no: parentNo,
        code: code,
        title: depth <= 1 ? String(formattedTitle).toUpperCase() : String(formattedTitle),
        volume: 0,
        unit: "ls",
        unitPrice: 0,
        isSection: true,
      });

      node.children.forEach((child: any, cIdx: number) => {
        const childNo = `${parentNo}.${cIdx + 1}`;
        flattenNode(child, childNo, depth + 1);
      });
    } else {
      const { vol, unit, price } = getItemVolAndUnit(node);
      resultRows.push({
        id: `disc_item_${code}_${currentRowIdx}`,
        rowIdx: currentRowIdx++,
        no: parentNo,
        code: code,
        title: String(formattedTitle),
        volume: vol,
        unit: unit,
        unitPrice: price,
      });
    }
  };

  if (matchingRoots.length > 0) {
    matchingRoots.forEach((rootNode: any, rIdx: number) => {
      flattenNode(rootNode, `${rIdx + 1}.0`, 0);
    });
  } else if (fullTree.length > 0) {
    flattenNode(fullTree[0], "1.0", 0);
  }

  return resultRows;
}
