# Hanora Support & Troubleshooting

If you encounter issues while using Hanora Context Reader, please check the following common solutions before filing a bug report.

## 1. Document Rendering Issues (PDFs)
- **Symptom:** PDF loads but text cannot be selected.
- **Cause:** The PDF is likely a scanned image without an OCR text layer.
- **Solution:** Hanora requires true text PDFs to function. You can use external tools like Adobe Acrobat or online OCR services to add a text layer to your PDF before importing it into Hanora.

## 2. Dictionary / Translation Missing
- **Symptom:** Highlighting a word shows no definition or "Chưa có nghĩa Việt".
- **Solution:** Hanora's base dictionary (CC-CEDICT) focuses on English. If you require advanced Vietnamese definitions, ensure your internet connection is active so the AI Context engine can provide a fallback. If you purchased a Premium Domain Pack, ensure it is activated in the **Store** tab.

## 3. Data Synchronization & Backup
- **Symptom:** I want to use Hanora on another computer without losing my flashcards.
- **Solution:** Go to **Settings > Backup / Restore local**. Click **Export JSON** to download your database. On the new computer, use the same menu to import the JSON file.

## 4. Critical Crashes (White Screen)
- **Symptom:** The app freezes or shows a blank white screen upon loading.
- **Cause:** The local SQLite database, uploaded document cache, or a browser setting might be corrupted.
- **Solution:** 
  1. Go to **Settings** (if accessible) and click **Factory Reset**.
  2. If the app cannot even load the Settings page, open your browser's Developer Tools (F12) -> Application Tab -> Storage -> click **Clear site data**. 
  *(Note: This will erase unsaved annotations. Always backup your data regularly).*

## 5. Contacting Support
If the above steps do not resolve your issue, please generate a Diagnostics Report:
1. Go to **Settings**.
2. Click **Export Diagnostics JSON**.
3. Send this file along with a description of your issue to `support@hanora.example.com` or use the "Báo lỗi" button in the navigation header.
