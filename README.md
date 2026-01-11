# 👟 VeriKicks

### AI-Powered Sneaker Authentication Engine

VeriKicks is a **high-end forensic AI system** designed to authenticate sneakers by analyzing visual, textual, and material-level evidence. Using Computer Vision, OCR, and Machine Learning, VeriKicks detects counterfeit footwear with high precision by examining **label data, structural geometry, barcodes, and material behavior**.

---

## 1. 📌 Project Title

**VeriKicks – AI-Powered Sneaker Authentication**

---

## 2. 📄 Basic Details

### 👥 Team Information

* **Team Name:** ForDevz
* **Team Members:**

  * Sreeramachandran S Menon
  * Ravish R B
  * V S Yadu Krishnan
  * Abhisek Arjunan Pillai

### 🧵 Track / Theme

**AI & Fashion Personalization**

---

### ❓ Problem Statement

The global sneaker resale market suffers heavily from **high-quality counterfeit products**, especially premium sneakers. Manual authentication is expensive, subjective, and does not scale.

---

### 💡 Solution Overview

VeriKicks provides an **automated AI-driven sneaker authentication platform** that verifies shoes using:

* Visual structure analysis
* OCR-based label verification
* Barcode & SKU validation
* Material friction analysis via short videos

The system delivers a **clear “Genuine” or “Anomaly” verdict** with confidence scores.

---

### 📝 Project Description

VeriKicks uses a **multi-layer forensic pipeline** built on Computer Vision and Machine Learning. Users upload three mandatory **“Trinity” images**:

1. **Label Image**
2. **Tag Image**
3. **Profile Image**

Optionally, users upload a **3-second “rub test” video** to analyze material behavior (leather vs PVC).
The backend validates digital authenticity, extracts text and barcodes, analyzes shoe geometry, and aggregates results into a final verdict.

---

## 3. 🛠️ Technical Details

### 🔧 Tech Stack

#### Frontend

* **Next.js 14**
* **TypeScript**
* **Tailwind CSS**
* **Lucide React (Icons)**

#### Backend

* **FastAPI (Python)**
* **Uvicorn (ASGI Server)**

#### Database

* **PostgreSQL**

  * Stores “Golden DB” reference sneaker metadata (SKU, labels, barcodes)

---

### 📚 Libraries & AI Models

* **YOLOv8**

  * Structural geometry extraction and visual object detection
* **OpenCV**

  * Image preprocessing, adaptive thresholding, HSV masking
  * Video frame extraction for material analysis
* **Pytesseract (OCR)**

  * Extracts SKU, size, manufacturing details from labels
* **Pyzbar**

  * Decodes UPC / EAN barcodes for digital verification
* **CNN-LSTM (Planned)**

  * Temporal video analysis for leather vs PVC friction behavior

---

### ⚙️ Implementation Brief

1. **Barcode Validation**

   * UPC/EAN scanned and cross-verified against reference databases
2. **OCR Pipeline**

   * Adaptive thresholding and HSV masking improve text accuracy
3. **Structural Verification**

   * YOLOv8 validates sneaker proportions and geometry
4. **Material Analysis (Optional)**

   * Short rub-test video analyzed for friction patterns
5. **Final Verdict**

   * Aggregated confidence score → **Genuine / Anomaly**

---

## 4. 🚀 Installation & Execution

### ✅ Prerequisites

* **Node.js 18+**
* **Python 3.10+**
* **Tesseract OCR Engine**
* **Python Virtual Environment (venv)**

---

### 🔙 Backend Setup (FastAPI)

```bash
cd verikicks-backend
python -m venv venv
source venv/bin/activate        # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
fastapi dev main.py
```

Backend runs at:

```
http://localhost:8000
```

---

### 🔜 Frontend Setup (Next.js)

```bash
cd verikicks-frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:3000
```

