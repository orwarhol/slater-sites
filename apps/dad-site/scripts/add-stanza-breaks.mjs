#!/usr/bin/env node
/**
 * add-stanza-breaks.mjs
 *
 * One-time script to add stanza breaks (blank lines) to flat poem MD files,
 * using the WordPress XML export as the source of truth for stanza structure.
 *
 * Usage:
 *   node add-stanza-breaks.mjs           # dry run: show what would change
 *   node add-stanza-breaks.mjs --write   # write to *.stanza.tmp.md sibling files
 *   node add-stanza-breaks.mjs --apply   # apply *.stanza.tmp.md → original files
 */

import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POETRY_DIR = join(__dirname, '../src/content/poetry');
const XML_FILE = join(__dirname, 'Squarespace-Wordpress-Export-02-23-2026.xml');

/** Minimum fraction of lines that must match for alignment to pass */
const MATCH_THRESHOLD = 0.95;

const args = process.argv.slice(2);
const doWrite = args.includes('--write');
const doApply = args.includes('--apply');

// ─── Normalization ─────────────────────────────────────────────────────────────

/**
 * Normalize a single line for matching purposes only (not for writing).
 * Strips trailing whitespace, all markdown bold/italic markers (_ and *),
 * collapses spaces, and normalises smart quotes / NBSP.
 */
function normalizeLine(line) {
  return line
    .replace(/\u00a0/g, ' ')          // NBSP → regular space
    .replace(/\u2018|\u2019/g, "'")   // smart single quotes → straight
    .replace(/\u201c|\u201d/g, '"')   // smart double quotes → straight
    .replace(/\\/g, '')               // remove backslashes (YAML escapes)
    .trimEnd()                        // strip trailing whitespace (incl. two-space line breaks)
    .replace(/[_*]/g, '')             // strip all markdown bold/italic markers
    .replace(/ {2,}/g, ' ')          // collapse multiple spaces to one
    .trim();
}

/** Normalize a title string for case-insensitive comparison. */
function normalizeTitle(t) {
  return t
    .replace(/\u00a0/g, ' ')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\\"/g, '"')             // unescape YAML \" sequences
    .replace(/\\'/g, "'")             // unescape YAML \' sequences
    .replace(/\\/g, '')
    .replace(/ {2,}/g, ' ')
    .toLowerCase()
    .trim();
}

// ─── XML Parsing ───────────────────────────────────────────────────────────────

/** Extract all <item> entries from the WordPress XML export. */
function parseXmlItems(xml) {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const raw = m[1];
    const titleM = raw.match(/<title>([\s\S]*?)<\/title>/);
    const dateM = raw.match(/<wp:post_date>([\s\S]*?)<\/wp:post_date>/);
    const contentM = raw.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
    if (!titleM || !contentM) continue;
    items.push({
      title: titleM[1].trim(),
      date: dateM ? dateM[1].trim().slice(0, 7) : '', // YYYY-MM
      html: contentM[1],
    });
  }
  return items;
}

/**
 * Convert HTML poem content to an array of stanzas.
 * Each stanza is an array of plain-text lines.
 * - <br> / <br /> within a <p> → line break within a stanza
 * - <p>...</p> boundary → stanza break
 */
function htmlToStanzas(html) {
  // Normalise line break tags before extracting <p> blocks
  let content = html
    .replace(/<br\s*\/?>\s*/gi, '\n')
    .replace(/\r\n/g, '\n');

  function decodeEntities(s) {
    return s
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)));
  }

  const stanzas = [];
  const pRe = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRe.exec(content)) !== null) {
    const inner = pm[1]
      .replace(/<[^>]+>/g, '') // strip remaining HTML tags
      .replace(/\n+$/, '');    // strip trailing newlines from block
    const text = decodeEntities(inner);
    const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim() !== '');
    if (lines.length > 0) stanzas.push(lines);
  }

  // Fallback for content without <p> tags: split on blank lines
  if (stanzas.length === 0) {
    const plain = decodeEntities(content.replace(/<[^>]+>/g, ''));
    for (const block of plain.split(/\n[ \t]*\n/)) {
      const lines = block.split('\n').map(l => l.trimEnd()).filter(l => l.trim() !== '');
      if (lines.length > 0) stanzas.push(lines);
    }
  }

  return stanzas;
}

