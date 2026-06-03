# Hanora Data Provenance & Licenses

This document outlines the sources, licenses, and data provenance of the dictionaries and linguistic databases embedded within the Hanora MVP.

## Release Data Layout

The release source tree includes raw import data under:

```text
data/raw/cedict/cedict_ts.u8
data/raw/hsk/*.csv
data/raw/phrase/*.csv
data/raw/TrungViet/TrungViet/star_trungviet.*
```

These files are required for reproducible dictionary bootstrap on another developer machine. Do not move them back to a local-only directory such as `D:\exe\des` or `D:\exe\...`.

The StarDict binary payloads are protected by `.gitattributes`:

```text
data/raw/TrungViet/**/*.dict binary
data/raw/TrungViet/**/*.idx binary
```

This prevents Git line-ending normalization from corrupting dictionary files.

## 1. CC-CEDICT (Chinese-English Dictionary)
- **Source**: [MDBG CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)
- **License**: Creative Commons Attribution-ShareAlike. Check the current CC-CEDICT distribution terms before public redistribution.
- **Usage**: Used as the primary lookup dictionary for token definitions and Pinyin.
- **In-repo raw path**: `data/raw/cedict/cedict_ts.u8`
- **Modifications**: Parsed into SQLite for fast offline queries and enriched with Vietnamese definitions when matching entries exist.

## 2. HSK Vocabulary List
- **Source**: HSK CSV word lists currently stored in the repository.
- **License**: Treat as educational reference material; verify provenance before commercial redistribution.
- **In-repo raw path**: `data/raw/hsk/*.csv`
- **Usage**: Used for HSK metadata, difficulty estimation, vocabulary import, and learning UI labels.

## 3. Trung-Việt StarDict Data
- **Source**: Community StarDict-style Trung-Việt dictionary files currently stored in the repository.
- **License**: Community/open-source dictionary terms may vary. Verify the upstream source and redistribution terms before external release.
- **In-repo raw path**: `data/raw/TrungViet/TrungViet/star_trungviet.*`
- **Usage**: Enriches CC-CEDICT/HSK entries with Vietnamese meanings and provides better local dictionary fallback.

## 4. Phrase Lists
- **Source**: Chinese phrase CSV files currently stored in the repository.
- **License**: Verify source terms before commercial redistribution.
- **In-repo raw path**: `data/raw/phrase/*.csv`
- **Usage**: Imports phrase-level dictionary entries so sentence/context lookup can resolve multi-character chunks, not only single tokens.

## 5. NLP & Tokenization (Jieba)
- **Source**: [fxsjy/jieba](https://github.com/fxsjy/jieba)
- **License**: MIT License.
- **Usage**: Used for cutting Chinese sentences into individual words/tokens for analysis.

## Developer Responsibilities

Before pushing release branches:

```bash
git status --short
git check-attr -a -- data/raw/TrungViet/TrungViet/star_trungviet.dict data/raw/TrungViet/TrungViet/star_trungviet.idx
python backend/scripts/bootstrap_data.py
npm run security:check
```

Do not rely on `backend/data/hanora.sqlite3` as the only copy of translation data. The reproducible source is `data/raw/` plus the importer scripts.

*Note: Hanora acts as an offline frontend/database for these linguistic resources. Users interacting with Hanora must adhere to the underlying licenses of these respective datasets, particularly when exporting or sharing flashcards.*
