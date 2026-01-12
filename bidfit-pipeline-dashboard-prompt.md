# BidFit v2.0 - Pipeline Dashboard Implementation

## Overview

Build a modern Pipeline/Kanban dashboard view for managing opportunities. This is added BELOW the existing dashboard stats cards (Documents, Opportunities, Analyses). Keep that overview section exactly as it is.

**Design Reference:** Use the design system from `bidfit-design-system.md` - dark sidebar, green accents (emerald-500), clean cards with rounded-xl corners.

---

## IMPORTANT: Keep Existing Dashboard Header

The current dashboard has a stats overview section with 3 cards:
- Documents (count)
- Opportunities (count)  
- Analyses (count)

**DO NOT REMOVE THIS.** Keep it at the top. Add the new Pipeline View BELOW it.

New layout structure:
```
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                                   │
│ Overview of your gap analysis activity                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Documents: 2]  [Opportunities: 1]  [Analyses: 3]         │  ← KEEP THIS
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Pipeline View (NEW)                                        │  ← ADD THIS BELOW
│  - View toggle (Pipeline / List / Calendar)                 │
│  - Filters                                                  │
│  - Kanban columns                                           │
│  - Hidden opportunities panel                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Data Model Updates

### 1.1 Add Pipeline Fields to Opportunity Model

**File:** `backend/app/models.py`

Add these fields to the Opportunity model:

```python
class Opportunity(Base):
    __tablename__ = "opportunities"
    
    # ... existing fields ...
    
    # NEW PIPELINE FIELDS
    pipeline_stage = Column(String(50), default='capture', nullable=False, index=True)
    # Values: 'capture', 'analyzing', 'writing', 'submitted', 'awarded', 'lost'
    
    is_hidden = Column(Boolean, default=False, nullable=False, index=True)
    hidden_at = Column(DateTime(timezone=True), nullable=True)
    hidden_reason = Column(String(500), nullable=True)
    
    is_no_bid = Column(Boolean, default=False, nullable=False)
    no_bid_reason = Column(String(500), nullable=True)
    
    is_favorite = Column(Boolean, default=False, nullable=False)
    
    estimated_value = Column(BigInteger, nullable=True)  # Store in cents for precision
    contract_type = Column(String(50), nullable=True)    # FFP, CPFF, T&M, IDIQ, etc.
```

### 1.2 Run Database Migration

```bash
cd backend && source venv/bin/activate
alembic revision --autogenerate -m "add_pipeline_fields_to_opportunities"
alembic upgrade head
```

---

## Phase 2: Backend API Updates

### 2.1 Update Opportunities List Endpoint

**File:** `backend/app/routes/opportunities.py`

Update the GET /opportunities endpoint to support filtering:

```python
from typing import Optional
from datetime import datetime
from sqlalchemy import or_, and_, func

@router.get("")
async def list_opportunities(
    company_id: uuid.UUID,
    # Filters
    stage: Optional[str] = Query(None, description="Pipeline stage filter"),
    is_hidden: bool = Query(False, description="Include hidden opportunities"),
    show_only_hidden: bool = Query(False, description="Show only hidden"),
    is_favorite: Optional[bool] = Query(None, description="Filter favorites"),
    min_score: Optional[int] = Query(None, description="Minimum relevance score"),
    max_score: Optional[int] = Query(None, description="Maximum relevance score"),
    agency: Optional[str] = Query(None, description="Filter by agency"),
    due_within_days: Optional[int] = Query(None, description="Due within N days"),
    search: Optional[str] = Query(None, description="Search title, agency, sol number"),
    # Sorting
    sort_by: str = Query("response_due_date", description="Sort field"),
    sort_order: str = Query("asc", description="Sort order: asc or desc"),
    db: AsyncSession = Depends(get_db)
) -> List[OpportunityResponse]:
    """List opportunities with filtering and sorting"""
    
    query = select(Opportunity).where(Opportunity.company_id == company_id)
    
    # Visibility filter
    if show_only_hidden:
        query = query.where(Opportunity.is_hidden == True)
    elif not is_hidden:
        query = query.where(Opportunity.is_hidden == False)
    
    # Stage filter
    if stage:
        query = query.where(Opportunity.pipeline_stage == stage)
    
    # Favorite filter
    if is_favorite is not None:
        query = query.where(Opportunity.is_favorite == is_favorite)
    
    # Agency filter
    if agency:
        query = query.where(Opportunity.agency.ilike(f"%{agency}%"))
    
    # Due date filter
    if due_within_days:
        due_date = datetime.utcnow() + timedelta(days=due_within_days)
        query = query.where(Opportunity.response_due_date <= due_date)
        query = query.where(Opportunity.response_due_date >= datetime.utcnow())
    
    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                Opportunity.title.ilike(search_term),
                Opportunity.agency.ilike(search_term),
                Opportunity.solicitation_number.ilike(search_term)
            )
        )
    
    # Sorting
    sort_column = getattr(Opportunity, sort_by, Opportunity.response_due_date)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())
    
    result = await db.execute(query)
    opportunities = result.scalars().all()
    
    # TODO: Join with latest analysis to get scores and filter by min/max score
    
    return opportunities
