export type PipelineStage = 'capture' | 'analyzing' | 'writing' | 'submitted' | 'awarded' | 'lost';

export interface OpportunityAnalysisSummary {
    id: string;
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
    company_name?: string;
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
