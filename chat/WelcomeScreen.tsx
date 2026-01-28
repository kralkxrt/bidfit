import { useState, useEffect, useMemo } from 'react';
import { TypewriterText } from './TypewriterText';
import { ROXY_GREETINGS } from '@/lib/constants';

function QuickPromptChip({ label, onClick }: { label: string, onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-full text-sm text-slate-700 dark:text-gray-300 transition-colors font-display"
        >
            {label}
        </button>
    )
}

// Custom Roxy Icon - Abstract flowing shape
function RoxyIcon() {
    return (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-6 relative overflow-hidden">
            <svg viewBox="0 0 48 48" className="w-10 h-10">
                <defs>
                    <linearGradient id="roxyInner" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.85" />
                    </linearGradient>
                </defs>
                <path
                    d="M16 20 Q24 14 32 20 Q38 26 32 32 Q24 38 16 32 Q10 26 16 20"
                    fill="url(#roxyInner)"
                />
            </svg>
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-full" />
        </div>
    );
}

export function WelcomeScreen({ onPromptClick, companyName }: { onPromptClick?: (prompt: string) => void, companyName?: string }) {
    // Pick random greeting on mount
    const greeting = useMemo(() => {
        return ROXY_GREETINGS[Math.floor(Math.random() * ROXY_GREETINGS.length)];
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            {/* Modern Roxy Icon */}
            <RoxyIcon />

            {/* Name */}
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 font-display">
                Roxy
            </h2>

            {/* Company Context Badge */}
            {companyName && (
                <div className="mb-4 px-3 py-0.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full border border-indigo-100 dark:border-indigo-500/20 inline-block">
                    {companyName} Workspace
                </div>
            )}

            {/* Typewriter Greeting */}
            <p className="text-slate-500 dark:text-gray-400 text-lg h-8 mb-10 font-body">
                <TypewriterText text={greeting} speed={35} delay={400} />
            </p>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-3 justify-center max-w-lg">
                <QuickPromptChip
                    label="Draft Past Performance Narrative"
                    onClick={() => onPromptClick?.("Draft a Past Performance section based on the uploaded docs.")}
                />
                <QuickPromptChip
                    label="Develop Technical Approach"
                    onClick={() => onPromptClick?.("Help me outline the Technical Approach.")}
                />
                <QuickPromptChip
                    label="Management Plan Review"
                    onClick={() => onPromptClick?.("Review my Management Plan for compliance gaps.")}
                />
                <QuickPromptChip
                    label="Compliance Matrix"
                    onClick={() => onPromptClick?.("Create a compliance matrix from the RFP.")}
                />
            </div>
        </div>
    )
}
