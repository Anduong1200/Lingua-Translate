"""vocabulary items

Revision ID: 0003_vocabulary_items
Revises: 0002_production_hardening
Create Date: 2026-05-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_vocabulary_items"
down_revision = "0002_production_hardening"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vocabulary_items",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("word", sa.String(length=128), nullable=False),
        sa.Column("translation", sa.Text(), nullable=False, server_default=""),
        sa.Column("pinyin", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("context", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_file", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("source_document_id", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("hsk_level", sa.Integer(), nullable=True),
        sa.Column("domain_tags_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("topic", sa.String(length=64), nullable=False, server_default="general"),
        sa.Column("favorite", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("learned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("lookup_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_vocabulary_items_word", "vocabulary_items", ["word"])
    op.create_index("ix_vocabulary_items_source_document_id", "vocabulary_items", ["source_document_id"])


def downgrade() -> None:
    op.drop_index("ix_vocabulary_items_source_document_id", table_name="vocabulary_items")
    op.drop_index("ix_vocabulary_items_word", table_name="vocabulary_items")
    op.drop_table("vocabulary_items")
