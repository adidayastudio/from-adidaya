import { CATEGORY_OPTIONS, SUBCATEGORY_OPTIONS, REIMBURSE_CATEGORY_OPTIONS, REIMBURSE_SUBCATEGORY_OPTIONS } from '@/components/finance/constants';
import type { FinanceCategory, FinanceSubcategory } from '@/lib/api/financeSetup';
export type FinanceCategoryWorkflow = 'purchasing' | 'reimbursement';
export function transactionCategoryValue(item: FinanceCategory | FinanceSubcategory, workflow: FinanceCategoryWorkflow): string {
    return item.legacyValues?.[workflow] || item.name;
}
export function transactionCategoriesFor(items: FinanceCategory[], workflow: FinanceCategoryWorkflow): FinanceCategory[] {
    return items.filter(item => !item.isArchived && (!item.legacyValues || !!item.legacyValues[workflow]));
}
// One-time import of Adidaya's existing values. Never regenerate these after migration.
export function importAdidayaTransactionCategories(existing: FinanceCategory[]): FinanceCategory[] {
    const result = existing.map(item => ({ ...item, subcategories: (item.subcategories || []).map(sub => ({ ...sub })) }));
    const normalize = (value: string) => value.trim().toLowerCase();
    const codes: Record<string, string> = { MATERIAL: 'MAT', TOOLS_EQUIPMENT: 'TEQ', SERVICES: 'SRV', PROJECT_OPERATIONS: 'PRO', OFFICE_OPERATIONS: 'OFF', ASSETS_INVENTORY: 'AST', FINANCIAL_LEGAL: 'FIN', SPECIAL: 'SPC', TRANSPORTATION: 'TRN', CONSUMPTION: 'CON', ACCOMMODATION: 'ACC', PURCHASE_PROJECT: 'PPR', OPERATIONS_PROJECT: 'POP', SUPPORT_OFFICE: 'SUP', COMMUNICATION: 'COM', HEALTH_SAFETY: 'HSE', TRAVEL_DUTY: 'TRV', EMERGENCY: 'EMG', OTHER: 'OTH' };
    for (const workflow of ['purchasing', 'reimbursement'] as const) {
        const categories = workflow === 'purchasing' ? CATEGORY_OPTIONS : REIMBURSE_CATEGORY_OPTIONS;
        const children: Record<string, { value: string; label: string }[]> = workflow === 'purchasing' ? SUBCATEGORY_OPTIONS : REIMBURSE_SUBCATEGORY_OPTIONS;
        for (const legacy of categories) {
            let category = result.find(item => item.legacyValues?.[workflow] === legacy.value || normalize(item.name) === normalize(legacy.label));
            if (!category) {
                category = { id: 'ady_cat_' + workflow + '_' + legacy.value.toLowerCase(), code: codes[legacy.value] || legacy.value, name: legacy.label, defaultExpenseType: workflow === 'purchasing' ? 'Project Purchase' : 'Reimbursement', resourceMapping: legacy.value === 'MATERIAL' ? 'Material' : legacy.value === 'TOOLS_EQUIPMENT' ? 'Tools' : legacy.value === 'SERVICES' ? 'Services' : legacy.value === 'ASSETS_INVENTORY' ? 'Assets' : 'None', subcategories: [] };
                result.push(category);
            }
            category.legacyValues = { ...category.legacyValues, [workflow]: legacy.value };
            for (const [index, oldSub] of (children[legacy.value] || []).entries()) {
                let sub = category.subcategories.find(item => item.legacyValues?.[workflow] === oldSub.value || normalize(item.name) === normalize(oldSub.label));
                if (!sub) {
                    sub = { id: category.id + '_' + oldSub.value.toLowerCase(), code: category.code + '-' + String(index + 1).padStart(2, '0'), name: oldSub.label, defaultExpenseType: 'Inherit from Category', resourceMapping: 'Inherit from Category' };
                    category.subcategories.push(sub);
                }
                sub.legacyValues = { ...sub.legacyValues, [workflow]: oldSub.value };
            }
        }
    }
    return result;
}
