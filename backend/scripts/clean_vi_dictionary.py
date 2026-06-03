import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'hanora.sqlite3')

def clean_vi_string(vi_raw: str) -> str:
    if not vi_raw:
        return ""
    
    # Split by ;;
    parts = [p.strip() for p in vi_raw.split(';;')]
    cleaned_parts = []
    
    for part in parts:
        # Remove {english} tags
        part = re.sub(r'\{.*?\}', '', part).strip()
        
        # Remove leading commas or spaces
        part = re.sub(r'^[,;\s]+', '', part)
        part = re.sub(r'[,;\s]+$', '', part)
        
        if not part:
            continue
            
        # Often StarDict dumps have very long explanations. We just want the first few concise synonyms.
        # Let's split by comma and take the first few
        sub_parts = [s.strip() for s in part.split(',')]
        
        # Filter out overly long sub-parts (often explanations with parenthesis like "(nghệ thuật)...")
        concise_sub_parts = []
        for s in sub_parts:
            # Remove content in parenthesis
            s_no_paren = re.sub(r'\(.*?\)', '', s).strip()
            if not s_no_paren:
                continue
            # If it's a short meaning (<= 4 words)
            if len(s_no_paren.split()) <= 4:
                concise_sub_parts.append(s_no_paren)
            else:
                # Truncate at the first long phrase
                break
                
        if concise_sub_parts:
            # Rejoin concise parts
            cleaned_parts.append(", ".join(concise_sub_parts))
    
    # Deduplicate and keep order
    seen = set()
    final_parts = []
    for p in cleaned_parts:
        if p not in seen:
            seen.add(p)
            final_parts.append(p)
            
    # If final_parts is empty but original wasn't, it means we stripped everything.
    # We might fallback to just returning nothing so we don't return garbage.
    if not final_parts:
        return ""
        
    return "; ".join(final_parts[:3]) # Limit to top 3 meanings to avoid spam

def clean_database():
    print(f"Connecting to {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute('SELECT id, vi FROM dictionary_entries WHERE vi IS NOT NULL AND vi != ""')
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} entries with Vietnamese definitions.")
    
    updates = []
    cleared_count = 0
    updated_count = 0
    
    for row_id, vi_raw in rows:
        cleaned = clean_vi_string(vi_raw)
        if cleaned != vi_raw:
            updates.append((cleaned, row_id))
            updated_count += 1
            if not cleaned:
                cleared_count += 1
                
    print(f"Updating {updated_count} rows ({cleared_count} cleared completely)...")
    
    cursor.executemany('UPDATE dictionary_entries SET vi = ? WHERE id = ?', updates)
    conn.commit()
    
    print("Done!")
    
    # Show examples
    cursor.execute('SELECT simplified, vi, en FROM dictionary_entries WHERE simplified IN ("处理", "数据", "系统")')
    for row in cursor.fetchall():
        print(f"{row[0]}: {row[1]} (en: {row[2]})")
        
    cursor.close()
    conn.close()

if __name__ == '__main__':
    clean_database()
