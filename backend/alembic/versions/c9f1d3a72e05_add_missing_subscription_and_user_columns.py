"""add_missing_subscription_and_user_columns

Revision ID: c9f1d3a72e05
Revises: 8b24c4b21291
Create Date: 2026-08-14 02:32:00.000000

Adds columns that were added to SQLAlchemy models after the last migration:
- subscriptions: plan_source, is_manual_override, is_paused, admin_notes
- users: is_super_admin
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9f1d3a72e05'
down_revision: Union[str, Sequence[str], None] = '8b24c4b21291'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add missing columns to subscriptions and users tables."""
    # subscriptions: plan_source
    op.add_column('subscriptions',
        sa.Column('plan_source', sa.String(), server_default='default', nullable=False)
    )
    # subscriptions: is_manual_override
    op.add_column('subscriptions',
        sa.Column('is_manual_override', sa.Boolean(), server_default='false', nullable=False)
    )
    # subscriptions: is_paused
    op.add_column('subscriptions',
        sa.Column('is_paused', sa.Boolean(), server_default='false', nullable=False)
    )
    # subscriptions: admin_notes
    op.add_column('subscriptions',
        sa.Column('admin_notes', sa.Text(), nullable=True)
    )
    # users: is_super_admin
    op.add_column('users',
        sa.Column('is_super_admin', sa.Boolean(), server_default='false', nullable=False)
    )


def downgrade() -> None:
    """Remove columns added in this migration."""
    op.drop_column('users', 'is_super_admin')
    op.drop_column('subscriptions', 'admin_notes')
    op.drop_column('subscriptions', 'is_paused')
    op.drop_column('subscriptions', 'is_manual_override')
    op.drop_column('subscriptions', 'plan_source')
