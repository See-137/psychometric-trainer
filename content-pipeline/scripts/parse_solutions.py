#!/usr/bin/env python3
"""
Parse solution PDFs and merge answers/explanations into exam questions.
Matches solutions to questions by exam season, section type, and question number.
"""
import argparse
import json
import re
from pathlib import Path
from typing import Optional
from tqdm import tqdm


def extract_solutions_from_text(text: str) -> dict:
    """
    Extract correct answers and explanations from solution text.
    
    Returns dict mapping question number to {answer, explanation}
    """
    solutions = {}
    
    # Common patterns for solutions:
    # 1. "שאלה 7: ג" or "Question 7: C"
    # 2. "7. התשובה הנכונה: ג"
    # 3. "7) ג - הסבר..."
    
    # Hebrew answer pattern
    hebrew_pattern = r'(?:שאלה\s*)?(\d{1,2})[\.\)\:]?\s*(?:התשובה(?:\s+הנכונה)?[\:\s]*)?([אבגד])\b\s*[-–]?\s*(.+?)(?=(?:שאלה\s*)?\d{1,2}[\.\)\:]|$)'
    
    # English answer pattern  
    english_pattern = r'(?:Question\s*)?(\d{1,2})[\.\)\:]?\s*(?:(?:The\s+)?(?:correct\s+)?answer[\:\s]*)?([ABCD])\b\s*[-–]?\s*(.+?)(?=(?:Question\s*)?\d{1,2}[\.\)\:]|$)'
    
    # Try Hebrew first
    matches = re.findall(hebrew_pattern, text, re.DOTALL | re.IGNORECASE)
    
    if not matches:
        matches = re.findall(english_pattern, text, re.DOTALL | re.IGNORECASE)
    
    for match in matches:
        q_num = int(match[0])
        answer = match[1].strip()
        explanation = match[2].strip() if len(match) > 2 else ""
        
        # Clean up explanation
        explanation = re.sub(r'\s+', ' ', explanation).strip()
        
        solutions[q_num] = {
            "answer": answer,
            "explanation": explanation[:1000]  # Limit length
        }
    
    return solutions


def match_solution_to_exam(solution_filename: str) -> dict:
    """
    Parse solution filename to determine which exam/section it belongs to.
    
    Examples:
    - פתרון-קיץ-2025-פרק-כמותי-ראשון.pdf → {season: summer, year: 2025, type: quantitative, order: 1}
    - פתרון-אביב-2025-פרק-מילולי-שני.pdf → {season: spring, year: 2025, type: verbal, order: 2}
    """
    result = {
        "season": None,
        "year": None,
        "section_type": None,
        "order": None
    }
    
    filename = solution_filename.lower()
    
    # Season detection
    season_map = {
        "אביב": "spring",
        "קיץ": "summer",
        "סתיו": "fall", 
        "חורף": "winter",
    }
    for heb, eng in season_map.items():
        if heb in filename:
            result["season"] = eng
            break
    
    # Year detection
    year_match = re.search(r"20\d{2}", filename)
    if year_match:
        result["year"] = int(year_match.group())
    
    # Section type detection
    if "כמותי" in filename or "quantitative" in filename:
        result["section_type"] = "quantitative"
    elif "מילולי" in filename or "verbal" in filename:
        result["section_type"] = "verbal"
    elif "אנגלית" in filename or "english" in filename:
        result["section_type"] = "english"
    
    # Order detection (first or second)
    if "ראשון" in filename or "first" in filename or "-1" in filename:
        result["order"] = 1
    elif "שני" in filename or "second" in filename or "-2" in filename:
        result["order"] = 2
    else:
        result["order"] = 1  # Default to first
    
    return result


def merge_solutions_into_exam(exam_path: Path, solutions: dict, section_type: str, order: int) -> bool:
    """
    Merge solutions into an exam JSON file.
    Returns True if any changes were made.
    """
    with open(exam_path, "r", encoding="utf-8") as f:
        exam = json.load(f)
    
    changes_made = False
    
    for section in exam.get("sections", []):
        if section.get("type") == section_type and section.get("order") == order:
            for question in section.get("questions", []):
                q_num = question.get("number")
                if q_num in solutions:
                    sol = solutions[q_num]
                    question["correctAnswer"] = sol["answer"]
                    if sol["explanation"]:
                        question["explanation"] = sol["explanation"]
                    changes_made = True
    
    if changes_made:
        with open(exam_path, "w", encoding="utf-8") as f:
            json.dump(exam, f, ensure_ascii=False, indent=2)
    
    return changes_made


def main():
    parser = argparse.ArgumentParser(description="Parse solutions and merge into exams")
    parser.add_argument("solutions_dir", help="Directory containing solution JSON extractions")
    parser.add_argument("exams_dir", help="Directory containing parsed exam JSON files")
    args = parser.parse_args()
    
    solutions_path = Path(args.solutions_dir)
    exams_path = Path(args.exams_dir)
    
    solution_files = list(solutions_path.glob("*.json"))
    print(f"Found {len(solution_files)} solution files")
    
    for sol_file in tqdm(solution_files, desc="Merging solutions"):
        try:
            # Load solution text
            with open(sol_file, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
            
            full_text = "\n".join(page.get("text", "") for page in raw_data.get("pages", []))
            solutions = extract_solutions_from_text(full_text)
            
            if not solutions:
                print(f"  ⚠ No solutions found in {sol_file.name}")
                continue
            
            # Match to exam
            match_info = match_solution_to_exam(sol_file.stem)
            
            if not all([match_info["season"], match_info["year"], match_info["section_type"]]):
                print(f"  ⚠ Could not match {sol_file.name} to exam")
                continue
            
            # Find matching exam file
            exam_pattern = f"*{match_info['season']}*{match_info['year']}*.json"
            matching_exams = list(exams_path.glob(exam_pattern))
            
            # Also try by constructing expected ID
            expected_id = f"{match_info['season']}_{match_info['year']}"
            direct_match = exams_path / f"{expected_id}.json"
            if direct_match.exists():
                matching_exams = [direct_match]
            
            for exam_file in matching_exams:
                if merge_solutions_into_exam(
                    exam_file, 
                    solutions, 
                    match_info["section_type"], 
                    match_info["order"]
                ):
                    print(f"  ✓ Merged {len(solutions)} solutions into {exam_file.name}")
                    
        except Exception as e:
            print(f"  ✗ Error processing {sol_file.name}: {e}")


if __name__ == "__main__":
    main()
