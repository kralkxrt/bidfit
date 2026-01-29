from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from uuid import UUID

# --- Shared Schemas ---

class OpportunityBase(BaseModel):
    title: str
    solicitation_number: Optional[str] = None
    agency: Optional[str] = None
    contracting_office: Optional[str] = None
    naics_code: Optional[str] = None
    psc_code: Optional[str] = None
    estimated_value: Optional[float] = None
    set_aside_type: Optional[str] = None
    contract_type: Optional[str] = None
    response_due_date: Optional[date] = None
    status: Optional[str] = "active"
    source_url: Optional[str] = None
    notes: Optional[str] = None

class OpportunityCreate(OpportunityBase):
    pass

class OpportunityUpdate(OpportunityBase):
    title: Optional[str] = None

class OpportunityResponse(OpportunityBase):
    id: UUID
    company_id: UUID
    company_name: Optional[str] = None
    
    # Pipeline Fields
    pipeline_stage: str
    is_hidden: bool
    hidden_at: Optional[datetime] = None
    hidden_reason: Optional[str] = None
    is_no_bid: bool
    no_bid_reason: Optional[str] = None
    is_favorite: bool
    
    # Analysis Summary
    latest_analysis: Optional[Dict[str, Any]] = None
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OpportunityDocumentResponse(BaseModel):
    id: UUID
    opportunity_id: UUID
    document_type: str
    filename: str
    processing_status: str
    file_url: Optional[str] = None  # Signed URL for document access
    parsed_requirements: Optional[Dict[str, Any]] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- Compliance Matrix Schemas ---

class ComplianceMatrixItemCreate(BaseModel):
    section: str
    requirement: str
    source_document: Optional[str] = None
    page_number: Optional[int] = None
    response_status: Optional[str] = "not_started"  # not_started, in_progress, complete, n_a
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class ComplianceMatrixItemUpdate(BaseModel):
    section: Optional[str] = None
    requirement: Optional[str] = None
    source_document: Optional[str] = None
    page_number: Optional[int] = None
    response_status: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class ComplianceMatrixItemResponse(BaseModel):
    id: UUID
    opportunity_id: UUID
    section: str
    requirement: str
    source_document: Optional[str] = None
    page_number: Optional[int] = None
    response_status: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Company Schemas ---
class CompanyCreate(BaseModel):
    name: str

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    
    # Extended Info
    employee_count: Optional[int] = None
    founded_year: Optional[int] = None
    description: Optional[str] = None
    
    # GovCon Specifics
    uei: Optional[str] = None
    cage_code: Optional[str] = None
    business_size: Optional[str] = None
    certifications: Optional[List[str]] = None
    certification_details: Optional[Dict[str, Any]] = None
    
    gsa_schedules: Optional[List[Dict[str, Any]]] = None
    contract_vehicles: Optional[List[str]] = None
    
    naics_codes: Optional[List[str]] = None
    primary_naic_code: Optional[str] = None
    service_areas: Optional[List[str]] = None
    facility_clearance: Optional[str] = None
    geographic_coverage: Optional[List[str]] = None
    
    annual_revenue: Optional[int] = None
    bonding_capacity: Optional[int] = None
    
    teaming_partners: Optional[List[Dict[str, Any]]] = None
    typical_role: Optional[str] = None

class CompanyResponse(BaseModel):
    id: UUID
    name: str
    website: Optional[str] = None
    linkedin_url: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    
    # Extended Info
    employee_count: Optional[int] = None
    founded_year: Optional[int] = None
    description: Optional[str] = None
    
    # GovCon Specifics
    uei: Optional[str] = None
    cage_code: Optional[str] = None
    business_size: Optional[str] = None
    certifications: Optional[List[str]] = None
    certification_details: Optional[Dict[str, Any]] = None
    
    gsa_schedules: Optional[List[Dict[str, Any]]] = None
    contract_vehicles: Optional[List[str]] = None
    
    naics_codes: Optional[List[str]] = None
    primary_naic_code: Optional[str] = None
    service_areas: Optional[List[str]] = None
    facility_clearance: Optional[str] = None
    geographic_coverage: Optional[List[str]] = None
    
    annual_revenue: Optional[int] = None
    bonding_capacity: Optional[int] = None
    
    teaming_partners: Optional[List[Dict[str, Any]]] = None
    typical_role: Optional[str] = None
    
    class Config:
        from_attributes = True

