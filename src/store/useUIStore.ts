import { create } from 'zustand';

interface UIState {
    isSidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;
    toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    isSidebarCollapsed: false,
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
}));
