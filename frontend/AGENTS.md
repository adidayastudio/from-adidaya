# AGENTS.md

## Working Mode
- Be extremely concise.
- Act first; explain only when needed.
- No progress narration.
- Do not restate the task.
- No tutorials or unsolicited suggestions.
- Final response: max 3 short bullets.
- **Browser Restriction**: DILARANG membuka browser (Chrome/browser subagent/puppeteer) secara otomatis kecuali jika diminta secara eksplisit oleh user.

## Repository Discipline
- Inspect only files relevant to the task.
- Prefer targeted search over broad repository exploration.
- Do not re-read unchanged files unnecessarily.
- Make the smallest change that fully solves the task.
- Do not refactor unrelated code.
- Reuse existing components, patterns, naming, and architecture.
- Preserve existing behavior unless the task explicitly changes it.

## Implementation
- Implement directly when requirements are clear.
- Do not create abstractions for one-off changes.
- Do not add dependencies unless necessary.
- **Consistency & Reuse**: Wajib konsisten dengan pola yang sudah ada di codebase. Gunakan drawer, bottom sheet, context menu, dan segmented control standar yang sudah teruji. Jangan buat custom/ad-hoc styling yang menyimpang dari pattern yang sudah ada.
- **iOS & Android UI Components**:
  - **iOS**: Wajib selalu menggunakan Native SwiftUI components (`@expo/ui/swift-ui` seperti `BottomSheet`, `Host`, `Form`, `Section`, dsb.) dan native context menus. Jangan ubah atau ganti native SwiftUI components dengan custom React Native Modal di iOS.
  - **Android**: Gunakan standar BottomSheet modal yang konsisten, mengisi penuh ke bawah layar (`statusBarTranslucent`, `navigationBarTranslucent`), dengan rounded top corners dan styling seragam.
- **Module Accent Colors**:
  - **FORMA / Brand utama (Menu)**: `#0036F8` (Electric Blue)
  - **Finance**: `#159957` (Green)
  - **Resources**: `#F58232` (Orange)
  - **People**: `#1677D2` (Blue)
  - **Clock**: `#0EA5E9` (Cyan Blue)
  - **Report**: `#0F9D8A` (Teal)
  - **Crew**: `#8B5CF6` (Purple)
  - **Forma AI**: `#4F46E5` (Indigo)

## Verification
- Run only relevant tests, lint, typecheck, or build checks.
- Do not run the full test suite unless the change requires it.
- Fix errors caused by your change only; report unrelated existing errors briefly.

## When Unclear
- Infer from nearby existing patterns first.
- Ask only if a missing decision would materially change the implementation.

## Repository Mapping
- Folder lokal `newfromadidaya` menggunakan repository GitHub `https://github.com/adidayastudio/from-adidaya.git` (dikonfirmasi user).
- Saat diminta commit/push, gunakan repository tersebut; jangan menyimpulkan repository tidak ada hanya karena remote lokal belum diatur.
