'use client';

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
    Search, Filter, EyeOff, Plus, LayoutGrid, List, Calendar,
    ChevronDown, X
} from 'lucide-react';
import { Opportunity, PipelineStage, PipelineSummary, OpportunityFilters } from '@/types/opportunity';
import { OpportunityCard } from './OpportunityCard';
import { HiddenOpportunitiesPanel } from './HiddenOpportunitiesPanel';
import { FilterPanel } from './FilterPanel';

const PIPELINE_STAGES: { key: PipelineStage; label: string; icon: string; color: string }[] = [
    { key: 'capture', label: 'Capture', icon: '📥', color: 'border-t-blue-500' },
    { key: 'analyzing', label: 'Analyzing', icon: '🔍', color: 'border-t-purple-500' },
    { key: 'writing', label: 'Writing', icon: '✍️', color: 'border-t-amber-500' },
    { key: 'compliance', label: 'Compliance', icon: '⚖️', color: 'border-t-indigo-500' },
    { key: 'submitted', label: 'Submitted', icon: '✅', color: 'border-t-green-600' },
];

interface PipelineViewProps {
    opportunities: Opportunity[];
    summary: PipelineSummary | null;
    onStageChange: (opportunityId: string, newStage: PipelineStage) => Promise<void>;
    onHide: (opportunityId: string, isNoBid: boolean, reason?: string) => Promise<void>;
    onRestore: (opportunityId: string) => Promise<void>;
    onToggleFavorite: (opportunityId: string) => Promise<void>;
    onRefresh: () => void;
}

export function PipelineView({
    opportunities,
    summary,
    onStageChange,
    onHide,
    onRestore,
    onToggleFavorite,
    onRefresh
}: PipelineViewProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showHidden, setShowHidden] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<OpportunityFilters>({});

    // Filter opportunities
    const filteredOpportunities = opportunities.filter(opp => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                opp.title.toLowerCase().includes(query) ||
                opp.agency.toLowerCase().includes(query) ||
                (opp.solicitation_number && opp.solicitation_number.toLowerCase().includes(query));
            if (!matchesSearch) return false;
        }

        // Other filters
        if (filters.is_favorite && !opp.is_favorite) return false;
        if (filters.min_score && opp.latest_analysis &&
            opp.latest_analysis.overall_relevance_score < filters.min_score) return false;

        return true;
    });

    // Group by stage (excluding hidden)
    const groupedOpportunities = PIPELINE_STAGES.reduce((acc, stage) => {
        acc[stage.key] = filteredOpportunities.filter(
            opp => opp.pipeline_stage === stage.key && !opp.is_hidden
        );
        return acc;
    }, {} as Record<PipelineStage, Opportunity[]>);

    // Hidden opportunities
    const hiddenOpportunities = opportunities.filter(opp => opp.is_hidden);

    // Handle drag end
    const handleDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // Dropped outside a droppable
        if (!destination) return;

        // Dropped in same position
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        // Update stage
        const newStage = destination.droppableId as PipelineStage;
        await onStageChange(draggableId, newStage);
    }, [onStageChange]);

    return (
        <div className="space-y-4">
            {/* Header with Search and Filters */}
            <div className="flex items-center justify-between gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search opportunities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Filter Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {Object.keys(filters).length > 0 && (
                            <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                {Object.keys(filters).length}
                            </span>
                        )}
                    </button>

                    {/* Show Hidden Toggle */}
                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showHidden ? 'border-gray-500 bg-gray-100 text-gray-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                            }`}
                    >
                        <EyeOff className="w-4 h-4" />
                        Hidden ({summary?.total_hidden || 0})
                    </button>

                    {/* Add New */}
                    <a
                        href="/opportunities/new"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Opportunity
                    </a>
                </div>
            </div>

            {/* Filter Panel (collapsible) */}
            {showFilters && (
                <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    onClear={() => setFilters({})}
                />
            )}

            {/* Pipeline Columns */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                    {PIPELINE_STAGES.map((stage) => (
                        <div key={stage.key} className="flex-shrink-0 w-72">
                            {/* Column Header */}
                            <div className={`bg-white rounded-t-xl border border-b-0 border-gray-200 p-3 border-t-4 ${stage.color}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span>{stage.icon}</span>
                                        <span className="font-semibold text-gray-900">{stage.label}</span>
                                    </div>
                                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        {groupedOpportunities[stage.key]?.length || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Droppable Area */}
                            <Droppable droppableId={stage.key}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`bg-gray-50 border border-gray-200 rounded-b-xl min-h-[400px] max-h-[1100px] overflow-y-auto p-2 space-y-2 transition-colors scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                                            }`}
                                    >
                                        {groupedOpportunities[stage.key]?.map((opportunity, index) => (
                                            <Draggable
                                                key={opportunity.id}
                                                draggableId={opportunity.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                    >
                                                        <OpportunityCard
                                                            opportunity={opportunity}
                                                            isDragging={snapshot.isDragging}
                                                            onHide={onHide}
                                                            onToggleFavorite={onToggleFavorite}
                                                        />
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {/* Empty State */}
                                        {groupedOpportunities[stage.key]?.length === 0 && !snapshot.isDraggingOver && (
                                            <div className="text-center py-8 text-gray-400 text-sm">
                                                No opportunities
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>

            {/* Hidden Opportunities Panel */}
            {/* Hidden Opportunities Panel */}
            {showHidden && (
                <HiddenOpportunitiesPanel
                    opportunities={hiddenOpportunities}
                    onRestore={onRestore}
                    onClose={() => setShowHidden(false)}
                />
            )}
        </div>
    );
}