// ─── MD File Parsing ───────────────────────────────────────────────────────────

/** Split a poem MD file into frontmatter lines and body lines. */
function parseMdFile(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') throw new Error('Missing opening ---');
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx < 0) throw new Error('Missing closing ---');
  return {
    fmLines: lines.slice(0, closeIdx + 1),
    bodyLines: lines.slice(closeIdx + 1),
  };
}

/** Extract title value from frontmatter lines, unescaping YAML sequences. */
function extractTitle(fmLines) {
  for (const l of fmLines) {
    const m = l.match(/^title:\s*"(.*)"$/) ||
              l.match(/^title:\s*'(.*)'$/) ||
              l.match(/^title:\s*(.+)$/);
    if (m) {
      return m[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\')
        .trim();
    }
  }
  return '';
}

/** Extract YYYY-MM date prefix from frontmatter lines. */
function extractDateYM(fmLines) {
  for (const l of fmLines) {
    const m = l.match(/^date:\s*(\d{4}-\d{2})/);
    if (m) return m[1];
  }
  return '';
}

/**
 * Returns true if the body already contains at least one blank line between
 * two non-empty lines (i.e. the poem already has stanza breaks).
 */
function hasStanzaBreaks(bodyLines) {
  let seenNonEmpty = false;
  let seenBlank = false;
  for (const l of bodyLines) {
    if (l.trim() === '') {
      if (seenNonEmpty) seenBlank = true;
    } else {
      if (seenBlank) return true;
      seenNonEmpty = true;
    }
  }
  return false;
}

// ─── Matching ──────────────────────────────────────────────────────────────────

/** Find the best-matching XML item for an MD poem. */
function matchXmlItem(mdTitle, mdDateYM, xmlItems) {
  const normMd = normalizeTitle(mdTitle);
  const candidates = xmlItems.filter(item => normalizeTitle(item.title) === normMd);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  // Disambiguate by YYYY-MM date when multiple titles match
  const byDate = candidates.filter(c => c.date.startsWith(mdDateYM));
  if (byDate.length > 0) return byDate[0];
  return candidates[0];
}

/**
 * Check that at least MATCH_THRESHOLD fraction of body lines correspond to
 * XML stanza lines (positional comparison after normalization).
 * Image lines (![...]) are excluded from the comparison.
 */
function checkAlignment(bodyLines, stanzas) {
  const mdLines = bodyLines
    .filter(l => l.trim() !== '' && !/^\s*!\[/.test(l))
    .map(normalizeLine);
  const xmlLines = stanzas.flat().map(normalizeLine);
  if (mdLines.length === 0 || xmlLines.length === 0) return false;
  const minLen = Math.min(mdLines.length, xmlLines.length);
  let matches = 0;
  for (let i = 0; i < minLen; i++) {
    if (mdLines[i] === xmlLines[i]) matches++;
  }
  const total = Math.max(mdLines.length, xmlLines.length);
  return (matches / total) >= MATCH_THRESHOLD;
}

// ─── Stanza Insertion ──────────────────────────────────────────────────────────

/**
 * Rebuild the body with stanza breaks inserted according to the XML stanza
 * structure. Leading blank lines (separator after frontmatter) are preserved.
 * Non-empty lines are never modified.
 */
function insertStanzaBreaks(bodyLines, stanzas) {
  const result = [];
  let lineIdx = 0;

  // Preserve leading blank lines (the blank line after the --- delimiter)
  while (lineIdx < bodyLines.length && bodyLines[lineIdx].trim() === '') {
    result.push(bodyLines[lineIdx]);
    lineIdx++;
  }

  for (let s = 0; s < stanzas.length; s++) {
    for (let l = 0; l < stanzas[s].length; l++) {
      // Skip any unexpected blank lines in the flat source
      while (lineIdx < bodyLines.length && bodyLines[lineIdx].trim() === '') {
        lineIdx++;
      }
      if (lineIdx < bodyLines.length) {
        result.push(bodyLines[lineIdx]);
        lineIdx++;
      }
    }
    // Insert a single blank line between stanzas (not after the last one)
    if (s < stanzas.length - 1) {
      result.push('');
    }
  }

  // Append any remaining lines (e.g. trailing newline sentinel)
  while (lineIdx < bodyLines.length) {
    result.push(bodyLines[lineIdx]);
    lineIdx++;
  }

  return result;
}

// ─── File Helpers ──────────────────────────────────────────────────────────────

function getPoetryFiles() {
  return readdirSync(POETRY_DIR)
    .filter(n => (n.endsWith('.md') || n.endsWith('.mdx')) && !n.endsWith('.stanza.tmp.md'))
    .sort()
    .map(n => join(POETRY_DIR, n));
}

function tmpPath(fp) {
  const ext = extname(fp);
  return fp.slice(0, -ext.length) + '.stanza.tmp.md';
}

// ─── Main ──────────────────────────────────────────────────────────────────────

function main() {
  // --apply mode: rename *.stanza.tmp.md files back to their originals
  if (doApply) {
    const files = getPoetryFiles();
    let applied = 0;
    for (const fp of files) {
      const tmp = tmpPath(fp);
      if (existsSync(tmp)) {
        renameSync(tmp, fp);
        console.log(`✓ Applied: ${basename(fp)}`);
        applied++;
      }
    }
    console.log(`\nApplied ${applied} file(s).`);
    return;
  }

  const xml = readFileSync(XML_FILE, 'utf-8');
  const xmlItems = parseXmlItems(xml);
  console.log(`Loaded ${xmlItems.length} XML items.\n`);

  const stats = {
    alreadyHasBreaks: 0,
    noMatch: 0,
    singleStanza: 0,
    poorAlignment: 0,
    updated: 0,
  };

  for (const fp of getPoetryFiles()) {
    const name = basename(fp);
    const content = readFileSync(fp, 'utf-8');
    let parsed;
    try {
      parsed = parseMdFile(content);
    } catch (e) {
      console.error(`  ERROR parsing ${name}: ${e.message}`);
      continue;
    }

    const { fmLines, bodyLines } = parsed;

    if (hasStanzaBreaks(bodyLines)) {
      stats.alreadyHasBreaks++;
      continue;
    }

    const mdTitle = extractTitle(fmLines);
    const mdDateYM = extractDateYM(fmLines);
    const xmlItem = matchXmlItem(mdTitle, mdDateYM, xmlItems);

    if (!xmlItem) {
      stats.noMatch++;
      console.log(`  SKIP (no XML match):       ${name}  title="${mdTitle}"`);
      continue;
    }

    const stanzas = htmlToStanzas(xmlItem.html);

    if (stanzas.length <= 1) {
      stats.singleStanza++;
      console.log(`  SKIP (XML has 1 stanza):   ${name}`);
      continue;
    }

    if (!checkAlignment(bodyLines, stanzas)) {
      const mdCount = bodyLines.filter(l => l.trim() !== '').length;
      const xmlCount = stanzas.flat().length;
      stats.poorAlignment++;
      console.log(`  SKIP (poor alignment):     ${name}  MD=${mdCount} XML=${xmlCount}`);
      continue;
    }

    const newBodyLines = insertStanzaBreaks(bodyLines, stanzas);
    const newContent = fmLines.join('\n') + '\n' + newBodyLines.join('\n');
    // Ensure exactly one trailing newline
    const finalContent = newContent.replace(/\n*$/, '\n');

    stats.updated++;
    console.log(`  UPDATE: ${name}  (${stanzas.length} stanzas)`);

    if (doWrite) {
      const tmp = tmpPath(fp);
      writeFileSync(tmp, finalContent, 'utf-8');
    }
  }

  console.log('\n─── Summary ──────────────────────────────────────────────────────');
  console.log(`  Already has stanza breaks (skipped):  ${stats.alreadyHasBreaks}`);
  console.log(`  No XML match (skipped):               ${stats.noMatch}`);
  console.log(`  XML has only 1 stanza (skipped):      ${stats.singleStanza}`);
  console.log(`  Poor content alignment (skipped):     ${stats.poorAlignment}`);
  console.log(`  Would update / updated:               ${stats.updated}`);
  if (!doWrite && stats.updated > 0) {
    console.log('\nRun with --write to write *.stanza.tmp.md staging files.');
    console.log('After reviewing, run with --apply to apply them to the originals.');
  }
}

main();
