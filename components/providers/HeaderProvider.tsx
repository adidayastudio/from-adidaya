"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

type HeaderContent = {
  left?: React.ReactNode;
  middle?: React.ReactNode;
  right?: React.ReactNode;
  shellBackground?: string; // e.g. a gradient string
  hideGlobalActions?: boolean;
};

type HeaderContextType = {
  setHeader: (content: HeaderContent) => void;
  clearHeader: () => void;
  headerContent: HeaderContent;
};

const HeaderContentContext = createContext<HeaderContent>({});
const HeaderActionContext = createContext<{
  setHeader: (content: HeaderContent) => void;
  clearHeader: (id?: string) => void;
} | undefined>(undefined);

export function HeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerState, setHeaderState] = useState<{ content: HeaderContent; id: string | null }>({ 
    content: {}, 
    id: null 
  });

  const setHeaderWithId = useCallback((content: HeaderContent, id: string) => {
    setHeaderState((prev) => {
      // If we are setting the SAME content for the SAME ID, skip to avoid loops
      // Note: React nodes (JSX) are compared by reference. Memoize them in the consumer.
      if (
        prev.id === id &&
        prev.content.left === content.left &&
        prev.content.middle === content.middle &&
        prev.content.right === content.right &&
        prev.content.shellBackground === content.shellBackground &&
        prev.content.hideGlobalActions === content.hideGlobalActions
      ) {
        return prev;
      }
      return { content: { ...content }, id };
    });
  }, []);

  const clearHeader = useCallback((id?: string) => {
    setHeaderState((prev) => {
      // If we are clearing and it's already cleared, skip to avoid loops
      if (!id || id === prev.id) {
        if (prev.id === null && Object.keys(prev.content).length === 0) {
          return prev;
        }
        return { content: {}, id: null };
      }
      return prev;
    });
  }, []);

  const actions = useMemo(() => ({ 
    setHeader: (content: HeaderContent) => setHeaderWithId(content, `h-${Date.now()}`),
    setHeaderWithId,
    clearHeader 
  }), [setHeaderWithId, clearHeader]);

  return (
    <HeaderActionContext.Provider value={actions}>
      <HeaderContentContext.Provider value={headerState.content}>
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
  const instanceId = React.useId();

  if (!actions) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }

  // Extract boolean expressions to stable variables for useMemo
  const hasLeft = !!content?.left;
  const hasMiddle = !!content?.middle;
  const hasRight = !!content?.right;
  const hideGlobalActions = !!content?.hideGlobalActions;

  // Effect to handle content synchronization
  const contentKey = useMemo(() => {
    if (!content) return null;
    return JSON.stringify({
      shellBackground: content.shellBackground,
      hasLeft,
      hasMiddle,
      hasRight,
      hideGlobalActions
    });
  }, [content?.shellBackground, hasLeft, hasMiddle, hasRight, hideGlobalActions]);

  useEffect(() => {
    if (content) {
      if ('setHeaderWithId' in actions) {
        (actions as any).setHeaderWithId(content, instanceId);
      } else {
        actions.setHeader(content);
      }
      return () => actions.clearHeader(instanceId);
    }
    // We intentionally exclude 'content' from dependencies because we use 'contentKey'
    // to decide when the content (shape/presence) has changed significantly.
    // This prevents infinite loops if the consumer passes a new object on every render.
  }, [contentKey, actions, instanceId, updateTrigger]);

  return { headerContent, setHeader: actions.setHeader, clearHeader: actions.clearHeader };
}