```

### 2.2 Add Pipeline-Specific Endpoints

**File:** `backend/app/routes/opportunities.py`

Add these new endpoints:

```python
# ============================================================
# PIPELINE ENDPOINTS
# ============================================================

@router.get("/pipeline-summary")
async def get_pipeline_summary(
    company_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Get opportunity counts grouped by pipeline stage"""
    
    query = text("""
        SELECT 
            pipeline_stage,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_hidden = false) as active,
            COUNT(*) FILTER (WHERE is_hidden = true) as hidden,
            COUNT(*) FILTER (WHERE is_no_bid = true) as no_bid,
            COUNT(*) FILTER (WHERE is_favorite = true AND is_hidden = false) as favorites
        FROM opportunities
        WHERE company_id = :company_id
        GROUP BY pipeline_stage
    """)
    
    result = await db.execute(query, {"company_id": str(company_id)})
    rows = result.fetchall()
    
    # Initialize all stages
    stages = {
        'capture': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'analyzing': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'writing': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'submitted': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'awarded': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
        'lost': {'total': 0, 'active': 0, 'hidden': 0, 'no_bid': 0, 'favorites': 0},
    }
    
    for row in rows:
        stage = row[0]
        if stage in stages:
            stages[stage] = {
                'total': row[1],
                'active': row[2],
                'hidden': row[3],
                'no_bid': row[4],
                'favorites': row[5]
            }
    
    total_active = sum(s['active'] for s in stages.values())
    total_hidden = sum(s['hidden'] for s in stages.values())
    
    return {
        'stages': stages,
        'total_active': total_active,
        'total_hidden': total_hidden
    }


@router.patch("/{opportunity_id}/stage")
async def update_pipeline_stage(
    opportunity_id: uuid.UUID,
    body: dict,  # {"stage": "writing"}
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Move opportunity to a different pipeline stage (drag-and-drop)"""
    
    valid_stages = ['capture', 'analyzing', 'writing', 'submitted', 'awarded', 'lost']
    stage = body.get('stage')
    
    if stage not in valid_stages:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid stage. Must be one of: {', '.join(valid_stages)}"
        )
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    old_stage = opportunity.pipeline_stage
    opportunity.pipeline_stage = stage
    opportunity.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "old_stage": old_stage,
        "new_stage": stage
    }


@router.patch("/{opportunity_id}/hide")
async def hide_opportunity(
    opportunity_id: uuid.UUID,
    body: dict,  # {"is_no_bid": false, "reason": "..."}
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Hide an opportunity from the pipeline view"""
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    is_no_bid = body.get('is_no_bid', False)
    reason = body.get('reason', None)
    
    opportunity.is_hidden = True
    opportunity.hidden_at = datetime.utcnow()
    opportunity.hidden_reason = reason
    
    if is_no_bid:
        opportunity.is_no_bid = True
        opportunity.no_bid_reason = reason
    
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "is_hidden": True,
        "is_no_bid": is_no_bid
    }


@router.patch("/{opportunity_id}/restore")
async def restore_opportunity(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Restore a hidden opportunity back to the pipeline"""
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opportunity.is_hidden = False
    opportunity.hidden_at = None
    opportunity.hidden_reason = None
    opportunity.is_no_bid = False
    opportunity.no_bid_reason = None
    
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "restored": True
    }


