# Tùy chọn: Hướng dẫn cài đặt OCR (Nhận dạng văn bản từ ảnh)

Tính năng OCR (nhận dạng ký tự quang học) trên Hanora hiện tại đang là tính năng **Tùy chọn (Optional)** và ở giai đoạn thử nghiệm (Experimental). 

Hanora tập trung hỗ trợ các định dạng file có text layer rõ ràng (PDF text-based, DOCX, TXT). Đối với file PDF dạng scan (chỉ là tập hợp các hình ảnh) hoặc định dạng hình ảnh trực tiếp, hệ thống cần công cụ OCR bên ngoài để trích xuất văn bản.

## OCR không được bật mặc định vì:
1. Chi phí tài nguyên lớn (CPU/RAM).
2. Tốc độ nhận dạng tiếng Trung đôi khi chậm đối với cấu hình máy phổ thông.
3. Độ chính xác phụ thuộc rất nhiều vào chất lượng file scan.

## Các giải pháp OCR có thể dùng cùng Hanora

Nếu bạn cần đọc file PDF dạng scan, bạn có thể thực hiện OCR trước ở bên ngoài (ví dụ dùng Adobe Acrobat, Foxit Phantom, hoặc Tesseract OCR) để chuyển file scan thành PDF có text-layer, sau đó upload vào Hanora như một file bình thường.

### Dự định tích hợp (Roadmap)
Trong các bản cập nhật Q3/2026, Hanora có kế hoạch tích hợp `Tesseract.js` dạng module lazy-load.
- Module này sẽ chỉ tải về máy client khi người dùng yêu cầu bật OCR.
- Toàn bộ quá trình xử lý vẫn diễn ra hoàn toàn offline trên trình duyệt của bạn nhằm đảm bảo quyền riêng tư.

Hiện tại, vui lòng ưu tiên sử dụng các file PDF chuẩn (được xuất trực tiếp từ Word/LaTeX) hoặc file DOCX/TXT để đạt trải nghiệm tốt nhất trên Hanora Context Reader.
