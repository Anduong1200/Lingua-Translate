# License and Attribution

To ensure full commercial compliance and respect for open-source communities, Hanora acknowledges the following data sources and dependencies.

## 1. CC-CEDICT Dictionary
The core base dictionary used in Hanora for Chinese-to-English translation is derived from the **CC-CEDICT** project.
- **License:** Creative Commons Attribution-Share Alike 3.0 License (CC-BY-SA 3.0)
- **Source:** [mdbg.net/chinese/dictionary?page=cc-cedict](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)
- **In-repo raw path:** `data/raw/cedict/cedict_ts.u8`
- **Modifications:** The raw data has been parsed, indexed, and imported into Hanora's local SQLite-backed dictionary tables, then optionally enriched with Vietnamese definitions where matching local entries exist.

Any derivative datasets built explicitly on top of the base CC-CEDICT data by users (excluding proprietary domain packs created from scratch by Hanora) inherit this CC-BY-SA 3.0 license.

## 2. Proprietary Domain Packs
The premium dictionary packs (e.g., Economics Chinese-Vietnamese, Computer Science Pack, Grammar Pattern Pack) are proprietary assets created, curated, and maintained by Hanora.
- These packs are **NOT** derived from CC-CEDICT.
- They are protected under copyright and may not be extracted, reverse-engineered, or redistributed without explicit written permission from Hanora.

## 3. Community Chinese-Vietnamese And Phrase Data
Hanora includes raw import files for local-first dictionary bootstrap:

```text
data/raw/hsk/*.csv
data/raw/phrase/*.csv
data/raw/TrungViet/TrungViet/star_trungviet.*
```

These files are used to enrich Vietnamese meanings, HSK metadata, and phrase-level lookup. Upstream licensing/provenance can vary by source, so verify redistribution terms before packaging public/commercial data bundles outside this repository. See `docs/DATA_LICENSES.md` for the current data layout and developer responsibilities.

## 4. PDF Parsing And OCR
Hanora utilizes Mozilla's **PDF.js** to render documents natively in the browser.
- **License:** Apache License 2.0
- **Source:** [github.com/mozilla/pdf.js](https://github.com/mozilla/pdf.js)

Backend OCR uses Tesseract/Poppler-compatible tooling and Python wrappers listed in `backend/requirements.txt`. OCR output is stored only as local document/page text and rendered as an invisible selection mask; Hanora does not alter or redistribute user PDFs.

## 5. User Documents
Hanora acts purely as a local rendering and overlay engine. 
- Hanora does **not** redistribute, host, or claim any copyright over the PDF or TXT files that users load into the application.
- The responsibility for obtaining lawful access to copyrighted reading materials lies entirely with the end user.
