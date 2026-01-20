/**
 * IMPROVED QUESTION PARSER v2
 * Extracts COMPLETE question text, answer options, correct answers, and explanations
 * with proper Hebrew RTL option handling and text cleanup
 */

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'content', 'exams');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT CLEANUP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    // Remove stray page numbers and footers
    .replace(/- \d+ -/g, '')
    .replace(/מועד (אביב|קיץ|סתיו) \d{4}/g, '')
    .replace(/כל הזכויות שמורות[^.]+\./g, '')
    .replace(/©[^.]+\./g, '')
    .replace(/אין להעתיק[^.]+\./g, '')
    .trim();
}

function cleanExplanation(text) {
  if (!text) return '';
  return cleanText(text)
    // Remove section identifiers that might have leaked in
    .replace(/\b(אביב|קיץ|סתיו)\s*\d{4}\s*[-–]\s*הסברים[^-]+- \d+ -/g, '')
    .replace(/חשיבה (מילולית|כמותית)\s*-\s*פרק\s*(ראשון|שני)/g, '')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// OFFICIAL ANSWER KEY EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function parseAnswerKey(examText) {
  const answerKey = {};
  
  const keyStart = examText.indexOf('מפתח תשובות נכונות');
  if (keyStart === -1) return answerKey;
  
  const keySection = examText.substring(keyStart);
  const lines = keySection.split('\n');
  
  const sections = [
    { pattern: 'חשיבה מילולית - פרק ראשון', key: 'verbal-1' },
    { pattern: 'חשיבה מילולית - פרק שני', key: 'verbal-2' },
    { pattern: 'חשיבה כמותית - פרק ראשון', key: 'quantitative-1' },
    { pattern: 'חשיבה כמותית - פרק שני', key: 'quantitative-2' },
    { pattern: 'אנגלית - פרק ראשון', key: 'english-1' },
    { pattern: 'אנגלית - פרק שני', key: 'english-2' },
  ];
  
  let currentSection = null;
  let questionNumbers = null;
  let collectedAnswers = '';
  
  function saveAnswers() {
    if (currentSection && questionNumbers && collectedAnswers.length > 0) {
      for (let j = 0; j < questionNumbers.length && j < collectedAnswers.length; j++) {
        const answer = parseInt(collectedAnswers[j], 10);
        if (answer >= 1 && answer <= 4) {
          answerKey[currentSection][questionNumbers[j]] = answer;
        }
      }
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    for (const sec of sections) {
      if (line.includes(sec.pattern)) {
        saveAnswers();
        currentSection = sec.key;
        answerKey[currentSection] = {};
        questionNumbers = null;
        collectedAnswers = '';
        break;
      }
    }
    
    if (currentSection && line.match(/^[\d]+$/) && line.length > 10) {
      if (line.startsWith('123456789')) {
        questionNumbers = [];
        let pos = 0;
        let num = 1;
        while (pos < line.length) {
          const numStr = String(num);
          if (line.substring(pos).startsWith(numStr)) {
            questionNumbers.push(num);
            pos += numStr.length;
            num++;
          } else break;
        }
        collectedAnswers = '';
      } else if (questionNumbers) {
        collectedAnswers += line;
        if (collectedAnswers.length >= questionNumbers.length) {
          saveAnswers();
          questionNumbers = null;
          collectedAnswers = '';
        }
      }
    } else if (currentSection && questionNumbers && line.match(/^[\d]+$/)) {
      collectedAnswers += line;
      if (collectedAnswers.length >= questionNumbers.length) {
        saveAnswers();
        questionNumbers = null;
        collectedAnswers = '';
      }
    }
    
    if (line.includes('חישוב אומדן')) {
      saveAnswers();
      break;
    }
  }
  
  return answerKey;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEBREW INLINE OPTIONS PARSER
// Handles RTL format: "10 )1( 12 )2( 16 )3( 18 )4(" 
// or LTR format: "(1) 10 (2) 12 (3) 16 (4) 18"
// ═══════════════════════════════════════════════════════════════════════════════

function parseInlineHebrewOptions(line) {
  const options = ['', '', '', ''];
  let parsed = false;
  
  // Pattern 1: RTL Hebrew format - "value )N(" where value comes BEFORE the number
  // Example: "10 )1( 12 )2( 16 )3( 18 )4("
  const rtlMatches = [...line.matchAll(/([^\s()]+)\s*\)([1-4])\(/g)];
  if (rtlMatches.length >= 2) {
    for (const match of rtlMatches) {
      const optNum = parseInt(match[2], 10);
      const optText = match[1].trim();
      if (optNum >= 1 && optNum <= 4 && optText) {
        options[optNum - 1] = optText;
        parsed = true;
      }
    }
  }
  
  // Pattern 2: LTR format - "(N) value" or ")N( value"
  if (!parsed) {
    const ltrMatches = [...line.matchAll(/[)(]([1-4])[)(]\s*([^)(]+?)(?=\s*[)(][1-4][)(]|$)/g)];
    if (ltrMatches.length >= 2) {
      for (const match of ltrMatches) {
        const optNum = parseInt(match[1], 10);
        const optText = match[2].trim();
        if (optNum >= 1 && optNum <= 4 && optText) {
          options[optNum - 1] = optText;
          parsed = true;
        }
      }
    }
  }
  
  // Pattern 3: Space-separated options with markers
  // "חדר הלבשה : בגדים )1( חדר ישיבות : ישיבה )2( ..."
  if (!parsed) {
    const mixedMatches = [...line.matchAll(/([^)(]+?)\s*[)(]([1-4])[)(]/g)];
    if (mixedMatches.length >= 2) {
      for (const match of mixedMatches) {
        const optNum = parseInt(match[2], 10);
        let optText = match[1].trim();
        // Remove preceding option text if it leaked
        optText = optText.replace(/^.*[)(][1-4][)(]\s*/, '').trim();
        if (optNum >= 1 && optNum <= 4 && optText && optText.length > 0) {
          options[optNum - 1] = optText;
          parsed = true;
        }
      }
    }
  }
  
  return parsed ? options : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEBREW QUESTION EXTRACTION (Verbal & Quantitative)
// Section order in Psychometric exam (must be respected for proper boundaries):
// 1. חשיבה מילולית - פרק ראשון (Verbal 1)
// 2. חשיבה מילולית - פרק שני (Verbal 2)
// 3. חשיבה כמותית - פרק ראשון (Quantitative 1)
// 4. חשיבה כמותית - פרק שני (Quantitative 2)
// 5. אנגלית - פרק ראשון (English 1)
// 6. אנגלית - פרק שני (English 2)
// ═══════════════════════════════════════════════════════════════════════════════

// Ordered list of section markers - MUST match exam order
const SECTION_ORDER = [
  'חשיבה מילולית - פרק ראשון',
  'חשיבה מילולית - פרק שני',
  'חשיבה כמותית - פרק ראשון',
  'חשיבה כמותית - פרק שני',
  'אנגלית - פרק ראשון',
  'אנגלית - פרק שני',
  'מפתח תשובות נכונות'
];

// Also check for garbled markers (common in PDF extraction)
// The key is the canonical marker, values are variants to search for
const SECTION_VARIANTS = {
  'חשיבה מילולית - פרק ראשון': ['חשיבה מילולית - פרק ראשון'],
  'חשיבה מילולית - פרק שני': ['חשיבה מילולית - פרק שני'],
  'חשיבה כמותית - פרק ראשון': ['חשיבה כמותית - פרק ראשון', 'חשיבה Ăמותית - פרק ראשון'],
  'חשיבה כמותית - פרק שני': ['חשיבה כמותית - פרק שני', 'חשיבה Ăמותית - פרק שני'],
  'אנגלית - פרק ראשון': ['אנגלית - פרק ראשון'],
  'אנגלית - פרק שני': ['אנגלית - פרק שני'],
  'מפתח תשובות נכונות': ['מפתח תשובות נכונות'],
};

function findSectionMarker(text, marker, startFrom = 0) {
  let minIdx = -1;
  
  // Try all variants for this marker and return the earliest match
  const variants = SECTION_VARIANTS[marker] || [marker];
  for (const variant of variants) {
    const idx = text.indexOf(variant, startFrom);
    if (idx !== -1 && (minIdx === -1 || idx < minIdx)) {
      minIdx = idx;
    }
  }
  
  return minIdx;
}

function extractHebrewSection(examText, sectionMarker, sectionKey) {
  const questions = {};
  
  // Find where THIS section starts (first occurrence after table of contents)
  // Skip first 1000 chars to avoid TOC
  const tocEnd = examText.indexOf('הזמן המוקצב', 1000);
  const searchStart = tocEnd > 0 ? tocEnd : 1000;
  
  const sectionStart = findSectionMarker(examText, sectionMarker, searchStart);
  if (sectionStart === -1) return questions;
  
  // Find the NEXT section in order (not just any section marker)
  const currentIdx = SECTION_ORDER.indexOf(sectionMarker);
  let sectionEnd = examText.length;
  
  // Look for the next section in order
  if (currentIdx >= 0 && currentIdx < SECTION_ORDER.length - 1) {
    const nextMarker = SECTION_ORDER[currentIdx + 1];
    // Find FIRST occurrence of next section marker after current section start
    const nextIdx = findSectionMarker(examText, nextMarker, sectionStart + sectionMarker.length);
    if (nextIdx !== -1) {
      sectionEnd = nextIdx;
    }
  }
  
  // Also check for answer key as final boundary
  const answerKeyIdx = examText.indexOf('מפתח תשובות נכונות', sectionStart);
  if (answerKeyIdx !== -1 && answerKeyIdx < sectionEnd) {
    sectionEnd = answerKeyIdx;
  }
  
  const sectionText = examText.substring(sectionStart, sectionEnd);
  const lines = sectionText.split('\n');
  
  // Track current question being parsed
  let currentQ = null;
  let stemLines = [];
  let options = ['', '', '', ''];
  let hasFoundOptions = false;
  
  function saveCurrentQuestion() {
    if (currentQ !== null) {
      // Combine stem lines
      let stem = stemLines.join(' ');
      
      // If we found options on separate lines but stem is empty, check inline
      if (!hasFoundOptions) {
        const inlineOpts = parseInlineHebrewOptions(stem);
        if (inlineOpts && inlineOpts.some(o => o.length > 0)) {
          // Extract stem (text before first option marker)
          const firstOptIdx = stem.search(/[)(][1-4][)(]/);
          if (firstOptIdx > 0) {
            // Find the text BEFORE the first option
            let stemPart = stem.substring(0, firstOptIdx);
            // For analogies, the stem includes " - " pattern
            const dashIdx = stemPart.lastIndexOf(' - ');
            if (dashIdx > 0) {
              stemPart = stemPart.substring(0, dashIdx + 3);
            }
            stem = cleanText(stemPart);
          }
          options = inlineOpts;
          hasFoundOptions = true;
        }
      }
      
      // Clean up stem
      stem = cleanText(stem);
      
      // Remove option text that leaked into stem
      if (hasFoundOptions) {
        for (const opt of options) {
          if (opt && opt.length > 3) {
            stem = stem.replace(opt, '').trim();
          }
        }
        // Remove stray option markers from stem
        stem = stem.replace(/\s*[)(][1-4][)(]\s*/g, ' ').trim();
      }
      
      // Remove leading question context that doesn't belong
      stem = stem
        .replace(/^נתון:\s*/g, '')
        .replace(/^שואלים:?\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Clean options
      options = options.map(opt => cleanText(opt));
      
      questions[currentQ] = {
        stem: stem,
        options: options
      };
    }
  }
  
  // Patterns for question numbers
  const qNumEndPattern = /\.(\d{1,2})$/; // Hebrew RTL: ".N" at end
  const qNumStartPattern = /^(\d{1,2})\.\s/; // Standard: "N. " at start
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip page headers and footers
    if (line.includes('כל הזכויות שמורות') || 
        line.includes('אין להעתיק') ||
        line.match(/^- \d+ -$/) ||
        line.match(/^עמוד ריק$/) ||
        line.includes('מועד אביב') ||
        line.includes('מועד קיץ') ||
        line.includes('מועד סתיו') ||
        line.includes('בפרק זה') ||
        line.includes('הזמן המוקצב')) {
      continue;
    }
    
    // Check for new question number
    const endsWithQNum = line.match(qNumEndPattern);
    const startsWithQNum = line.match(qNumStartPattern);
    
    if (endsWithQNum || startsWithQNum) {
      // Save previous question
      saveCurrentQuestion();
      
      // Start new question
      currentQ = endsWithQNum 
        ? parseInt(endsWithQNum[1], 10)
        : parseInt(startsWithQNum[1], 10);
      
      // Get stem part from this line (excluding question number)
      const stemPart = endsWithQNum 
        ? line.replace(/\.\d{1,2}$/, '').trim()
        : line.replace(/^\d{1,2}\.\s*/, '').trim();
      
      stemLines = stemPart ? [stemPart] : [];
      options = ['', '', '', ''];
      hasFoundOptions = false;
      continue;
    }
    
    // If we're collecting a question
    if (currentQ !== null) {
      // Check for inline options on this line
      const lineOptions = parseInlineHebrewOptions(line);
      if (lineOptions && lineOptions.filter(o => o.length > 0).length >= 2) {
        // Found inline options
        for (let j = 0; j < 4; j++) {
          if (lineOptions[j]) {
            options[j] = lineOptions[j];
          }
        }
        hasFoundOptions = true;
        // Don't add this line to stem
        continue;
      }
      
      // Check for standalone option line: ")N( text" or "text )N("
      const standaloneOpt = line.match(/^([^)(]+?)\s*\)([1-4])\($/);
      if (standaloneOpt) {
        const optNum = parseInt(standaloneOpt[2], 10);
        options[optNum - 1] = cleanText(standaloneOpt[1]);
        hasFoundOptions = true;
        continue;
      }
      
      const standaloneOpt2 = line.match(/^\(([1-4])\)\s*(.+)$/);
      if (standaloneOpt2) {
        const optNum = parseInt(standaloneOpt2[1], 10);
        options[optNum - 1] = cleanText(standaloneOpt2[2]);
        hasFoundOptions = true;
        continue;
      }
      
      // Add to stem
      stemLines.push(line);
    }
  }
  
  // Save last question
  saveCurrentQuestion();
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGLISH QUESTION EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractEnglishSection(examText, sectionMarker, sectionKey) {
  const questions = {};
  
  // Skip first 1000 chars to avoid TOC
  const tocEnd = examText.indexOf('הזמן המוקצב', 1000);
  const searchStart = tocEnd > 0 ? tocEnd : 1000;
  
  const sectionStart = findSectionMarker(examText, sectionMarker, searchStart);
  if (sectionStart === -1) return questions;
  
  // Find the NEXT section in order
  const currentIdx = SECTION_ORDER.indexOf(sectionMarker);
  let sectionEnd = examText.length;
  
  if (currentIdx >= 0 && currentIdx < SECTION_ORDER.length - 1) {
    const nextMarker = SECTION_ORDER[currentIdx + 1];
    const nextIdx = findSectionMarker(examText, nextMarker, sectionStart + sectionMarker.length);
    if (nextIdx !== -1) {
      sectionEnd = nextIdx;
    }
  }
  
  // Also check for answer key as final boundary
  const answerKeyIdx = examText.indexOf('מפתח תשובות נכונות', sectionStart);
  if (answerKeyIdx !== -1 && answerKeyIdx < sectionEnd) {
    sectionEnd = answerKeyIdx;
  }
  
  const sectionText = examText.substring(sectionStart, sectionEnd);
  const lines = sectionText.split('\n');
  
  let currentQ = null;
  let stemLines = [];
  let options = ['', '', '', ''];
  let inQuestionSection = false;
  let inPassage = false;
  
  function saveCurrentQuestion() {
    if (currentQ !== null && (stemLines.length > 0 || options.some(o => o.length > 0))) {
      const stem = cleanText(stemLines.join(' '));
      questions[currentQ] = {
        stem: stem,
        options: options.map(o => cleanText(o))
      };
    }
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip headers/footers
    if (line.includes('כל הזכויות שמורות') || 
        line.includes('אין להעתיק') ||
        line.match(/^- \d+ -$/) ||
        line.includes('מועד')) {
      continue;
    }
    
    // Check for "Questions" marker
    if (line.match(/^Questions$/i)) {
      inQuestionSection = true;
      inPassage = false;
      continue;
    }
    
    // Check for passage header
    if (line.match(/^Text (I|II)/i)) {
      inPassage = true;
      inQuestionSection = false;
      continue;
    }
    
    // Check for question number
    const qNumMatch = line.match(/^(\d{1,2})\.\s+(.*)$/);
    if (qNumMatch) {
      saveCurrentQuestion();
      
      currentQ = parseInt(qNumMatch[1], 10);
      stemLines = qNumMatch[2] ? [qNumMatch[2]] : [];
      options = ['', '', '', ''];
      inQuestionSection = true;
      inPassage = false;
      continue;
    }
    
    if (inPassage) continue;
    
    if (currentQ !== null && inQuestionSection) {
      // Check for option line
      const optionLineMatch = line.match(/^\(([1-4])\)\s+(.*)$/);
      if (optionLineMatch) {
        const optNum = parseInt(optionLineMatch[1], 10);
        options[optNum - 1] = optionLineMatch[2].trim();
        continue;
      }
      
      // Check for inline options
      const inlineOptions = [...line.matchAll(/\(([1-4])\)\s*([^(]+)/g)];
      if (inlineOptions.length >= 2) {
        for (const match of inlineOptions) {
          const optNum = parseInt(match[1], 10);
          let optText = match[2].trim().replace(/\s+/g, ' ').trim();
          options[optNum - 1] = optText;
        }
        continue;
      }
      
      // Add to stem
      stemLines.push(line);
    }
  }
  
  saveCurrentQuestion();
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOLUTION FILE EXTRACTION (for explanations and fallback questions)
// ═══════════════════════════════════════════════════════════════════════════════

function extractFromSolution(season, sectionKey) {
  const solPath = path.join(TEMP_DIR, `${season}-${sectionKey}-solution-raw.txt`);
  if (!fs.existsSync(solPath)) return { explanations: {}, questions: {} };
  
  const solText = fs.readFileSync(solPath, 'utf-8');
  const explanations = {};
  const questions = {};
  
  // Split by question numbers
  const blocks = solText.split(/(?=^\d{1,2}\.\s)/m);
  
  for (const block of blocks) {
    const numMatch = block.match(/^(\d{1,2})\./);
    if (!numMatch) continue;
    
    const qNum = parseInt(numMatch[1], 10);
    if (qNum < 1 || qNum > 30) continue;
    
    let content = block.replace(/^\d{1,2}\.\s*/, '').trim();
    
    // Extract question stem
    let stem = '';
    const stemMatch = content.match(/^([^.]+(?:\.[^.]+){0,2})/);
    if (stemMatch) {
      stem = stemMatch[1].trim()
        .replace(/תשובה\s*\(\d\)\s*\.?\s*$/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (stem.length > 300) {
        stem = stem.substring(0, 300) + '...';
      }
    }
    
    if (stem.length > 15) {
      questions[qNum] = {
        stem: stem,
        options: ['', '', '', '']
      };
    }
    
    // Extract full explanation
    let explanation = cleanExplanation(content);
    
    // Limit length
    if (explanation.length > 1500) {
      explanation = explanation.substring(0, 1500) + '...';
    }
    
    if (explanation.length > 20) {
      explanations[qNum] = explanation;
    }
  }
  
  return { explanations, questions };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST-PROCESSING: Clean up parsed questions
// ═══════════════════════════════════════════════════════════════════════════════

function postProcessQuestions(questions, sectionKey) {
  const processed = {};
  
  for (const [qNum, q] of Object.entries(questions)) {
    let { stem, options } = q;
    
    // Clean stem
    stem = cleanText(stem);
    
    // Remove "שאלה N - חשיבה..." prefix if it's the only content
    if (stem.match(/^שאלה\s*\d+\s*-\s*חשיבה/)) {
      const cleaned = stem.replace(/^שאלה\s*\d+\s*-\s*חשיבה[^\n]+/, '').trim();
      if (cleaned.length > 10) {
        stem = cleaned;
      }
    }
    
    // Fix Hebrew RTL question text that got concatenated incorrectly
    // Pattern: "text1?text2" where ? is in the middle - this is usually the actual question
    // The part AFTER the ? should come BEFORE it logically (RTL issue)
    if (stem.includes('?') && !stem.endsWith('?')) {
      const qMarkIdx = stem.indexOf('?');
      const beforeQ = stem.substring(0, qMarkIdx);
      const afterQ = stem.substring(qMarkIdx + 1);
      
      // If the part after ? looks like the beginning of a sentence (Hebrew letters)
      if (afterQ.match(/^[א-ת]/) && beforeQ.length > 10) {
        // Reconstruct: afterQ + ? + beforeQ (if makes sense)
        // But usually the format is: context...question?
        // Keep as is but add proper spacing
        stem = beforeQ.trim() + '? ' + afterQ.trim();
      }
    }
    
    // Clean up "נתון:" sections - separate them clearly
    stem = stem
      .replace(/נתון:\s*\./g, 'נתון: ')
      .replace(/נתון:\s+/g, '\nנתון: ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Clean options
    for (let i = 0; i < options.length; i++) {
      if (options[i]) {
        // Remove leaked question text from options
        // Pattern: option has "?" followed by more text
        if (options[i].includes('?')) {
          const parts = options[i].split('?');
          // Take only the part that looks like a number or short answer
          for (const part of parts) {
            if (part.match(/^\d+$/) || part.length < 30) {
              options[i] = part.trim();
              break;
            }
          }
        }
        
        // Clean the option
        options[i] = cleanText(options[i]);
      }
    }
    
    processed[qNum] = { stem, options };
  }
  
  return processed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXAM PARSING
// ═══════════════════════════════════════════════════════════════════════════════

function parseExam(season, seasonHebrew) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📚 ${season.toUpperCase()} (${seasonHebrew})`);
  console.log('═'.repeat(70));
  
  const examPath = path.join(TEMP_DIR, `${season}-exam-raw.txt`);
  if (!fs.existsSync(examPath)) {
    console.log('❌ Exam file not found');
    return null;
  }
  
  const examText = fs.readFileSync(examPath, 'utf-8');
  console.log(`📄 Exam text: ${examText.length.toLocaleString()} chars`);
  
  const answerKey = parseAnswerKey(examText);
  
  const sectionDefs = [
    { key: 'verbal-1', type: 'verbal', section: 1, marker: 'חשיבה מילולית - פרק ראשון', lang: 'he' },
    { key: 'verbal-2', type: 'verbal', section: 2, marker: 'חשיבה מילולית - פרק שני', lang: 'he' },
    { key: 'quantitative-1', type: 'quantitative', section: 1, marker: 'חשיבה כמותית - פרק ראשון', lang: 'he' },
    { key: 'quantitative-2', type: 'quantitative', section: 2, marker: 'חשיבה כמותית - פרק שני', lang: 'he' },
    { key: 'english-1', type: 'english', section: 1, marker: 'אנגלית - פרק ראשון', lang: 'en' },
    { key: 'english-2', type: 'english', section: 2, marker: 'אנגלית - פרק שני', lang: 'en' },
  ];
  
  const hebrewLabels = ['א', 'ב', 'ג', 'ד'];
  const englishLabels = ['1', '2', '3', '4'];
  const allQuestions = [];
  
  for (const def of sectionDefs) {
    const sectionAnswers = answerKey[def.key] || {};
    const questionNums = Object.keys(sectionAnswers).map(Number).sort((a, b) => a - b);
    
    if (questionNums.length === 0) {
      console.log(`  ⚠️ ${def.key}: No answers in key`);
      continue;
    }
    
    // Extract questions from exam
    let extractedQuestions = {};
    if (def.lang === 'he') {
      extractedQuestions = extractHebrewSection(examText, def.marker, def.key);
    } else {
      extractedQuestions = extractEnglishSection(examText, def.marker, def.key);
    }
    
    // Post-process to clean up
    extractedQuestions = postProcessQuestions(extractedQuestions, def.key);
    
    // Get explanations and fallback questions from solutions
    const { explanations, questions: solutionQuestions } = extractFromSolution(season, def.key);
    
    const extractedCount = Object.keys(extractedQuestions).length;
    const solutionCount = Object.keys(solutionQuestions).length;
    console.log(`  ${def.key}: ${questionNums.length} answers, ${extractedCount} from exam, ${solutionCount} from solution, ${Object.keys(explanations).length} explanations`);
    
    for (const qNum of questionNums) {
      const correctAnswer = sectionAnswers[qNum];
      const explanation = explanations[qNum] || '';
      
      let extracted = extractedQuestions[qNum] || null;
      const solutionExtracted = solutionQuestions[qNum] || null;
      
      // Use solution if exam extraction failed
      if (!extracted && solutionExtracted) {
        extracted = solutionExtracted;
      }
      
      const labels = def.lang === 'he' ? hebrewLabels : englishLabels;
      
      // Build options
      let options;
      let hasValidOptions = false;
      if (extracted && extracted.options.some(o => o.length > 0)) {
        options = extracted.options.map((opt, i) => ({
          id: i + 1,
          text: opt || `תשובה ${labels[i]}`,
          label: labels[i]
        }));
        hasValidOptions = extracted.options.filter(o => o.length > 0).length >= 2;
      } else {
        options = [1, 2, 3, 4].map(i => ({
          id: i,
          text: `תשובה ${labels[i - 1]}`,
          label: labels[i - 1]
        }));
      }
      
      // Build stem
      let stem = extracted?.stem || '';
      const hasValidStem = stem && stem.length > 3 && !stem.startsWith('שאלה');
      
      if (!stem || stem.length < 3) {
        stem = def.lang === 'he' 
          ? `שאלה ${qNum} - ${def.marker}`
          : `Question ${qNum} - ${def.marker}`;
      }
      
      const hasFullText = hasValidStem || hasValidOptions;
      
      allQuestions.push({
        id: `${season}-${def.key}-${qNum}`,
        examId: season,
        sectionType: def.type,
        sectionNumber: def.section,
        questionNumber: qNum,
        language: def.lang,
        stem: stem,
        options: options,
        correctAnswer: correctAnswer,
        explanation: cleanExplanation(explanation),
        hasFullText: hasFullText
      });
    }
  }
  
  const fullTextCount = allQuestions.filter(q => q.hasFullText).length;
  console.log(`\n  📊 TOTAL: ${allQuestions.length} questions`);
  console.log(`  ✅ Full text extracted: ${fullTextCount} (${Math.round(fullTextCount/allQuestions.length*100)}%)`);
  console.log(`  ⚠️ Placeholder text: ${allQuestions.length - fullTextCount}`);
  
  const exam = {
    id: season,
    name: `מבחן ${seasonHebrew}`,
    nameEn: `${season.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Exam`,
    date: '2025',
    totalQuestions: allQuestions.length,
    fullTextQuestions: fullTextCount,
    sections: {
      verbal: { questions: allQuestions.filter(q => q.sectionType === 'verbal').length },
      quantitative: { questions: allQuestions.filter(q => q.sectionType === 'quantitative').length },
      english: { questions: allQuestions.filter(q => q.sectionType === 'english').length }
    },
    questions: allQuestions
  };
  
  const outPath = path.join(OUTPUT_DIR, `${season}.json`);
  fs.writeFileSync(outPath, JSON.stringify(exam, null, 2), 'utf-8');
  console.log(`  💾 Saved: ${season}.json`);
  
  return exam;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🎯 IMPROVED QUESTION PARSER v2');
console.log('Extracting COMPLETE questions with proper Hebrew RTL handling!');

const exams = [
  { season: 'spring-2025', hebrew: 'אביב 2025' },
  { season: 'summer-2025', hebrew: 'קיץ 2025' },
  { season: 'fall-2025', hebrew: 'סתיו 2025' }
];

let totalQuestions = 0;
let totalFullText = 0;
const results = [];

for (const { season, hebrew } of exams) {
  const exam = parseExam(season, hebrew);
  if (exam) {
    results.push({
      id: exam.id,
      name: exam.name,
      nameEn: exam.nameEn,
      totalQuestions: exam.totalQuestions,
      fullTextQuestions: exam.fullTextQuestions
    });
    totalQuestions += exam.totalQuestions;
    totalFullText += exam.fullTextQuestions;
  }
}

// Save index
const indexPath = path.join(OUTPUT_DIR, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify({
  exams: results,
  totalQuestions,
  fullTextQuestions: totalFullText,
  lastUpdated: new Date().toISOString()
}, null, 2), 'utf-8');

console.log(`\n${'═'.repeat(70)}`);
console.log('✅ COMPLETE!');
console.log(`📊 Total Exams: ${results.length}`);
console.log(`📊 Total Questions: ${totalQuestions}`);
console.log(`📊 Full Text Extracted: ${totalFullText} (${Math.round(totalFullText/totalQuestions*100)}%)`);
console.log('═'.repeat(70));
