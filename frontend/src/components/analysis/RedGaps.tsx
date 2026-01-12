"use client";

import { AlertTriangle, XCircle } from "lucide-react";

interface RedGap {
    title: string;
    evidence: string;
    risk_level?: string;
    mitigation?: string;
}

interface RedGapsProps {
    weaknesses: RedGap[];
}

export function RedGaps({ weaknesses }: RedGapsProps) {
    if (!weaknesses || weaknesses.length === 0) return null;

    return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 relative overflow-hidden shadow-sm mt-6">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />

            <div className="flex gap-4 pl-2">
                <div className="bg-red-100 p-2 rounded-lg h-fit flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-red-900 text-lg">
                        Major Gaps & Risks
                    </h3>
                    <p className="text-red-700/80 text-sm mb-4">
                        These are critical areas where the opportunity alignment is weak.
                    </p>
                    <ul className="space-y-4">
                        {weaknesses.slice(0, 3).map((weakness, i) => (
                            <li key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-lg border border-red-100/50">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-600" />
                                        <span className="font-bold text-red-800 text-sm">{weakness.title}</span>
                                    </div>
                                    {weakness.risk_level && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                                            {weakness.risk_level} Risk
                                        </span>
                                    )}
                                </div>
                                <span className="text-red-700 text-sm leading-relaxed pl-6">{weakness.evidence}</span>
                                {weakness.mitigation && (
                                    <div className="mt-2 pl-6 text-xs text-red-800/70 italic">
                                        mitigation: {weakness.mitigation}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
