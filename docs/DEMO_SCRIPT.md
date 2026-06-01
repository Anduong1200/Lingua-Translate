# Kịch bản Demo Video (Hanora Context Reader)

> **Mục đích:** Thể hiện rõ toàn bộ luồng sử dụng cốt lõi (Core Workflow) và chứng minh sự ổn định của hệ thống Offline-First, khả năng xử lý PDF, và AI Context.  
> **Thời lượng dự kiến:** 2 - 4 phút.  
> **Định dạng:** Quay toàn màn hình (1080p/4K). Mở sẵn DevTools (Network tab) trong một số cảnh để chứng minh tính năng offline/local cache.

---

## Cảnh 1: Khởi động & Upload Tài Liệu (0:00 - 0:30)

- **Thao tác màn hình:** 
  1. Mở app từ màn hình Landing Page, click "Bắt đầu ngay".
  2. Bỏ qua Onboarding (hoặc thao tác nhanh qua Onboarding nếu muốn khoe tính năng cài đặt HSK/Domain).
  3. Tại Dashboard, thực hiện thao tác kéo thả (Drag & Drop) một file PDF tiếng Trung chuyên ngành (Ví dụ: Báo cáo kinh tế hoặc Tài liệu IT).
- **Lời bình (Voiceover):** 
  > *"Xin chào, đây là Hanora Context Reader. Thay vì phải copy-paste văn bản sang các công cụ dịch thuật làm mất định dạng, Hanora cho phép bạn đọc trực tiếp tài liệu PDF tiếng Trung ngay trên trình duyệt."*

## Cảnh 2: Tra từ thông minh theo ngữ cảnh (0:30 - 1:15)

- **Thao tác màn hình:**
  1. Mở file PDF vừa upload. 
  2. Bôi đen một câu chứa thuật ngữ chuyên ngành (ví dụ: về kinh tế hoặc tin học).
  3. Bảng phân tích (Sidebar) bên phải lập tức hiện ra: Tách từ (Tokenization) chuẩn xác, Pinyin, và nghĩa tiếng Việt cơ bản từ local dictionary (tốc độ phản hồi tức thì 0ms).
  4. Chuyển qua tab "AI Chat / Google Context" để xem AI giải thích sắc thái ngữ pháp của câu vừa bôi đen.
- **Lời bình (Voiceover):**
  > *"Khi gặp một câu khó, mình chỉ cần bôi đen. Ngay lập tức, engine NLP tích hợp sẽ tách từ chính xác, cung cấp phiên âm Pinyin và nghĩa cơ bản nhờ bộ từ điển Offline. Đặc biệt, hệ thống AI Context sẽ giải thích cặn kẽ cấu trúc ngữ pháp và sắc thái của câu dựa trên ngữ cảnh chuyên ngành."*

## Cảnh 3: User Corrections (Chỉnh sửa nghĩa) (1:15 - 1:45)

- **Thao tác màn hình:**
  1. Click vào một từ vựng cụ thể trong bảng phân tích.
  2. Nghĩa tiếng Việt có sẵn chưa sát với ngữ cảnh (hoặc đang dùng English fallback).
  3. Nhập nghĩa tiếng Việt mới vào ô "Chỉnh sửa nghĩa" và nhấn Lưu (Save Correction).
  4. Hiển thị thông báo (Toast): *"Đã lưu nghĩa Việt ưu tiên"*.
- **Lời bình (Voiceover):**
  > *"Nếu từ điển cơ bản không có nghĩa chính xác cho thuật ngữ chuyên môn này, mình có thể tự cập nhật nghĩa. Bản ghi này được lưu lại cục bộ và ưu tiên hiển thị trong các lần tra cứu sau, giúp cá nhân hoá trải nghiệm học tập."*

## Cảnh 4: Lưu Annotation & Kiểm tra độ ổn định Offline (1:45 - 2:30)

- **Thao tác màn hình:**
  1. Bôi đen lại cụm từ quan trọng, nhấn nút Highlight/Save trên popup nổi.
  2. (Tuỳ chọn) Tắt mạng wifi hoặc bật chế độ Offline trong tab Network của DevTools.
  3. F5 (Reload) lại toàn bộ trang web.
  4. Mở lại file PDF: Đoạn highlight màu vàng **vẫn còn nguyên vị trí cũ** (chứng minh bbox mapping chuẩn xác).
- **Lời bình (Voiceover):**
  > *"Sau khi lưu từ vựng, tính năng highlight sẽ bám trực tiếp vào tọa độ (bbox) của PDF. Nhờ kiến trúc Offline-first và IndexedDB, ngay cả khi tải lại trang hoặc mất mạng, mọi ghi chú và dữ liệu của bạn vẫn được lưu giữ an toàn mà không bị mất đi."*

## Cảnh 5: Quản lý Ôn tập & Flashcards (2:30 - 3:30)

- **Thao tác màn hình:**
  1. Chuyển sang trang **Library (Từ vựng)** hoặc **Study Hub (Flashcards)**.
  2. Nhấn nút "Tạo Flashcard" (Add to review) cho từ vừa lưu.
  3. Chuyển sang chế độ lật thẻ (Flashcard review): Mặt trước là từ vựng, mặt sau có kèm **nguyên văn câu ví dụ (Context)** được rút trích trực tiếp từ PDF.
  4. Đánh giá độ khó (Easy/Good/Hard).
- **Lời bình (Voiceover):**
  > *"Từ vựng sau khi lưu sẽ được chuyển vào Study Hub. Điểm khác biệt của Hanora là flashcard tự động đính kèm câu văn gốc mà bạn đã đọc trong PDF. Việc ôn tập theo đúng ngữ cảnh thực tế kết hợp với thuật toán Spaced Repetition (SRS) sẽ giúp não bộ ghi nhớ sâu hơn gấp nhiều lần."*

## Cảnh 6: Dashboard Cập Nhật & Kết Thúc (3:30 - 4:00)

- **Thao tác màn hình:**
  1. Quay lại trang **Dashboard chính**.
  2. Trỏ chuột vào biểu đồ tiến độ học tập, số lượng từ đã tra cứu, số ngày liên tiếp (Streak) đã tăng lên.
  3. Cuộn màn hình nhẹ nhàng để khoe UI tổng quan, sau đó dừng lại.
- **Lời bình (Voiceover):**
  > *"Cuối cùng, mọi tiến độ học tập đều được thống kê trực quan tại Dashboard. Hanora không chỉ là một công cụ dịch thuật, mà là một quy trình học ngôn ngữ toàn diện. Cảm ơn các bạn đã theo dõi demo!"*
