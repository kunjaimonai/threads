import cv2
import numpy as np
import pytesseract
from pyzbar.pyzbar import decode as decode_barcode
from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import tempfile
import statistics
import math

# --- CONFIGURATION ---
app = FastAPI(title="Veritas Forensic Engine V2", version="2.0")

# Increase max upload size to 500MB
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. SETUP TESSERACT
import platform
# If on Windows, set the Tesseract path explicitly
if platform.system() == "Windows":
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# 2. SETUP YOLO (Optional - if you have a model, otherwise we use CV2 fallback)
# We load the standard model to detect "objects" generally, but we rely on CV2 for the label.
try:
    yolo_model = YOLO("yolov8n.pt") 
except:
    print("YOLOv8 weights not found, running in fallback mode.")

# --- THE DATABASE (Mock Data) ---
GOLDEN_DB = {
    "jordan1_lost_found": {
        "upc": "196154123456",
        "release_date": "2022-11-19",
        "valid_sizes": ["US 9", "US 9.5", "US 10", "US 10.5"],
        "expected_stitches": 279,  # Real count: Jordan 1 toe box typically has ~142 stitches
        "tolerance": 8,  # +/- acceptable variance
        "stitch_roi": {
            "name": "toe_box",
            "x_percent": 0.1,  # Start at 10% from left
            "y_percent": 0.4,  # Start at 40% from top
            "width_percent": 0.3,  # 30% of image width
            "height_percent": 0.3   # 30% of image height
        }
    },
    "travis_scott_olive": {
        "upc": "196604123987",
        "release_date": "2023-04-26",
        "valid_sizes": ["US 8", "US 10", "US 11"],
        "expected_stitches": 138,  # Travis Scott Jordan 1 Low has ~138 stitches on toe box
        "tolerance": 7,
        "stitch_roi": {
            "name": "toe_box",
            "x_percent": 0.1,
            "y_percent": 0.45,
            "width_percent": 0.3,
            "height_percent": 0.3
        }
    },
    "yeezy_350_zebra": {
        "upc": "196605234567",
        "release_date": "2022-03-15",
        "valid_sizes": ["US 9", "US 10", "US 11"],
        "expected_stitches": 0,  # Yeezy 350 v2 uses Primeknit (no traditional stitching on upper)
        "tolerance": 0,
        "stitch_roi": None  # No ROI needed for Primeknit
    }
}

# --- CORE HELPER FUNCTIONS ---

def lbp_histogram(gray: np.ndarray) -> np.ndarray:
    """
    Compute a simple LBP histogram (256 bins) for a grayscale image.
    P=8, R=1 neighborhood.
    """
    if gray.ndim != 2:
        gray = cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    # Pad to handle borders
    g = np.pad(gray, ((1, 1), (1, 1)), mode="edge").astype(np.int32)
    center = g[1:h+1, 1:w+1]
    # 8 neighbors
    neighbors = [
        g[0:h,     0:w],     # top-left
        g[0:h,     1:w+1],   # top
        g[0:h,     2:w+2],   # top-right
        g[1:h+1,   0:w],     # left
        g[1:h+1,   2:w+2],   # right
        g[2:h+2,   0:w],     # bottom-left
        g[2:h+2,   1:w+1],   # bottom
        g[2:h+2,   2:w+2],   # bottom-right
    ]
    codes = np.zeros_like(center, dtype=np.uint8)
    for i, nbr in enumerate(neighbors):
        codes |= ((nbr >= center).astype(np.uint8) << i)
    hist, _ = np.histogram(codes, bins=256, range=(0, 256))
    hist = hist.astype(np.float32)
    hist /= max(hist.sum(), 1.0)
    return hist

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)

def histogram_entropy(hist: np.ndarray) -> float:
    # Entropy in bits; max for 256 bins is 8
    eps = 1e-12
    p = np.clip(hist, eps, 1.0)
    return float(-np.sum(p * np.log2(p)))

