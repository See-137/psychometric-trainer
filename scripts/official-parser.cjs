/**
 * OFFICIAL ANSWER KEY PARSER
 * Extracts answers directly from the מפתח תשובות נכונות (Answer Key) section
 * This is the most accurate source - straight from the exam PDF!
 */

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'content', 'exams');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse the official answer key from exam text
 */
function parseAnswerKey(examText) {
  const answerKey = {};
  
  // Find the answer key section
  const keyStart = examText.indexOf('מפתח תשובות נכונות');
  if (keyStart === -1) {
    console.log('  ⚠️ Answer key section not found');
    return answerKey;
  }
  
  const keySection = examText.substring(keyStart);
  const lines = keySection.split('\n');
  
  // Section patterns
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
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for section header
    for (const sec of sections) {
      if (line.includes(sec.pattern)) {
        // Save any pending answers for previous section before switching
        if (currentSection && questionNumbers && collectedAnswers.length > 0) {
          saveAnswers(answerKey, currentSection, questionNumbers, collectedAnswers);
        }
        currentSection = sec.key;
        answerKey[currentSection] = {};
        questionNumbers = null;
        collectedAnswers = '';
        break;
      }
    }
    
    // Check for question numbers line (all digits, representing question numbers 1-23 etc)
    // The numbers are concatenated: "1234567891011121314..."
    if (currentSection && line.match(/^[\d]+$/) && line.length > 10) {
      // This could be question numbers or answers
      // Question numbers: 1234567891011... (ascending sequence)
      // Answers: random 1-4 digits
      
      // Check if it looks like question numbers (starts with 12345...)
      if (line.startsWith('123456789')) {
        // Parse question numbers
        questionNumbers = [];
        let pos = 0;
        let num = 1;
        while (pos < line.length) {
          const numStr = String(num);
          if (line.substring(pos).startsWith(numStr)) {
            questionNumbers.push(num);
            pos += numStr.length;
            num++;
          } else {
            break;
          }
        }
        collectedAnswers = ''; // Reset answer collection
      } else if (questionNumbers) {
        // Collect answer digits (might be split across lines)
        collectedAnswers += line;
        
        // Check if we have all answers
        if (collectedAnswers.length >= questionNumbers.length) {
          saveAnswers(answerKey, currentSection, questionNumbers, collectedAnswers);
          questionNumbers = null;
          collectedAnswers = '';
        }
      }
    } else if (currentSection && questionNumbers && line.match(/^[\d]+$/)) {
      // Short digit line - might be continuation of answers
      collectedAnswers += line;
      
      if (collectedAnswers.length >= questionNumbers.length) {
        saveAnswers(answerKey, currentSection, questionNumbers, collectedAnswers);
        questionNumbers = null;
        collectedAnswers = '';
      }
    }
    
    // Stop at scoring section
    if (line.includes('חישוב אומדן')) {
      // Save any remaining answers before exiting
      if (currentSection && questionNumbers && collectedAnswers.length > 0) {
        saveAnswers(answerKey, currentSection, questionNumbers, collectedAnswers);
      }
      break;
    }
  }
  
  return answerKey;
}

function saveAnswers(answerKey, section, questionNumbers, answerString) {
  for (let j = 0; j < questionNumbers.length && j < answerString.length; j++) {
    const answer = parseInt(answerString[j], 10);
    if (answer >= 1 && answer <= 4) {
      answerKey[section][questionNumbers[j]] = answer;
    }
  }
}

/**
 * Extract explanations from solution files
 */
function extractExplanations(season, sectionKey) {
  const solPath = path.join(TEMP_DIR, `${season}-${sectionKey}-solution-raw.txt`);
  
  if (!fs.existsSync(solPath)) {
    return {};
  }
  
  const solText = fs.readFileSync(solPath, 'utf-8');
  const explanations = {};
  
  // Split by question numbers (N. at start of line)
  const blocks = solText.split(/(?=^\d{1,2}\.\s)/m);
  
  for (const block of blocks) {
    const numMatch = block.match(/^(\d{1,2})\./);
    if (!numMatch) continue;
    
    const qNum = parseInt(numMatch[1], 10);
    
    // Extract explanation text (first 800 chars after question number, before final answer)
    let explanation = block
      .replace(/^\d{1,2}\.\s*/, '')
      .replace(/תשובה\s*\(\d\)\s*\.?\s*$/gm, '')
      .trim();
    
    // Get first meaningful paragraph
    const paragraphs = explanation.split(/\n\n+/);
    explanation = paragraphs[0] || explanation;
    
    // Truncate if too long
    if (explanation.length > 800) {
      explanation = explanation.substring(0, 800) + '...';
    }
    
    if (explanation.length > 30) {
      explanations[qNum] = explanation.replace(/\s+/g, ' ').trim();
    }
  }
  
  return explanations;
}

/**
 * Parse complete exam with official answer key
 */
