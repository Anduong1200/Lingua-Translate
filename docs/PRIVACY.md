# Privacy Policy

**Effective Date:** June 1, 2026

At Hanora, we believe that your language learning journey and the documents you read are fundamentally private. We designed our architecture around a local-first philosophy specifically to protect your data.

## 1. What Data We Collect
**Short answer:** Almost nothing.

Hanora is a local-first application. When you upload a PDF or TXT file into Hanora:
- The file is processed **locally** on your device using your browser's PDF engine (PDF.js).
- Your documents are stored in the local FastAPI backend and SQLite database on your machine.
- Your flashcards, vocabulary lists, annotations, and reading progress are stored in local SQLite. Browser `localStorage` is limited to lightweight preferences and client-side logs.
- Hanora does not provide cloud sync in MVP 0.1.

## 2. Telemetry and Diagnostics
We do not use stealth telemetry, tracking pixels, or third-party analytics (like Google Analytics) to monitor your clicks.

If you encounter a bug, you can voluntarily use the "Export Diagnostics" feature. This generates a local JSON file containing your OS version, App version, and crash logs. You have full control over whether to share this file with our support team. It will **never** contain the text of your personal PDF documents.

## 3. The "AI Context" Exception
To provide advanced grammar and context explanations, Hanora integrates with third-party Large Language Models (e.g., Google Gemini). 
- AI context reading is gated by local consent settings (`/api/ai/consent`).
- By default, Hanora sends nothing to Gemini. Selected text, paragraph/page context, and personal notes are sent only after the relevant local consent switches are enabled.
- We do not send your entire document.
- The backend stores only request metadata for debugging/rate-limit accounting, not raw API keys.

## 4. Your Rights
Because your data lives on your device, you have control through local backup, restore, and reset tools. Use Settings > Backup / Restore local before clearing browser cache or replacing the SQLite database.

## 5. Contact
For privacy inquiries, please contact privacy@hanora.example.com.
