'use client';

import React from 'react';
import { X } from 'lucide-react';
import { OpportunityFilters } from '@/types/opportunity';

interface FilterPanelProps {
    filters: OpportunityFilters;
    onChange: (filters: OpportunityFilters) => void;
    onClear: () => void;
}

export function FilterPanel({ filters, onChange, onClear }: FilterPanelProps) {
    const hasFilters = Object.keys(filters).length > 0;

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Filters</h3>
                {hasFilters && (
                    <button
                        onClick={onClear}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <X className="w-4 h-4" />
                        Clear all
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Relevance Score */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Min Relevance
                    </label>
                    <select
                        value={filters.min_score || ''}
                        onChange={(e) => onChange({
                            ...filters,
                            min_score: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Any</option>
                        <option value="85">Very Relevant (85%+)</option>
                        <option value="70">Relevant (70%+)</option>
                        <option value="50">Somewhat (50%+)</option>
                    </select>
                </div>

                {/* Due Within */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Due Within
                    </label>
                    <select
                        value={filters.due_within_days || ''}
                        onChange={(e) => onChange({
                            ...filters,
                            due_within_days: e.target.value ? parseInt(e.target.value) : undefined
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="">Any time</option>
                        <option value="7">7 days</option>
                        <option value="14">14 days</option>
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                    </select>
                </div>

                {/* Agency */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        Agency
                    </label>
                    <input
                        type="text"
                        value={filters.agency || ''}
                        onChange={(e) => onChange({ ...filters, agency: e.target.value || undefined })}
                        placeholder="Filter by agency..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                </div>

                {/* Favorites Only */}
                <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.is_favorite || false}
                            onChange={(e) => onChange({
                                ...filters,
                                is_favorite: e.target.checked || undefined
                            })}
                            className="w-4 h-4 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Favorites only</span>
                    </label>
                </div>
            </div>
        </div>
    );
}
