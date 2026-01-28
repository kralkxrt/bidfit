
import React, { useState } from 'react';
import { TypewriterText } from './TypewriterText';
import { Sparkles } from 'lucide-react';

const THINKING_PHRASES = [
    "Thinking...",
    "Analyzing requirements...",
    "Consulting the FAR...",
    "Reviewing your proposal...",
    "Checking compliance...",
    "Structuring the response...",
    "Optimizing win themes...",
    "Hunting for discriminators...",
    "Drafting the content...",
    "Polishing the language...",
    "Running quality check...",
    "Applying GovCon best practices...",
    "Searching document library...",
    "Synthesizing data...",
    "Almost ready..."
];

export function ThinkingIndicator() {
    const [index, setIndex] = useState(0);

    const handleComplete = () => {
        // Wait 1.5 seconds before switching to the next phrase
        setTimeout(() => {
            setIndex((prev) => (prev + 1) % THINKING_PHRASES.length);
        }, 1500);
    };

    return (
        <div className="flex items-center gap-3 pl-12 opacity-80 min-h-[24px]">
            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center animate-pulse shrink-0">
                <Sparkles className="w-3 h-3 text-indigo-500" />
            </div>
            <span className="text-xs font-medium text-indigo-500">
                <TypewriterText
                    text={THINKING_PHRASES[index]}
                    speed={40}
                    delay={0}
                    onComplete={handleComplete}
                />
            </span>
        </div>
    );
}
