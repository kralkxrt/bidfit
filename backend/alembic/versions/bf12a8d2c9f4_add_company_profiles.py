"""add_company_profiles

Revision ID: bf12a8d2c9f4
Revises: 5b2a7c9f10de
Create Date: 2026-01-27 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "bf12a8d2c9f4"
down_revision: Union[str, None] = "5b2a7c9f10de"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "company_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("naics_codes", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("certifications", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("clearances", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("set_asides", postgresql.JSONB(astext_type=sa.Text()), nullable=True, server_default=sa.text("'{}'::jsonb")),
        sa.Column("employee_count", sa.Integer(), nullable=True),
        sa.Column("annual_revenue", sa.Numeric(), nullable=True),
        sa.Column("bonding_capacity", sa.Numeric(), nullable=True),
        sa.Column("cage_code", sa.Text(), nullable=True),
        sa.Column("duns_number", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("company_profiles")
