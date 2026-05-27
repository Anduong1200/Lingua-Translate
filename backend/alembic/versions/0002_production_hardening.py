"""production hardening

Revision ID: 0002_production_hardening
Revises: 0001_initial_schema
Create Date: 2026-05-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_production_hardening"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("dictionary_entries") as batch_op:
        batch_op.add_column(sa.Column("source_version", sa.String(length=64), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("license", sa.String(length=128), nullable=False, server_default=""))
        batch_op.add_column(sa.Column("raw_line", sa.Text(), nullable=False, server_default=""))

    op.create_index("ix_dictionary_entries_source", "dictionary_entries", ["source"])
    op.create_index("ix_pages_document_page", "pages", ["document_id", "page_number"])
    op.create_index("ix_annotations_document_page", "annotations", ["document_id", "page_number"])
    op.create_index("ix_review_items_due_at", "review_items", ["due_at"])


def downgrade() -> None:
    op.drop_index("ix_review_items_due_at", table_name="review_items")
    op.drop_index("ix_annotations_document_page", table_name="annotations")
    op.drop_index("ix_pages_document_page", table_name="pages")
    op.drop_index("ix_dictionary_entries_source", table_name="dictionary_entries")

    with op.batch_alter_table("dictionary_entries") as batch_op:
        batch_op.drop_column("raw_line")
        batch_op.drop_column("license")
        batch_op.drop_column("source_version")
