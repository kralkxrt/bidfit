import { useEffect, useState } from 'react';
import { ChatSession } from '@/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DeleteConfirmationModal } from '@/components/ui/DeleteConfirmationModal';

interface SessionListProps {
    clientId: string;
    selectedSessionId: string | null;
    onSelectSession: (sessionId: string) => void;
    refreshTrigger?: number; // Increment to force refresh
}

export function SessionList({ clientId, selectedSessionId, onSelectSession, refreshTrigger }: SessionListProps) {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const data = await api.chat.listSessions(clientId);
            setSessions(data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (clientId) fetchSessions();
    }, [clientId, refreshTrigger]);

    // Cleanup search when client changes
    useEffect(() => {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
    }, [clientId]);

    // Handle Search with Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await api.chat.searchSessions(clientId, searchQuery);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, clientId]);

    const handleCreateSession = async () => {
        try {
            const newSession = await api.chat.createSession(clientId, 'New Chat');
            setSessions([newSession, ...sessions]);
            onSelectSession(newSession.id);
            setSearchQuery(''); // Clear search on new chat
            if (isCollapsed) setIsCollapsed(false);
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    };

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        setSessionToDelete(sessionId);
    };

    const handleConfirmedDelete = async () => {
        if (!sessionToDelete) return;
        try {
            await api.chat.deleteSession(clientId, sessionToDelete);
            setSessions(sessions.filter(s => s.id !== sessionToDelete));
            // Also update search results if consistent
            setSearchResults(searchResults.filter(s => s.id !== sessionToDelete));

            if (selectedSessionId === sessionToDelete) {
                onSelectSession('');
            }
        } catch (error) {
            console.error('Failed to delete session:', error);
        } finally {
            setSessionToDelete(null);
        }
    };

    const displaySessions = searchQuery.length >= 2 ? searchResults : sessions;

    return (
        <div className="relative h-full flex flex-shrink-0">
            {/* The collapsible container */}
            <div
                className={`
                    flex flex-col h-full border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${isCollapsed ? 'w-0 border-r-0' : 'w-64'}
                `}
            >
                <div className="px-4 pt-4 pb-0 flex flex-col gap-3">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chats</h2>

                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400 dark:text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 h-9 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-500 placeholder:text-slate-400 dark:placeholder:text-gray-600 text-slate-900 dark:text-white transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-2.5 hover:text-red-500 text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <Button
                        onClick={handleCreateSession}
                        variant="outline"
                        className="w-full bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-900 dark:text-white border-slate-200 dark:border-white/10 shadow-sm justify-start px-3 h-10 mb-2"
                    >
                        <Plus className="w-4 h-4 mr-2 text-slate-500 dark:text-slate-400" />
                        New Chat
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-1 min-w-[256px]">
                    {isSearching && (
                        <div className="text-center py-4 text-slate-400 text-xs animate-pulse">
                            Searching...
                        </div>
                    )}

                    {!isSearching && displaySessions.map(session => (
                        <div
                            key={session.id}
                            onClick={() => onSelectSession(session.id)}
                            className={`
                                group flex flex-col p-3 rounded-lg cursor-pointer transition-all relative overflow-hidden
                                ${selectedSessionId === session.id
                                    ? 'bg-white dark:bg-white/10 shadow-sm border border-slate-200 dark:border-white/5'
                                    : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-900 dark:text-white'
                                }
                            `}
                        >
                            <div className="flex items-start justify-between w-full">
                                <div className="flex flex-col overflow-hidden max-w-[170px]">
                                    <span className={`text-sm font-medium truncate ${selectedSessionId === session.id ? 'text-black dark:text-white' : 'text-slate-700 dark:text-gray-200'}`}>
                                        {session.title}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                        {formatDistanceToNow(new Date(session.updated_at), { addSuffix: true })}
                                    </span>
                                </div>
                                <button
                                    onClick={(e) => handleDeleteSession(e, session.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-slate-400 hover:text-red-500 transition-all absolute top-2 right-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Search match snippet */}
                            {searchQuery.length > 0 && session.snippet && (
                                <div className="mt-2 text-xs text-slate-500 dark:text-gray-400 italic bg-yellow-50 dark:bg-yellow-500/10 px-1.5 py-1 rounded border border-yellow-100 dark:border-yellow-500/20 truncate">
                                    "{session.snippet}"
                                </div>
                            )}
                        </div>
                    ))}

                    {!isSearching && displaySessions.length === 0 && !loading && (
                        <div className="text-center text-slate-400 text-sm mt-10">
                            {searchQuery.length > 0 ? (
                                <div>
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No matches found
                                </div>
                            ) : (
                                <div>
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    No chats yet
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Toggle Button - Outside the collapsing div so it stays visible */}
            <div className="absolute top-4 -right-0 z-20 translate-x-full">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-2 bg-white dark:bg-[#1C1C1E] border border-l-0 border-slate-200 dark:border-white/10 rounded-r-lg shadow-sm text-slate-400 hover:text-blue-600 transition-all"
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
            </div>

            <DeleteConfirmationModal
                isOpen={!!sessionToDelete}
                onClose={() => setSessionToDelete(null)}
                onConfirm={handleConfirmedDelete}
                title="Delete Chat Session?"
                description="This will permanently delete this conversation and all its messages."
            />
        </div>
    );
}
