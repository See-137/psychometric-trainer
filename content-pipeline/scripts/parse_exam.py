#!/usr/bin/env python3
"""
Parse extracted text into structured exam JSON.
Detects question patterns, section boundaries, and question types.
"""
import argparse
import json
import re
import uuid
from pathlib import Path
from typing import Optional
from tqdm import tqdm


# Hebrew section names mapping
SECTION_PATTERNS = {
    "quantitative": [r"חשיבה כמותית", r"כמותי"],
    "verbal": [r"חשיבה מילולית", r"מילולי"],
    "english": [r"אנגלית", r"english"],
}

# Question type detection patterns
QUESTION_TYPE_PATTERNS = {
    # Quantitative
    "algebra": [r"פתור", r"משוואה", r"נעלם", r"x\s*[+\-=]"],
    "geometry": [r"משולש", r"מעגל", r"שטח", r"היקף", r"זווית", r"מלבן"],
    "data-interpretation": [r"גרף", r"טבלה", r"דיאגרמה", r"תרשים", r"לפי הנתונים"],
    "word-problem": [r"בעיית מילים", r"מחיר", r"מהירות", r"זמן"],
    "sequences": [r"סדרה", r"איבר", r"הבא בסדרה"],
    
    # Verbal
    "analogy": [r":", r"יחס", r"כמו.*כך"],
    "sentence-completion": [r"____", r"השלם", r"חסר"],
    "reading-comprehension-hebrew": [r"קטע", r"לפי הקטע", r"על פי הטקסט"],
    "logic": [r"מסקנה", r"אם.*אז", r"בהכרח"],
    
    # English
    "sentence-completion-english": [r"____.*\(.*\)", r"blank"],
    "restatement": [r"restatement", r"restated", r"same meaning"],
    "reading-comprehension-english": [r"passage", r"according to", r"the author"],
}

# Hebrew option labels
HEBREW_OPTIONS = ["א", "ב", "ג", "ד"]
ENGLISH_OPTIONS = ["A", "B", "C", "D"]


def detect_section_type(text: str) -> Optional[str]:
    """Detect section type from text content."""
    text_lower = text.lower()
    for section_type, patterns in SECTION_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return section_type
    return None


def detect_question_type(stem: str, section_type: str) -> str:
    """Detect question type based on content patterns."""
    for qtype, patterns in QUESTION_TYPE_PATTERNS.items():
        # Only match types relevant to section
        if section_type == "quantitative" and qtype not in ["algebra", "geometry", "data-interpretation", "word-problem", "sequences"]:
            continue
        if section_type == "verbal" and qtype not in ["analogy", "sentence-completion", "reading-comprehension-hebrew", "logic"]:
            continue
        if section_type == "english" and qtype not in ["sentence-completion-english", "restatement", "reading-comprehension-english"]:
            continue
            
        for pattern in patterns:
            if re.search(pattern, stem, re.IGNORECASE):
                return qtype
    
    # Default by section
    defaults = {
        "quantitative": "word-problem",
        "verbal": "sentence-completion",
        "english": "sentence-completion-english"
    }
    return defaults.get(section_type, "word-problem")


def parse_questions_from_text(text: str, section_type: str, section_id: str) -> list:
    """
    Extract questions from raw text.
    
    Looks for patterns like:
    - Hebrew: ".1" or "1." followed by text, then options א, ב, ג, ד
    - English: "1." followed by text, then options A, B, C, D
    """
    questions = []
    
    # Pattern for question start: number followed by period or period followed by number
    question_pattern = r'(?:^|\n)\s*(\d{1,2})[\.\)]\s*(.+?)(?=(?:\n\s*\d{1,2}[\.\)])|$)'
    
    # Find all potential questions
    matches = re.findall(question_pattern, text, re.DOTALL)
    
    for match in matches:
        q_num = int(match[0])
        q_content = match[1].strip()
        
        # Try to extract options
        options = []
        option_labels = HEBREW_OPTIONS if section_type != "english" else ENGLISH_OPTIONS
        
        for i, label in enumerate(option_labels):
            # Look for option pattern: א. or א) or (א)
            option_pattern = rf'[\.|\)|\(]?\s*{label}\s*[\.|\)|\(]?\s*(.+?)(?=[\.|\)|\(]?\s*[{"|".join(option_labels[i+1:])}]|$)' if i < len(option_labels) - 1 else rf'[\.|\)|\(]?\s*{label}\s*[\.|\)|\(]?\s*(.+?)$'
            option_match = re.search(option_pattern, q_content, re.DOTALL)
            if option_match:
                options.append({
                    "label": label,
                    "text": option_match.group(1).strip()
                })
        
        # Extract stem (text before first option)
        stem = q_content
        if options:
            first_option_pattern = rf'[\.|\)|\(]?\s*{option_labels[0]}\s*[\.|\)]'
            stem_match = re.split(first_option_pattern, q_content)
            if stem_match:
                stem = stem_match[0].strip()
        
        if stem and len(options) >= 2:  # Valid question needs stem and at least 2 options
            questions.append({
                "id": f"{section_id}-q{q_num}",
                "sectionId": section_id,
                "number": q_num,
                "type": detect_question_type(stem, section_type),
                "stem": stem,
                "options": options if options else [{"label": l, "text": ""} for l in option_labels],
                "correctAnswer": "",  # Will be filled from solutions
            })
    
    return questions


