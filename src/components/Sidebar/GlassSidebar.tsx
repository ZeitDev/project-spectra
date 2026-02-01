import { useEffect, useState, useRef } from 'react';
import { useSessionStore } from '../../store/useSessionStore';
import { useTreeStore } from '../../store/useTreeStore';
import { useUIStore } from '../../store/useUIStore';
import { Session } from '../../types/session';

export function GlassSidebar() {
    const { sessions, currentSessionId, createSession, switchSession, deleteSession, updateSessionName, togglePinSession } = useSessionStore();
    const treeStore = useTreeStore();
    const { isSidebarCollapsed, setSidebarCollapsed, toggleSidebar } = useUIStore();

    // UI state for menus and renaming
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    // const [isCollapsed, setIsCollapsed] = useState(false); // Removed local state
    const menuRef = useRef<HTMLDivElement>(null);
    const editInputRef = useRef<HTMLInputElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Focus input when editing starts
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

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
            localStorage.setItem(`spectra-tree-${currentSessionId}`, JSON.stringify({
                state: {
                    nodes: currentState.nodes,
                    rootId: currentState.rootId,
                    focusedNodeId: currentState.focusedNodeId,
                    highlightedNodeIds: currentState.highlightedNodeIds
                },
                version: 0
            }));
        }

        // 2. Load target session state
        const savedData = localStorage.getItem(`spectra-tree-${targetSessionId}`);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
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
        setSidebarCollapsed(false);
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

        createSession();
        treeStore.clearAll();
    };

    const handleRenameSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editingId && editName.trim()) {
            updateSessionName(editingId, editName.trim());
            setEditingId(null);
        }
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    // Sort sessions: Pinned first, then by createdAt descending
    const sortedSessions = [...sessions].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.createdAt - a.createdAt;
    });

    return (
        <div
            className={`
                fixed top-6 left-6 w-64 z-50 pointer-events-none flex flex-col gap-4
                transition-[height] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]
                ${isSidebarCollapsed ? 'h-[72px]' : 'h-[calc(100vh-3rem)]'}
            `}
        >
            {/* Main Container */}
            <div className="glass w-full h-full pointer-events-auto flex flex-col p-4 overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-slate-800 font-bold tracking-wider text-lg font-display">SPECTRA</h1>
                        <button
                            onClick={toggleSidebar}
                            className="p-1 rounded-md hover:bg-black/5 text-slate-400 hover:text-indigo-600 transition-colors"
                            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                        >
                            <svg
                                className={`w-4 h-4 transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    </div>
                    <button
                        onClick={handleCreateSession}
                        className="p-1.5 rounded-lg bg-white/40 hover:bg-white/60 text-slate-700 hover:text-indigo-600 transition-all shadow-sm"
                        title="New Session"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </button>
                </div>

                {/* Session List */}
                <div className={`
                    flex-1 overflow-y-auto -mx-2 px-2 pb-2 space-y-1 gradient-scrollbar
                    transition-opacity duration-300 delay-100
                    ${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'}
                `}>
                    {sortedSessions.map(session => (
                        <div
                            key={session.id}
                            className={`
                                group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                                ${session.id === currentSessionId
                                    ? 'bg-white/40 border-indigo-500/30 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-white/20 hover:border-white/30'
                                }
                            `}
                            onClick={() => handleSwitchSession(session.id)}
                        >
                            {/* Pin Indicator */}
                            {session.isPinned && (
                                <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-indigo-500/50 shadow-sm" />
                            )}

                            {/* Info or Edit Mode */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                                {editingId === session.id ? (
                                    <input
                                        ref={editInputRef}
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={handleRenameKeyDown}
                                        onBlur={handleRenameSubmit}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full bg-white/50 border border-indigo-200 rounded px-1 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                ) : (
                                    <>
                                        <h3 className={`text-sm font-medium truncate ${session.id === currentSessionId ? 'text-slate-800' : 'text-slate-600'}`}>
                                            {session.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-400">
                                            {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* 3-Dot Menu Button */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === session.id ? null : session.id);
                                    }}
                                    className={`
                                        p-1 rounded-md hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-all
                                        ${menuOpenId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                                    `}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>

                                {/* Dropdown Menu */}
                                {menuOpenId === session.id && (
                                    <div
                                        ref={menuRef}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-8 w-32 bg-white/90 backdrop-blur-xl border border-white/50 rounded-lg shadow-xl z-50 py-1 text-sm animate-in fade-in zoom-in-95 duration-100"
                                    >
                                        <button
                                            onClick={() => {
                                                togglePinSession(session.id);
                                                setMenuOpenId(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                            {session.isPinned ? 'Unpin' : 'Pin'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(session.id);
                                                setEditName(session.name);
                                                setMenuOpenId(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Rename
                                        </button>
                                        <div className="h-px bg-slate-100 my-1" />
                                        <button
                                            onClick={() => {
                                                deleteSession(session.id);
                                                setMenuOpenId(null);
                                            }}
                                            className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Controls & Info Section */}
                <div className={`
                    mt-4 pt-4 border-t border-slate-200/50 flex-shrink-0
                    transition-all duration-300 delay-150
                    ${isSidebarCollapsed ? 'opacity-0 invisible h-0 overflow-hidden mt-0 pt-0' : 'opacity-100 visible'}
                `}>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                        Controls & Info
                    </h4>
                    <div className="space-y-2.5 px-1 pb-2">
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Single LMB</span> node to select it for branching
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Select text</span> to branch on it specifically
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Double LMB</span> node to focus it
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Single LMB</span> to canvas to deselect all
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Single RMB</span> branch/nodes to select multiple
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Hold + Drag RMB</span> to zoom
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Mousewheel</span> to scroll vertically
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-600 leading-relaxed">
                                <span className="font-semibold text-slate-800">Hover node or select a branch</span> to view a summary
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
