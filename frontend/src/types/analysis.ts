export interface DimensionalScoreDetails {
    score: number;
    label: string;
    strengths: Array<{ item: string; evidence: string }>;
    weaknesses: Array<{ item: string; evidence: string }>;
    gaps: Array<{ item: string; evidence: string }>;
}

export interface DimensionalScores {
    scope_alignment: DimensionalScoreDetails;
    magnitude: DimensionalScoreDetails;
    complexity: DimensionalScoreDetails;
    recency: DimensionalScoreDetails;
    quality: DimensionalScoreDetails;
}

export interface RequirementAssessment {
    req_id: string;
    category: string;
    requirement_text: string;
    criticality: string;
    coverage_status: string;
    supporting_evidence: string[];
    notes?: string;
}

export interface ContractAssessment {
    contract_name: string;
    contract_number?: string;
    customer_agency: string;
    service_branch: string;
    contract_value: number | string;
    duration_months?: number;
    fte_count?: number;
    relevance_score: number;
    scope_match: string;
    environment_match: string;
    primary_use: string;
    limitations: string[];
    is_padding: boolean;
    performance_ratings?: Record<string, string>;
}

export interface RedFlag {
    warning: string;
    reason: string;
}

export interface Analysis {
    id: string;
    company_id: string;
    opportunity_id: string;
    documents_analyzed: string[];

    overall_relevance_score: string;
    overall_relevance_label?: string;

    go_no_go_recommendation: string;
    go_no_go_reasoning: string;

    requirements_matrix: RequirementAssessment[];
    requirements_summary: {
        total: number;
        strong: number;
        moderate: number;
        weak: number;
        gap: number;
        coverage_percentage: number;
    };
    contract_assessments: ContractAssessment[];
    dimensional_scores: DimensionalScores;
    red_flags: RedFlag[];
    evaluator_perspective: string;

    strengths: Array<{ title: string; evidence: string; pws_alignment?: string; impact?: string }>;
    weaknesses: Array<{ title: string; evidence: string; risk_level: string; mitigation: string }>;
    recommendations: {
        narrative_strategy: string;
        gap_mitigations: Array<{ gap: string; action: string; priority: string }>;
        teaming_suggestion?: string;
    };

    created_at: string;

    // Phase 0
    company_compliance?: {
        qualification_status: 'QUALIFIED' | 'CONDITIONAL' | 'DISQUALIFIED';
        disqualifiers: string[];
        compliance_flags: Array<{
            field: string;
            requirement: string;
            company_value: string;
            status: 'COMPLIANT' | 'GAP' | 'WEAKNESS' | 'FLAG';
            note: string;
        }>;
    };

    // Phase 0A
    document_analysis?: DocumentAnalysis;

    // Legacy fields (optional)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gap_matrix?: any;
    scope_score?: string;
    magnitude_score?: string;
    complexity_score?: string;
    recency_score?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    document_assessments?: any[];
}

export interface PPRequirements {
    references_required?: number | { min: number; max?: number };
    recency_years?: number;
    min_contract_value?: number;
    max_contract_value?: number; // Legacy field
    contract_value?: { min: number; max?: number };
    relevancy_criteria?: string;
    cpars_requested?: boolean;
    contract_types_preferred?: string[];
}

export interface EvaluationFactors {
    past_performance_weight?: string;
    scoring_approach?: string;
    rating_scale?: string[];
    key_criteria?: string[];
}

export interface ScopeOverview {
    summary: string;
    key_objectives: string[];
}

export interface DocumentAnalysis {
    document_type: 'RFP' | 'PWS' | 'SOW' | 'RFI' | 'SOURCES_SOUGHT';
    sections_identified: string[];
    scope_overview?: ScopeOverview;
    pp_requirements: PPRequirements;
    evaluation_factors: EvaluationFactors;
    special_requirements?: Record<string, string>;
}
