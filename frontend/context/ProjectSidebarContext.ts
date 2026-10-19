import { createContext } from 'react';

// Project workspaces temporarily collapse the app sidebar while they have focus.
export const ProjectSidebarContext = createContext<() => (() => void)>(() => () => {});
