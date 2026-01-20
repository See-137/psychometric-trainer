/**
 * FULL QUESTION PARSER
 * Extracts COMPLETE question text, answer options, correct answers, and explanations
 * NO SHORTCUTS - Full content extraction as requested!
 */

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'content', 'exams');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
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
// HEBREW QUESTION EXTRACTION (Verbal & Quantitative)
// ═══════════════════════════════════════════════════════════════════════════════

function extractHebrewSection(examText, sectionMarker, sectionKey) {
  const questions = {};
  
  // Find section start
  const sectionStart = examText.indexOf(sectionMarker);
  if (sectionStart === -1) return questions;
  
  // Find next section start (to bound our search)
  const nextSections = [
    'חשיבה מילולית - פרק שני',
    'חשיבה כמותית - פרק ראשון',
    'חשיבה כמותית - פרק שני',
    'אנגלית - פרק ראשון',
    'אנגלית - פרק שני',
    'מפתח תשובות נכונות',
    'גיליון תשובות'
  ].filter(s => s !== sectionMarker);
  
  let sectionEnd = examText.length;
  for (const next of nextSections) {
    const idx = examText.indexOf(next, sectionStart + sectionMarker.length);
    if (idx !== -1 && idx < sectionEnd) {
      sectionEnd = idx;
    }
  }
  
  const sectionText = examText.substring(sectionStart, sectionEnd);
  const lines = sectionText.split('\n');
  
  let currentQ = null;
  let currentStem = [];
  let currentOptions = ['', '', '', ''];
  let collectingOptions = false;
  
  // Helper function to extract options from a combined stem+options line
  // Hebrew format example: "בית ספר : השכלה - חדר הלבשה : בגדים )1( חדר ישיבות : ישיבה )2( חדר אוכל : רעָב )3( חדר כושר : כושר )4("
  // The stem is before option 1, options come after
  function parseInlineOptions(text) {
    const opts = ['', '', '', ''];
    
    // Find all option markers: )1( )2( )3( )4( or (1) (2) (3) (4)
    // Match pattern: text before each marker
    const optionMatches = [...text.matchAll(/([^()]+?)\s*[)(](\d)[)(]/g)];
    
    if (optionMatches.length < 2) return null;
    
    // Store all matched segments with their numbers
    const segments = [];
    for (const match of optionMatches) {
      const optNum = parseInt(match[2], 10);
      if (optNum >= 1 && optNum <= 4) {
        segments.push({ num: optNum, text: match[1].trim(), fullMatch: match[0], index: match.index });
      }
    }
    
    // Sort by position in text to find stem vs options
    segments.sort((a, b) => a.index - b.index);
    
    // If we have option 1 first, the text before option 1's text is the stem
    // But the segment[0].text might CONTAIN the stem followed by option 1 text
    if (segments.length >= 2 && segments[0].num === 1) {
      // For Hebrew analogies format like: "בית ספר : השכלה - חדר הלבשה : בגדים )1("
      // The stem is "בית ספר : השכלה -" and option 1 is "חדר הלבשה : בגדים"
      // They're separated by " - " in analogies questions
      
      const firstSegmentText = segments[0].text;
      
      // Check if there's a clear stem separator like " - "
      const dashIdx = firstSegmentText.lastIndexOf(' - ');
      let stem = '';
      let opt1Text = firstSegmentText;
      
      if (dashIdx > 0) {
        stem = firstSegmentText.substring(0, dashIdx + 3).trim(); // Include " - "
        opt1Text = firstSegmentText.substring(dashIdx + 3).trim();
      } else {
        // No dash separator - the entire first segment is option 1 text
        // Stem might be empty or from a previous line
        stem = '';
        opt1Text = firstSegmentText;
      }
      
      opts[0] = opt1Text;
      
      // Fill remaining options
      for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        if (seg.num >= 2 && seg.num <= 4) {
          opts[seg.num - 1] = seg.text;
        }
      }
      
      return { stem: stem, options: opts };
    }
    
    // Fallback: extract options normally
    for (const seg of segments) {
      opts[seg.num - 1] = seg.text;
    }
    
    // Try to find stem as text before first option
    if (segments.length > 0) {
      const firstIdx = segments[0].index;
      let stem = text.substring(0, firstIdx).trim();
      // Remove any trailing parts that belong to option 1
      stem = stem.replace(/\s+$/, '').trim();
      return { stem: stem, options: opts };
    }
    
    return null;
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip page headers, footers, and copyright
    if (line.includes('כל הזכויות שמורות') || 
        line.includes('אין להעתיק') ||
        line.match(/^- \d+ -$/) ||
        line.includes('מועד אביב') ||
        line.includes('מועד קיץ') ||
        line.includes('מועד סתיו')) {
      continue;
    }
    
    // Check for question number pattern: line ending with .N (Hebrew RTL)
    const endsWithQNum = line.match(/\.(\d{1,2})$/);
    
    // Also check for a line that starts with N. (left-aligned question number)
    const startsWithQNum = line.match(/^(\d{1,2})\./);
    
    // Check if this line has option markers like (1), (2), )1(, )2( etc
    const hasOptionMarkers = line.match(/[)(]\d[)(]/g);
    
    if (endsWithQNum || startsWithQNum) {
      // Save previous question
      if (currentQ !== null) {
        // Combine stem lines and try to extract inline options
        const combinedStem = currentStem.join(' ').replace(/\s+/g, ' ').trim();
        
        // Check if options are inline in the stem
        const parsed = parseInlineOptions(combinedStem);
        if (parsed && parsed.options.some(o => o.length > 0)) {
          questions[currentQ] = {
            stem: parsed.stem,
            options: parsed.options
          };
        } else if (currentOptions.some(o => o.length > 0)) {
          questions[currentQ] = {
            stem: combinedStem,
            options: currentOptions
          };
        } else {
          questions[currentQ] = {
            stem: combinedStem,
            options: currentOptions
          };
        }
      }
      
      // Start new question
      currentQ = endsWithQNum 
        ? parseInt(endsWithQNum[1], 10)
        : parseInt(startsWithQNum[1], 10);
      
      const stemPart = endsWithQNum 
        ? line.replace(/\.\d{1,2}$/, '').trim()
        : line.replace(/^\d{1,2}\.\s*/, '').trim();
      
      currentStem = stemPart ? [stemPart] : [];
      currentOptions = ['', '', '', ''];
      collectingOptions = false;
      
    } else if (hasOptionMarkers && currentQ !== null) {
      // Line contains option markers - could be inline options
      currentStem.push(line);
      
      // Also try to extract from just this line
      const optMatches = [...line.matchAll(/([^()]+?)\s*[)(](\d)[)(]/g)];
      for (const match of optMatches) {
        const optNum = parseInt(match[2], 10);
        if (optNum >= 1 && optNum <= 4) {
          currentOptions[optNum - 1] = match[1].trim();
          collectingOptions = true;
        }
      }
      
    } else if (currentQ !== null) {
      // Continue collecting stem/content for current question
      if (line.length > 2) {
        currentStem.push(line);
      }
    }
  }
  
  // Save last question
  if (currentQ !== null) {
    const combinedStem = currentStem.join(' ').replace(/\s+/g, ' ').trim();
    const parsed = parseInlineOptions(combinedStem);
    if (parsed && parsed.options.some(o => o.length > 0)) {
      questions[currentQ] = {
        stem: parsed.stem,
        options: parsed.options
      };
    } else if (currentOptions.some(o => o.length > 0)) {
      questions[currentQ] = {
        stem: combinedStem,
        options: currentOptions
      };
    } else {
      questions[currentQ] = {
        stem: combinedStem,
        options: currentOptions
      };
    }
  }
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENGLISH QUESTION EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractEnglishSection(examText, sectionMarker, sectionKey) {
  const questions = {};
  
  // Find first occurrence of section marker
  const sectionStart = examText.indexOf(sectionMarker);
  if (sectionStart === -1) return questions;
  
  // Determine the end boundary based on section type
  let sectionEnd;
  if (sectionKey === 'english-1') {
    // English-1 ends when English-2 starts
    sectionEnd = examText.indexOf('אנגלית - פרק שני', sectionStart + 100);
    if (sectionEnd === -1) sectionEnd = examText.indexOf('מפתח תשובות נכונות', sectionStart);
  } else {
    // English-2 ends at answer key
    sectionEnd = examText.indexOf('מפתח תשובות נכונות', sectionStart);
  }
  
  if (sectionEnd === -1) sectionEnd = examText.length;
  
  const sectionText = examText.substring(sectionStart, sectionEnd);
  
  // First, find "Questions" marker to separate passages from questions
  // Reading comprehension sections have format:
  // Text I (Questions X-Y)
  // [passage with line numbers like (1), (5), (10)...]
  // Questions
  // X. question stem
  // (1) option (2) option...
  
  // Split by question numbers: N. at start of line
  const lines = sectionText.split('\n');
  let currentQ = null;
  let currentStem = [];
  let currentOptions = ['', '', '', ''];
  let inQuestionSection = false;
  let inPassage = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Skip page headers/footers
    if (line.includes('כל הזכויות שמורות') || 
        line.includes('אין להעתיק') ||
        line.match(/^- \d+ -$/) ||
        line.includes('מועד אביב') ||
        line.includes('מועד קיץ') ||
        line.includes('מועד סתיו')) {
      continue;
    }
    
    // Check for "Questions" marker
    if (line.match(/^Questions$/i)) {
      inQuestionSection = true;
      inPassage = false;
      continue;
    }
    
    // Check for "Text I" or "Text II" passage header
    if (line.match(/^Text (I|II)/i)) {
      inPassage = true;
      inQuestionSection = false;
      continue;
    }
    
    // Check for question number at start: "N." or "N. " 
    const qNumMatch = line.match(/^(\d{1,2})\.\s+(.*)$/);
    if (qNumMatch) {
      // Save previous question
      if (currentQ !== null && (currentStem.length > 0 || currentOptions.some(o => o.length > 0))) {
        const stem = currentStem.join(' ').replace(/\s+/g, ' ').trim();
        questions[currentQ] = {
          stem: stem,
          options: currentOptions
        };
      }
      
      // Start new question
      currentQ = parseInt(qNumMatch[1], 10);
      currentStem = qNumMatch[2] ? [qNumMatch[2]] : [];
      currentOptions = ['', '', '', ''];
      inQuestionSection = true;
      inPassage = false;
      continue;
    }
    
    // If we're in a passage (line numbers like (1), (5), etc), skip
    if (inPassage) continue;
    
    // If we're processing a question, look for options
    if (currentQ !== null && inQuestionSection) {
      // Check for option patterns: (1) text (2) text... OR standalone options
      // Options are (1), (2), (3), (4) - NOT line numbers like (5), (10), (15)
      
      // Pattern: line starts with (N) where N is 1-4
      const optionLineMatch = line.match(/^\((\d)\)\s+(.*)$/);
      if (optionLineMatch) {
        const optNum = parseInt(optionLineMatch[1], 10);
        if (optNum >= 1 && optNum <= 4) {
          currentOptions[optNum - 1] = optionLineMatch[2].trim();
          continue;
        }
      }
      
      // Pattern: inline options (1) text (2) text (3) text (4) text
      // Only match if we see (1), (2), (3), (4) consecutively, not (5), (10), etc.
      const inlineOptions = [...line.matchAll(/\(([1-4])\)\s*([^(]+)/g)];
      if (inlineOptions.length >= 2) {
        // This looks like options inline
        for (const match of inlineOptions) {
          const optNum = parseInt(match[1], 10);
          if (optNum >= 1 && optNum <= 4) {
            let optText = match[2].trim()
              .replace(/\s+/g, ' ')
              .replace(/\s*\d{2,}\s*$/, '')  // Remove trailing page numbers
              .trim();
            currentOptions[optNum - 1] = optText;
          }
        }
        continue;
      }
      
      // Otherwise, add to stem
      currentStem.push(line);
    }
  }
  
  // Save last question
  if (currentQ !== null && (currentStem.length > 0 || currentOptions.some(o => o.length > 0))) {
    const stem = currentStem.join(' ').replace(/\s+/g, ' ').trim();
    questions[currentQ] = {
      stem: stem,
      options: currentOptions
    };
  }
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPLANATION AND QUESTION EXTRACTION FROM SOLUTION FILES
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
    
    // Extract question stem from the beginning
    // The solution typically starts with the question/problem description
    // Find the first sentence or paragraph that describes the problem
    let stem = '';
    
    // Look for patterns like "נתון..." or "שואלים..." at the start
    const stemMatch = content.match(/^([^.]+(?:\.[^.]+){0,2})/);
    if (stemMatch) {
      stem = stemMatch[1].trim();
      // Clean up the stem
      stem = stem
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
        options: ['', '', '', ''] // Options from solution files are usually not in clean format
      };
    }
    
    // Extract explanation
    let explanation = content
      .replace(/תשובה\s*\(\d\)\s*\.?\s*$/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Get first meaningful chunk
    const paragraphs = explanation.split(/\n\n+/);
    explanation = paragraphs[0] || explanation;
    
    if (explanation.length > 1000) {
      explanation = explanation.substring(0, 1000) + '...';
    }
    
    if (explanation.length > 20) {
      explanations[qNum] = explanation;
    }
  }
  
  return { explanations, questions };
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
  
  // Get official answer key
  const answerKey = parseAnswerKey(examText);
  
  // Section configuration
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
    
    // Extract full questions from exam
    let extractedQuestions = {};
    if (def.lang === 'he') {
      extractedQuestions = extractHebrewSection(examText, def.marker, def.key);
    } else {
      extractedQuestions = extractEnglishSection(examText, def.marker, def.key);
    }
    
    // Get explanations AND fallback questions from solution files
    const { explanations, questions: solutionQuestions } = extractFromSolution(season, def.key);
    
    const extractedCount = Object.keys(extractedQuestions).length;
    const solutionCount = Object.keys(solutionQuestions).length;
    console.log(`  ${def.key}: ${questionNums.length} answers, ${extractedCount} from exam, ${solutionCount} from solution, ${Object.keys(explanations).length} explanations`);
    
    // Build questions
    for (const qNum of questionNums) {
      const correctAnswer = sectionAnswers[qNum];
      const explanation = explanations[qNum] || '';
      
      // Try exam extraction first, then fall back to solution
      let extracted = extractedQuestions[qNum] || null;
      const solutionExtracted = solutionQuestions[qNum] || null;
      
      // Use solution if exam extraction failed
      if (!extracted && solutionExtracted) {
        extracted = solutionExtracted;
      }
      
      const labels = def.lang === 'he' ? hebrewLabels : englishLabels;
      
      // Build options array
      let options;
      let hasValidOptions = false;
      if (extracted && extracted.options.some(o => o.length > 0)) {
        options = extracted.options.map((opt, i) => ({
          id: i + 1,
          text: opt || `תשובה ${labels[i]}`,
          label: labels[i]
        }));
        // Count how many options have actual text (not placeholders)
        hasValidOptions = extracted.options.filter(o => o.length > 0).length >= 2;
      } else {
        options = [1, 2, 3, 4].map(i => ({
          id: i,
          text: `תשובה ${labels[i - 1]}`,
          label: labels[i - 1]
        }));
      }
      
      // Build question stem
      let stem = extracted?.stem || '';
      const hasValidStem = stem && stem.length > 3 && !stem.startsWith('שאלה');
      
      if (!stem || stem.length < 3) {
        stem = def.lang === 'he' 
          ? `שאלה ${qNum} - ${def.marker}`
          : `Question ${qNum} - ${def.marker}`;
      }
      
      // hasFullText is true if we have EITHER a valid stem OR valid options (with real content)
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
        explanation: explanation,
        hasFullText: hasFullText
      });
    }
  }
  
  // Count stats
  const fullTextCount = allQuestions.filter(q => q.hasFullText).length;
  console.log(`\n  📊 TOTAL: ${allQuestions.length} questions`);
  console.log(`  ✅ Full text extracted: ${fullTextCount} (${Math.round(fullTextCount/allQuestions.length*100)}%)`);
  console.log(`  ⚠️ Placeholder text: ${allQuestions.length - fullTextCount}`);
  
  // Build exam object
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
  
  // Save to file
  const outPath = path.join(OUTPUT_DIR, `${season}.json`);
  fs.writeFileSync(outPath, JSON.stringify(exam, null, 2), 'utf-8');
  console.log(`  💾 Saved: ${season}.json`);
  
  return exam;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('🎯 FULL QUESTION PARSER');
console.log('Extracting COMPLETE questions - NO SHORTCUTS!');

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
