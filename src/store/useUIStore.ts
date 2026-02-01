import { create } from 'zustand';

interface SelectionState {
    nodeId: string;
    text: string;
}

interface UIState {
    isSidebarCollapsed: boolean;
    activeSelection: SelectionState | null;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
    setActiveSelection: (selection: SelectionState | null) => void;
    clearActiveSelection: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSidebarCollapsed: false,
    activeSelection: null,
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setActiveSelection: (selection) => set({ activeSelection: selection }),
    clearActiveSelection: () => set({ activeSelection: null }),
}));