def parse_exam_file(raw_json_path: Path, exam_id: str) -> dict:
    """Parse a single exam's raw extraction into structured format."""
    with open(raw_json_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)
    
    # Combine all page text
    full_text = "\n".join(page["text"] for page in raw_data.get("pages", []))
    
    # Detect exam metadata from filename
    # Example: בחינה-פסיכומטרית-להתנסות-מועד-קיץ-2025
    filename = raw_json_path.stem
    
    season_map = {
        "אביב": "spring",
        "קיץ": "summer", 
        "סתיו": "fall",
        "חורף": "winter",
        "spring": "spring",
        "summer": "summer",
        "fall": "fall",
        "winter": "winter",
    }
    
    season = "summer"  # default
    year = 2025  # default
    
    for heb, eng in season_map.items():
        if heb in filename.lower():
            season = eng
            break
    
    year_match = re.search(r"20\d{2}", filename)
    if year_match:
        year = int(year_match.group())
    
    exam = {
        "id": exam_id,
        "season": season,
        "year": year,
        "hebrewName": f"{season_map.get(season, season)} {year}",
        "sections": [],
        "metadata": {
            "source": raw_data.get("source", filename),
            "processedAt": "",  # Will be set during processing
        }
    }
    
    # Try to split into sections and parse questions
    # This is a simplified version - real implementation needs more sophisticated parsing
    section_type = detect_section_type(full_text) or "quantitative"
    section_id = f"{exam_id}-{section_type}-1"
    
    questions = parse_questions_from_text(full_text, section_type, section_id)
    
    if questions:
        exam["sections"].append({
            "id": section_id,
            "examId": exam_id,
            "type": section_type,
            "order": 1,
            "timeLimitMinutes": 20 if section_type != "english" else 30,
            "questions": questions
        })
    
    return exam


def main():
    parser = argparse.ArgumentParser(description="Parse raw extractions into exam JSON")
    parser.add_argument("input_dir", help="Directory containing raw JSON extractions")
    parser.add_argument("output_dir", help="Directory for parsed exam JSON")
    args = parser.parse_args()
    
    input_path = Path(args.input_dir)
    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    json_files = list(input_path.glob("*.json"))
    print(f"Found {len(json_files)} raw JSON files")
    
    exams = []
    
    for json_file in tqdm(json_files, desc="Parsing"):
        try:
            exam_id = json_file.stem.replace("-", "_").lower()
            exam = parse_exam_file(json_file, exam_id)
            
            # Save individual exam
            output_file = output_path / f"{exam_id}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(exam, f, ensure_ascii=False, indent=2)
            
            exams.append({
                "id": exam["id"],
                "season": exam["season"],
                "year": exam["year"],
                "hebrewName": exam["hebrewName"],
                "file": f"{exam_id}.json"
            })
            
        except Exception as e:
            print(f"  ✗ Error parsing {json_file.name}: {e}")
    
    # Create index file
    index_file = output_path / "index.json"
    with open(index_file, "w", encoding="utf-8") as f:
        json.dump({"exams": exams}, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Created {len(exams)} exam files + index.json")


if __name__ == "__main__":
    main()
