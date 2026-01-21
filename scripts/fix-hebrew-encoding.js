const fs = require('fs');
const path = require('path');

function decodeHebrewEntities(text) {
  // First decode HTML entities
  const entityMap = {
    '&gt;': '>',
    '&lt;': '<',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&nbsp;': ' '
  };
  
  let decoded = text;
  for (const [entity, char] of Object.entries(entityMap)) {
    decoded = decoded.replaceAll(entity, char);
  }
  
  // Fix specific Hebrew encoding issues
  decoded = decoded.replaceAll(/×[\u0090-\u009F][\u0080-\u00FF]/g, (match) => {
    try {
      // Convert the × pattern back to proper Hebrew
      const bytes = [];
      for (let i = 0; i < match.length; i++) {
        bytes.push(match.charCodeAt(i));
      }
      return String.fromCharCode(...bytes);
    } catch (e) {
      return match;
    }
  });
  
  // Fix common Hebrew text patterns that got mangled
  const hebrewFixes = {
    '\u00D7\u0094\u00D7\u0099\u00D7\u0090\u00D7\u009C\u00D7\u0094': 'השאלה',
    '\u00D7\u00AA\u00D7\u0099\u00D7\u0095\u00D7\u0091\u00D7\u0094': 'תשובה',
    '\u00D7\u0094\u00D7\u00A1\u00D7\u0091\u00D7\u00A8': 'הסבר',
    '\u00D7\u0097\u00D7\u0099\u00D7\u0091\u00D7\u0094': 'חשבון',
    // Add more patterns as needed
  };
  
  for (const [broken, fixed] of Object.entries(hebrewFixes)) {
    decoded = decoded.replaceAll(broken, fixed);
  }
  
  return decoded;
}

function fixMathematicalExpressions(text) {
  // Fix common mathematical expression issues
  let fixed = text;
  
  // Fix fractions with proper Hebrew context
  fixed = fixed.replace(/(\d+)\/(\d+)/g, '$1/$2');
  
  // Fix decimal points
  fixed = fixed.replace(/(\d+)\.(\d+)/g, '$1.$2');
  
  // Fix mathematical operators in Hebrew context
  fixed = fixed.replace(/([א-ת]+)\s*×\s*([0-9])/g, '$1 × $2');
  fixed = fixed.replace(/([0-9])\s*×\s*([א-ת]+)/g, '$1 × $2');
  
  // Fix percentages
  fixed = fixed.replace(/(\d+)%/g, '$1%');
  
  // Fix equations
  fixed = fixed.replace(/([0-9x])\s*=\s*([0-9x])/g, '$1 = $2');
  
  // Fix parentheses spacing in mathematical contexts
  fixed = fixed.replace(/\(\s*([0-9+\-×÷]+)\s*\)/g, '($1)');
  
  return fixed;
}

function validateHebrewText(text) {
  const issues = [];
  
  // Check for encoding artifacts
  if (text.includes('×')) {
    issues.push('Contains encoding artifacts (×)');
  }
  
  // Check for malformed Hebrew words
  const hebrewRegex = /[א-ת]+/g;
  const hebrewWords = text.match(hebrewRegex) || [];
  
  hebrewWords.forEach(word => {
    if (word.length < 2) {
      issues.push(`Suspicious short Hebrew word: ${word}`);
    }
  });
  
  return issues;
}

function processExamFile(filePath) {
  console.log(`\nProcessing ${filePath}...`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const exam = JSON.parse(content);
    
    let totalQuestions = 0;
    let fixedQuestions = 0;
    
    // Process each section
    exam.sections.forEach(section => {
      console.log(`  Section: ${section.nameHe || section.name}`);
      
      section.questions.forEach(question => {
        totalQuestions++;
        let wasFixed = false;
        
        // Fix question text
        const originalText = question.text;
        question.text = fixMathematicalExpressions(decodeHebrewEntities(question.text));
        
        if (question.text !== originalText) {
          wasFixed = true;
        }
        
        // Fix explanation if exists
        if (question.explanation) {
          const originalExplanation = question.explanation;
          question.explanation = fixMathematicalExpressions(decodeHebrewEntities(question.explanation));
          
          if (question.explanation !== originalExplanation) {
            wasFixed = true;
          }
        }
        
        // Fix option texts
        question.options.forEach(option => {
          const originalOption = option.text;
          option.text = fixMathematicalExpressions(decodeHebrewEntities(option.text));
          
          if (option.text !== originalOption) {
            wasFixed = true;
          }
        });
        
        if (wasFixed) {
          fixedQuestions++;
        }
        
        // Validate the fixed text
        const issues = validateHebrewText(question.text);
        if (issues.length > 0) {
          console.log(`    Question ${question.id}: ${issues.join(', ')}`);
        }
      });
    });
    
    console.log(`  Fixed ${fixedQuestions}/${totalQuestions} questions`);
    
    // Write the fixed content back
    const backupPath = filePath.replace('.json', '.backup-' + Date.now() + '.json');
    fs.writeFileSync(backupPath, content); // Backup original
    fs.writeFileSync(filePath, JSON.stringify(exam, null, 2), 'utf8');
    
    console.log(`  ✓ Fixed and saved (backup: ${path.basename(backupPath)})`);
    
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

// Process all exam files
const examDir = path.join(__dirname, '..', 'public', 'content', 'exams');
const examFiles = ['spring-2025.json', 'summer-2025.json', 'fall-2025.json'];

console.log('🔧 Fixing Hebrew encoding and mathematical expressions...\n');

examFiles.forEach(fileName => {
  const filePath = path.join(examDir, fileName);
  if (fs.existsSync(filePath)) {
    processExamFile(filePath);
  } else {
    console.log(`❌ File not found: ${fileName}`);
  }
});

console.log('\n✅ Hebrew encoding fix completed!');