function parseExam(season, seasonHebrew) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📚 ${season.toUpperCase()} (${seasonHebrew})`);
  console.log('═'.repeat(60));
  
  // Read exam text
  const examPath = path.join(TEMP_DIR, `${season}-exam-raw.txt`);
  if (!fs.existsSync(examPath)) {
    console.log('❌ Exam file not found');
    return null;
  }
  
  const examText = fs.readFileSync(examPath, 'utf-8');
  console.log(`📄 Exam text: ${examText.length.toLocaleString()} chars`);
  
  // Parse official answer key
  const answerKey = parseAnswerKey(examText);
  
  // Section configuration
  const sectionDefs = [
    { key: 'verbal-1', type: 'verbal', section: 1, nameHe: 'חשיבה מילולית - פרק ראשון' },
    { key: 'verbal-2', type: 'verbal', section: 2, nameHe: 'חשיבה מילולית - פרק שני' },
    { key: 'quantitative-1', type: 'quantitative', section: 1, nameHe: 'חשיבה כמותית - פרק ראשון' },
    { key: 'quantitative-2', type: 'quantitative', section: 2, nameHe: 'חשיבה כמותית - פרק שני' },
    { key: 'english-1', type: 'english', section: 1, nameHe: 'אנגלית - פרק ראשון' },
    { key: 'english-2', type: 'english', section: 2, nameHe: 'אנגלית - פרק שני' },
  ];
  
  const hebrewLabels = ['א', 'ב', 'ג', 'ד'];
  const allQuestions = [];
  
  // Process each section
  for (const def of sectionDefs) {
    const sectionAnswers = answerKey[def.key] || {};
    const questionNums = Object.keys(sectionAnswers).map(Number).sort((a, b) => a - b);
    
    if (questionNums.length === 0) {
      console.log(`  ⚠️ ${def.key}: No answers found`);
      continue;
    }
    
    // Get explanations from solution file
    const explanations = extractExplanations(season, def.key);
    
    console.log(`  ✓ ${def.key}: ${questionNums.length} questions (explanations: ${Object.keys(explanations).length})`);
    
    // Build questions
    for (const qNum of questionNums) {
      const correctAnswer = sectionAnswers[qNum];
      const explanation = explanations[qNum] || '';
      
      allQuestions.push({
        id: `${season}-${def.type}-${def.section}-q${qNum}`,
        questionNumber: qNum,
        sectionType: def.type,
        sectionNumber: def.section,
        sectionNameHe: def.nameHe,
        text: `שאלה ${qNum}`,
        options: [
          { id: 1, label: 'א', text: 'תשובה א' },
          { id: 2, label: 'ב', text: 'תשובה ב' },
          { id: 3, label: 'ג', text: 'תשובה ג' },
          { id: 4, label: 'ד', text: 'תשובה ד' },
        ],
        correctAnswer: correctAnswer - 1, // 0-indexed
        correctAnswerLabel: hebrewLabels[correctAnswer - 1],
        explanation: explanation || `התשובה הנכונה היא: ${hebrewLabels[correctAnswer - 1]}`,
        difficulty: 'medium',
        tags: [def.type],
      });
    }
  }
  
  // Build exam object
  const exam = {
    id: season,
    name: `מועד ${seasonHebrew}`,
    nameEn: `${season.split('-')[0].charAt(0).toUpperCase() + season.split('-')[0].slice(1)} ${season.split('-')[1]} Exam`,
    year: parseInt(season.split('-')[1], 10),
    season: season.split('-')[0],
    totalQuestions: allQuestions.length,
    sections: sectionDefs.map(def => ({
      type: def.type,
      section: def.section,
      nameHe: def.nameHe,
      questionCount: allQuestions.filter(q => 
        q.sectionType === def.type && q.sectionNumber === def.section
      ).length
    })).filter(s => s.questionCount > 0),
    questions: allQuestions,
  };
  
  console.log(`\n  📊 TOTAL: ${exam.totalQuestions} questions`);
  
  return exam;
}

/**
 * Main
 */
function main() {
  console.log('\n🎯 OFFICIAL ANSWER KEY PARSER');
  console.log('Extracting from מפתח תשובות נכונות (Official Answer Key)\n');
  
  const exams = [
    { season: 'spring-2025', hebrew: 'אביב 2025' },
    { season: 'summer-2025', hebrew: 'קיץ 2025' },
    { season: 'fall-2025', hebrew: 'סתיו 2025' },
  ];
  
  const results = [];
  let totalQuestions = 0;
  
  for (const { season, hebrew } of exams) {
    const exam = parseExam(season, hebrew);
    
    if (exam && exam.totalQuestions > 0) {
      // Save exam
      const outputPath = path.join(OUTPUT_DIR, `${season}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(exam, null, 2), 'utf-8');
      console.log(`  💾 Saved: ${season}.json`);
      
      results.push({
        id: season,
        name: hebrew,
        nameEn: exam.nameEn,
        file: `${season}.json`,
        questionCount: exam.totalQuestions,
      });
      
      totalQuestions += exam.totalQuestions;
    }
  }
  
  // Save index
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({
    exams: results,
    totalExams: results.length,
    totalQuestions,
    generatedAt: new Date().toISOString(),
    source: 'Official NITE Answer Keys (מפתח תשובות נכונות)',
  }, null, 2), 'utf-8');
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ COMPLETE!');
  console.log(`📊 Total Exams: ${results.length}`);
  console.log(`📊 Total Questions: ${totalQuestions}`);
  console.log('═'.repeat(60) + '\n');
}

main();
