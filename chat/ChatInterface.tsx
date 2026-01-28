'use client'

import { useState, useEffect, useRef } from 'react';
import { useCompanyStore } from '@/stores/app-store';
import { SessionList } from './SessionList';
import { ChatWindow } from './ChatWindow';
import { CompanyTransitionOverlay } from './CompanyTransitionOverlay';

export function ChatInterface() {
    const { selectedCompany } = useCompanyStore();
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [sessionRefresh, setSessionRefresh] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const prevCompanyIdRef = useRef<string | null>(null);

    // Initial load check
    useEffect(() => {
        if (!prevCompanyIdRef.current && selectedCompany) {
            prevCompanyIdRef.current = selectedCompany.id;
        }
    }, [selectedCompany]);

    // Transition effect
    useEffect(() => {
        if (selectedCompany && prevCompanyIdRef.current && selectedCompany.id !== prevCompanyIdRef.current) {
            // Company changed!
            setIsTransitioning(true);
            setSelectedSessionId(null); // Reset session selection
            prevCompanyIdRef.current = selectedCompany.id;

            // Artificial delay for the premium "system refresh" feel
            setTimeout(() => {
                setIsTransitioning(false);
            }, 1200);
        }
    }, [selectedCompany]);

    if (!selectedCompany) {
        return (
            <div className="flex flex-1 items-center justify-center text-slate-400">
                Please select a company to start chatting.
            </div>
        );
    }

    // CRITICAL FIX: Detect if we are in the middle of a company switch (Render phase)
    // If so, force session ID to null immediately to prevent cross-company data leaks
    // or showing the old chat for a split second.
    const isCompanySwitched = prevCompanyIdRef.current && prevCompanyIdRef.current !== selectedCompany.id;
    const effectiveSessionId = isCompanySwitched ? null : selectedSessionId;

    const handleRefreshSessions = () => {
        setSessionRefresh(prev => prev + 1);
    };

    return (
        <div className="flex flex-1 h-full overflow-hidden silver-border-container mt-1 mx-4 mb-4 !rounded-2xl bg-white dark:bg-[#1C1C1E] shadow-2xl relative">
            <CompanyTransitionOverlay
                companyName={selectedCompany.name}
                isVisible={isTransitioning}
            />

            {/* We use the company ID as a key to force a full re-mount
                of the chat components when switching. This ensures
                all state is freshly initialized for the new context. */}
            <div key={selectedCompany.id} className="flex h-full w-full">
                <SessionList
                    clientId={selectedCompany.id}
                    selectedSessionId={effectiveSessionId}
                    onSelectSession={setSelectedSessionId}
                    refreshTrigger={sessionRefresh}
                />

                <div className="flex-1 min-w-0">
                    <ChatWindow
                        clientId={selectedCompany.id}
                        companyName={selectedCompany.name}
                        sessionId={effectiveSessionId || undefined}
                        onSessionCreated={setSelectedSessionId}
                        onFirstMessage={handleRefreshSessions}
                    />
                </div>
            </div>
        </div>
    );
}

