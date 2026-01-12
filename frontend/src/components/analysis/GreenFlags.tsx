"use client";

import { CheckCircle2, Award } from "lucide-react";

interface GreenFlag {
    title: string;
    evidence: string;
    pws_alignment?: string;
}

interface GreenFlagsProps {
    strengths: GreenFlag[];
}

export function GreenFlags({ strengths }: GreenFlagsProps) {
    if (!strengths || strengths.length === 0) return null;

    return (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />

            <div className="flex gap-4 pl-2">
                <div className="bg-emerald-100 p-2 rounded-lg h-fit flex-shrink-0">
                    <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-emerald-900 text-lg">
                        Key Strengths & Differentiators
                    </h3>
                    <p className="text-emerald-700/80 text-sm mb-4">
                        Leverage these high-impact advantages in your proposal executive summary.
                    </p>
                    <ul className="space-y-4">
                        {strengths.slice(0, 3).map((strength, i) => (
                            <li key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-lg border border-emerald-100/50">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-emerald-800 text-sm">{strength.title}</span>
                                </div>
                                <span className="text-emerald-700 text-sm leading-relaxed pl-6">{strength.evidence}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
