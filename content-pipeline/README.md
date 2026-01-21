# Content Pipeline - Psychometric Trainer

Pipeline for extracting and processing Israeli Psychometric Exam PDFs into structured JSON.

## Setup

```bash
cd content-pipeline
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

## Directory Structure

```
content-pipeline/
├── input/
│   ├── exams/          # Place exam PDFs here
│   └── solutions/      # Place solution PDFs here
├── output/
│   ├── raw/            # Extracted text (intermediate)
│   ├── parsed/         # Final JSON files
│   └── images/         # Extracted diagrams
├── scripts/
│   ├── extract_text.py    # PDF → raw JSON
│   ├── parse_exam.py      # Raw JSON → structured exam
│   ├── parse_solutions.py # Merge solutions into exams
│   ├── extract_images.py  # Extract diagrams
│   └── validate.py        # Validate output
└── schemas/
    └── exam.schema.json   # JSON Schema
```

## Usage

### Step 1: Extract text from PDFs

```bash
# Extract from exam PDFs
python scripts/extract_text.py input/exams/ output/raw/

# Extract from solution PDFs  
python scripts/extract_text.py input/solutions/ output/raw/solutions/
```

### Step 2: Parse into structured JSON

```bash
python scripts/parse_exam.py output/raw/ output/parsed/
```

### Step 3: Merge solutions

```bash
python scripts/parse_solutions.py output/raw/solutions/ output/parsed/
```

### Step 4: Extract images (optional)

```bash
python scripts/extract_images.py input/exams/ output/images/
```

### Step 5: Validate output

```bash
python scripts/validate.py output/parsed/
```

### Step 6: Deploy to app

```bash
# Copy to app's public folder
cp -r output/parsed/*.json ../app/public/data/
cp -r output/images/* ../app/public/images/
```

## PDF Naming Convention

For best auto-matching of solutions to exams:

**Exams:**
- `בחינה-פסיכומטרית-מועד-קיץ-2025.pdf`
- `psychometric-exam-summer-2025.pdf`

**Solutions:**
- `פתרון-קיץ-2025-פרק-כמותי-ראשון.pdf`
- `פתרון-קיץ-2025-פרק-מילולי-שני.pdf`
- `solution-summer-2025-english-1.pdf`

## Manual Corrections

The automated parsing may need manual corrections. Edit the JSON files in `output/parsed/` directly:

1. Fix question text that didn't parse correctly
2. Add missing options
3. Correct answer mappings
4. Add explanations

Use `validate.py` after changes to verify structure is valid.

## Extraction Methods

The pipeline supports multiple extraction methods:

- **pdfplumber** (default): Fast, good for structured text
- **PyMuPDF**: Better for complex layouts
- **auto**: Tries pdfplumber, falls back to PyMuPDF if sparse

```bash
python scripts/extract_text.py input/exams/ output/raw/ --method auto
```
