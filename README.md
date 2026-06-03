<div align="center">
  <h1>Hanora Context Reader</h1>
  <p><strong>A Dictionary-backed, Local-first Chinese Reading Assistant tailored for Vietnamese learners.</strong></p>

  [![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](#)
  [![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](#)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)](#)
  [![Playwright](https://img.shields.io/badge/Tested_with-Playwright-2EAD33?logo=playwright&logoColor=white)](#)
  [![Build](https://img.shields.io/badge/Build-Passing-brightgreen?logo=github&logoColor=white)](#)
  [![Types](https://img.shields.io/badge/Types-Strict-brightgreen?logo=typescript&logoColor=white)](#)
</div>

---

## 1. The Problem
Learning Chinese through reading is highly effective, but current tools fall short:
- **PDF Translation Tools** often destroy the original layout or just paste raw translated text, removing the opportunity to *learn* the source language.
- **Generic GenAI (ChatGPT/Claude)** are great at translation but terrible at structured vocabulary building. They require constant prompt engineering and don't natively integrate with Flashcard/Spaced Repetition Systems (SRS).
- **Popup Dictionaries** (browser extensions) only work on web pages, fail miserably on PDF/scanned documents, and lack contextual awareness (word boundary detection in Chinese is notoriously hard).

**Hanora** solves this by providing a unified workspace where reading, contextual lookup, and vocabulary retention happen seamlessly.

## 2. Target Users
- **HSK 3 - HSK 6 Learners**: Intermediate to advanced learners who want to consume native Chinese materials (news, academic papers, books).
- **Domain Experts**: Professionals (Economics, IT, Education) who need to read specialized Chinese documents and require domain-specific terminology.

## 3. Core Workflow
The application is designed around a strictly enforced, 5-step high-retention loop:
1. **Read**: Upload any PDF/TXT document. Text layer is parsed and rendered preserving structure.
2. **Look up**: Highlight any word or sentence. The NLP engine detects word boundaries and provides definitions.
3. **Understand**: Contextual AI explains grammar patterns and nuances based on the specific sentence.
4. **Save**: One-click annotation saves the token, its pinyin, meaning, and exact contextual source sentence.
5. **Review**: The built-in SRS (Spaced Repetition System) automatically schedules flashcard reviews to guarantee long-term memory.

## 4. Architecture

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend [Frontend (React + Zustand Slices)]
        UI[React UI Components]
        Store[Zustand Slices]
        API[Local API Client]
        PDF[PDF.js Renderer]
    end

    %% Backend Layer
    subgraph Backend [Backend (FastAPI)]
        Router[API Routers]
        NLP[NLP Service / Jieba]
        Dict[Dictionary Service]
        DB[(SQLite Local DB)]
    end

    %% External
    subgraph External [External Services]
        LLM[Google Gemini API]
        FirebaseAuth[Firebase Authentication]
    end

    %% Connections
    UI <--> Store
    Store <--> API
    Store <--> PDF
    API <--> Router
    Router <--> NLP
    Router <--> Dict
    Router <--> DB
    NLP <--> LLM
    Store <--> FirebaseAuth
```

## 5. Tech Stack
- **Frontend**: React 19, Vite, TypeScript, TailwindCSS v4, Zustand (State Management), PDF.js (Document Rendering), Framer Motion (Animations).
- **Authentication**: Firebase Authentication (Google OAuth & Email/Password).
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Alembic (Migrations), Jieba (Chinese Tokenization).
- **Testing**: Vitest (Unit/Component), Playwright (End-to-End Testing).
- **Data**: SQLite local backend, CC-CEDICT (Dictionary).

## 6. Dictionary & NLP Pipeline
The application uses a hybrid approach to ensure speed and accuracy:
1. **Tokenization**: `Jieba` segments the Chinese sentence into tokens.
2. **Local Lookup (O(1))**: Tokens are mapped against the local CC-CEDICT database to instantly fetch literal dictionary meanings (English/Vietnamese) and Pinyin.
3. **Contextual Enrichment (Optional)**: For natural, fluent translations and grammar explanations, the selected text can be sent to the LLM (Gemini) after the local AI consent gate. Cloud AI sharing is off by default and must be explicitly enabled. If disabled or if the API key is not configured, the system gracefully falls back to the deterministic local dictionary literal translations.

## 7. Local-First Design
- **Why?** Language learners should be able to keep documents, annotations, flashcards, and dictionary data on their own machine.
- **How?** Core data is persisted in local SQLite via the FastAPI backend. The frontend hydrates state from backend APIs. localStorage is used only for lightweight preferences and client logs.
- **Network use:** Core reading, dictionary lookup, annotation, review, backup, and dashboard flows do not require cloud translation services after local dependencies and dictionary data are available. Contextual AI requires internet access and degrades to deterministic local NLP when disabled or unavailable.

## 8. Annotation & Review Model
- **PDF Span Mapping**: Instead of saving isolated words, Hanora saves the exact coordinate (bbox) and the full source sentence. This ensures flashcards always have the correct context.
- **Simple SRS**: Flashcards are scheduled using a lightweight Spaced Repetition algorithm (configurable intervals: 1m, 5m, 15m, 1d) optimized for short-to-medium term retention.
- **AI Consent & Budget**: `GET/PATCH /api/ai/consent` controls whether selected text, page context, or notes may be sent to Gemini. AI context is disabled by default until explicit opt-in. The backend orchestrator strictly enforces these checks.
- **Multiple AI Keys**: The system uses a GoogleKeyPool. Multiple keys are supported only for BYOK, environment separation, or legitimate fallback. Not intended for quota bypass.
- **AI Safety & Logging**: `GET /api/ai/budget` reports daily request/token budget and circuit-breaker status. The system features a daily AI request cap, token cap, per-user cost/budget logging, and a circuit breaker for error limits.

## 9. Data Sources & Licensing
- **CC-CEDICT**: Core dictionary data is sourced from CC-CEDICT (Creative Commons Attribution-Share Alike 3.0).
- **Hanora NLP**: Proprietary parsing and contextual mapping logic.

## 10. Environment Variables Setup (.env)
To run this project in a real environment (without mocks), you must configure the following API keys and settings.

### Frontend (`src/.env` or `.env` at root)
```env
VITE_API_BASE_URL=http://127.0.0.1:3001/api

# Firebase Authentication Config
VITE_FIREBASE_API_KEY="AIzaSy..."
VITE_FIREBASE_AUTH_DOMAIN="hanora-84d97.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="hanora-84d97"
VITE_FIREBASE_STORAGE_BUCKET="hanora-84d97.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="172303223494"
VITE_FIREBASE_APP_ID="1:172303223494:web:047092eb1a33bc144725c7"
```

### Backend (`backend/.env`)
```env
# Google Gemini API for AI Context Reading & Quiz Generation
GOOGLE_API_KEY="AIzaSy..."
```
- **Sample Documents**: Provided sample texts are for educational purposes.

## 10. Current Limitations
- **PDF Scans**: OCR is an **optional** feature and is currently experimental. Scanned PDFs without a valid text layer cannot be reliably highlighted out of the box. You will need external dependencies to enable OCR (see [docs/ocr_setup.md](docs/ocr_setup.md) for more details).
- **Mobile Support**: The reader interface is currently optimized for Desktop/Tablet. Mobile responsiveness is functional but not ideal for complex PDF rendering.
- **Sync Conflict Resolution**: Multi-device cloud sync is not implemented in MVP 0.1. Backup/restore is local and explicit.

## 11. Fresh Clone Gate
The repository is designed to run from a clean clone without hand-editing tracked files. Required tools: Node.js, Python 3.11+, and browser dependencies installed by Playwright when running E2E.

Fast path:

```bash
git clone https://github.com/Anduong1200/Lingua-Translate.git
cd Lingua-Translate
npm run setup
npm run dev
```

Platform-specific setup scripts are also available:

```bash
# Windows PowerShell
./setup.ps1

# Linux/macOS
./setup.sh
```

Manual path:

```bash
# 1. Clone
git clone https://github.com/Anduong1200/Lingua-Translate.git
cd Lingua-Translate

# 2. Local env
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Dependencies
npm install
python -m pip install -r backend/requirements.txt
npx playwright install chromium

# 4. Database schema
python -m alembic upgrade head

# 5. Reproducible data import
# Built-in bootstrap:
python backend/scripts/bootstrap_data.py
# Optional full Chinese-Vietnamese import:
python backend/scripts/import_trungviet_dict.py --stardict-dir path/to/TrungViet --hsk-dir path/to/hsk --phrase-dir path/to/phrase

# 6. Quality gates
npm run security:check
npm run test
npm run build
npm run e2e

# 7. Start frontend + backend
npm run dev
```

Release artifact:
```bash
npm run release:clean
# outputs the single clean source artifact:
# release/hanora-mvp-source.zip
```

## 12. Demo
Demo screenshots and video should be generated from the current build before public release.

## 13. Roadmap
- [ ] **Q3 2026**: Robust Client-side OCR for scanned PDFs using Tesseract.js.
- [ ] **Q3 2026**: Native mobile application (React Native) for on-the-go flashcard reviews.
- [ ] **Q4 2026**: Peer-to-peer vocabulary deck sharing and community translation upvoting.
- [ ] **Q4 2026**: Advanced SRS algorithm (FSRS integration).

## Kiến trúc (Architecture)
Chi tiết kiến trúc MVP và sơ đồ hệ thống xem tại: [docs/architecture.md](docs/architecture.md).
