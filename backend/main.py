from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.config import (
    engine,
    SessionLocal,
    Base,
    configured_cors_origins,
    ensure_runtime_schema,
    APP_VERSION
)
from services.nlp_service import configure_jieba
from services.user_profile_service import get_profile

# Import Modular Routers
from routers.documents import router as doc_router
from routers.dictionary import router as dict_router
from routers.nlp import router as nlp_router
from routers.annotations import router as ann_router
from routers.review import router as rev_router
from routers.user import router as usr_router
from routers.admin import router as adm_router

# Background database schema initialization
if os.environ.get("HANORA_SKIP_CREATE_ALL") != "1":
    Base.metadata.create_all(engine)
    ensure_runtime_schema()
    with SessionLocal() as startup_session:
        configure_jieba(startup_session)
        get_profile(startup_session)

# App instance creation
app = FastAPI(title="Chinese Context Reader Local API", version=APP_VERSION)

# CORS middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=configured_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Route registration
app.include_router(doc_router)
app.include_router(dict_router)
app.include_router(nlp_router)
app.include_router(ann_router)
app.include_router(rev_router)
app.include_router(usr_router)
app.include_router(adm_router)
