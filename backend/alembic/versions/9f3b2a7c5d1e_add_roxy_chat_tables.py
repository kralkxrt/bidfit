"""add_roxy_chat_tables

Revision ID: 9f3b2a7c5d1e
Revises: e8f6913ee60d
Create Date: 2026-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "9f3b2a7c5d1e"
down_revision: Union[str, None] = "e8f6913ee60d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roxy_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("opportunity_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_roxy_sessions_opportunity", "roxy_sessions", ["opportunity_id"], unique=False)

    op.create_table(
        "roxy_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("roxy_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("citations", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("tool_used", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("role IN ('user', 'assistant')", name="ck_roxy_messages_role"),
    )
    op.create_index("idx_roxy_messages_session", "roxy_messages", ["session_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_roxy_messages_session", table_name="roxy_messages")
    op.drop_table("roxy_messages")
    op.drop_index("idx_roxy_sessions_opportunity", table_name="roxy_sessions")
    op.drop_table("roxy_sessions")
