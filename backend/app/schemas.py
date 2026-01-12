from pydantic import BaseModel, HttpUrl
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
    parsed_requirements: Optional[Dict[str, Any]] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    
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

# --- Opportunity Schemas ---
