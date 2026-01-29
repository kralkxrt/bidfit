'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    Star,
    Calendar,
    DollarSign,
    AlertTriangle,
    MoreHorizontal,
    Edit,
    EyeOff,
    Ban,
    ExternalLink,
} from 'lucide-react';
import { Opportunity } from '@/types/opportunity';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OpportunityCardProps {
    opportunity: Opportunity;
    isDragging?: boolean;
    onHide: (id: string, isNoBid: boolean, reason?: string) => Promise<void>;
    onToggleFavorite: (id: string) => Promise<void>;
}

export function OpportunityCard({
    opportunity,
    isDragging,
    onHide,
    onToggleFavorite
}: OpportunityCardProps) {
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [showHideModal, setShowHideModal] = useState(false);

    const analysis = opportunity.latest_analysis;
    const score = analysis?.overall_relevance_score || 0;
    const gapCount = analysis?.requirements_summary?.gap || 0;

    // Score color
    const getScoreColor = (score: number) => {
        if (score >= 70) return 'bg-emerald-100 text-emerald-700 border-emerald-300';
        if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-300';
        return 'bg-red-100 text-red-700 border-red-300';
    };

    // Avoid using `new Date()` during SSR render (timezone/clock differences can break hydration).
    const [now, setNow] = useState<Date | null>(null);
    useEffect(() => {
        setNow(new Date());
    }, []);

    const daysUntilDue = useMemo(() => {
        if (!opportunity.response_due_date || !now) return null;
        const due = new Date(opportunity.response_due_date);
        const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    }, [now, opportunity.response_due_date]);
    const isUrgent = daysUntilDue !== null && daysUntilDue <= 7;
    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

    // Format currency
    const formatValue = (cents?: number) => {
        if (!cents) return null;
        const dollars = cents / 100;
        if (dollars >= 1000000) return `$${(dollars / 1000000).toFixed(1)}M`;
        if (dollars >= 1000) return `$${(dollars / 1000).toFixed(0)}K`;
        return `$${dollars.toFixed(0)}`;
    };

    // Navigate to opportunity on card click
    const handleCardClick = (e: React.MouseEvent) => {
        // Don't navigate if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) {
            return;
        }
        router.push(`/opportunities/${opportunity.id}`);
    };

    return (
        <>
            <div
                onClick={handleCardClick}
                className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer ${isDragging ? 'shadow-lg rotate-2 scale-105' : ''
                    }`}
            >
                {/* Card Header */}
                <div className="p-3">
                    {/* Top Row: Favorite + Score */}
                    <div className="flex items-start justify-between mb-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFavorite(opportunity.id);
                            }}
                            className={`p-1 rounded transition-colors ${opportunity.is_favorite
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-gray-300 hover:text-gray-400'
                                }`}
                        >
                            <Star className={`w-4 h-4 ${opportunity.is_favorite ? 'fill-current' : ''}`} />
                        </button>

                        {analysis && (
                            <div className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getScoreColor(score)}`}>
                                {score}%
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <Link
                        href={`/opportunities/${opportunity.id}`}
                        className="block font-medium text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2 text-sm"
                    >
                        {opportunity.title}
                    </Link>

                    {/* Agency */}
                    <p className="text-xs text-gray-500 mt-1 truncate">
                        {opportunity.agency}
                    </p>
                </div>

                {/* Card Body */}
                <div className="px-3 pb-2 space-y-2">
                    {/* Due Date */}
                    {opportunity.response_due_date && (
                        <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'
                            }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                                {now
                                    ? new Date(opportunity.response_due_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })
                                    : "—"}
                            </span>
                            {daysUntilDue !== null && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${isOverdue
                                    ? 'bg-red-100 text-red-700'
                                    : isUrgent
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-gray-100 text-gray-600'
                                    }`}>
                                    {isOverdue ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d`}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Value + Contract Type */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        {opportunity.estimated_value && (
                            <span className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                {formatValue(opportunity.estimated_value)}
                            </span>
                        )}
                        {opportunity.contract_type && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                                {opportunity.contract_type}
                            </span>
                        )}
                    </div>

                    {/* Gap Warning */}
                    {gapCount > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{gapCount} critical gap{gapCount !== 1 ? 's' : ''}</span>
                        </div>
                    )}

                    {/* Requirements Progress */}
                    {analysis?.requirements_summary && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>Requirements</span>
                                <span>{analysis.requirements_summary.coverage_percentage}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                                <div
                                    className="bg-emerald-500"
                                    style={{ width: `${(analysis.requirements_summary.strong / analysis.requirements_summary.total) * 100}%` }}
                                />
                                <div
                                    className="bg-amber-400"
                                    style={{ width: `${((analysis.requirements_summary.moderate + analysis.requirements_summary.weak) / analysis.requirements_summary.total) * 100}%` }}
                                />
                                <div
                                    className="bg-red-400"
                                    style={{ width: `${(analysis.requirements_summary.gap / analysis.requirements_summary.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="border-t border-gray-100 px-2 py-2 flex items-center justify-between">
                    {/* Assigned Company */}
                    <div className="text-xs text-gray-400 font-medium truncate max-w-[70%] px-1" title={opportunity.company_name}>
                        {opportunity.company_name}
                    </div>

                    {/* More Menu */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(!showMenu);
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 bottom-full mb-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                    <Link
                                        href={`/opportunities/${opportunity.id}`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        View Details
                                    </Link>
                                    <Link
                                        href={`/opportunities/${opportunity.id}/edit`}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Edit className="w-4 h-4" />
                                        Edit
                                    </Link>
                                    <hr className="my-1 border-gray-100" />
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowHideModal(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                                    >
                                        <EyeOff className="w-4 h-4" />
                                        Hide
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            onHide(opportunity.id, true, '');
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                                    >
                                        <Ban className="w-4 h-4" />
                                        No-Bid
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Hide Modal */}
            {showHideModal && (
                <HideOpportunityModal
                    opportunity={opportunity}
                    onHide={onHide}
                    onClose={() => setShowHideModal(false)}
                />
            )}
        </>
    );
}

// Hide Modal Component
function HideOpportunityModal({
    opportunity,
    onHide,
    onClose
}: {
    opportunity: Opportunity;
    onHide: (id: string, isNoBid: boolean, reason?: string) => Promise<void>;
    onClose: () => void;
}) {
    const [isNoBid, setIsNoBid] = useState(false);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        await onHide(opportunity.id, isNoBid, reason || undefined);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Hide Opportunity
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                        “{opportunity.title}”
                    </p>

                    <div className="space-y-4">
                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="hideType"
                                checked={!isNoBid}
                                onChange={() => setIsNoBid(false)}
                                className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                            />
                            <div>
                                <p className="font-medium text-gray-900">Just hide</p>
                                <p className="text-sm text-gray-500">Can restore later from hidden panel</p>
                            </div>
                        </label>

                        <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="hideType"
                                checked={isNoBid}
                                onChange={() => setIsNoBid(true)}
                                className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                            />
                            <div>
                                <p className="font-medium text-gray-900">No-Bid</p>
                                <p className="text-sm text-gray-500">Mark as passed opportunity with reason</p>
                            </div>
                        </label>

                        {isNoBid && (
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Reason for no-bid (optional)..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                rows={3}
                            />
                        )}
                    </div>
                </div>

                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Hiding...' : 'Hide Opportunity'}
                    </button>
                </div>
            </div>
        </div>
    );
}
