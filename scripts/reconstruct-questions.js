import fs from 'fs';
import path from 'path';

/**
 * Reconstruct Hebrew question text that got corrupted during PDF parsing
 * The original content is valid - we need to fix parsing artifacts
 */
function reconstructQuestionText(text) {
  if (!text) return text;
  
  let reconstructed = text;
  
  // Step 1: Fix measurement units that got separated
  reconstructed = reconstructed
    .replace(/(\d+)\s*ס["״]*מ/g, '$1 ס"מ')
    .replace(/(\d+)\s*ק["״]*מ/g, '$1 ק"מ')
    .replace(/(\d+)\s*מ["״]*ר/g, '$1 מ"ר');
  
  // Step 2: Fix fractions that got separated  
  reconstructed = reconstructed
    .replace(/(\d+)\s+(\d+)(?=\s|$)/g, (match, num1, num2, offset, string) => {
      // Check context - if followed by Hebrew, likely a fraction
      const after = string.slice(offset + match.length, offset + match.length + 10);
      if (/^[\s]*[א-ת]/.test(after) && parseInt(num1) < 10 && parseInt(num2) < 100) {
        return `${num1}/${num2}`;
      }
      return match;
    });
    
  // Step 3: Remove diagram coordinate artifacts (scattered capitals)
  reconstructed = reconstructed
    // Remove patterns like "A B C D E F" that are diagram labels
    .replace(/\b[A-Z](\s+[A-Z]){3,}[\s]*(?=[א-ת]|$)/g, '')
    // Remove isolated coordinate patterns
    .replace(/\b[A-Z]\s*\d+\s*[A-Z]\s*\d+/g, '')
    // Remove single scattered capital letters between Hebrew words
    .replace(/([א-ת])\s+[A-Z]\s+([א-ת])/g, '$1 $2');
  
  // Step 4: Clean up copyright and metadata
  reconstructed = reconstructed
    .replace(/©[^©]*פרק\s+ראשון[^©]*©/gi, '')
    .replace(/©.*?©/g, '')
    .replace(/\s*-\s*חשיבה\s+(כמותית|מילולית)\s*-\s*פרק\s+ראשון\s*$/gi, '');
  
  // Step 5: Fix Hebrew punctuation and spacing
  reconstructed = reconstructed
    .replace(/\s*:\s*-\s*/g, ': ')
    .replace(/\s*\?\s*/g, '? ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/\s*,\s*/g, ', ')
    // Clean up multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Step 6: Ensure question ends properly
  if (reconstructed && !/[?.]$/.test(reconstructed)) {
    // If it's clearly a question, add question mark
    if (/^(מה|איזה|כמה|איך|מתי|איפה)/.test(reconstructed) || /איזה|מה/.test(reconstructed)) {
      reconstructed += '?';
    }
  }
  
  return reconstructed;
}

/**
 * Check if question needs reconstruction (has parsing artifacts)
 */
function needsReconstruction(question) {
  const text = question.stem;
  if (!text) return false;
  
  // Look for signs of parsing corruption
  const hasArtifacts = [
    /\b[A-Z]\s+[A-Z]\s+[A-Z]/.test(text),       // Scattered coordinates
    /©.*?©/.test(text),                         // Copyright mixed in text  
    /\d+\s+\d+(?=\s[א-ת])/.test(text),         // Numbers separated from Hebrew
    /[A-Z]\s*\d+\s*[A-Z]\s*\d+/.test(text),    // Coordinate patterns
    /ס\s*["״]*\s*מ/.test(text),                // Separated measurement units
  ].some(check => check);
  
  return hasArtifacts;
}

/**
 * Process exam file and reconstruct questions
 */
async function processExamFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  // Skip files that don't contain questions (like index.json)
  if (!data.questions || !Array.isArray(data.questions)) {
    console.log(`⏭️  Skipping ${path.basename(filePath)} - no questions found`);
    return 0;
  }
  
  let reconstructedCount = 0;
  const reconstructedQuestions = [];
  
  data.questions.forEach(question => {
    const originalStem = question.stem;
    const originalOptions = question.options.map(opt => opt.text);
    
    if (needsReconstruction(question)) {
      // Reconstruct the question text
      question.stem = reconstructQuestionText(originalStem);
      
      // Reconstruct option text too
      question.options.forEach(option => {
        const originalOptionText = option.text;
        option.text = reconstructQuestionText(originalOptionText);
      });
      
      reconstructedCount++;
      reconstructedQuestions.push({
        id: question.id,
        originalStem: originalStem.substring(0, 100) + '...',
        reconstructedStem: question.stem.substring(0, 100) + '...'
      });
      
      console.log(`🔧 Reconstructed: ${question.id}`);
      console.log(`   Before: ${originalStem.substring(0, 80)}...`);
      console.log(`   After:  ${question.stem.substring(0, 80)}...`);
      console.log('');
    }
  });
  
  // Write reconstructed file
  const backupPath = filePath.replace('.json', '.backup.json');
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`✅ Processed ${data.questions.length} questions`);
  console.log(`🔧 Reconstructed: ${reconstructedCount} questions`);
  
  return { total: data.questions.length, reconstructed: reconstructedCount, details: reconstructedQuestions };
}

// Process all exam files
const examDir = path.join(process.cwd(), 'public', 'content', 'exams');
const files = fs.readdirSync(examDir).filter(f => f.endsWith('.json') && !f.includes('.backup'));

let totalProcessed = 0;
let totalReconstructed = 0;

for (const file of files) {
  console.log(`\n📖 Processing: ${file}`);
  const result = await processExamFile(path.join(examDir, file));
  totalProcessed += result.total;
  totalReconstructed += result.reconstructed;
}

console.log(`\n✨ Reconstruction complete!`);
console.log(`📊 Total questions: ${totalProcessed}`);
console.log(`🔧 Total reconstructed: ${totalReconstructed}`);
console.log(`💾 Backup files created for safety`);

export { reconstructQuestionText, needsReconstruction };