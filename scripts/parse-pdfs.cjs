/**
 * PDF Parser for Psychometric Exams
 * Extracts questions from exam PDFs and solutions from solution PDFs
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

const PDF_DIR = path.join(__dirname, '../../../');
const OUTPUT_DIR = path.join(__dirname, '../public/content/exams');

// Exam configurations
const EXAMS = {
  'spring-2025': {
    examPdf: 'חוברת-בחינה-פסיכומטרית-אביב-2025.pdf',
    hebrewName: 'אביב 2025',
    season: 'spring',
    year: 2025,
    solutions: {
      'quantitative-1': 'פתרון-אביב-2025-פרק-כמותי-ראשון.pdf',
      'quantitative-2': 'פתרון-אביב-2025-פרק-כמותי-שני.pdf',
      'verbal-1': 'פתרון-אביב-2025-פרק-מילולי-ראשון.pdf',
      'verbal-2': 'פתרון-אביב-2025-פרק-מילולי-שני.pdf',
      'english-1': 'פתרונות-אביב-2025-פרק-אנגלית-ראשון.pdf',
      'english-2': 'פתרונות-אביב-2025-פרק-אנגלית-שני.pdf',
    }
  },
  'summer-2025': {
    examPdf: 'בחינה-פסיכומטרית-להתנסות-מועד-קיץ-2025.pdf',
    hebrewName: 'קיץ 2025',
    season: 'summer',
    year: 2025,
    solutions: {
      'quantitative-1': 'פתרון-קיץ-2025-פרק-כמותי-ראשון.pdf',
      'quantitative-2': 'פתרון-קיץ-2025-פרק-כמותי-שני.pdf',
      'verbal-1': 'פתרון-קיץ-2025-פרק-מילולי-ראשון.pdf',
      'verbal-2': 'פתרון-קיץ-2025-פרק-מילולי-שני.pdf',
      'english-1': 'פתרונות-קיץ-2025-פרק-אנגלית-ראשון.pdf',
      'english-2': 'פתרונות-קיץ-2025-פרק-אנגלית-שני.pdf',
    }
  },
  'fall-2025': {
    examPdf: 'בחינה-פסיכומטרית-להתנסות-מועד-סתיו-2025.pdf',
    hebrewName: 'סתיו 2025',
    season: 'fall',
    year: 2025,
    solutions: {
      'quantitative-1': 'פתרון-סתיו-2025-פרק-כמותי-ראשון-1.pdf',
      'quantitative-2': 'פתרון-סתיו-2025-פרק-כמותי-שני.pdf',
      'verbal-1': 'פתרון-סתיו-2025-פרק-מילולי-ראשון.pdf',
      'verbal-2': 'פתרון-סתיו-2025-פרק-מילולי-שני-1.pdf',
      'english-1': 'פתרון-סתיו-2025-פרק-אנגלית-ראשון.pdf',
      'english-2': 'פתרון-סתיו-2025-פרק-אנגלית-שני.pdf',
    }
  }
};

async function extractPdfText(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error reading ${pdfPath}:`, error.message);
    return null;
  }
}

async function parseExam(examId) {
  const config = EXAMS[examId];
  console.log(`\n📚 Parsing ${config.hebrewName}...`);
  
  // Extract exam text
  const examPath = path.join(PDF_DIR, config.examPdf);
  const examText = await extractPdfText(examPath);
  
  if (!examText) {
    console.error(`Failed to extract exam: ${config.examPdf}`);
    return null;
  }
  
  console.log(`  ✓ Extracted exam text (${examText.length} chars)`);
  
  // Save raw text for inspection
  const rawDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  fs.writeFileSync(
    path.join(rawDir, `${examId}-exam-raw.txt`),
    examText,
    'utf8'
  );
  
  // Extract solutions
  const solutions = {};
  for (const [sectionKey, solutionPdf] of Object.entries(config.solutions)) {
    const solutionPath = path.join(PDF_DIR, solutionPdf);
    if (fs.existsSync(solutionPath)) {
      const solutionText = await extractPdfText(solutionPath);
      if (solutionText) {
        solutions[sectionKey] = solutionText;
        fs.writeFileSync(
          path.join(rawDir, `${examId}-${sectionKey}-solution-raw.txt`),
          solutionText,
          'utf8'
        );
        console.log(`  ✓ Extracted ${sectionKey} solutions`);
      }
    } else {
      console.log(`  ⚠ Missing: ${solutionPdf}`);
    }
  }
  
  return { examText, solutions, config };
}

async function main() {
  console.log('🚀 Starting PDF extraction...\n');
  
  // Ensure output dirs exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Parse all exams
  for (const examId of Object.keys(EXAMS)) {
    await parseExam(examId);
  }
  
  console.log('\n✅ Raw text extraction complete!');
  console.log('📁 Raw text files saved to: scripts/../temp/');
  console.log('\nNext step: Analyze the extracted text structure to parse questions.');
}

main().catch(console.error);
