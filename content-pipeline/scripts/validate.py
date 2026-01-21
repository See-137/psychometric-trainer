#!/usr/bin/env python3
"""
Validate parsed exam JSON files against schema.
Reports missing data and quality issues.
"""
import argparse
import json
from pathlib import Path
from jsonschema import validate, ValidationError


EXAM_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["id", "season", "year", "sections"],
    "properties": {
        "id": {"type": "string"},
        "season": {"enum": ["spring", "summer", "fall", "winter"]},
        "year": {"type": "integer", "minimum": 2000, "maximum": 2100},
        "hebrewName": {"type": "string"},
        "sections": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["id", "examId", "type", "order", "questions"],
                "properties": {
                    "id": {"type": "string"},
                    "examId": {"type": "string"},
                    "type": {"enum": ["quantitative", "verbal", "english"]},
                    "order": {"enum": [1, 2]},
                    "timeLimitMinutes": {"type": "integer"},
                    "questions": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "required": ["id", "sectionId", "number", "stem", "options"],
                            "properties": {
                                "id": {"type": "string"},
                                "sectionId": {"type": "string"},
                                "number": {"type": "integer", "minimum": 1},
                                "type": {"type": "string"},
                                "stem": {"type": "string", "minLength": 1},
                                "options": {
                                    "type": "array",
                                    "minItems": 2,
                                    "items": {
                                        "type": "object",
                                        "required": ["label", "text"],
                                        "properties": {
                                            "label": {"type": "string"},
                                            "text": {"type": "string"}
                                        }
                                    }
                                },
                                "correctAnswer": {"type": "string"},
                                "explanation": {"type": "string"}
                            }
                        }
                    }
                }
            }
        }
    }
}


def validate_exam_file(file_path: Path) -> dict:
    """
    Validate a single exam JSON file.
    Returns dict with validation results and quality metrics.
    """
    result = {
        "file": file_path.name,
        "valid": False,
        "errors": [],
        "warnings": [],
        "stats": {}
    }
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            exam = json.load(f)
        
        # Schema validation
        validate(exam, EXAM_SCHEMA)
        result["valid"] = True
        
        # Quality checks
        total_questions = 0
        questions_with_answers = 0
        questions_with_explanations = 0
        empty_options = 0
        
        for section in exam.get("sections", []):
            for question in section.get("questions", []):
                total_questions += 1
                
                if question.get("correctAnswer"):
                    questions_with_answers += 1
                else:
                    result["warnings"].append(f"Q{question['number']}: Missing correct answer")
                
                if question.get("explanation"):
                    questions_with_explanations += 1
                
                for opt in question.get("options", []):
                    if not opt.get("text"):
                        empty_options += 1
        
        result["stats"] = {
            "totalQuestions": total_questions,
            "withAnswers": questions_with_answers,
            "withExplanations": questions_with_explanations,
            "emptyOptions": empty_options,
            "answerCoverage": f"{(questions_with_answers / total_questions * 100):.1f}%" if total_questions > 0 else "0%"
        }
        
        if empty_options > 0:
            result["warnings"].append(f"{empty_options} empty option texts found")
        
    except ValidationError as e:
        result["errors"].append(f"Schema validation failed: {e.message}")
    except json.JSONDecodeError as e:
        result["errors"].append(f"Invalid JSON: {e}")
    except Exception as e:
        result["errors"].append(f"Error: {e}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Validate exam JSON files")
    parser.add_argument("input_dir", help="Directory containing parsed exam JSON")
    parser.add_argument("--strict", action="store_true", help="Fail on warnings")
    args = parser.parse_args()
    
    input_path = Path(args.input_dir)
    json_files = [f for f in input_path.glob("*.json") if f.name != "index.json"]
    
    print(f"Validating {len(json_files)} exam files...\n")
    
    all_valid = True
    total_questions = 0
    total_with_answers = 0
    
    for json_file in json_files:
        result = validate_exam_file(json_file)
        
        status = "✓" if result["valid"] else "✗"
        print(f"{status} {result['file']}")
        
        if result["stats"]:
            stats = result["stats"]
            print(f"   Questions: {stats['totalQuestions']}, Answers: {stats['answerCoverage']}")
            total_questions += stats["totalQuestions"]
            total_with_answers += stats["withAnswers"]
        
        for error in result["errors"]:
            print(f"   ✗ {error}")
        
        for warning in result["warnings"][:3]:  # Limit warnings shown
            print(f"   ⚠ {warning}")
        if len(result["warnings"]) > 3:
            print(f"   ... and {len(result['warnings']) - 3} more warnings")
        
        if not result["valid"] or (args.strict and result["warnings"]):
            all_valid = False
        
        print()
    
    # Summary
    print("=" * 50)
    print(f"Total questions: {total_questions}")
    print(f"With answers: {total_with_answers} ({total_with_answers/total_questions*100:.1f}%)" if total_questions > 0 else "")
    print(f"Overall: {'✓ All valid' if all_valid else '✗ Some issues found'}")
    
    return 0 if all_valid else 1


if __name__ == "__main__":
    exit(main())
