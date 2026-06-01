# Privacy Policy

**Effective Date:** June 1, 2026

At Hanora, we believe that your language learning journey and the documents you read are fundamentally private. We designed our architecture around an "Offline-First" philosophy specifically to protect your data.

## 1. What Data We Collect
**Short answer:** Almost nothing.

Hanora is a local-first application. When you upload a PDF or TXT file into Hanora:
- The file is processed **locally** on your device using your browser's PDF engine (PDF.js).
- Your documents are **never** uploaded to our servers.
- Your flashcards, vocabulary lists, and reading progress are stored locally in your browser's IndexedDB and localStorage.

## 2. Telemetry and Diagnostics
We do not use stealth telemetry, tracking pixels, or third-party analytics (like Google Analytics) to monitor your clicks.

If you encounter a bug, you can voluntarily use the "Export Diagnostics" feature. This generates a local JSON file containing your OS version, App version, and crash logs. You have full control over whether to share this file with our support team. It will **never** contain the text of your personal PDF documents.

## 3. The "AI Context" Exception
To provide advanced grammar and context explanations, Hanora integrates with third-party Large Language Models (e.g., Google Gemini). 
- When you highlight a specific sentence and request an AI explanation, **only that specific sentence** is transmitted securely via our backend to the LLM provider.
- We do not send your entire document.
- We do not store these sentences on our servers after the request is completed.

## 4. Your Rights
Because your data lives on your device, you have absolute control. You can use the "Factory Reset" option in Settings at any time to permanently erase all Hanora data from your device.

## 5. Contact
For privacy inquiries, please contact privacy@hanora.example.com.
