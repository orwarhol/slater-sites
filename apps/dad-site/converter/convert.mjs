#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Existing tags from the tag library
const EXISTING_TAGS = [
  "Abstract", "Aging", "Death", "death", "brotherhood", "age", "Family",
  "Little Poems", "Billboard", "Time", "Christmas", "Christmas songs",
  "holidays", "memory", "Santa Claus", "singing", "theatre", "xmas",
  "father", "funeral", "mother", "Sand Dunes Tavern", "Silver Street",
  "Teahouse of the August Moon", "mortality", "Nicole", "pacifism", "war",
  "Meditations", "consciousness", "daydreaming", "productivity", "Theatre",
  "biography", "drama", "Eugene O'Neill", "Lion In Winter", "playwriting",
  "art", "art exhibition", "culture", "Edgar Degas", "fine art",
  "Henri Matisse", "Jean Renoir", "museum", "museum exhibition", "painting",
  "passion", "Education", "auditions", "Casie", "cellphones", "plays",
  "teenagers", "THS", "Torrance High School", "food", "Sausage McMuffin",
  "students", "teaching", "Bert", "church", "Easter", "worship",
  "Bob Dylan", "children", "dancing", "family", "family gathering", "hope",
  "music", "War", "draft", "fatherhood", "Fort Ord", "Korea", "Truman",
  "veteran", "WWI", "Aquarium of the Pacific", "Fiat", "Sue", "college",
  "growing-up", "growth", "moving", "time", "driving", "Neil Diamond",
  "sadness", "flowers", "giraffe", "seasons", "winter", "Vanagan", "work",
  "Film", "film", "movies", "History", "politics", "religion", "history",
  "1940s", "1949", "childhood", "Jimmy Carter", "Shakespeare", "neighbor",
  "dark humor", "black humor", "toad", "wood carving", "On the Road",
  "automobiles", "cars", "coffee", "Metaphor", "Places", "architecture",
  "design", "New Mexico", "Portales", "streets", "traveling", "Philosophy",
  "Alfa Romero", "Porsche", "builder", "building", "construction", "house",
  "mobile home", "Renaissance Man", "bird", "buildings", "city", "hawk",
  "nature", "street", "urban", "cats", "desert", "heat", "porch", "summer",
  "wind", "Ziggy", "train tracks", "trains", "bull", "bull pen",
  "dairy farm", "el segundo dairy", "randall dairy el segundo",
  "By The Skin Of Our Teeth", "high school", "Our Town", "Shakespearean",
  "Thornton Wilder", "Nelson Rockefeller", "zen", "authority", "pulled-over"
];

/**
 * Extract text from a .wps file using Python extractor that preserves blank lines
 */
function extractTextFromWps(wpsFilePath) {
  try {
    const scriptPath = path.join(__dirname, 'extract-wps-text.py');
    const output = execSync(`python3 "${scriptPath}" "${wpsFilePath}"`, { encoding: 'utf8' });
    return output;
  } catch (error) {
    console.error(`Error extracting text from ${wpsFilePath}:`, error.message);
    return '';
  }
}

/**
 * Parse the raw text extracted from the .wps file
 */
