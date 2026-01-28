'use client';

import React from 'react';
import { EyeOff, RotateCcw, Trash2, Ban, X } from 'lucide-react';
import { Opportunity } from '@/types/opportunity';

interface HiddenOpportunitiesPanelProps {
    opportunities: Opportunity[];
    onRestore: (id: string) => Promise<void>;
    onClose: () => void;
}

export function HiddenOpportunitiesPanel({
    opportunities,
    onRestore,
    onClose
}: HiddenOpportunitiesPanelProps) {
    return (
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <EyeOff className="w-5 h-5 text-gray-500" />
                    <h3 className="font-semibold text-gray-900">
                        Hidden Opportunities ({opportunities.length})
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                    <p>No hidden opportunities found.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {opportunities.map((opp) => (
                        <div
                            key={opp.id}
                            className="bg-white rounded-lg border border-gray-200 p-3 opacity-75 hover:opacity-100 transition-opacity"
                        >
                            <div className="flex items-start justify-between mb-2">
                                {opp.is_no_bid ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                        <Ban className="w-3 h-3" />
                                        No-Bid
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        <EyeOff className="w-3 h-3" />
                                        Hidden
                                    </span>
                                )}
                                {opp.latest_analysis && (
                                    <span className="text-xs text-gray-400">
                                        {opp.latest_analysis.overall_relevance_score}%
                                    </span>
                                )}
                            </div>

                            <h4 className="font-medium text-gray-700 text-sm line-clamp-2 mb-1">
                                {opp.title}
                            </h4>
                            <p className="text-xs text-gray-500 truncate mb-2">
                                {opp.agency}
                            </p>

                            {opp.hidden_reason && (
                                <p className="text-xs text-gray-400 italic mb-2 line-clamp-2">
                                    “{opp.hidden_reason}”
                                </p>
                            )}

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onRestore(opp.id)}
                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    Restore
                                </button>
                                <button
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Delete permanently"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
