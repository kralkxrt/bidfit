"""Init_schema

Revision ID: 06fcc5391ca4
Revises: 
Create Date: 2026-01-11 12:49:11.057443

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY, UUID, INET, TEXT
from pgvector.sqlalchemy import Vector


# revision identifiers, used by Alembic.
revision: str = '06fcc5391ca4'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    # Create users table
    op.create_table('users',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=True),
        sa.Column('auth_provider', sa.String(length=50), server_default='local', nullable=True),
        sa.Column('auth_provider_id', sa.String(length=255), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=True),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index('idx_users_email', 'users', ['email'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_users_auth_provider', 'users', ['auth_provider', 'auth_provider_id'], unique=False)

    # Create companies table
    op.create_table('companies',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('cage_code', sa.String(length=10), nullable=True),
        sa.Column('uei', sa.String(length=12), nullable=True),
        sa.Column('duns', sa.String(length=9), nullable=True),
        sa.Column('primary_naics', sa.ARRAY(sa.String()), nullable=True),
        sa.Column('size_standard', sa.String(length=100), nullable=True),
        sa.Column('address_line1', sa.String(length=255), nullable=True),
        sa.Column('address_line2', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=50), nullable=True),
        sa.Column('zip_code', sa.String(length=20), nullable=True),
        sa.Column('country', sa.String(length=100), server_default='United States', nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('settings', JSONB, server_default='{}', nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_companies_name', 'companies', ['name'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_companies_cage', 'companies', ['cage_code'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_companies_uei', 'companies', ['uei'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))

    # Create user_companies table
    op.create_table('user_companies',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(length=50), server_default='analyst', nullable=False),
        sa.Column('is_default', sa.Boolean(), server_default='false', nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'company_id')
    )
    op.create_index('idx_user_companies_company', 'user_companies', ['company_id'], unique=False)
    op.create_index('idx_user_companies_user', 'user_companies', ['user_id'], unique=False)

    # Create documents table
    from pgvector.sqlalchemy import Vector
    op.create_table('documents',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('contract_number', sa.String(length=100), nullable=True),
        sa.Column('contract_title', sa.String(length=500), nullable=True),
        sa.Column('customer_agency', sa.String(length=255), nullable=True),
        sa.Column('customer_command', sa.String(length=255), nullable=True),
        sa.Column('customer_office', sa.String(length=255), nullable=True),
        sa.Column('contract_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('contract_type', sa.String(length=50), nullable=True),
        sa.Column('period_of_performance_start', sa.Date(), nullable=True),
        sa.Column('period_of_performance_end', sa.Date(), nullable=True),
        sa.Column('naics_code', sa.String(length=6), nullable=True),
        sa.Column('psc_code', sa.String(length=10), nullable=True),
        sa.Column('clearance_level', sa.String(length=50), nullable=True),
        sa.Column('fte_count', sa.Integer(), nullable=True),
        sa.Column('geographic_scope', sa.String(length=255), nullable=True),
        sa.Column('locations', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('cpars_quality_rating', sa.String(length=20), nullable=True),
        sa.Column('cpars_schedule_rating', sa.String(length=20), nullable=True),
        sa.Column('cpars_cost_rating', sa.String(length=20), nullable=True),
        sa.Column('cpars_management_rating', sa.String(length=20), nullable=True),
        sa.Column('cpars_overall_rating', sa.String(length=20), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('parsed_content', JSONB, nullable=True),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('processing_status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('tags', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_documents_company', 'documents', ['company_id'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_documents_customer', 'documents', ['customer_agency'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_documents_embedding', 'documents', ['embedding'], unique=False, postgresql_using='ivfflat', postgresql_ops={'embedding': 'vector_cosine_ops'}, postgresql_with={'lists': 100})
    op.create_index('idx_documents_naics', 'documents', ['naics_code'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_documents_status', 'documents', ['processing_status'], unique=False)
    op.create_index('idx_documents_type', 'documents', ['document_type'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))

    # Create opportunities table
    op.create_table('opportunities',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('solicitation_number', sa.String(length=100), nullable=True),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('agency', sa.String(length=255), nullable=True),
        sa.Column('sub_agency', sa.String(length=255), nullable=True),
        sa.Column('contracting_office', sa.String(length=255), nullable=True),
        sa.Column('naics_code', sa.String(length=6), nullable=True),
        sa.Column('psc_code', sa.String(length=10), nullable=True),
        sa.Column('estimated_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('set_aside_type', sa.String(length=100), nullable=True),
        sa.Column('contract_type', sa.String(length=50), nullable=True),
        sa.Column('response_due_date', sa.Date(), nullable=True),
        sa.Column('questions_due_date', sa.Date(), nullable=True),
        sa.Column('award_date', sa.Date(), nullable=True),
        sa.Column('status', sa.String(length=20), server_default='active', nullable=True),
        sa.Column('source_url', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_opportunities_company', 'opportunities', ['company_id'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_opportunities_due_date', 'opportunities', ['response_due_date'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_opportunities_status', 'opportunities', ['status'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))

    # Create opportunity_documents table
    op.create_table('opportunity_documents',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('opportunity_id', sa.UUID(), nullable=False),
        sa.Column('document_type', sa.String(length=50), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('raw_text', sa.Text(), nullable=True),
        sa.Column('parsed_requirements', JSONB, nullable=True),
        sa.Column('embedding', Vector(1536), nullable=True),
        sa.Column('processing_status', sa.String(length=20), server_default='pending', nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_opp_docs_embedding', 'opportunity_documents', ['embedding'], unique=False, postgresql_using='ivfflat', postgresql_ops={'embedding': 'vector_cosine_ops'}, postgresql_with={'lists': 50})
    op.create_index('idx_opp_docs_opportunity', 'opportunity_documents', ['opportunity_id'], unique=False)
    op.create_index('idx_opp_docs_type', 'opportunity_documents', ['document_type'], unique=False)

    # Create analyses table
    op.create_table('analyses',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('opportunity_id', sa.UUID(), nullable=False),
        sa.Column('overall_relevance_score', sa.String(length=20), nullable=False),
        sa.Column('scope_score', sa.String(length=20), nullable=True),
        sa.Column('magnitude_score', sa.String(length=20), nullable=True),
        sa.Column('complexity_score', sa.String(length=20), nullable=True),
        sa.Column('recency_score', sa.String(length=20), nullable=True),
        sa.Column('strengths', JSONB, server_default='[]', nullable=False),
        sa.Column('weaknesses', JSONB, server_default='[]', nullable=False),
        sa.Column('recommendations', JSONB, server_default='[]', nullable=False),
        sa.Column('gap_matrix', JSONB, server_default='{}', nullable=False),
        sa.Column('document_assessments', JSONB, server_default='[]', nullable=True),
        sa.Column('documents_analyzed', sa.ARRAY(sa.UUID()), nullable=False),
        sa.Column('agent_confidence', sa.Numeric(precision=3, scale=2), nullable=True),
        sa.Column('go_no_go_recommendation', sa.String(length=20), nullable=True),
        sa.Column('go_no_go_reasoning', sa.Text(), nullable=True),
        sa.Column('analysis_notes', sa.Text(), nullable=True),
        sa.Column('user_notes', sa.Text(), nullable=True),
        sa.Column('raw_llm_response', sa.Text(), nullable=True),
        sa.Column('processing_time_seconds', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('model_version', sa.String(length=100), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.ForeignKeyConstraint(['opportunity_id'], ['opportunities.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_analyses_company', 'analyses', ['company_id'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_analyses_created', 'analyses', ['created_at'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_analyses_opportunity', 'analyses', ['opportunity_id'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))
    op.create_index('idx_analyses_score', 'analyses', ['overall_relevance_score'], unique=False, postgresql_where=sa.text('deleted_at IS NULL'))

    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.UUID(), server_default=sa.text('uuid_generate_v4()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('company_id', sa.UUID(), nullable=True),
        sa.Column('action', sa.String(length=100), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=True),
        sa.Column('entity_id', sa.UUID(), nullable=True),
        sa.Column('details', JSONB, server_default='{}', nullable=True),
        sa.Column('ip_address', INET, nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_audit_action', 'audit_logs', ['action'], unique=False)
    op.create_index('idx_audit_company', 'audit_logs', ['company_id'], unique=False)
    op.create_index('idx_audit_created', 'audit_logs', ['created_at'], unique=False)
    op.create_index('idx_audit_user', 'audit_logs', ['user_id'], unique=False)

    # Create updated_at trigger function
    op.execute("""
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    """)

    # Apply triggers
    op.execute("CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();")
    op.execute("CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();")
    op.execute("CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();")
    op.execute("CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();")
    op.execute("CREATE TRIGGER update_analyses_updated_at BEFORE UPDATE ON analyses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();")


def downgrade() -> None:
    # Drop triggers
    op.execute("DROP TRIGGER IF EXISTS update_analyses_updated_at ON analyses")
    op.execute("DROP TRIGGER IF EXISTS update_opportunities_updated_at ON opportunities")
    op.execute("DROP TRIGGER IF EXISTS update_documents_updated_at ON documents")
    op.execute("DROP TRIGGER IF EXISTS update_companies_updated_at ON companies")
    op.execute("DROP TRIGGER IF EXISTS update_users_updated_at ON users")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column")

    # Drop tables
    op.drop_table('audit_logs')
    op.drop_table('analyses')
    op.drop_table('opportunity_documents')
    op.drop_table('opportunities')
    op.drop_table('documents')
    op.drop_table('user_companies')
    op.drop_table('companies')
    op.drop_table('users')
    
    # Disable extensions (optional, commented out to avoid permission issues)
    # op.execute('DROP EXTENSION IF EXISTS "vector"')
    # op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')

