# Google AI Studio – Hướng Dẫn Dành Cho Developer

> Tài liệu này giải thích cách hệ thống API key xoay tua (round-robin) hoạt động trong backend. Đọc kỹ trước khi chạy backend hoặc debug liên quan đến AI.

## Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│  POST /api/nlp/analyze  { "ai_enabled": true }              │
│  POST /api/ai/context-reading                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                        │
│                                                             │
│  1. Phân tích NLP cục bộ (jieba + từ điển) → rule_based     │
│  2. Nếu AI enabled → gọi Google Gemini API                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │          GoogleApiKeyPool (round-robin)               │   │
│  │                                                       │   │
│  │  keys = [key_0, key_1, key_2, ...]                    │   │
│  │                                                       │   │
│  │  Lần gọi 1 → dùng key_0                              │   │
│  │  Lần gọi 2 → dùng key_1                              │   │
│  │  Lần gọi 3 → dùng key_2                              │   │
│  │  Lần gọi 4 → quay lại key_0  ← XOAY TUA             │   │
│  │                                                       │   │
│  │  Nếu key_1 bị lỗi (429/403) → tự động thử key_2     │   │
│  │  Nếu TẤT CẢ key lỗi → trả về "all_keys_failed"      │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
│  ⚠ Backend KHÔNG BAO GIỜ trả raw API key ra response.       │
│    Chỉ trả: key_index (số thứ tự) và key_fingerprint       │
│    (SHA-256 đầu 10 ký tự) để debug.                         │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│            Google AI Studio (Gemini API)                     │
│  https://generativelanguage.googleapis.com/v1beta            │
│  Model mặc định: gemini-3.5-flash                           │
└─────────────────────────────────────────────────────────────┘
```

## Cách Thêm API Key

Có **3 cách** để cung cấp API key cho backend, hệ thống sẽ gộp tất cả lại (dedup) thành một danh sách duy nhất:

### Cách 1: File `.env` (Khuyên dùng cho dev)

Tạo file `backend/.env` (đã bị .gitignore, an toàn):

```env
# Nhiều key cách nhau bằng dấu phẩy
GOOGLE_API_KEYS=AIzaSyA_key1_xxx,AIzaSyB_key2_yyy,AIzaSyC_key3_zzz

# Model và timeout
GOOGLE_AI_MODEL=gemini-3.5-flash
GOOGLE_AI_TIMEOUT_SECONDS=30
```

### Cách 2: Biến môi trường (Khuyên dùng cho server/CI)

```bash
# Linux / Server
export GOOGLE_API_KEYS="AIzaSyA_key1,AIzaSyB_key2,AIzaSyC_key3"

# Windows PowerShell
$env:GOOGLE_API_KEYS = "AIzaSyA_key1,AIzaSyB_key2,AIzaSyC_key3"
```

Backend nhận các biến: `GOOGLE_API_KEYS`, `GEMINI_API_KEYS`, `GOOGLE_API_KEY`, `GEMINI_API_KEY` — tất cả đều hợp lệ.

### Cách 3: File text (Backup / thêm key thủ công)

Tạo file `backend/data/google_api_keys.txt` — mỗi key một dòng:

```
# Key nhóm 1 (tài khoản A)
AIzaSyA_key1_xxx
AIzaSyB_key2_yyy

# Key nhóm 2 (tài khoản B)
AIzaSyC_key3_zzz
```

File này cũng bị .gitignore, không bao giờ commit lên repo.

## Cơ Chế Xoay Tua (Round-Robin) Chi Tiết

Xem class `GoogleApiKeyPool` trong `backend/main.py`:

```
Trạng thái pool:  _index = 0
Keys:             [key_A, key_B, key_C]

Request 1:  dùng key_A (index=0) → _index chuyển thành 1
Request 2:  dùng key_B (index=1) → _index chuyển thành 2
Request 3:  dùng key_C (index=2) → _index chuyển thành 0  ← QUAY LẠI ĐẦU
Request 4:  dùng key_A (index=0) → _index chuyển thành 1
...
```

### Khi Một Key Bị Lỗi (Quota / Rate Limit)

Hàm `generate_google_ai_context()` sẽ tự động thử key tiếp theo:

```
Keys: [key_A, key_B, key_C]

