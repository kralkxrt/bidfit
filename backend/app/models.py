from datetime import datetime
from typing import List, Optional
from uuid import uuid4
import sqlalchemy
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Numeric, Text, ForeignKey, Date, JSON, ARRAY
from sqlalchemy.orm import Relationship, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY as PG_ARRAY
from pgvector.sqlalchemy import Vector
from app.database import Base

# --- Models ---

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)
    auth_provider = Column(String(50), default='local')
    auth_provider_id = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user_companies = relationship("UserCompany", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False, index=True)
    cage_code = Column(String(10), index=True, nullable=True)
    uei = Column(String(12), index=True, nullable=True)
    duns = Column(String(9), nullable=True)
    primary_naics = Column(PG_ARRAY(String), nullable=True)
    size_standard = Column(String(100), nullable=True)
    
    address_line1 = Column(String(255), nullable=True)
    address_line2 = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)
    country = Column(String(100), default='United States')
    website = Column(String(255), nullable=True)
    linkedin_url = Column(String(255), nullable=True)

    # Expanded Info
    employee_count = Column(Integer, nullable=True)
    founded_year = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    
    # GovCon Specifics - Socioeconomic
    business_size = Column(String(50), nullable=True) # 'small', 'large', 'other_than_small'
    certifications = Column(JSONB, default=[]) # ['8a', 'hubzone', 'sdvosb', 'wosb', 'edwosb']
    certification_details = Column(JSONB, default={}) # {cert: {expiration_date: '...', number: '...'}}
    
    # Contract Vehicles
    gsa_schedules = Column(JSONB, default=[]) # [{schedule: 'MAS', contract_number: '...', sins: []}]
    contract_vehicles = Column(JSONB, default=[]) # ['OASIS Pool 1', 'SEWP V']
    
    # Capabilities
    # Note: primary_naics is already defined above as PG_ARRAY, let's keep that but maybe also support a single primary string if needed? 
    # The existing primary_naics is PG_ARRAY(String). Let's treat that as "All NAICS" or rename/add new fields?
    # User asked for: naics_codes (list) and primary_naics (string).
    # Existing `primary_naics` is an Array. Let's rename existing to `naics_codes` if we can or just use strict naming.
    # To avoid data loss/migration pain on MVP, let's keep existing `primary_naics` array as the list of codes (it was likely intended as such) 
    # and add a new `primary_naic` (singular) string.
    # Actually wait, `primary_naics = Column(PG_ARRAY(String))` implies multiple. Let's use that for "naics_codes" effectively.
    # And add `primary_naic_code` for the single primary.
    
    primary_naic_code = Column(String(6), nullable=True)
    # reusing primary_naics as the list for now, or we can alias in schema.
    
    service_areas = Column(JSONB, default=[]) # ['IT Services', 'Logistics']
    facility_clearance = Column(String(50), nullable=True) # 'none', 'confidential', 'secret', 'top_secret'
    geographic_coverage = Column(JSONB, default=[])
    
    # Financial
    annual_revenue = Column(sqlalchemy.BigInteger, nullable=True)
    bonding_capacity = Column(sqlalchemy.BigInteger, nullable=True)
    
    # Relationships
    teaming_partners = Column(JSONB, default=[]) # [{name, relationship}]
    typical_role = Column(String(50), nullable=True) # 'prime', 'sub'

    settings = Column(JSONB, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    user_companies = relationship("UserCompany", back_populates="company", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="company", cascade="all, delete-orphan")
    opportunities = relationship("Opportunity", back_populates="company", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="company", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="company")

class UserCompany(Base):
    __tablename__ = "user_companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False, default='analyst')
    is_default = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="user_companies")
    company = relationship("Company", back_populates="user_companies")

