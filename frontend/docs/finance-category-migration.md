# Adidaya Transaction Categories import

The first call to getFinanceCategories imports the existing purchasing and reimbursement category/subcategory catalog into the current Setup storage. It merges matching names/legacy values, preserves custom fields and archived entries, then writes a one-time migration marker. Subsequent reads do not recreate deleted entries. Empty saved lists stay empty after the migration.

The active web/Android request drawer and iOS request sheet read this same catalog. Archived items are hidden. A separate legacyValues mapping preserves Adidaya transaction values even if a display name/code is edited in Setup; historical transaction rows are not rewritten. Category and subcategory editors preserve this mapping. New custom categories retain the existing name-based save convention.

This uses the existing AsyncStorage-backed Finance Setup storage; cross-device cloud sync is not introduced by this change. Nothing was inserted into production financial transaction tables. Previously unused AddPurchaseModal/AddReimbursementModal components are not wired into the application and were left alone.

Verification: 17 category-import, Setup and release regression tests passed; TypeScript comparison found no new diagnostics. Cases cover all legacy codes, idempotent merge, custom/archived preservation, and deletion after migration without resurrection.
