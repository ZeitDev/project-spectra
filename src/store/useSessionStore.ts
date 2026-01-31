import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '../types/session';

interface SessionState {
    sessions: Session[];
    currentSessionId: string | null;
    createSession: () => void;
    switchSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    updateSessionName: (sessionId: string, name: string) => void;
    togglePinSession: (sessionId: string) => void;
}

const generateId = () => crypto.randomUUID();

export const useSessionStore = create<SessionState>()(
    persist(
        (set, _get) => ({
            sessions: [],
            currentSessionId: null,

            createSession: () => {
                const id = generateId();
                const newSession: Session = {
                    id,
                    name: `Session ${new Date().toLocaleTimeString()}`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };

                set((state) => ({
                    sessions: [newSession, ...state.sessions],
                    currentSessionId: id,
                }));

                // Force reload to clear current tree store from memory if needed
                // But typically we rely on the component using the key to re-mount/reset
                // However, Zustand persist needs a specific key.
                // We'll handle tree reset in the component layer by updating the persistent storage key/version
                // or by manually clearing the tree store. 
                // Currently, let's just assume we will handle the tree-data-swap in the logic or useEffect.

                // Actually, a better pattern for this multi-session without backend
                // is to force a window reload or manage the tree store's persistence key dynamically.
                // For this MVP, let's trigger a reload or rely on a wrapper that changes the key.
            },

            switchSession: (sessionId) => {
                set({ currentSessionId: sessionId });
            },

            deleteSession: (sessionId) => {
                set((state) => {
                    const newSessions = state.sessions.filter((s) => s.id !== sessionId);
                    let newCurrentId = state.currentSessionId;

                    if (state.currentSessionId === sessionId) {
                        newCurrentId = newSessions.length > 0 ? newSessions[0].id : null;
                    }

                    // Clean up local storage for this session
                    localStorage.removeItem(`spectra-tree-${sessionId}`);

                    return {
                        sessions: newSessions,
                        currentSessionId: newCurrentId,
                    };
                });
            },

            updateSessionName: (sessionId, name) => {
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === sessionId ? { ...s, name, updatedAt: Date.now() } : s
                    ),
                }));
            },

            togglePinSession: (sessionId) => {
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
                    ),
                }));
            },
        }),
        {
            name: 'spectra-sessions',
        }
    )
);
