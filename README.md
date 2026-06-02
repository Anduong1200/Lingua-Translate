<div align="center">
  <h1>Hanora Context Reader</h1>
  <p><strong>A Dictionary-backed, Local-first Chinese Reading Assistant tailored for Vietnamese learners.</strong></p>

  [![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](#)
  [![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](#)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)](#)
  [![Playwright](https://img.shields.io/badge/Tested_with-Playwright-2EAD33?logo=playwright&logoColor=white)](#)
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
    subgraph Frontend [Frontend (React + Zustand)]
        UI[React UI Components]
        Store[Zustand View State]
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
```

## 5. Tech Stack
- **Frontend**: React 19, Vite, TypeScript, TailwindCSS, Zustand (State Management), PDF.js (Document Rendering), Framer Motion (Animations).
- **Backend**: Python 3.11, FastAPI, SQLAlchemy, Alembic (Migrations), Jieba (Chinese Tokenization).
- **Testing**: Vitest (Unit/Component), Playwright (End-to-End Testing).
- **Data**: SQLite local backend, CC-CEDICT (Dictionary).

## 6. Dictionary & NLP Pipeline
The application uses a hybrid approach to ensure speed and accuracy:
1. **Tokenization**: `Jieba` segments the Chinese sentence into tokens.
2. **Local Lookup (O(1))**: Tokens are mapped against the local CC-CEDICT database to instantly fetch basic English/Vietnamese meanings and Pinyin.
3. **Contextual Enrichment**: For complex sentences or user requests, the selected text can be sent to the LLM (Gemini) after the local AI consent gate. Cloud AI sharing is off by default and must be explicitly enabled.

## 7. Local-First Design
- **Why?** Language learners should be able to keep documents, annotations, flashcards, and dictionary data on their own machine.
- **How?** SQLite through the local FastAPI backend is the source of truth. The React/Zustand frontend is hydrated from backend APIs and only keeps view/cache state. `localStorage` is limited to client-side logs and lightweight preferences.
- **Network use:** Core reading, dictionary lookup, annotation, review, backup, and dashboard flows do not require cloud translation services after local dependencies and dictionary data are available. Contextual AI requires internet access and degrades to deterministic local NLP when disabled or unavailable.
- **Not implemented yet:** Browser-only IndexedDB sync queues and multi-device cloud sync are outside MVP 0.1.

## 8. Annotation & Review Model
- **PDF Span Mapping**: Instead of saving isolated words, Hanora saves the exact coordinate (bbox) and the full source sentence. This ensures flashcards always have the correct context.
- **Simple SRS**: Flashcards are scheduled using a lightweight Spaced Repetition algorithm (configurable intervals: 1m, 5m, 15m, 1d) optimized for short-to-medium term retention.
- **User Corrections**: Users can override definitions. These corrections are saved and prioritized for future lookups within the same domain.
- **AI Consent & Budget**: `GET/PATCH /api/ai/consent` controls whether selected text, page context, or notes may be sent to Gemini. The default blocks all AI context sharing until the user opts in. `GET /api/ai/budget` reports daily request/token budget and circuit-breaker status.

## 9. Data Sources & Licensing
- **CC-CEDICT**: Core dictionary data is sourced from CC-CEDICT (Creative Commons Attribution-Share Alike 3.0).
- **Hanora NLP**: Proprietary parsing and contextual mapping logic.
- **Sample Documents**: Provided sample texts are for educational purposes.

## 10. Current Limitations
- **PDF Scans**: OCR is currently experimental. Scanned PDFs without a valid text layer cannot be reliably highlighted.
- **Mobile Support**: The reader interface is currently optimized for Desktop/Tablet. Mobile responsiveness is functional but not ideal for complex PDF rendering.
- **Sync Conflict Resolution**: Multi-device cloud sync is not implemented in MVP 0.1. Backup/restore is local and explicit.

## 11. Fresh Clone Gate
The repository is designed to run from a clean clone without hand-editing tracked files. Required tools: Node.js, Python 3.11+, and browser dependencies installed by Playwright when running E2E.

```bash
# 1. Clone
git clone https://github.com/Anduong1200/Lingua-Translate.git
cd Lingua-Translate

# 2. Local env
cp .env.example .env

# 3. Dependencies
npm install
pip install -r backend/requirements.txt

# 4. Database schema
alembic upgrade head

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
