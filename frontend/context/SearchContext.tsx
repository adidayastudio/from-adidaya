import React, { createContext, useCallback, useContext, useState } from 'react';

export interface ContextActionOption {
    label: string;
    icon: string;         // Ionicons name
    sfIcon?: string;      // SF Symbol name
    description?: string; // Optional description for card-style layout
    action: () => void;
}

export interface ContextAction {
    label: string;
    icon: string;      // Ionicons name for Android/Custom Floating Bar
    iconFocused?: string; // Optional focused Ionicons name
    sfIcon?: string;   // SF Symbol name for iOS NativeTabs
    action: () => void;
    options?: ContextActionOption[];
}

interface SearchContextType {
    isSearchVisible: boolean;
    setIsSearchVisible: (visible: boolean) => void;
    toggleSearch: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    activeModule: string;
    setActiveModule: (module: string) => void;
    contextAction: ContextAction | null;
    setContextAction: (action: ContextAction | null) => void;
    lastActivePath: string;
    setLastActivePath: (path: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeModule, setActiveModule] = useState('home');
    const [contextAction, setContextAction] = useState<ContextAction | null>(null);
    const [lastActivePath, setLastActivePath] = useState('/(tabs)/home');

    const toggleSearch = useCallback(() => {
        setIsSearchVisible(prev => !prev);
    }, []);

    return (
        <SearchContext.Provider value={{
            isSearchVisible,
            setIsSearchVisible,
            toggleSearch,
            searchQuery,
            setSearchQuery,
            activeModule,
            setActiveModule,
            contextAction,
            setContextAction,
            lastActivePath,
            setLastActivePath,
        }}>
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
}
