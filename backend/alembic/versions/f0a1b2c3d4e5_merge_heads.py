"""merge_heads

Revision ID: f0a1b2c3d4e5
Revises: 72a7b6a9509d, bf12a8d2c9f4, 7c1e2f4a9b8d
Create Date: 2026-01-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f0a1b2c3d4e5"
down_revision: Union[str, None] = ("72a7b6a9509d", "bf12a8d2c9f4", "7c1e2f4a9b8d")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Merge point – no schema changes.
    pass


def downgrade() -> None:
    # Downgrading past a merge requires selecting a specific branch.
    pass