class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    
    contract_number = Column(String(100), nullable=True)
    contract_title = Column(String(500), nullable=True)
    customer_agency = Column(String(255), nullable=True, index=True)
    customer_command = Column(String(255), nullable=True)
    customer_office = Column(String(255), nullable=True)
    
    contract_value = Column(Numeric(15, 2), nullable=True)
    contract_type = Column(String(50), nullable=True)
    period_of_performance_start = Column(Date, nullable=True)
    period_of_performance_end = Column(Date, nullable=True)
    
    naics_code = Column(String(6), nullable=True, index=True)
    psc_code = Column(String(10), nullable=True)
    clearance_level = Column(String(50), nullable=True)
    
    fte_count = Column(Integer, nullable=True)
    geographic_scope = Column(String(255), nullable=True)
    locations = Column(PG_ARRAY(Text), nullable=True)
    
    cpars_quality_rating = Column(String(20), nullable=True)
    cpars_schedule_rating = Column(String(20), nullable=True)
    cpars_cost_rating = Column(String(20), nullable=True)
    cpars_management_rating = Column(String(20), nullable=True)
    cpars_overall_rating = Column(String(20), nullable=True)
    
    raw_text = Column(Text, nullable=True)
    parsed_content = Column(JSONB, nullable=True)
    
    embedding = Column(Vector(1536), nullable=True)
    
    processing_status = Column(String(20), default='pending', index=True)
    processing_error = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    
    tags = Column(PG_ARRAY(Text), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="documents")

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    solicitation_number = Column(String(100), nullable=True)
    title = Column(String(500), nullable=False)
    
    agency = Column(String(255), nullable=True)
    sub_agency = Column(String(255), nullable=True)
    contracting_office = Column(String(255), nullable=True)
    
    naics_code = Column(String(6), nullable=True)
    psc_code = Column(String(10), nullable=True)
    estimated_value = Column(Numeric(15, 2), nullable=True)
    set_aside_type = Column(String(100), nullable=True)
    contract_type = Column(String(50), nullable=True)
    
    response_due_date = Column(Date, nullable=True, index=True)
    questions_due_date = Column(Date, nullable=True)
    award_date = Column(Date, nullable=True)
    
    status = Column(String(20), default='active', index=True)
    source_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)

    # NEW PIPELINE FIELDS
    pipeline_stage = Column(String(50), default='capture', nullable=False, index=True)
    # Values: 'capture', 'analyzing', 'writing', 'submitted', 'awarded', 'lost'
    
    is_hidden = Column(Boolean, default=False, nullable=False, index=True)
    hidden_at = Column(DateTime(timezone=True), nullable=True)
    hidden_reason = Column(String(500), nullable=True)
    
    is_no_bid = Column(Boolean, default=False, nullable=False)
    no_bid_reason = Column(String(500), nullable=True)
    
    is_favorite = Column(Boolean, default=False, nullable=False)
    contract_type = Column(String(50), nullable=True)    # FFP, CPFF, T&M, IDIQ, etc.
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="opportunities")
    documents = relationship("OpportunityDocument", back_populates="opportunity", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="opportunity", cascade="all, delete-orphan")

class OpportunityDocument(Base):
    __tablename__ = "opportunity_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    document_type = Column(String(50), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    
    raw_text = Column(Text, nullable=True)
    parsed_requirements = Column(JSONB, nullable=True)
    embedding = Column(Vector(1536), nullable=True)
    
    processing_status = Column(String(20), default='pending')
    processing_error = Column(Text, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    opportunity = relationship("Opportunity", back_populates="documents")

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    opportunity_id = Column(UUID(as_uuid=True), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    overall_relevance_score = Column(String(20), nullable=False, index=True)
    scope_score = Column(String(20), nullable=True)
    magnitude_score = Column(String(20), nullable=True)
    complexity_score = Column(String(20), nullable=True)
    recency_score = Column(String(20), nullable=True)
    
    strengths = Column(JSONB, nullable=False, default=[])
    weaknesses = Column(JSONB, nullable=False, default=[])
    recommendations = Column(JSONB, nullable=False, default=[])
    gap_matrix = Column(JSONB, nullable=False, default={})
    
    document_assessments = Column(JSONB, default=[])
    documents_analyzed = Column(PG_ARRAY(UUID(as_uuid=True)), nullable=False)
    agent_confidence = Column(Numeric(3, 2), nullable=True)
    
    go_no_go_recommendation = Column(String(20), nullable=True)
    go_no_go_reasoning = Column(Text, nullable=True)
    
    # v2.0 Fields - Enhanced Analysis
    requirements_matrix = Column(JSONB, nullable=True)      # List of RequirementAssessment
    requirements_summary = Column(JSONB, nullable=True)     # {total, strong, moderate, weak, gap, coverage_percentage}
    contract_assessments = Column(JSONB, nullable=True)     # List of ContractAssessment with individual relevance scores
    red_flags = Column(JSONB, nullable=True)                # List of {warning, reason}
    evaluator_perspective = Column(Text, nullable=True)     # Government evaluator summary
    overall_relevance_label = Column(String(50), nullable=True) # e.g. "RELEVANT", "VERY RELEVANT"
    dimensional_scores = Column(JSONB, nullable=True)       # Enhanced with strengths/weaknesses/gaps per dimension
    
    # Phase 0 Integration
    company_compliance = Column(JSONB, nullable=True)       # {qualification_status, compliance_flags, disqualifiers}
    
    analysis_notes = Column(Text, nullable=True)
    user_notes = Column(Text, nullable=True)
    raw_llm_response = Column(Text, nullable=True)
    
    processing_time_seconds = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    model_version = Column(String(100), nullable=True)
    
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    company = relationship("Company", back_populates="analyses")
    opportunity = relationship("Opportunity", back_populates="analyses")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), index=True)
    
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    
    details = Column(JSONB, default={})
    
    ip_address = Column(sqlalchemy.dialects.postgresql.INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
    company = relationship("Company", back_populates="audit_logs")
