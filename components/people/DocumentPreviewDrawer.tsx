import React from 'react';
import { DocumentPreviewModal } from './DocumentPreviewModal';

export interface PreviewDocItem {
    id: string;
    title: string;
    category: string;
    file_url: string;
    created_at?: string;
    updated_at?: string;
}

export interface DocumentPreviewDrawerProps {
    visible: boolean;
    onClose: () => void;
    document: PreviewDocItem | null;
    onDownload: (url: string, title: string) => void;
    onChange: (category: string) => void;
    onDelete: (docId: string, category: string) => void;
    isDark?: boolean;
}

export const DocumentPreviewDrawer: React.FC<DocumentPreviewDrawerProps> = DocumentPreviewModal as any;
export default DocumentPreviewDrawer;
