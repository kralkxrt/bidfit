"use client";

import { AlertTriangle } from "lucide-react";
import { RedFlag } from "@/types/analysis";

interface RedFlagsProps {
    flags: RedFlag[];
}

export function RedFlags({ flags }: RedFlagsProps) {
    if (!flags || flags.length === 0) return null;

    return (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
            {/* Left accent bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />

            <div className="flex gap-4 pl-2">
                <div className="bg-red-100 p-2 rounded-lg h-fit flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                    <h3 className="font-bold text-red-900 text-lg">
                        Strategic Red Flags — Do NOT Include in Proposal
                    </h3>
                    <p className="text-red-700/80 text-sm mb-4">
                        The following items pose significant risks to compliance or evaluator perception.
                    </p>
                    <ul className="space-y-4">
                        {flags.map((flag, i) => (
                            <li key={i} className="flex flex-col gap-1 bg-white/60 p-3 rounded-lg border border-red-100/50">
                                <span className="font-bold text-red-800 text-sm">{flag.warning}</span>
                                <span className="text-red-600 text-sm leading-relaxed">{flag.reason}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
