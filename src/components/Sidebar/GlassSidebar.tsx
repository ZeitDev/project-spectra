import { useEffect } from 'react';
import { useSessionStore } from '../../store/useSessionStore';
import { useTreeStore } from '../../store/useTreeStore';

export function GlassSidebar() {
    const { sessions, currentSessionId, createSession, switchSession, deleteSession } = useSessionStore();
    const treeStore = useTreeStore();

    // Initialize first session if none exist
    useEffect(() => {
        if (sessions.length === 0) {
            createSession();
        }
    }, [sessions.length, createSession]);

    const handleSwitchSession = (targetSessionId: string) => {
        if (targetSessionId === currentSessionId) return;

        // 1. Save current session state
        if (currentSessionId) {
            const currentState = useTreeStore.getState();
            // We only need to persist the 'state' part of persisted store, but useTreeStore is the store itself.
            // Zustand persist middleware handles auto-saving to 'spectra-tree-storage'.
            // but we want to save per session.

            // Let's manually save to a specific key
            localStorage.setItem(`spectra-tree-${currentSessionId}`, JSON.stringify({
                state: {
                    nodes: currentState.nodes,
                    rootId: currentState.rootId,
                    focusedNodeId: currentState.focusedNodeId,
                    highlightedNodeIds: currentState.highlightedNodeIds
                },
                version: 0 // minimal mock of zustand persist structure if needed, or just plain object
            }));
        }

        // 2. Load target session state
        const savedData = localStorage.getItem(`spectra-tree-${targetSessionId}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Handle both raw object and zustand persist wrapped object
                const stateToLoad = parsed.state || parsed;
                treeStore.loadState(stateToLoad);
            } catch (e) {
                console.error("Failed to load session", e);
                treeStore.clearAll();
            }
        } else {
            treeStore.clearAll();
        }

        // 3. Update active session pointer
        switchSession(targetSessionId);
    };

    const handleCreateSession = () => {
        // Save current before creating new?
        // switchSession logic inside createSession action does not exist, it just adds to list.
        // We need to implement the 'new session' flow here using the primitives.

        // Actually, createSession in store adds a new session and sets it as current. 
        // We should wrap that interaction to save the old one first.

        if (currentSessionId) {
            const currentState = useTreeStore.getState();
            localStorage.setItem(`spectra-tree-${currentSessionId}`, JSON.stringify({
                state: {
                    nodes: currentState.nodes,
                    rootId: currentState.rootId,
                    focusedNodeId: currentState.focusedNodeId,
                    highlightedNodeIds: currentState.highlightedNodeIds
                }
            }));
        }

        createSession(); // This sets new currentSessionId in session store
        treeStore.clearAll(); // Clear the tree for the new session
    };

    return (
        <div className="fixed top-6 left-6 w-64 h-[calc(100vh-3rem)] z-50 pointer-events-none flex flex-col gap-4">
            {/* Main Container - Pointer events auto to allow interaction */}
            <div className="glass w-full h-full pointer-events-auto flex flex-col p-4 overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-slate-700 font-semibold tracking-wide text-sm uppercase">Sessions</h2>
                    <button
                        onClick={handleCreateSession}
                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 text-slate-600 hover:text-indigo-600 transition-all"
                        title="New Session"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto -mx-2 px-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                    <div className="flex flex-col gap-2">
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                onClick={() => handleSwitchSession(session.id)}
                                className={`
                                    group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                    ${session.id === currentSessionId
                                        ? 'bg-white/40 border-indigo-500/30 shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-white/20 hover:border-white/30'
                                    }
                                `}
                            >
                                {/* Icon */}
                                <div className={`
                                    flex items-center justify-center w-8 h-8 rounded-lg 
                                    ${session.id === currentSessionId
                                        ? 'bg-indigo-500 text-white shadow-indigo-500/30 shadow-lg'
                                        : 'bg-slate-200/50 text-slate-500 group-hover:bg-white group-hover:text-indigo-500'
                                    } transition-colors
                                `}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-sm font-medium truncate ${session.id === currentSessionId ? 'text-slate-800' : 'text-slate-600'}`}>
                                        {session.name}
                                    </h3>
                                    <p className="text-[10px] text-slate-400">
                                        {new Date(session.createdAt).toLocaleDateString()}
                                    </p>
                                </div>

                                {/* Delete (hover only) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteSession(session.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
