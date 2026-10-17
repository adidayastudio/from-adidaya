# Finance Setup UI update

Applied the current Forma presentation to 34 setup components, plus shared destructive-action confirmation. Categories, expense types, taxes, account editors, payment terms/cycles, search/filter controls, switches, and guides are included.

Adidaya financeSetup API storage, Funding Sources mapping, approval authorization, notification triggers and transactional APIs were preserved. The Forma tenant metadata sync, migration of old browser settings to cloud, empty-default replacement and reset-to-Forma orchestration were not imported. The existing bank account section/editor/guide remain on the Adidaya path.

Setup pane state is updated after its save completes; save errors are displayed instead of silently updating the visible value.

Verification: 14 targeted setup and release regression tests pass. The first updated TypeScript comparison introduced zero new normalized diagnostics and removed six existing ones. Web build passed. No production records were edited.

Updated components:

- FinanceAccountEditSheet.tsx
- FinanceAccountsGuideSheet.tsx
- FinanceAccountsSection.tsx
- FinanceAuditLogSection.tsx
- FinanceCategoryEditSheet.ios.tsx
- FinanceCategoryEditSheet.tsx
- FinanceDocumentLevelsGuideSheet.tsx
- FinanceDocumentRulesSection.tsx
- FinanceExpenseTypeEditSheet.ios.tsx
- FinanceExpenseTypeEditSheet.tsx
- FinanceExpenseTypesGuideSheet.tsx
- FinanceExpenseTypesSection.tsx
- FinanceFieldRulesSection.tsx
- FinanceGroupEditModal.tsx
- FinanceLevelEditModal.tsx
- FinanceNotificationRulesSection.tsx
- FinancePaymentCycleEditSheet.tsx
- FinancePaymentCyclesGuideSheet.tsx
- FinancePaymentCyclesSection.tsx
- FinancePaymentTermEditSheet.tsx
- FinancePaymentTermsGuideSheet.tsx
- FinancePaymentTermsSection.tsx
- FinanceResourceMappingGuideSheet.tsx
- FinanceSubcategoryEditSheet.ios.tsx
- FinanceSubcategoryEditSheet.tsx
- FinanceTaxRuleEditSheet.ios.tsx
- FinanceTaxRuleEditSheet.tsx
- FinanceTaxRulesGuideSheet.tsx
- FinanceTaxRulesSection.tsx
- FinanceTeamSetupTab.tsx
- FinanceTransactionCategoriesSection.tsx
- FinanceWorkflowSegmentedPicker.tsx
- FinanceApprovalMatrixGuideSheet.tsx
- FinanceFieldRulesGuideSheet.tsx
