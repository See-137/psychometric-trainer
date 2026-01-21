#!/usr/bin/env python3
"""
Extract text from PDF files using multiple strategies.
Primary: pdfplumber (fast, good for structured text)
Fallback: PyMuPDF (better for complex layouts)
Handles Hebrew RTL text correctly.
"""
import argparse
import json
import os
from pathlib import Path
from typing import Optional
import pdfplumber
import fitz  # PyMuPDF
from tqdm import tqdm


def extract_with_pdfplumber(pdf_path: Path) -> dict:
    """Extract text using pdfplumber (primary method)."""
    result = {
        "source": pdf_path.name,
        "method": "pdfplumber",
        "pages": []
    }
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            tables = page.extract_tables() or []
            
            result["pages"].append({
                "number": i + 1,
                "text": text,
                "tables": tables,
                "width": page.width,
                "height": page.height
            })
    
    return result


def extract_with_pymupdf(pdf_path: Path) -> dict:
    """Extract text using PyMuPDF (fallback for complex layouts)."""
    result = {
        "source": pdf_path.name,
        "method": "pymupdf",
        "pages": []
    }
    
    doc = fitz.open(pdf_path)
    for i, page in enumerate(doc):
        text = page.get_text("text")
        
        # Extract text blocks with position info (useful for RTL ordering)
        blocks = page.get_text("dict")["blocks"]
        
        result["pages"].append({
            "number": i + 1,
            "text": text,
            "blocks": [
                {
                    "bbox": b.get("bbox"),
                    "text": b.get("lines", [{}])[0].get("spans", [{}])[0].get("text", "") 
                    if b.get("type") == 0 else None
                }
                for b in blocks if b.get("type") == 0
            ],
            "width": page.rect.width,
            "height": page.rect.height
        })
    
    doc.close()
    return result


def extract_pdf_text(pdf_path: Path, method: str = "auto") -> dict:
    """
    Extract text from PDF with automatic method selection.
    
    Args:
        pdf_path: Path to PDF file
        method: "pdfplumber", "pymupdf", or "auto"
    
    Returns:
        Dictionary with extracted content
    """
    if method == "pdfplumber":
        return extract_with_pdfplumber(pdf_path)
    elif method == "pymupdf":
        return extract_with_pymupdf(pdf_path)
    else:  # auto
        # Try pdfplumber first, fall back to pymupdf if result is sparse
        result = extract_with_pdfplumber(pdf_path)
        
        # Check if extraction was successful (has meaningful text)
        total_text = "".join(p["text"] for p in result["pages"])
        if len(total_text.strip()) < 100:  # Very little text extracted
            print(f"  ⚠ pdfplumber sparse result, trying PyMuPDF...")
            result = extract_with_pymupdf(pdf_path)
        
        return result


def main():
    parser = argparse.ArgumentParser(description="Extract text from PDFs")
    parser.add_argument("input_dir", help="Directory containing PDFs")
    parser.add_argument("output_dir", help="Directory for output JSON")
    parser.add_argument("--method", choices=["pdfplumber", "pymupdf", "auto"], 
                        default="auto", help="Extraction method")
    args = parser.parse_args()
    
    input_path = Path(args.input_dir)
    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    pdf_files = list(input_path.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDF files")
    
    for pdf_file in tqdm(pdf_files, desc="Extracting"):
        try:
            result = extract_pdf_text(pdf_file, args.method)
            output_file = output_path / f"{pdf_file.stem}.json"
            
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
        except Exception as e:
            print(f"  ✗ Error processing {pdf_file.name}: {e}")


if __name__ == "__main__":
    main()
