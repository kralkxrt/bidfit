"""add_document_text_positions

Revision ID: 3b7b1d7a2d3c
Revises: 9f3b2a7c5d1e
Create Date: 2026-01-27 13:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "3b7b1d7a2d3c"
down_revision: Union[str, None] = "9f3b2a7c5d1e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_text_positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("text_content", sa.Text(), nullable=False),
        sa.Column("bounding_box", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_text_positions_document", "document_text_positions", ["document_id"], unique=False)
    op.create_index("idx_text_positions_page", "document_text_positions", ["document_id", "page_number"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_text_positions_page", table_name="document_text_positions")
    op.drop_index("idx_text_positions_document", table_name="document_text_positions")
    op.drop_table("document_text_positions")
