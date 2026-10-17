import React, { createContext, useContext } from 'react';
export const ReportEditorContext = createContext({ params: new URLSearchParams(), chromeTarget: null as HTMLElement | null, onClose: () => {}, onSaved: () => {} });
export const useSearchParams = () => useContext(ReportEditorContext).params;
export const useRouter = () => {
    const { onClose, onSaved } = useContext(ReportEditorContext);
    return { back: onClose, push: (_url: string) => onSaved(), replace: (_url: string) => onSaved() };
};
