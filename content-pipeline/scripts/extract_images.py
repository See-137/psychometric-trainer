#!/usr/bin/env python3
"""
Extract images/diagrams from PDF files.
Useful for geometry questions and data interpretation charts.
"""
import argparse
import json
from pathlib import Path
import fitz  # PyMuPDF
from PIL import Image
import io
from tqdm import tqdm


def extract_images_from_pdf(pdf_path: Path, output_dir: Path, min_size: int = 50) -> list:
    """
    Extract all images from a PDF that meet minimum size requirements.
    
    Args:
        pdf_path: Path to PDF file
        output_dir: Directory to save extracted images
        min_size: Minimum width/height in pixels to include
    
    Returns:
        List of image metadata dictionaries
    """
    images = []
    doc = fitz.open(pdf_path)
    
    for page_num, page in enumerate(doc):
        image_list = page.get_images()
        
        for img_index, img in enumerate(image_list):
            xref = img[0]
            
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Load image to check size
                pil_image = Image.open(io.BytesIO(image_bytes))
                width, height = pil_image.size
                
                # Skip tiny images (likely icons or artifacts)
                if width < min_size or height < min_size:
                    continue
                
                # Generate filename
                filename = f"{pdf_path.stem}-p{page_num + 1}-img{img_index + 1}.{image_ext}"
                output_path = output_dir / filename
                
                # Save image
                with open(output_path, "wb") as f:
                    f.write(image_bytes)
                
                images.append({
                    "id": f"{pdf_path.stem}-p{page_num + 1}-img{img_index + 1}",
                    "filename": filename,
                    "page": page_num + 1,
                    "width": width,
                    "height": height,
                    "format": image_ext
                })
                
            except Exception as e:
                print(f"  ⚠ Error extracting image {img_index} from page {page_num + 1}: {e}")
    
    doc.close()
    return images


def main():
    parser = argparse.ArgumentParser(description="Extract images from PDFs")
    parser.add_argument("input_dir", help="Directory containing PDFs")
    parser.add_argument("output_dir", help="Directory for extracted images")
    parser.add_argument("--min-size", type=int, default=50, help="Minimum image dimension")
    args = parser.parse_args()
    
    input_path = Path(args.input_dir)
    output_path = Path(args.output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    pdf_files = list(input_path.glob("*.pdf"))
    print(f"Found {len(pdf_files)} PDF files")
    
    all_images = []
    
    for pdf_file in tqdm(pdf_files, desc="Extracting images"):
        try:
            images = extract_images_from_pdf(pdf_file, output_path, args.min_size)
            all_images.extend(images)
            
            if images:
                print(f"  ✓ {pdf_file.name}: {len(images)} images")
                
        except Exception as e:
            print(f"  ✗ Error processing {pdf_file.name}: {e}")
    
    # Save manifest
    manifest_path = output_path / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"images": all_images}, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Extracted {len(all_images)} total images")


if __name__ == "__main__":
    main()
