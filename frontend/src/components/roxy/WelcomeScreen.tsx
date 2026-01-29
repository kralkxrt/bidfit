"use client";

import { useEffect, useMemo, useState } from "react";
import { TypewriterText } from "@/components/roxy/TypewriterText";

function RoxyIcon() {
    return (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25 mb-6 relative overflow-hidden">
            <svg viewBox="0 0 48 48" className="w-10 h-10">
                <defs>
                    <linearGradient id="roxyWelcomeInner" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="white" stopOpacity="0.85" />
                    </linearGradient>
                </defs>
                <path d="M16 20 Q24 14 32 20 Q38 26 32 32 Q24 38 16 32 Q10 26 16 20" fill="url(#roxyWelcomeInner)" />
            </svg>
            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10 rounded-full" />
        </div>
    );
}

export function WelcomeScreen() {
    const greetings = useMemo(
        () => [
            "What are we winning today?",
            "Ready to analyze.",
            "Drop an RFP, let's see what we're working with.",
            "What's the opportunity?",
        ],
        []
    );

    // IMPORTANT: avoid Math.random during SSR to prevent hydration mismatches (which can break click handlers).
    const [greeting, setGreeting] = useState(greetings[0]);

    useEffect(() => {
        setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
    }, [greetings]);

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <RoxyIcon />

            <h2 className="text-2xl font-bold text-slate-900 mb-1">Roxy</h2>

            <p className="text-slate-500 text-lg h-8 mb-4">
                <TypewriterText text={greeting} speed={35} delay={400} />
            </p>

            <p className="text-sm text-slate-400">
                Use the quick prompts below to get started
            </p>
        </div>
    );
}

