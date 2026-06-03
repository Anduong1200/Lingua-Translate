# Hanora Data Provenance & Licenses

This document outlines the sources, licenses, and data provenance of the dictionaries and linguistic databases embedded within the Hanora MVP.

## 1. CC-CEDICT (Chinese-English Dictionary)
- **Source**: [MDBG CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict)
- **License**: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0).
- **Usage**: Used as the primary lookup dictionary for token definitions and Pinyin.
- **Modifications**: Parsed into SQLite for fast offline queries.

## 2. HSK Vocabulary List
- **Source**: Hanban / Confucius Institute Official HSK Guidelines (v2.0 / v3.0).
- **License**: Publicly available educational standard.
- **Usage**: Used for linguistic difficulty estimation (HSK 1-6) and sentence color-coding.

## 3. Vietnamese Dictionary (Han-Viet / Pinyin)
- **Source**: Compiled from open-source Stardict dictionaries and community data.
- **License**: GPL / Open Source community licenses.
- **Usage**: Provides offline quick meanings for Chinese tokens to Vietnamese.

## 4. NLP & Tokenization (Jieba)
- **Source**: [fxsjy/jieba](https://github.com/fxsjy/jieba)
- **License**: MIT License.
- **Usage**: Used for cutting Chinese sentences into individual words/tokens for analysis.

*Note: Hanora acts as an offline frontend/database for these linguistic resources. Users interacting with Hanora must adhere to the underlying licenses of these respective datasets, particularly when exporting or sharing flashcards.*
