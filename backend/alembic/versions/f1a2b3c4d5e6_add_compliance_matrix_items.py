"""add_compliance_matrix_items

Revision ID: f1a2b3c4d5e6
Revises: f0a1b2c3d4e5
Create Date: 2026-01-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "f0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # gen_random_uuid() is provided by pgcrypto on Postgres/Supabase.
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "compliance_matrix_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column(
            "opportunity_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("opportunities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section", sa.String(length=50), nullable=False),
        sa.Column("requirement", sa.Text(), nullable=False),
        sa.Column("source_document", sa.String(length=255), nullable=True),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("response_status", sa.String(length=20), nullable=False, server_default="not_started"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("assigned_to", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index(
        "idx_compliance_matrix_items_opportunity",
        "compliance_matrix_items",
        ["opportunity_id"],
        unique=False,
    )
    op.create_index(
        "idx_compliance_matrix_items_section",
        "compliance_matrix_items",
        ["opportunity_id", "section"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("idx_compliance_matrix_items_section", table_name="compliance_matrix_items")
    op.drop_index("idx_compliance_matrix_items_opportunity", table_name="compliance_matrix_items")
    op.drop_table("compliance_matrix_items")
