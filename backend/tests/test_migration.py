from pathlib import Path
import sqlite3
import pytest
from sqlalchemy import create_engine, select, text as sql_text
from sqlalchemy.orm import declarative_base

# Add backend directory to sys.path to allow importing modular packages
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.config import Base, ensure_runtime_schema, DB_PATH
import db.config
import models

def test_database_clean_bootstrap_and_migration(tmp_path) -> None:
    # 1. Create a path for a completely fresh, empty SQLite database
    temp_db_file = tmp_path / "fresh_hanora.sqlite3"
    assert not temp_db_file.exists()

    # 2. Create a temporary engine pointing to this new file
    temp_engine = create_engine(f"sqlite:///{temp_db_file}")

    # 3. Patch db.config engine and DB_PATH to use the temporary ones
    original_engine = db.config.engine
    original_db_path = db.config.DB_PATH
    
    db.config.engine = temp_engine
    db.config.DB_PATH = temp_db_file

    try:
        # 4. Perform fresh schema creation (simulating startup)
        Base.metadata.create_all(temp_engine)

        # 5. Run the runtime migrations (PRAGMA column checks and index creations)
        ensure_runtime_schema()

        # 6. Verify database file was created and is non-empty
        assert temp_db_file.exists()
        assert temp_db_file.stat().st_size > 0

        # 7. Query dynamic schema to verify tables and columns are successfully generated
        with temp_engine.connect() as connection:
            # Check documents table structure
            document_cols = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(documents)")).fetchall()}
            assert "original_filename" in document_cols
            assert "stored_filename" in document_cols
            assert "file_path" in document_cols
            assert "sha256" in document_cols
            assert "mime_type" in document_cols

            # Check dictionary_entries table structure
            dict_cols = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(dictionary_entries)")).fetchall()}
            assert "source_version" in dict_cols
            assert "license" in dict_cols
            assert "raw_line" in dict_cols

            # Check vocabulary_items table structure
            vocab_cols = {row[1] for row in connection.execute(sql_text("PRAGMA table_info(vocabulary_items)")).fetchall()}
            assert "source_document_id" in vocab_cols
            assert "topic" in vocab_cols
            assert "favorite" in vocab_cols
            assert "learned" in vocab_cols
            assert "lookup_count" in vocab_cols

            # Verify that index creations succeeded
            indexes = {row[0] for row in connection.execute(sql_text("SELECT name FROM sqlite_master WHERE type='index'")).fetchall()}
            assert "ix_dictionary_entries_source" in indexes
            assert "ix_pages_document_page" in indexes
            assert "ix_annotations_document_page" in indexes
            assert "ix_review_items_due_at" in indexes
            assert "ix_vocabulary_items_word" in indexes
            assert "ix_vocabulary_items_source_document_id" in indexes

    finally:
        # Revert patches to avoid side effects on other tests
        db.config.engine = original_engine
        db.config.DB_PATH = original_db_path
        temp_engine.dispose()


def test_runtime_schema_migrates_integer_user_correction_id(tmp_path) -> None:
    temp_db_file = tmp_path / "legacy_user_corrections.sqlite3"
    temp_engine = create_engine(f"sqlite:///{temp_db_file}")

    original_engine = db.config.engine
    original_db_path = db.config.DB_PATH

    db.config.engine = temp_engine
    db.config.DB_PATH = temp_db_file

    try:
        Base.metadata.create_all(temp_engine)
        with temp_engine.begin() as connection:
            connection.execute(sql_text("DROP TABLE user_corrections"))
            connection.execute(sql_text("""
                CREATE TABLE user_corrections (
                    id INTEGER NOT NULL PRIMARY KEY,
                    original_term VARCHAR(128) NOT NULL,
                    system_translation TEXT DEFAULT '',
                    user_translation TEXT DEFAULT '',
                    context TEXT DEFAULT '',
                    domain VARCHAR(64) DEFAULT 'general',
                    created_at DATETIME NOT NULL
                )
            """))
            connection.execute(sql_text("""
                INSERT INTO user_corrections (
                    id, original_term, system_translation, user_translation, context, domain, created_at
                )
                VALUES (
                    1, '系统', 'hệ thống', 'hệ thống nghiệp vụ',
                    '业务系统需要处理大量数据。', 'computer_science', '2026-06-02T00:00:00+00:00'
                )
            """))

        ensure_runtime_schema()

        with temp_engine.begin() as connection:
            columns = {
                row[1]: str(row[2] or "").upper()
                for row in connection.execute(sql_text("PRAGMA table_info(user_corrections)")).fetchall()
            }
            assert columns["id"].startswith("VARCHAR")

            connection.execute(sql_text("""
                INSERT INTO user_corrections (
                    id, original_term, system_translation, user_translation, context, domain, created_at
                )
                VALUES (
                    'corr_ci_check', '处理', 'xử lý', 'xử lý dữ liệu',
                    '计算机系统需要处理大量数据。', 'computer_science', '2026-06-02T00:00:00+00:00'
                )
            """))
            ids = {
                row[0]
                for row in connection.execute(sql_text("SELECT id FROM user_corrections")).fetchall()
            }
            assert {"1", "corr_ci_check"} <= ids
    finally:
        db.config.engine = original_engine
        db.config.DB_PATH = original_db_path
        temp_engine.dispose()
