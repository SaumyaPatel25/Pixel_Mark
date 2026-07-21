"""add_blueprint_dom_edit_tables

Revision ID: fb605e50789d
Revises: aa1d8e603fda
Create Date: 2026-07-21 00:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'fb605e50789d'
down_revision = 'b3e00cae3bfb'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'blueprint_dom_targets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('canvas_frame_id', sa.String(), nullable=False),
        sa.Column('page_url', sa.String(), nullable=True),
        sa.Column('selector_primary', sa.String(), nullable=True),
        sa.Column('selector_fallback', sa.String(), nullable=True),
        sa.Column('xpath', sa.String(), nullable=True),
        sa.Column('target_signature_json', sa.JSON(), nullable=True),
        sa.Column('element_tag', sa.String(), nullable=True),
        sa.Column('element_label', sa.String(), nullable=True),
        sa.Column('text_excerpt', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['canvas_frame_id'], ['canvas_frames.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'blueprint_dom_edit_sets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('project_id', sa.String(), nullable=False),
        sa.Column('canvas_frame_id', sa.String(), nullable=False),
        sa.Column('target_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('version_number', sa.Integer(), nullable=True, default=1),
        sa.Column('status', sa.String(), nullable=True, default='draft'),
        sa.Column('base_snapshot_json', sa.JSON(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['canvas_frame_id'], ['canvas_frames.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_id'], ['blueprint_dom_targets.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'blueprint_dom_edit_operations',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('edit_set_id', sa.String(), nullable=False),
        sa.Column('op_type', sa.String(), nullable=False),
        sa.Column('property_key', sa.String(), nullable=False),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('unit', sa.String(), nullable=True),
        sa.Column('selector_override', sa.String(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['edit_set_id'], ['blueprint_dom_edit_sets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('blueprint_dom_edit_operations')
    op.drop_table('blueprint_dom_edit_sets')
    op.drop_table('blueprint_dom_targets')
