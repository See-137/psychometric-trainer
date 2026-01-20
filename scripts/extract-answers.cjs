/**
 * Extract answer keys from solution PDF text files
 * The Israeli Psychometric has clear "תשובה (N)" patterns
 */

const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'content', 'exams');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Extract answer numbers from solution text
 * Pattern: תשובה (N) where N is 1-4
 */
function extractAnswersFromSolution(text) {
  const answers = [];
  
  // Hebrew pattern: תשובה (1) or תשובה (2) etc.
  // Also match תשובה: (1) or תשובה : (1)
  const answerPattern = /תשובה\s*:?\s*\((\d)\)/g;
  
  let match;
  while ((match = answerPattern.exec(text)) !== null) {
    const answerNum = parseInt(match[1], 10);
    if (answerNum >= 1 && answerNum <= 4) {
      answers.push(answerNum);
    }
  }
  
  return answers;
}

/**
 * Parse all solution files for an exam season
 */
function parseExamSolutions(season) {
  console.log(`\n📚 Parsing ${season} solutions...`);
  
  const sections = {
    quantitative1: `${season}-quantitative-1-solution-raw.txt`,
    quantitative2: `${season}-quantitative-2-solution-raw.txt`,
    verbal1: `${season}-verbal-1-solution-raw.txt`,
    verbal2: `${season}-verbal-2-solution-raw.txt`,
    english1: `${season}-english-1-solution-raw.txt`,
    english2: `${season}-english-2-solution-raw.txt`,
  };
  
  const results = {};
  
  for (const [sectionKey, filename] of Object.entries(sections)) {
    const filePath = path.join(TEMP_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.log(`  ⚠️ Missing: ${filename}`);
      continue;
    }
    
    const text = fs.readFileSync(filePath, 'utf-8');
    const answers = extractAnswersFromSolution(text);
    
    results[sectionKey] = {
      answers,
      count: answers.length
    };
    
    console.log(`  ✓ ${sectionKey}: ${answers.length} answers extracted`);
    console.log(`    First 5: [${answers.slice(0, 5).join(', ')}]`);
    console.log(`    Last 5: [${answers.slice(-5).join(', ')}]`);
  }
  
  return results;
}

/**
 * Create exam JSON structure with answer keys
 */
function createExamJSON(season, seasonHebrew, solutions) {
  const questions = [];
  let questionId = 1;
  
  // Section configuration with expected question counts
  const sectionConfig = [
    { key: 'quantitative1', type: 'quantitative', section: 1, nameHe: 'חשיבה כמותית - פרק ראשון', nameEn: 'Quantitative Reasoning - Part 1' },
    { key: 'quantitative2', type: 'quantitative', section: 2, nameHe: 'חשיבה כמותית - פרק שני', nameEn: 'Quantitative Reasoning - Part 2' },
    { key: 'verbal1', type: 'verbal', section: 1, nameHe: 'חשיבה מילולית - פרק ראשון', nameEn: 'Verbal Reasoning - Part 1' },
    { key: 'verbal2', type: 'verbal', section: 2, nameHe: 'חשיבה מילולית - פרק שני', nameEn: 'Verbal Reasoning - Part 2' },
    { key: 'english1', type: 'english', section: 1, nameHe: 'אנגלית - פרק ראשון', nameEn: 'English - Part 1' },
    { key: 'english2', type: 'english', section: 2, nameHe: 'אנגלית - פרק שני', nameEn: 'English - Part 2' },
  ];
  
  for (const config of sectionConfig) {
    const solutionData = solutions[config.key];
    
    if (!solutionData || solutionData.answers.length === 0) {
      console.log(`  ⚠️ No answers for ${config.key}`);
      continue;
    }
    
    // Create questions for this section
    for (let i = 0; i < solutionData.answers.length; i++) {
      const correctAnswerIndex = solutionData.answers[i] - 1; // Convert 1-4 to 0-3
      
      questions.push({
        id: `${season}-${config.type}-${config.section}-q${i + 1}`,
        questionNumber: i + 1,
        sectionType: config.type,
        sectionNumber: config.section,
        sectionNameHe: config.nameHe,
        sectionNameEn: config.nameEn,
        // Placeholder text - will be enhanced with actual question text later
        text: `שאלה ${i + 1}`,
        textEn: `Question ${i + 1}`,
        options: [
          { id: 1, text: 'תשובה 1', textEn: 'Option 1' },
          { id: 2, text: 'תשובה 2', textEn: 'Option 2' },
          { id: 3, text: 'תשובה 3', textEn: 'Option 3' },
          { id: 4, text: 'תשובה 4', textEn: 'Option 4' },
        ],
        correctAnswer: correctAnswerIndex,
        explanation: `התשובה הנכונה היא ${solutionData.answers[i]}`,
        explanationEn: `The correct answer is ${solutionData.answers[i]}`,
        difficulty: 'medium',
        tags: [config.type],
      });
      
      questionId++;
    }
  }
  
  const exam = {
    id: season,
    name: `מועד ${seasonHebrew}`,
    nameEn: `${season.charAt(0).toUpperCase() + season.slice(1).replace('-', ' ')} Exam`,
    year: parseInt(season.split('-')[1], 10),
    season: season.split('-')[0],
    totalQuestions: questions.length,
    sections: sectionConfig.map(c => ({
      type: c.type,
      section: c.section,
      nameHe: c.nameHe,
      nameEn: c.nameEn,
      questionCount: solutions[c.key]?.answers.length || 0,
    })),
    questions,
  };
  
  return exam;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Extracting answer keys from solution files...\n');
  
  const exams = [
    { season: 'spring-2025', hebrew: 'אביב 2025' },
    { season: 'summer-2025', hebrew: 'קיץ 2025' },
    { season: 'fall-2025', hebrew: 'סתיו 2025' },
  ];
  
  const allExams = [];
  
  for (const { season, hebrew } of exams) {
    const solutions = parseExamSolutions(season);
    const examJSON = createExamJSON(season, hebrew, solutions);
    
    // Save individual exam file
    const outputPath = path.join(OUTPUT_DIR, `${season}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(examJSON, null, 2), 'utf-8');
    console.log(`\n  💾 Saved: ${outputPath}`);
    console.log(`     Total questions: ${examJSON.totalQuestions}`);
    
    allExams.push({
      id: season,
      name: hebrew,
      nameEn: examJSON.nameEn,
      file: `${season}.json`,
      questionCount: examJSON.totalQuestions,
    });
  }
  
  // Save exam index
  const indexPath = path.join(OUTPUT_DIR, 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify({
    exams: allExams,
    totalExams: allExams.length,
    totalQuestions: allExams.reduce((sum, e) => sum + e.questionCount, 0),
    generatedAt: new Date().toISOString(),
  }, null, 2), 'utf-8');
  
  console.log('\n✅ Answer extraction complete!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log(`📊 Total exams: ${allExams.length}`);
  console.log(`📊 Total questions: ${allExams.reduce((sum, e) => sum + e.questionCount, 0)}`);
}

main();