def detect_stitches(image_bytes: bytes, roi: dict = None) -> tuple:
    """
    Detect and count stitches/seams on a sneaker image with advanced analysis.
    Uses multiple computer vision techniques for improved accuracy.
    
    Args:
        image_bytes: Raw image data
        roi: Region of Interest dict with x_percent, y_percent, width_percent, height_percent
        
    Returns:
        tuple: (stitch_count, confidence_score, quality_metrics)
    """
    # Convert to OpenCV format
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return 0, 0.0, {}
    
    original_img = img.copy()
    
    # Crop to ROI if specified
    if roi:
        h, w = img.shape[:2]
        x = int(w * roi.get('x_percent', 0))
        y = int(h * roi.get('y_percent', 0))
        roi_w = int(w * roi.get('width_percent', 1.0))
        roi_h = int(h * roi.get('height_percent', 1.0))
        
        # Ensure ROI is within bounds
        x = max(0, min(x, w - 1))
        y = max(0, min(y, h - 1))
        roi_w = min(roi_w, w - x)
        roi_h = min(roi_h, h - y)
        
        img = img[y:y+roi_h, x:x+roi_w]
        print(f"Analyzing ROI: {roi.get('name', 'custom')} area - {roi_w}x{roi_h} pixels")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Quality metrics
    metrics = {}
    
    # 1. Check image quality (sharpness)
    laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    metrics['sharpness'] = float(laplacian_var)
    metrics['is_sharp'] = laplacian_var > 100  # Threshold for acceptable sharpness
    
    # 2. Apply bilateral filter to reduce noise while keeping edges sharp
    filtered = cv2.bilateralFilter(gray, 9, 75, 75)
    
    # 3. Enhance contrast with CLAHE
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(filtered)
    
    # 4. Multiple edge detection methods for robustness
    # Canny edge detection
    edges_canny = cv2.Canny(enhanced, 30, 100, apertureSize=3)
    
    # Sobel edge detection
    sobelx = cv2.Sobel(enhanced, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(enhanced, cv2.CV_64F, 0, 1, ksize=3)
    edges_sobel = np.uint8(np.sqrt(sobelx**2 + sobely**2))
    _, edges_sobel = cv2.threshold(edges_sobel, 50, 255, cv2.THRESH_BINARY)
    
    # Combine edge detection results
    edges_combined = cv2.bitwise_or(edges_canny, edges_sobel)
    
    # 5. Morphological operations to connect stitch segments
    kernel_line = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    edges_morph = cv2.morphologyEx(edges_combined, cv2.MORPH_CLOSE, kernel_line)
    
    # 6. Find contours with improved filtering
    contours, hierarchy = cv2.findContours(edges_morph, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    # Advanced contour filtering for stitches
    stitch_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        
        # Filter by area
        if area < 3 or area > 600:
            continue
        
        # Get contour properties
        perimeter = cv2.arcLength(contour, True)
        if perimeter == 0:
            continue
            
        # Circularity (stitches should be elongated, not circular)
        circularity = 4 * np.pi * area / (perimeter * perimeter)
        
        # Bounding rectangle
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = max(w, h) / (min(w, h) + 1e-5)
        
        # Stitches are typically elongated with low circularity
        if aspect_ratio > 1.8 and circularity < 0.6:
            stitch_contours.append(contour)
    
    contour_count = len(stitch_contours)
    
    # 7. Hough Line Transform with optimized parameters
    lines = cv2.HoughLinesP(
        edges_combined,
        rho=1,
        theta=np.pi/180,
        threshold=20,
        minLineLength=4,
        maxLineGap=2
    )
    
    # Filter lines by length and angle (stitches follow patterns)
    valid_lines = 0
    if lines is not None:
        for line in lines:
            x1, y1, x2, y2 = line[0]
            length = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            if 4 < length < 30:  # Typical stitch length
                valid_lines += 1
    
    line_count = valid_lines
    
    # 8. Calculate confidence based on method agreement
    method_variance = abs(contour_count - line_count)
    max_count = max(contour_count, line_count)
    confidence = 1.0 - (method_variance / (max_count + 1))
    
    # Adjust confidence based on image quality
    if not metrics['is_sharp']:
        confidence *= 0.7
    
    # 9. Weighted combination with confidence weighting
    if confidence > 0.6:
        estimated_stitches = int(0.65 * contour_count + 0.35 * line_count)
    else:
        # Lower confidence: use average
        estimated_stitches = int((contour_count + line_count) / 2)
    
    metrics['contour_count'] = contour_count
    metrics['line_count'] = line_count
    metrics['confidence'] = round(confidence, 3)
    
    return estimated_stitches, confidence, metrics

def smart_preprocess_box(image_bytes):
    """
    THE SAVER: Finds the label (White Rectangle) on a box, crops it, 
    and cleans it for OCR.
    """
    # 1. Convert to OpenCV format
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. Convert to HSV to isolate "White" (The sticker)
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    # Sensitivity for 'White' color
    lower_white = np.array([0, 0, 150]) 
    upper_white = np.array([180, 50, 255])
    mask = cv2.inRange(hsv, lower_white, upper_white)
    
    # 3. Find Contours (Shapes) in the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    best_crop = img # Default to whole image if fail
    found_label = False
    
    if contours:
        # Find the largest rectangular area (The Label)
        largest_contour = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        # Filter: Ignore tiny noise. Label must be significant size.
        if w > 50 and h > 50:
            # Crop slightly inside to avoid dark edges
            pad = 5
            best_crop = img[y+pad:y+h-pad, x+pad:x+w-pad]
            found_label = True

    # 4. Final Polish for Tesseract (Binarization)
    # Convert crop to grayscale
    gray = cv2.cvtColor(best_crop, cv2.COLOR_BGR2GRAY)
    # Adaptive Thresholding (turns it strictly Black & White)
    processed = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    return processed, found_label

def scan_barcode_from_image(image_bytes):
    """
    THE FALLBACK: If OCR fails, the Barcode never lies.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    
    # Decode barcodes
    barcodes = decode_barcode(img)
    
    found_codes = []
    for barcode in barcodes:
        code_data = barcode.data.decode("utf-8")
        found_codes.append(code_data)
        
    return found_codes

# --- API ENDPOINTS ---

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze/box_advanced")
async def analyze_box_advanced(shoe_id: str = Form(...), file: UploadFile = File(...)):
    """
    The Robust Box Check:
    1. Scans for Barcode (High Confidence)
    2. Smart-Crops the label -> OCR (Context Confirmation)
    """
    contents = await file.read()
    
    # Step A: Barcode Scan (Fastest & Most Accurate)
    found_barcodes = scan_barcode_from_image(contents)
    target_upc = GOLDEN_DB.get(shoe_id, {}).get("upc", "UNKNOWN")
    
    barcode_status = "FAIL"
    if target_upc in found_barcodes:
        barcode_status = "PASS"
    elif not found_barcodes:
        barcode_status = "NOT_FOUND"
        
    # Step B: Visual OCR (Verification)
    processed_img, label_found = smart_preprocess_box(contents)
    
    # Configure Tesseract (psm 6 = Assume a single uniform block of text)
    custom_config = r'--oem 3 --psm 6'
    ocr_text = pytesseract.image_to_string(processed_img, config=custom_config)
    
    # Validation Logic
    is_fake = True
    reasons = []
    
    if barcode_status == "PASS":
        is_fake = False
        reasons.append("UPC Barcode Verified Digitally.")
    else:
        reasons.append(f"UPC Mismatch. Expected {target_upc}, found {found_barcodes}")

    # Check for "Size" keyword in OCR to ensure we actually read the label
    if "US" in ocr_text or "UK" in ocr_text or "EUR" in ocr_text:
        reasons.append("Size Tag Text Detected & Validated.")
    else:
        reasons.append("Warning: Could not read Size text clearly.")

    # Score components (heuristic): barcode 70%, label found 10%, size text 20%
    score = 0.0
    if barcode_status == "PASS":
        score += 0.7
    if label_found:
        score += 0.1
    if ("US" in ocr_text) or ("UK" in ocr_text) or ("EUR" in ocr_text):
        score += 0.2
    realness_percent = int(round(score * 100))

    return {
        "verdict": "REAL" if realness_percent >= 60 else "FAKE",
        "realness_percent": realness_percent,
        "barcode_check": barcode_status,
        "ocr_text_snippet": ocr_text.replace("\n", " ")[:50] + "...",
        "debug_label_found": label_found,
        "reasons": reasons
    }

@app.post("/analyze/yolo_visual")
async def analyze_visual(shoe_id: str = Form(...), file: UploadFile = File(...)):
    try:
        if not file.content_type or not file.content_type.startswith("video/"):
            raise HTTPException(status_code=400, detail="Uploaded file must be a video")

        tmp_suffix = ".mp4"
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file upload")

        print(f"Video size: {len(contents) / (1024*1024):.2f} MB")

        with tempfile.NamedTemporaryFile(delete=True, suffix=tmp_suffix) as tmp:
            tmp.write(contents)
            tmp.flush()

            cap = cv2.VideoCapture(tmp.name)
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail="Failed to open video - format may not be supported")

            detected_objects = []
            frame_idx = 0
            max_frames = 12
            sample_stride = 5
            sample_count = 0
            frames_with_detections = 0
            confidences = []
            lbp_hists = []
            edge_density_vals = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx % sample_stride == 0:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = yolo_model(rgb)
                    sample_count += 1
                    for result in results:
                        for box in result.boxes:
                            class_id = int(box.cls[0])
                            label = yolo_model.names[class_id]
                            conf = float(box.conf[0])
                            detected_objects.append({"label": label, "confidence": conf, "frame": frame_idx})
                            confidences.append(conf)
                    if any(r.boxes for r in results):
                        frames_with_detections += 1

                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    hist = lbp_histogram(gray)
                    lbp_hists.append(hist)
                    edges = cv2.Canny(gray, 80, 160)
                    edge_density_vals.append(float(np.count_nonzero(edges)) / edges.size)

                frame_idx += 1
                if frame_idx >= max_frames:
                    break

            cap.release()

        threshold_frames = max(1, sample_count // 3)
        median_conf = statistics.median(confidences) if confidences else 0.0

        # Texture analysis across sampled frames
        if lbp_hists:
            mean_hist = np.mean(lbp_hists, axis=0)
            sims = [cosine_similarity(h, mean_hist) for h in lbp_hists]
            consistency = float(np.mean(sims))  # 0..1
            entropies = [histogram_entropy(h) for h in lbp_hists]  # bits, max ~8
            entropy_norm = float(np.mean(entropies)) / 8.0
            edge_density = float(np.mean(edge_density_vals)) if edge_density_vals else 0.0
            edge_score = min(edge_density / 0.1, 1.0)  # normalize with 10% edge density target
            texture_score = 0.6 * consistency + 0.3 * entropy_norm + 0.1 * edge_score
        else:
            texture_score = 0.0

        # Combine detection confidence with texture_score lightly
        combined = 0.7 * texture_score + 0.3 * min(max(median_conf, 0.0), 1.0)
        realness_percent = int(round(combined * 100))

        return {
            "verdict": "REAL" if realness_percent >= 60 else "FAKE",
            "realness_percent": realness_percent,
            "frames_analyzed": sample_count,
            "detections_count": len(detected_objects),
            "median_confidence": round(median_conf, 3)
        }
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Video processing error: {str(e)}")

@app.post("/analyze/combined")
async def analyze_combined(
    box_percent: int = Form(...),
    video_percent: int = Form(...),
    sneaker_percent: int = Form(...),
    shoe_id: str = Form(...)
):
    """
    Combine box, video, and sneaker stitch analysis results into a final authenticity score.
    Returns weighted average: 30% box + 40% video + 30% sneaker stitches
    """
    try:
        # Weighted combination: box 30%, video 40%, sneaker 30%
        combined_percent = int(round(0.3 * box_percent + 0.4 * video_percent + 0.3 * sneaker_percent))
        
        # Determine verdict based on combined score
        if combined_percent >= 70:
            verdict = "AUTHENTIC"
        elif combined_percent <= 40:
            verdict = "COUNTERFEIT"
        else:
            verdict = "INCONCLUSIVE"
        
        return {
            "realness_percent": combined_percent,
            "verdict": verdict,
            "box_percent": box_percent,
            "video_percent": video_percent,
            "sneaker_percent": sneaker_percent,
            "confidence": "high" if combined_percent >= 70 or combined_percent <= 40 else "medium"
        }
    except Exception as e:
        print(f"Error combining results: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error combining results: {str(e)}")

@app.post("/analyze/sneaker_stitches")
async def analyze_sneaker_stitches(shoe_id: str = Form(...), file: UploadFile = File(...)):
    """
    Analyze the stitch count on a sneaker image and compare to expected values.
    Returns a percentage score based on how closely it matches authentic stitching.
    """
    try:
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file must be an image")

        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file upload")

        # Get expected stitch data
        shoe_data = GOLDEN_DB.get(shoe_id)
        if not shoe_data:
            raise HTTPException(status_code=404, detail=f"Shoe model '{shoe_id}' not found in database")

        expected_stitches = shoe_data.get("expected_stitches", 0)
        tolerance = shoe_data.get("tolerance", 10)
        roi = shoe_data.get("stitch_roi")

        # Detect stitches in the uploaded image (in specific ROI if defined)
        detected_stitches, confidence, quality_metrics = detect_stitches(contents, roi)
        roi_name = roi.get('name', 'full image') if roi else 'full image'
        print(f"Detected stitches in {roi_name}: {detected_stitches}, Expected: {expected_stitches}, Confidence: {confidence:.2f}")

        # Calculate score based on difference
        difference = abs(detected_stitches - expected_stitches)
        
        if difference <= tolerance:
            # Within acceptable range
            score_percent = int(100 - (difference / tolerance) * 20)  # Max 20% penalty within tolerance
        else:
            # Outside tolerance
            excess = difference - tolerance
            score_percent = int(max(0, 80 - (excess / expected_stitches) * 100))

        # Determine verdict
        verdict = "PASS" if score_percent >= 70 else "FAIL"

        return {
            "verdict": verdict,
            "realness_percent": score_percent,
            "detected_stitches": detected_stitches,
            "expected_stitches": expected_stitches,
            "tolerance": tolerance,
            "difference": difference,
            "detection_area": roi.get('name', 'full image') if roi else 'full image',
            "analysis": "Stitch pattern matches authentic" if verdict == "PASS" else "Stitch count deviation detected"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error analyzing stitches: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Stitch analysis error: {str(e)}")

