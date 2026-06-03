import os
import cv2
import numpy as np
import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image
from io import BytesIO

tesseract_path = os.environ.get("TESSERACT_CMD", "tesseract")
pytesseract.pytesseract.tesseract_cmd = tesseract_path

def preprocess_for_ocr(pil_image):
    # Convert PIL image to OpenCV format (numpy array)
    # PIL uses RGB, OpenCV uses BGR
    img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    
    # 1. Grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Khử nhiễu (Denoising)
    denoised = cv2.medianBlur(gray, 3) 
    
    # 3. Nhị phân hóa (Binarization - Otsu's Thresholding)
    _, processed_img = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    return processed_img

def ocr_chinese_pdf_bytes(pdf_bytes: bytes) -> str:
    print("OCR: Đang chuyển đổi PDF thành hình ảnh...")
    
    # Poppler path can also be configured via env var if needed on Windows
    poppler_path = os.environ.get("POPPLER_PATH", None)
    
    # dpi=300 là mức tối thiểu khuyên dùng cho OCR chữ Hán
    pages = convert_from_bytes(pdf_bytes, dpi=300, poppler_path=poppler_path)
    
    page_texts: list[str] = []
    for i, page in enumerate(pages):
        print(f"OCR: Đang xử lý trang {i + 1}/{len(pages)}...")
        
        # Tiền xử lý ảnh bằng OpenCV
        final_image = preprocess_for_ocr(page)
        
        # Cấu hình Tesseract:
        # -l chi_sim: Dùng ngôn ngữ tiếng Trung giản thể
        # --oem 1: Sử dụng Neural Network (LSTM) engine
        # --psm 6: Giả định ảnh là một khối văn bản đồng nhất
        custom_config = r'-l chi_sim --oem 1 --psm 6'
        
        text = pytesseract.image_to_string(final_image, config=custom_config)
        page_texts.append(text.strip())
        
    return "\f".join(page_texts).strip()


def ocr_chinese_image_bytes(image_bytes: bytes) -> str:
    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    final_image = preprocess_for_ocr(image)
    custom_config = r'-l chi_sim --oem 1 --psm 6'
    return pytesseract.image_to_string(final_image, config=custom_config)
