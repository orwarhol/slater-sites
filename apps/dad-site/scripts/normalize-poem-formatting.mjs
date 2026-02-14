#!/usr/bin/env node
/**
 * normalize-poem-formatting.mjs
 * 
 * One-off script to normalize line formatting across all poem content files.
 * 
 * This script:
 * - Walks apps/dad-site/src/content/poetry recursively
 * - Processes only .md and .mdx files
 * - Preserves YAML frontmatter exactly as-is
 * - Ensures exactly one blank line after frontmatter
 * - Removes all blank lines in poem body
 * - Adds exactly two spaces at the end of each non-empty line in the body
 * 
 * Reference: mortality-has-its-disadvantages.md shows the desired format
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const POETRY_DIR = './src/content/poetry';

/**
 * Recursively get all .md and .mdx files in a directory
 */
function getPoetryFiles(dir) {
  const files = [];
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getPoetryFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Parse a file into frontmatter and body
 */
function parseFile(content) {
  const lines = content.split('\n');
  
  // Find frontmatter boundaries
  if (lines[0] !== '---') {
    throw new Error('File does not start with frontmatter');
  }
  
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIndex = i;
      break;
    }
  }
  
  if (closingIndex === -1) {
    throw new Error('Could not find closing frontmatter delimiter');
  }
  
  // Extract frontmatter (including the --- delimiters)
  const frontmatter = lines.slice(0, closingIndex + 1).join('\n');
  
  // Extract body (everything after the closing ---)
  const body = lines.slice(closingIndex + 1).join('\n');
  
  return { frontmatter, body };
}

/**
 * Normalize the poem body:
 * 1. Remove all blank/empty lines
 * 2. Add exactly two spaces at the end of each non-empty line
 */
function normalizeBody(body) {
  const lines = body.split('\n');
  const normalizedLines = [];
  
  for (const line of lines) {
    // Skip blank/empty lines (lines that are empty or only whitespace)
    if (line.trim() === '') {
      continue;
    }
    
    // Strip trailing whitespace and add exactly two spaces
    const trimmedLine = line.trimEnd();
    normalizedLines.push(trimmedLine + '  ');
  }
  
  return normalizedLines.join('\n');
}

/**
 * Process a single poem file
 */
function processFile(filepath) {
  try {
    const content = readFileSync(filepath, 'utf-8');
    const { frontmatter, body } = parseFile(content);
    const normalizedBody = normalizeBody(body);
    
    // Reconstruct file: frontmatter + exactly one blank line + normalized body
    const newContent = frontmatter + '\n\n' + normalizedBody + '\n';
    
    writeFileSync(filepath, newContent, 'utf-8');
    return { success: true, filepath };
  } catch (error) {
    return { success: false, filepath, error: error.message };
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Starting poem formatting normalization...\n');
  
  const files = getPoetryFiles(POETRY_DIR);
  console.log(`Found ${files.length} poetry files to process\n`);
  
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };
  
  for (const file of files) {
    const result = processFile(file);
    if (result.success) {
      results.success++;
      console.log(`✓ ${file}`);
    } else {
      results.failed++;
      results.errors.push(result);
      console.log(`✗ ${file}: ${result.error}`);
    }
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`Successfully processed: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log(`  ${e.filepath}: ${e.error}`));
    process.exit(1);
  }
}

main();
