// Shared widths keep navigation and list/detail boundaries stable across modules.
export const DESKTOP_SIDEBAR_WIDTH = 224;
export const DESKTOP_COLLAPSED_SIDEBAR_WIDTH = 64;
export const DESKTOP_LIST_PANE = {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 360,
    width: 360,
    minWidth: 360,
    maxWidth: 360,
} as const;

export const DESKTOP_PANEL_HEADER = { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0 } as const;
export const DESKTOP_PANEL_TITLE_ROW = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 34 } as const;
export const DESKTOP_PANEL_TITLE = { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, flexShrink: 1 } as const;
export const DESKTOP_PANEL_ACTION = { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' } as const;
