"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dictionary_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("simplified", sa.String(length=128), nullable=False),
        sa.Column("traditional", sa.String(length=128), nullable=True),
        sa.Column("pinyin", sa.String(length=256), nullable=True),
        sa.Column("pinyin_numbered", sa.String(length=256), nullable=True),
        sa.Column("vi", sa.Text(), nullable=True),
        sa.Column("en", sa.Text(), nullable=True),
        sa.Column("pos", sa.String(length=64), nullable=True),
        sa.Column("hsk_level", sa.Integer(), nullable=True),
        sa.Column("domain_tags_json", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("source", sa.String(length=64), nullable=False, server_default="custom_vi"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.8"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_dictionary_entries_simplified", "dictionary_entries", ["simplified"])

    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("title", sa.String(length=256), nullable=False),
        sa.Column("file_name", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("original_filename", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("stored_filename", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("file_path", sa.Text(), nullable=False, server_default=""),
        sa.Column("sha256", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("mime_type", sa.String(length=128), nullable=False, server_default=""),
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="pdf"),
        sa.Column("language", sa.String(length=32), nullable=False, server_default="zh-CN"),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "pages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False, server_default=""),
        sa.Column("width", sa.Float(), nullable=True),
        sa.Column("height", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_pages_document_id", "pages", ["document_id"])

    op.create_table(
        "annotations",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("document_id", sa.String(length=64), nullable=False),
        sa.Column("page_id", sa.String(length=64), nullable=False, server_default="page-1"),
        sa.Column("page_number", sa.Integer(), nullable=True),
        sa.Column("sentence_id", sa.String(length=128), nullable=True),
        sa.Column("selected_text", sa.Text(), nullable=False),
        sa.Column("selection_start", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("selection_end", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bbox_json", sa.Text(), nullable=True),
        sa.Column("annotation_type", sa.String(length=32), nullable=False, server_default="word"),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("explanation_vi", sa.Text(), nullable=False, server_default=""),
        sa.Column("selected_meaning_vi", sa.Text(), nullable=False, server_default=""),
        sa.Column("analysis_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("source_sentence", sa.Text(), nullable=False, server_default=""),
        sa.Column("pinyin", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("hsk_level", sa.Integer(), nullable=True),
        sa.Column("domain_tag", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_annotations_document_id", "annotations", ["document_id"])

    op.create_table(
        "review_items",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("annotation_id", sa.String(length=64), nullable=True),
        sa.Column("item_type", sa.String(length=32), nullable=False, server_default="flashcard"),
        sa.Column("source_type", sa.String(length=32), nullable=False, server_default="word"),
        sa.Column("front", sa.Text(), nullable=False, server_default=""),
        sa.Column("back", sa.Text(), nullable=False, server_default=""),
        sa.Column("context", sa.Text(), nullable=False, server_default=""),
        sa.Column("source_sentence", sa.Text(), nullable=False, server_default=""),
        sa.Column("pinyin", sa.String(length=256), nullable=False, server_default=""),
        sa.Column("hsk_level", sa.Integer(), nullable=True),
        sa.Column("domain_tag", sa.String(length=64), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ease", sa.Float(), nullable=False, server_default="2.5"),
        sa.Column("reviewed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "review_events",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("review_item_id", sa.String(length=64), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("response_time_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_review_events_review_item_id", "review_events", ["review_item_id"])

    op.create_table(
        "user_profile",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("target_level", sa.String(length=16), nullable=False, server_default="HSK4"),
        sa.Column("native_language", sa.String(length=16), nullable=False, server_default="vi"),
        sa.Column("preferred_domains_json", sa.Text(), nullable=False, server_default='["general"]'),
        sa.Column("show_pinyin", sa.String(length=32), nullable=False, server_default="always"),
        sa.Column("translation_style", sa.String(length=32), nullable=False, server_default="both"),
    )

    op.create_table(
        "known_words",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("word", sa.String(length=128), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0.5"),
        sa.Column("last_seen", sa.DateTime(timezone=True), nullable=False),
        sa.Column("times_seen", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("times_looked_up", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_known_words_word", "known_words", ["word"])

    op.create_table(
        "user_corrections",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("original_term", sa.String(length=128), nullable=False),
        sa.Column("system_translation", sa.Text(), nullable=False, server_default=""),
        sa.Column("user_translation", sa.Text(), nullable=False),
        sa.Column("context", sa.Text(), nullable=False, server_default=""),
        sa.Column("domain", sa.String(length=64), nullable=False, server_default="general"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_corrections_original_term", "user_corrections", ["original_term"])


def downgrade() -> None:
    op.drop_table("user_corrections")
    op.drop_table("known_words")
    op.drop_table("user_profile")
    op.drop_table("review_events")
    op.drop_table("review_items")
    op.drop_table("annotations")
    op.drop_table("pages")
    op.drop_table("documents")
    op.drop_table("dictionary_entries")
