"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { TypewriterText } from "@/components/roxy/TypewriterText";

const THINKING_PHRASES = [
    "Thinking...",
    "Reviewing requirements...",
    "Scanning documents...",
    "Cross-referencing citations...",
    "Checking evaluation criteria...",
    "Extracting key details...",
    "Drafting an answer...",
    "Almost ready...",
];

export function ThinkingIndicator() {
    const [index, setIndex] = useState(0);

    const handleComplete = () => {
        setTimeout(() => {
            setIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
        }, 1500);
    };

    return (
        <div className="flex items-center gap-3 pl-12 opacity-80 min-h-[24px]">
            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center animate-pulse shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-500" />
            </div>
            <span className="text-xs font-medium text-indigo-500">
                <TypewriterText text={THINKING_PHRASES[index]} speed={40} delay={0} onComplete={handleComplete} />
            </span>
        </div>
    );
}
