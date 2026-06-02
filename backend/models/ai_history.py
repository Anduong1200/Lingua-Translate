from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey, JSON
from db.config import Base, now_utc

class AiRequestRecord(Base):
    __tablename__ = "ai_requests"

    id = Column(String, primary_key=True, index=True)
    task_type = Column(String, nullable=False)
    model = Column(String, nullable=False)
    status = Column(String, nullable=False)
    latency_ms = Column(Integer, nullable=False)
    input_token_estimate = Column(Integer, nullable=True)
    output_token_estimate = Column(Integer, nullable=True)
    created_at = Column(String, default=lambda: now_utc().isoformat())

class AiCacheRecord(Base):
    __tablename__ = "ai_cache"

    id = Column(String, primary_key=True, index=True)
    cache_key = Column(String, unique=True, index=True, nullable=False)
    task_type = Column(String, nullable=False)
    context_hash = Column(String, nullable=False)
    response_json = Column(Text, nullable=False)
    expires_at = Column(String, nullable=False)
    created_at = Column(String, default=lambda: now_utc().isoformat())

class ChatSessionRecord(Base):
    __tablename__ = "chat_sessions"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    created_at = Column(String, default=lambda: now_utc().isoformat())

class ChatMessageRecord(Base):
    __tablename__ = "chat_messages"

    id = Column(String, primary_key=True, index=True)
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    source_refs_json = Column(JSON, nullable=True)
    created_at = Column(String, default=lambda: now_utc().isoformat())

class AiUserConsentRecord(Base):
    __tablename__ = "ai_user_consent"

    user_id = Column(String, primary_key=True, index=True)
    allow_send_selected_text = Column(Boolean, default=False)
    allow_send_page_context = Column(Boolean, default=False)
    allow_send_notes = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: now_utc().isoformat())