Request:
  → Thử key_A → HTTP 429 (rate limit) → ghi lỗi vào errors[]
  → Thử key_B → HTTP 200 OK → trả kết quả ✓
  
Key_A sẽ được "nghỉ" cho đến khi tua lại đến nó.
```

**Ngoại lệ:** Nếu lỗi là HTTP 400 (bad request — prompt sai, không phải lỗi key), hệ thống sẽ **dừng ngay**, không thử key tiếp theo vì prompt sai thì key nào cũng sẽ sai.

### Khi Tất Cả Key Đều Lỗi

Backend trả về JSON:

```json
{
  "enabled": true,
  "provider": "google_gemini",
  "model": "gemini-3.5-flash",
  "status": "all_keys_failed",
  "errors": [
    { "key_index": 0, "status_code": 429, "message": "Resource exhausted..." },
    { "key_index": 1, "status_code": 429, "message": "Resource exhausted..." },
    { "key_index": 2, "status_code": 403, "message": "API key expired..." }
  ]
}
```

→ Frontend vẫn hoạt động bình thường với kết quả NLP cục bộ. AI chỉ là lớp bổ sung.

## API Endpoints Liên Quan

| Endpoint | Mô tả |
|---|---|
| `GET /api/ai/status` | Kiểm tra trạng thái AI: số key, key tiếp theo, fingerprint |
| `POST /api/ai/context-reading` | Gọi AI trực tiếp (cần body JSON) |
| `POST /api/nlp/analyze` với `"ai_enabled": true` | NLP cục bộ + AI context nếu có key |
| `GET /api/health/deep` | Health check bao gồm AI status |

## Kiểm Tra Nhanh (Debug Commands)

```bash
# Kiểm tra key đã cấu hình chưa
curl http://127.0.0.1:3001/api/ai/status

# Kết quả mong đợi (key đã cấu hình):
# {
#   "enabled": true,
#   "provider": "google_gemini",
#   "model": "gemini-3.5-flash",
#   "configured_keys": 3,
#   "next_key_index": 0,
#   "key_fingerprints": ["a1b2c3d4e5", "f6g7h8i9j0", "k1l2m3n4o5"]
# }

# Kết quả khi CHƯA có key:
# { "enabled": false, ... }

# Test gọi AI thực tế
curl -X POST http://127.0.0.1:3001/api/nlp/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "由于市场需求下降", "ai_enabled": true}'
```

## Bảo Mật — KHÔNG ĐƯỢC LÀM

| ❌ Tuyệt đối không | ✅ Nên làm |
|---|---|
| Commit API key vào git | Đặt trong `backend/.env` hoặc biến môi trường |
| Paste key vào chat/Slack | Dùng fingerprint (`/api/ai/status`) để xác nhận key |
| Trả raw key trong API response | Backend chỉ trả `key_index` và `key_fingerprint` |
| Dùng 1 key duy nhất cho production | Tạo ít nhất 3 key từ các tài khoản Google khác nhau |

> ⚠ Nếu vô tình commit hoặc lộ key: Vào https://aistudio.google.com → Xóa key cũ → Tạo key mới → Cập nhật `backend/.env` → Restart backend.

## Tạo API Key Mới

1. Truy cập https://aistudio.google.com/apikey
2. Nhấn **Create API Key**
3. Chọn hoặc tạo Google Cloud Project
4. Copy key (dạng `AIzaSy...`)
5. Thêm vào `backend/.env` hoặc `backend/data/google_api_keys.txt`
6. Restart backend → Kiểm tra `GET /api/ai/status`

**Mẹo:** Mỗi tài khoản Google free có rate limit riêng. Để tối đa throughput, dùng key từ nhiều tài khoản Google khác nhau.