@router.patch("/{opportunity_id}/favorite")
async def toggle_favorite(
    opportunity_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Toggle favorite status of an opportunity"""
    
    opportunity = await db.get(Opportunity, opportunity_id)
    if not opportunity:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    
    opportunity.is_favorite = not opportunity.is_favorite
    await db.commit()
    
    return {
        "success": True,
        "opportunity_id": str(opportunity_id),
        "is_favorite": opportunity.is_favorite
    }
```

---

## Phase 3: Frontend Implementation

### 3.1 Install Drag-and-Drop Library

```bash
cd frontend
npm install @hello-pangea/dnd
```

This is a maintained fork of react-beautiful-dnd.

### 3.2 TypeScript Types

**File:** `frontend/src/types/opportunity.ts` (create or update)

```typescript
export type PipelineStage = 'capture' | 'analyzing' | 'writing' | 'submitted' | 'awarded' | 'lost';

export interface OpportunityAnalysisSummary {
  overall_relevance_score: number;
  overall_relevance_label: string;
  go_no_go: 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
  requirements_summary?: {
    total: number;
    strong: number;
    moderate: number;
    weak: number;
    gap: number;
    coverage_percentage: number;
  };
}

export interface Opportunity {
  id: string;
  title: string;
  agency: string;
  solicitation_number?: string;
  response_due_date?: string;
  estimated_value?: number;
  contract_type?: string;
  naics_code?: string;
  status: string;
  
  // Pipeline fields
  pipeline_stage: PipelineStage;
  is_hidden: boolean;
  hidden_at?: string;
  hidden_reason?: string;
  is_no_bid: boolean;
  no_bid_reason?: string;
  is_favorite: boolean;
  
  // Joined from latest analysis
  latest_analysis?: OpportunityAnalysisSummary;
  
  created_at: string;
  updated_at?: string;
}

export interface PipelineStageSummary {
  total: number;
  active: number;
  hidden: number;
  no_bid: number;
  favorites: number;
}

export interface PipelineSummary {
  stages: Record<PipelineStage, PipelineStageSummary>;
  total_active: number;
  total_hidden: number;
}

export interface OpportunityFilters {
  search?: string;
  stage?: PipelineStage;
  is_hidden?: boolean;
  show_only_hidden?: boolean;
  is_favorite?: boolean;
  min_score?: number;
  max_score?: number;
  agency?: string;
  due_within_days?: number;
}
```

### 3.3 Pipeline View Component

**File:** `frontend/src/components/dashboard/PipelineView.tsx`

```tsx
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
  { key: 'submitted', label: 'Submitted', icon: '📤', color: 'border-t-emerald-500' },
  { key: 'awarded', label: 'Awarded', icon: '🏆', color: 'border-t-green-600' },
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
        opp.solicitation_number?.toLowerCase().includes(query);
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
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showFilters ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {Object.keys(filters).length > 0 && (
              <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {Object.keys(filters).length}
              </span>
            )}
          </button>

          {/* Show Hidden Toggle */}
          <button
            onClick={() => setShowHidden(!showHidden)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showHidden ? 'border-gray-500 bg-gray-100 text-gray-700' : 'border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
          >
            <EyeOff className="w-4 h-4" />
            Hidden ({summary?.total_hidden || 0})
          </button>

          {/* Add New */}
          <a
            href="/opportunities/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
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
                    className={`bg-gray-50 border border-gray-200 rounded-b-xl min-h-[400px] p-2 space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-emerald-50 border-emerald-300' : ''
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
      {showHidden && hiddenOpportunities.length > 0 && (
        <HiddenOpportunitiesPanel
          opportunities={hiddenOpportunities}
          onRestore={onRestore}
          onClose={() => setShowHidden(false)}
        />
      )}
    </div>
  );
}
```

### 3.4 Opportunity Card Component

**File:** `frontend/src/components/dashboard/OpportunityCard.tsx`

```tsx
'use client';

import React, { useState } from 'react';
import { 
  Star, Calendar, DollarSign, AlertTriangle, CheckCircle,
  MoreHorizontal, Eye, Download, Edit, EyeOff, Ban, Trash2,
  ExternalLink
} from 'lucide-react';
import { Opportunity } from '@/types/opportunity';
import Link from 'next/link';

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

  // Days until due
  const getDaysUntilDue = () => {
    if (!opportunity.response_due_date) return null;
    const due = new Date(opportunity.response_due_date);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const daysUntilDue = getDaysUntilDue();
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

  return (
    <>
      <div
        className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all ${
          isDragging ? 'shadow-lg rotate-2 scale-105' : ''
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
              className={`p-1 rounded transition-colors ${
                opportunity.is_favorite 
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
            <div className={`flex items-center gap-1.5 text-xs ${
              isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'
            }`}>
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {new Date(opportunity.response_due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              {daysUntilDue !== null && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
                  isOverdue 
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

        {/* Card Actions */}
        <div className="border-t border-gray-100 px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Link
              href={`/opportunities/${opportunity.id}/analysis`}
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="View Analysis"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <button
              className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
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
            "{opportunity.title}"
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
```

### 3.5 Hidden Opportunities Panel

**File:** `frontend/src/components/dashboard/HiddenOpportunitiesPanel.tsx`

```tsx
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
                "{opp.hidden_reason}"
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
    </div>
  );
}
```

### 3.6 Filter Panel

**File:** `frontend/src/components/dashboard/FilterPanel.tsx`

```tsx
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
```

### 3.7 Update Dashboard Page

**File:** `frontend/src/app/dashboard/page.tsx` (or wherever your dashboard is)

Update the dashboard page to include the Pipeline View BELOW the existing stats:

```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PipelineView } from '@/components/dashboard/PipelineView';
import { Opportunity, PipelineStage, PipelineSummary } from '@/types/opportunity';
// Keep your existing imports for the stats cards

export default function DashboardPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get company ID from auth context or wherever you store it
  const companyId = 'your-company-id'; // Replace with actual

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch opportunities
      const oppRes = await fetch(`/api/opportunities?company_id=${companyId}`);
      const oppData = await oppRes.json();
      setOpportunities(oppData);

      // Fetch pipeline summary
      const summaryRes = await fetch(`/api/opportunities/pipeline-summary?company_id=${companyId}`);
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pipeline actions
  const handleStageChange = async (opportunityId: string, newStage: PipelineStage) => {
    try {
      await fetch(`/api/opportunities/${opportunityId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      
      // Optimistic update
      setOpportunities(prev => prev.map(opp => 
        opp.id === opportunityId ? { ...opp, pipeline_stage: newStage } : opp
      ));
    } catch (error) {
      console.error('Failed to update stage:', error);
      fetchData(); // Refresh on error
    }
  };

  const handleHide = async (opportunityId: string, isNoBid: boolean, reason?: string) => {
    try {
      await fetch(`/api/opportunities/${opportunityId}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_no_bid: isNoBid, reason })
      });
      fetchData();
    } catch (error) {
      console.error('Failed to hide opportunity:', error);
    }
  };

  const handleRestore = async (opportunityId: string) => {
    try {
      await fetch(`/api/opportunities/${opportunityId}/restore`, {
        method: 'PATCH'
      });
      fetchData();
    } catch (error) {
      console.error('Failed to restore opportunity:', error);
    }
  };

  const handleToggleFavorite = async (opportunityId: string) => {
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/favorite`, {
        method: 'PATCH'
      });
      const data = await res.json();
      
      // Optimistic update
      setOpportunities(prev => prev.map(opp => 
        opp.id === opportunityId ? { ...opp, is_favorite: data.is_favorite } : opp
      ));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return (
    <div className="p-6 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your gap analysis activity</p>
      </div>

      {/* ============================================ */}
      {/* EXISTING STATS CARDS - KEEP THIS SECTION    */}
      {/* ============================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Documents Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Documents</h3>
            {/* Your existing icon */}
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">2</p>
          <p className="text-sm text-gray-500 mt-1">Past performance references</p>
        </div>

        {/* Opportunities Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Opportunities</h3>
            {/* Your existing icon */}
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_active || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Active pursuits</p>
        </div>

        {/* Analyses Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-500 text-sm font-medium">Analyses</h3>
            {/* Your existing icon */}
          </div>
          <p className="text-3xl font-bold text-gray-900 mt-2">3</p>
          <p className="text-sm text-gray-500 mt-1">Gap analyses completed</p>
        </div>
      </div>

      {/* ============================================ */}
      {/* NEW PIPELINE VIEW - ADD THIS BELOW          */}
      {/* ============================================ */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline</h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : (
          <PipelineView
            opportunities={opportunities}
            summary={summary}
            onStageChange={handleStageChange}
            onHide={handleHide}
            onRestore={handleRestore}
            onToggleFavorite={handleToggleFavorite}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
}
```

---

## Phase 4: Testing

### 4.1 Test Checklist

After implementation, verify:

```
Backend:
☐ GET /api/opportunities returns opportunities with new fields
☐ GET /api/opportunities?is_hidden=true returns hidden opportunities
☐ GET /api/opportunities?stage=capture filters by stage
☐ GET /api/opportunities/pipeline-summary returns correct counts
☐ PATCH /api/opportunities/{id}/stage updates stage
☐ PATCH /api/opportunities/{id}/hide hides opportunity
☐ PATCH /api/opportunities/{id}/restore restores opportunity
☐ PATCH /api/opportunities/{id}/favorite toggles favorite

Frontend:
☐ Pipeline columns display correctly
☐ Opportunities appear in correct columns
☐ Drag and drop works between columns
☐ Search filters opportunities in real-time
☐ Filter panel works
☐ Hide modal appears and works
☐ Hidden panel shows hidden opportunities
☐ Restore button works
☐ Favorite star toggles
☐ Card displays score, due date, gaps correctly
☐ Urgent/overdue dates show warning colors
☐ Mobile responsive (columns scroll horizontally)
```

---

## Design Notes

- Use `emerald-500` for primary green accents
- Cards: `rounded-xl border border-gray-200 shadow-sm`
- Column headers have colored top border (`border-t-4`)
- Drop zones highlight with `bg-emerald-50 border-emerald-300`
- Dragging cards get `shadow-lg rotate-2 scale-105` effect
- Hidden opportunities panel has `bg-gray-100` muted background
- Use the design system from `bidfit-design-system.md`

---

## Files to Create/Update

```
Backend:
├── app/models.py                    # UPDATE - add pipeline fields
├── app/routes/opportunities.py      # UPDATE - add endpoints
└── alembic/versions/xxx.py          # NEW - migration

Frontend:
├── src/types/opportunity.ts         # CREATE - TypeScript types
├── src/components/dashboard/
│   ├── PipelineView.tsx            # CREATE - main pipeline component
│   ├── OpportunityCard.tsx         # CREATE - card component
│   ├── HiddenOpportunitiesPanel.tsx # CREATE - hidden panel
│   └── FilterPanel.tsx             # CREATE - filter panel
└── src/app/dashboard/page.tsx       # UPDATE - add pipeline view
```

---

## Summary

This implementation adds:
1. **Pipeline/Kanban view** with drag-and-drop
2. **Hide/No-Bid functionality** to archive opportunities
3. **Filtering** by relevance, agency, due date, favorites
4. **Search** across title, agency, solicitation number
5. **Hidden opportunities panel** with restore capability
6. **Favorite starring** for important opportunities
7. **Visual indicators** for scores, gaps, urgency

All while **keeping the existing dashboard stats cards** at the top.