# --- Company Profile Schemas ---
class CompanyProfileBase(BaseModel):
    name: str
    naics_codes: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    clearances: Optional[List[str]] = None
    set_asides: Optional[Dict[str, bool]] = None
    employee_count: Optional[int] = None
    annual_revenue: Optional[float] = None
    bonding_capacity: Optional[float] = None
    cage_code: Optional[str] = None
    duns_number: Optional[str] = None

class CompanyProfileUpdate(BaseModel):
    name: Optional[str] = None
    naics_codes: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    clearances: Optional[List[str]] = None
    set_asides: Optional[Dict[str, bool]] = None
    employee_count: Optional[int] = None
    annual_revenue: Optional[float] = None
    bonding_capacity: Optional[float] = None
    cage_code: Optional[str] = None
    duns_number: Optional[str] = None

class CompanyProfileResponse(CompanyProfileBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Company Profile API (BidWin) ---
class PastPerformanceSummary(BaseModel):
    contract_count: int
    total_value: int
    agencies: List[str]


class CompanyProfileAPIUpdate(BaseModel):
    name: Optional[str] = None
    duns: Optional[str] = None
    cage: Optional[str] = None
    uei: Optional[str] = None
    naics_primary: Optional[str] = None
    naics_secondary: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    set_asides: Optional[List[str]] = None
    clearance_level: Optional[str] = None
    cleared_personnel_count: Optional[int] = None


class CompanyProfileAPIResponse(BaseModel):
    id: UUID
    name: str
    duns: Optional[str] = None
    cage: Optional[str] = None
    uei: Optional[str] = None
    naics_primary: Optional[str] = None
    naics_secondary: List[str] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    set_asides: List[str] = Field(default_factory=list)
    clearance_level: Optional[str] = None
    cleared_personnel_count: int = 0
    past_performance_summary: PastPerformanceSummary

    class Config:
        from_attributes = True

# --- Past Performance Schemas ---

class PastPerformanceBase(BaseModel):
    filename: Optional[str] = None

    contract_number: Optional[str] = None
    contract_title: Optional[str] = None
    customer_agency: Optional[str] = None
    customer_command: Optional[str] = None
    customer_office: Optional[str] = None

    contract_value: Optional[float] = None
    contract_type: Optional[str] = None
    period_of_performance_start: Optional[date] = None
    period_of_performance_end: Optional[date] = None

    naics_code: Optional[str] = None
    psc_code: Optional[str] = None
    clearance_level: Optional[str] = None

    fte_count: Optional[int] = None
    geographic_scope: Optional[str] = None
    locations: Optional[List[str]] = None

    notes: Optional[str] = None


class PastPerformanceCreate(PastPerformanceBase):
    pass


class PastPerformanceUpdate(BaseModel):
    filename: Optional[str] = None

    contract_number: Optional[str] = None
    contract_title: Optional[str] = None
    customer_agency: Optional[str] = None
    customer_command: Optional[str] = None
    customer_office: Optional[str] = None

    contract_value: Optional[float] = None
    contract_type: Optional[str] = None
    period_of_performance_start: Optional[date] = None
    period_of_performance_end: Optional[date] = None

    naics_code: Optional[str] = None
    psc_code: Optional[str] = None
    clearance_level: Optional[str] = None

    fte_count: Optional[int] = None
    geographic_scope: Optional[str] = None
    locations: Optional[List[str]] = None

    notes: Optional[str] = None


class PastPerformanceResponse(PastPerformanceBase):
    id: UUID
    company_id: UUID
    document_type: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# --- Opportunity Schemas ---
