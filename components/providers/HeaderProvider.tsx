"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

type HeaderContent = {
  left?: React.ReactNode;
  middle?: React.ReactNode;
  right?: React.ReactNode;
  shellBackground?: string; // e.g. a gradient string
};

type HeaderContextType = {
  setHeader: (content: HeaderContent) => void;
  clearHeader: () => void;
  headerContent: HeaderContent;
};

const HeaderContentContext = createContext<HeaderContent>({});
const HeaderActionContext = createContext<{
  setHeader: (content: HeaderContent) => void;
  clearHeader: () => void;
} | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerContent, setHeaderContent] = useState<HeaderContent>({});

  const setHeader = useCallback((content: HeaderContent) => {
    setHeaderContent((prev) => {
      // Basic stability check
      if (
        prev.left === content.left &&
        prev.middle === content.middle &&
        prev.right === content.right &&
        prev.shellBackground === content.shellBackground
      ) {
        return prev;
      }
      return { ...prev, ...content };
    });
  }, []);

  const clearHeader = useCallback(() => {
    setHeaderContent((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      return {};
    });
  }, []);

  const actions = React.useMemo(() => ({ setHeader, clearHeader }), [setHeader, clearHeader]);

  return (
    <HeaderActionContext.Provider value={actions}>
      <HeaderContentContext.Provider value={headerContent}>
        {children}
      </HeaderContentContext.Provider>
    </HeaderActionContext.Provider>
  );
}

/**
 * useHeader Hook
 * @param content Optional content to set on mount
 * @param updateTrigger Optional value to trigger a refresh (e.g. a date or id)
 * @returns The current header state and action functions
 */
export function useHeader(content?: HeaderContent, updateTrigger?: any) {
  const actions = useContext(HeaderActionContext);
  const headerContent = useContext(HeaderContentContext);

  if (!actions) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }

  // Effect to handle content synchronization
  // We use JSON stringify for stable comparison of non-node properties
  const contentKey = React.useMemo(() => {
    if (!content) return null;
    return JSON.stringify({
      shellBackground: content.shellBackground,
      // Track existence of nodes
      hasLeft: !!content.left,
      hasMiddle: !!content.middle,
      hasRight: !!content.right
    });
  }, [content?.shellBackground, !!content?.left, !!content?.middle, !!content?.right]);

  useEffect(() => {
    if (content) {
      actions.setHeader(content);
      return () => actions.clearHeader();
    }
  }, [contentKey, actions, updateTrigger]);

  return { headerContent, setHeader: actions.setHeader, clearHeader: actions.clearHeader };
}
