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
}

export interface RedFlag {
    warning: string;
    reason: string;
}

export interface Analysis {
    id: string;
    company_id: string;
    opportunity_id: string;

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

    // Legacy fields (optional)
    gap_matrix?: any;
    scope_score?: string;
    magnitude_score?: string;
    complexity_score?: string;
    recency_score?: string;
    document_assessments?: any[];
}