function parseWpsContent(rawText) {
  // Split by lines but preserve original (don't trim yet)
  const rawLines = rawText.split('\n');
  
  // Find where content starts and ends
  let startIndex = 0;
  let endIndex = rawLines.length;
  
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed.length > 2 && !trimmed.match(/^[@#$%^&*(){}[\]]/)) {
      startIndex = i;
      break;
    }
  }
  
  for (let i = rawLines.length - 1; i >= 0; i--) {
    const trimmed = rawLines[i].trim();
    if (trimmed.match(/Microsoft Works|MSWorksWPDoc|Arial|Modern|^[a-z]{4}$/)) {
      endIndex = i;
    } else if (trimmed.length > 10) {
      break;
    }
  }
  
  const contentLines = rawLines.slice(startIndex, endIndex);
  
  // Find title, date, signature
  let title = '';
  let dateStr = '';
  let bodyStartIndex = 0;
  let signatureIndex = -1;
  
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i].trim();
    
    // Look for date
    const dateMatch = line.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/);
    if (dateMatch) {
      dateStr = dateMatch[0];
      if (i > contentLines.length / 2) {
        signatureIndex = i;
      }
    }
    
    // Look for signature
    if (line.match(/^(Charlie|Charles|CRS)$/i)) {
      signatureIndex = i;
    }
  }
  
  // Find title (first non-empty line) - clean up commas
  for (let i = 0; i < Math.min(contentLines.length, 5); i++) {
    const line = contentLines[i].trim();
    if (line.length > 0 && line.length < 100 && !line.match(/^[@#$%^&*]/)) {
      title = line.replace(/,\s*$/, ''); // Remove trailing comma
      bodyStartIndex = i + 1;
      break;
    }
  }
  
  // Get body lines (preserve blank lines as stanza indicators)
  let bodyEndIndex = signatureIndex > 0 ? signatureIndex : contentLines.length;
  const bodyLines = contentLines.slice(bodyStartIndex, bodyEndIndex);
  
  // Process lines: merge fragmented lines, preserve blank lines
  const processedBody = [];
  let i = 0;
  
  while (i < bodyLines.length) {
    const line = bodyLines[i];
    const trimmed = line.trim();
    
    // Preserve blank lines (they indicate stanza breaks)
    if (trimmed === '') {
      // Only add blank line if we have content before it and it's not a duplicate
      if (processedBody.length > 0 && processedBody[processedBody.length - 1] !== '') {
        processedBody.push('');
      }
      i++;
      continue;
    }
    
    // Skip signature lines (Charlie, Charles, CRS)
    if (trimmed.match(/^(Charlie|Charles|CRS)$/i)) {
      i++;
      continue;
    }
    
    // Check if this is a fragment that should be merged with the next line
    if (trimmed.length <= 2 && !trimmed.match(/[.,!?;:]$/) && i < bodyLines.length - 1) {
      const nextTrimmed = bodyLines[i + 1].trim();
      // Skip if next line is blank
      if (nextTrimmed === '') {
        processedBody.push(trimmed);
        i++;
        continue;
      }
      // Handle common contractions like I + ve = I've, don + t = don't, etc.
      if (trimmed.match(/^[A-Za-z]$/)) {
        const nextWord = nextTrimmed.split(/\s/)[0];
        if (nextWord.match(/^(ve|ll|re|d|t|s|m)(\s|$)/)) {
          // It's a contraction
          const restOfLine = nextTrimmed.substring(nextWord.length).trim();
          processedBody.push(trimmed + "'" + nextWord + (restOfLine ? ' ' + restOfLine : ''));
        } else {
          processedBody.push(trimmed + nextTrimmed);
        }
      } else {
        processedBody.push(trimmed + nextTrimmed);
      }
      i += 2; // Skip both lines
    } else {
      processedBody.push(trimmed);
      i++;
    }
  }
  
  // Post-process to fix common missing apostrophes in contractions
  for (let i = 0; i < processedBody.length; i++) {
    let line = processedBody[i];
    if (line) {
      // Fix obvious contractions that are missing apostrophes
      // Be conservative to avoid false positives
      line = line.replace(/\bIve\b/g, "I've");
      line = line.replace(/\bId\b/g, "I'd");
      line = line.replace(/\bIll\b/g, "I'll");
      line = line.replace(/\bIm\b/g, "I'm");
      line = line.replace(/\bdont\b/g, "don't");
      line = line.replace(/\bcant\b/g, "can't");
      line = line.replace(/\bwont\b/g, "won't");
      line = line.replace(/\bdidnt\b/g, "didn't");
      line = line.replace(/\bwouldnt\b/g, "wouldn't");
      line = line.replace(/\bcouldnt\b/g, "couldn't");
      line = line.replace(/\bshouldnt\b/g, "shouldn't");
      line = line.replace(/\bisnt\b/g, "isn't");
      line = line.replace(/\barent\b/g, "aren't");
      line = line.replace(/\bwasnt\b/g, "wasn't");
      line = line.replace(/\bwerent\b/g, "weren't");
      line = line.replace(/\bhasnt\b/g, "hasn't");
      line = line.replace(/\bhavent\b/g, "haven't");
      line = line.replace(/\bhadnt\b/g, "hadn't");
      line = line.replace(/\byoure\b/g, "you're");
      line = line.replace(/\byouve\b/g, "you've");
      line = line.replace(/\byoull\b/g, "you'll");
      line = line.replace(/\btheyre\b/g, "they're");
      line = line.replace(/\btheyve\b/g, "they've");
      line = line.replace(/\btheyll\b/g, "they'll");
      line = line.replace(/\bweve\b/g, "we've");
      line = line.replace(/\bthats\b/g, "that's");
      line = line.replace(/\bwhats\b/g, "what's");
      line = line.replace(/\bwheres\b/g, "where's");
      line = line.replace(/\bwhos\b/g, "who's");
      line = line.replace(/\bhes\b/g, "he's");
      line = line.replace(/\bshes\b/g, "she's");
      
      processedBody[i] = line;
    }
  }
  
  return {
    title,
    date: dateStr,
    bodyLines: processedBody,
    rawContent: contentLines.map(l => l.trim()).join('\n')
  };
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  
  // Try to parse the date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return new Date();
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate tags based on poem content
 */
function generateTags(content, title) {
  const tags = [];
  const contentLower = content.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Keywords to tag mappings
  const tagMappings = {
    'family': ['Family', 'family'],
    'mother': ['mother', 'Family'],
    'father': ['father', 'Family'],
    'children': ['children', 'Family'],
    'war': ['War', 'war'],
    'death': ['Death', 'death'],
    'theatre': ['Theatre', 'theatre'],
    'time': ['Time', 'time'],
    'meditation': ['Meditations'],
    'age': ['Aging', 'age'],
    'old': ['Aging'],
    'memory': ['memory'],
    'poem': ['Little Poems'],
    'brother': ['brotherhood', 'Family'],
    'god': ['religion'],
  };
  
  const usedTags = new Set();
  
  // Check content for keywords
  for (const [keyword, relatedTags] of Object.entries(tagMappings)) {
    if (contentLower.includes(keyword) || titleLower.includes(keyword)) {
      for (const tag of relatedTags) {
        if (!usedTags.has(tag.toLowerCase()) && tags.length < 5) {
          tags.push(tag);
          usedTags.add(tag.toLowerCase());
        }
      }
    }
  }
  
  // If we don't have enough tags, add some generic ones
  if (tags.length === 0) {
    tags.push('Abstract');
  }
  
  return tags.slice(0, 5);
}

/**
 * Generate excerpt from poem body (140-180 chars, sentence-aware)
 */
function generateExcerpt(bodyLines) {
  const fullText = bodyLines.join(' ').replace(/\s+/g, ' ').trim();
  
  if (fullText.length <= 180) {
    return fullText;
  }
  
  // Try to find a sentence ending within the 140-180 range
  for (let i = 180; i >= 140 && i < fullText.length; i--) {
    if (fullText[i] === '.' && i + 1 < fullText.length && fullText[i + 1] === ' ') {
      return fullText.substring(0, i + 1).trim();
    }
  }
  
  // If no sentence ending found, just find the last complete word
  let endPos = 180;
  while (endPos > 140 && fullText[endPos] !== ' ') {
    endPos--;
  }
  
  return fullText.substring(0, endPos).trim();
}

/**
 * Convert filename to lowercase with dashes
 */
function generateFilename(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') + '.md';
}

/**
 * Format poem body with proper line spacing
 */
function formatPoemBody(bodyLines) {
  const formattedLines = [];
  
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    
    if (line === '') {
      // Preserve blank lines (stanza breaks)
      formattedLines.push('');
      continue;
    }
    
    // Check if next line is blank or if this is the last line
    const isLastLineOfStanza = i === bodyLines.length - 1 || bodyLines[i + 1] === '';
    
    if (isLastLineOfStanza) {
      formattedLines.push(line); // No trailing spaces on last line of stanza
    } else {
      formattedLines.push(line + '  '); // Add two spaces for line break
    }
  }
  
  return formattedLines.join('\n');
}

/**
 * Convert a single .wps file to .md
 */
function convertWpsToMd(wpsFilePath, outputDir) {
  console.log(`\nProcessing: ${path.basename(wpsFilePath)}`);
  
  // Extract text
  const rawText = extractTextFromWps(wpsFilePath);
  if (!rawText) {
    console.error('Failed to extract text');
    return null;
  }
  
  // Parse content
  const parsed = parseWpsContent(rawText);
  console.log(`Title: ${parsed.title}`);
  console.log(`Date: ${parsed.date}`);
  
  // Generate metadata
  const title = parsed.title || path.basename(wpsFilePath, '.wps');
  const date = parseDate(parsed.date);
  const formattedDate = formatDate(date);
  const tags = generateTags(parsed.rawContent, title);
  const excerpt = generateExcerpt(parsed.bodyLines);
  const filename = generateFilename(title);
  
  // Format poem body
  const poemBody = formatPoemBody(parsed.bodyLines);
  
  // Generate frontmatter
  const frontmatter = [
    '---',
    `title: "${title}"`,
    `date: ${formattedDate}`,
    `tags: ${JSON.stringify(tags)}`,
    `excerpt: "${excerpt}"`,
    '---',
    '',
    poemBody,
    ''
  ].join('\n');
  
  // Write to output
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, frontmatter, 'utf8');
  
  console.log(`✓ Created: ${filename}`);
  console.log(`  Tags: ${tags.join(', ')}`);
  console.log(`  Excerpt: ${excerpt.substring(0, 60)}...`);
  
  return outputPath;
}

/**
 * Main function
 */
function main() {
  const inputDir = path.join(__dirname, 'input');
  const outputDir = path.join(__dirname, 'output');
  
  // Find all .wps files
  const wpsFiles = fs.readdirSync(inputDir)
    .filter(file => file.endsWith('.wps'))
    .map(file => path.join(inputDir, file));
  
  if (wpsFiles.length === 0) {
    console.log('No .wps files found in input directory');
    return;
  }
  
  console.log(`Found ${wpsFiles.length} .wps file(s)`);
  
  // Process each file
  for (const wpsFile of wpsFiles) {
    convertWpsToMd(wpsFile, outputDir);
  }
  
  console.log('\n✓ Conversion complete!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { convertWpsToMd, extractTextFromWps, parseWpsContent };
