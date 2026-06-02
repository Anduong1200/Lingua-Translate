# Hanora Context Reader: Technical Case Study

This document details the core architectural decisions and product trade-offs made during the development of Hanora.

## 1. Why Not Build a "Standard" PDF Translator?
Most PDF translation tools (like Google Translate PDF or DeepL) extract all text, translate it in bulk, and overwrite the original document. 
**The Problem:**
- **Context Loss for Learners:** Language learners *want* to see the original language. Overwriting it defeats the purpose of reading practice.
- **Layout Destruction:** PDF text extraction is notoriously inaccurate. Re-injecting translated text often destroys the document's visual layout (columns, tables, image captions).
**The Hanora Solution:**
Hanora acts as an *overlay* rather than a *converter*. It renders the original PDF intact using `PDF.js` and provides an invisible, interactive text layer on top. Translations are localized to the user's specific selection, preserving the document's structural integrity and maximizing educational value.

## 2. Why Use Dictionary-Backed Explanations (Instead of 100% GenAI)?
With the advent of powerful LLMs, it is tempting to pass every user selection to an API prompt like `"Translate this Chinese text to Vietnamese and explain the grammar"`.
**The Problem:**
- **Latency:** API calls take 1-3 seconds. For a reading tool where users look up dozens of words per minute, this latency is unacceptable.
- **Cost:** High token volume leads to massive API costs.
- **Inconsistency:** LLMs hallucinate base definitions or provide different formatting for the same word.
**The Hanora Solution (Hybrid Pipeline):**
- **O(1) Local Lookup:** Every word selection is first tokenized by `Jieba` and queried against local SQLite-backed dictionary tables. This provides deterministic definitions without relying on cloud translation.
- **LLM as a Fallback/Enhancement:** The LLM is strictly reserved for *Context Explanations* (disambiguating meaning based on the surrounding sentence) or when local dictionary coverage fails.

## 3. Why Local-First?
Language learning is a continuous habit, and reading history should remain under the user's control.
**Implementation:**
- The dictionary, documents, annotations, review items, and user corrections live in the local FastAPI backend's SQLite database.
- The React frontend hydrates Zustand state from backend APIs on startup. Browser `localStorage` is reserved for lightweight preferences and diagnostics logs.
**Trade-off:**
This requires the local backend to be running, but it keeps MVP storage simple, inspectable, and reproducible. Browser-only IndexedDB sync queues are intentionally out of scope for MVP 0.1.

## 4. The Necessity of Mapping Annotations to PDF Spans
When a user highlights a word to save as a flashcard, we don't just save the string `"经济" (Economy)`.
**The Problem:**
Chinese words are highly polysemous (multiple meanings). Memorizing a word out of context is inefficient.
**The Hanora Solution:**
Annotations are tightly coupled to the PDF's internal coordinate system (`bbox`). When saving a word, Hanora records:
1. The token itself (`surface`, `pinyin`).
2. The exact paragraph/sentence (`source_sentence`) where it was found.
3. The page number and bounding box coordinates.
**Result:** When reviewing flashcards, users see the exact sentence they were reading, dramatically increasing recall rates. If they forget the context, they can click a button to jump straight back to the exact coordinate in the PDF.

## 5. Handling User Corrections (Crowdsourcing Pipeline)
Dictionaries are static, but language is dynamic. When a user finds an inaccurate translation and overrides it with their own meaning (`meaningOverride`), this data isn't discarded.
**The Pipeline:**
- Corrections are saved in local SQLite with high priority.
- Review scheduling is handled by the backend review scheduler.
- Over time, these corrections can be aggregated (crowdsourced) to improve the global dictionary, specifically addressing domain-specific jargon (e.g., IT or Economics terms not found in CC-CEDICT).

## 6. Increasing Vietnamese Coverage
CC-CEDICT is primarily Chinese-to-English.
**The Strategy:**
- We implement a programmatic fallback mechanism. If a `vi` (Vietnamese) definition is missing, we display the `en` (English) definition alongside a clear UI warning: *"Chưa có nghĩa Việt đáng tin. Hiển thị English fallback."*
- We utilize the LLM context engine to generate high-quality Vietnamese definitions on-the-fly when requested, and cache these results locally to gradually build a proprietary `zh-vi` dataset.

## 7. Security & Release Hygiene
A critical aspect of Portfolio Readiness is demonstrating operational maturity.
- **No Secrets in Repo:** All API keys (e.g., Gemini LLM keys) are strictly managed via `.env` files which are included in `.gitignore`.
- **Environment Validation:** The backend uses `pydantic-settings` to fail fast during startup if required environment variables are missing.
- **Clean Build Artifacts:** The build process (`npm run build`) produces a pristine `dist` folder. The `setup` scripts ensure no `node_modules` or `.env` files are accidentally committed.
- **Vite Configuration:** Environment variables passed to the frontend are strictly prefixed with `VITE_` to prevent accidental exposure of backend secrets.
