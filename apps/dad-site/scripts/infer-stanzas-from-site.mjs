#!/usr/bin/env node
/**
 * infer-stanzas-from-site.mjs
 *
 * Fetches canonical poem pages from charlesslater.com, extracts stanza breaks,
 * and applies them to local poem Markdown files with high-confidence only.
 *
 * Usage:
 *   node scripts/infer-stanzas-from-site.mjs [options]
 *
 * Options:
 *   --dry-run     (default) Don't write changes; just report
 *   --write       Actually write changes to poem files
 *   --limit=N     Process only first N poems
 *   --keep-tmp    Keep temp files even on success
 *
 * Outputs:
 *   Console summary
 *   apps/dad-site/scripts/stanza-inference-report.json
 */

import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Configuration ────────────────────────────────────────────────────────────

const POETRY_DIR = join(__dirname, '../src/content/poetry');
const REPORT_PATH = join(__dirname, 'stanza-inference-report.json');
const BASE_URL = 'https://charlesslater.com';
const CONFIDENCE_THRESHOLD = 0.95; // ≥95% of lines must align cleanly

// ─── CLI Argument Parsing ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const WRITE_MODE = args.includes('--write');
const DRY_RUN = !WRITE_MODE;
const KEEP_TMP = args.includes('--keep-tmp');

let LIMIT = Infinity;
const limitArg = args.find(a => a.startsWith('--limit='));
if (limitArg) {
  const n = parseInt(limitArg.split('=')[1], 10);
  if (!isNaN(n) && n > 0) LIMIT = n;
}

// ─── Frontmatter Parsing ──────────────────────────────────────────────────────

/**
 * Parse a markdown file into frontmatter block and body.
 * @returns {{ frontmatter: string, body: string }}
 */
function parseFile(content) {
  const lines = content.split('\n');

  if (lines[0] !== '---') {
    throw new Error('File does not start with frontmatter delimiter');
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

  // frontmatter includes both --- delimiters
  const frontmatter = lines.slice(0, closingIndex + 1).join('\n');
  // body is everything after the closing ---
  const body = lines.slice(closingIndex + 1).join('\n');

  return { frontmatter, body };
}

/**
 * Extract title and date from YAML frontmatter string.
 * @returns {{ title: string, date: Date }}
 */
function extractFrontmatterFields(frontmatter) {
  const titleMatch = frontmatter.match(/^title:\s*"(.+?)"\s*$/m)
    || frontmatter.match(/^title:\s*'(.+?)'\s*$/m)
    || frontmatter.match(/^title:\s*(.+?)\s*$/m);

  const dateMatch = frontmatter.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);

  const title = titleMatch ? titleMatch[1].trim() : '';
  const dateStr = dateMatch ? dateMatch[1] : '';
  const date = dateStr ? new Date(dateStr + 'T00:00:00Z') : null;

  return { title, date };
}

// ─── URL Generation ───────────────────────────────────────────────────────────

/**
 * Slugify a poem title to match WordPress URL conventions:
 *   - lowercase
 *   - spaces → hyphens
 *   - remove characters that are not alphanumeric or hyphens
 *   - collapse consecutive hyphens
 *   - strip leading/trailing hyphens
 */
function slugifyTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Compute the canonical URL for a poem on charlesslater.com.
 * Format: /poetry/YYYY/MM/slug/
 */
function computeCanonicalUrl(title, date) {
  const slug = slugifyTitle(title);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${BASE_URL}/poetry/${year}/${month}/${slug}/`;
}

// ─── HTML Fetching ────────────────────────────────────────────────────────────

/**
 * Fetch a URL and return the HTML body as a string.
 * Returns null on error (network error, non-200 status, etc.).
 */
async function fetchPage(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StanzaInferenceBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return { html: null, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    return { html, error: null };
  } catch (err) {
    return { html: null, error: err.message || String(err) };
  }
}

// ─── HTML Poem Extraction ─────────────────────────────────────────────────────

/**
 * Decode common HTML entities.
 */
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8220;/g, '\u201c') // left double quote
    .replace(/&#8221;/g, '\u201d') // right double quote
    .replace(/&#8216;/g, '\u2018') // left single quote
    .replace(/&#8217;/g, '\u2019') // right single quote
    .replace(/&#8230;/g, '\u2026') // ellipsis
    .replace(/&#8212;/g, '\u2014') // em dash
    .replace(/&#8211;/g, '\u2013') // en dash
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, m => {
      const code = parseInt(m.slice(2, -1), 10);
      return String.fromCharCode(code);
    })
    .replace(/&[a-z]+;/gi, ' ');
}

/**
 * Strip all HTML tags from a string.
 */
function stripTags(str) {
  return str.replace(/<[^>]*>/g, '');
}

/**
 * Extract poem body from WordPress HTML.
 *
 * Returns an array of "blocks" where each block is an array of non-empty
 * text lines. Blank separation between blocks = stanza breaks.
 *
 * Strategy:
 * 1. Find the main content area (entry-content / post-content / article).
 * 2. Remove nav, footer, aside, .tags, .post-navigation elements.
 * 3. Split on <p> boundaries and <br> within paragraphs.
 * 4. Non-empty paragraphs separated by others = stanza breaks.
 */
function extractPoemBodyFromHtml(html) {
  // Normalize newlines
  let content = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // ── Step 1: Isolate main content area ──────────────────────────────────────

  // Try to find WordPress content div
  const contentPatterns = [
    /class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  let mainContent = null;
  for (const pattern of contentPatterns) {
    const match = content.match(pattern);
    if (match) {
      mainContent = match[1];
      break;
    }
  }

  if (!mainContent) {
    // Fall back to body
    const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    mainContent = bodyMatch ? bodyMatch[1] : content;
  }

  // ── Step 2: Remove navigation, footer, sidebar, metadata elements ──────────

  const removePatterns = [
    /<nav[\s\S]*?<\/nav>/gi,
    /<footer[\s\S]*?<\/footer>/gi,
    /<aside[\s\S]*?<\/aside>/gi,
    /<header[\s\S]*?<\/header>/gi,
    // WordPress post-navigation / entry-navigation
    /<div[^>]*class="[^"]*(?:nav-links|post-navigation|entry-footer|entry-meta|tags|post-tags|entry-header|page-header)[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    // Scripts and styles
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    // Comments
    /<!--[\s\S]*?-->/g,
    // Heading tags (h1-h3 contain title/date metadata)
    /<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/gi,
    // Author/date metadata spans
    /<(?:span|div)[^>]*class="[^"]*(?:author|date|time|posted|byline|entry-date|published)[^"]*"[^>]*>[\s\S]*?<\/(?:span|div)>/gi,
    // "Previous" / "Next" post links
    /<div[^>]*class="[^"]*prev-next[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
  ];

  let cleaned = mainContent;
  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // ── Step 3: Convert <br> tags to newline markers within paragraphs ──────────

  // Replace <br> with a special marker so we can split lines within paragraphs
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // ── Step 4: Extract text from <p> blocks, treating each <p> as a stanza ───

  const blocks = [];
  let currentBlock = [];

  // Split by <p> or </p> boundaries
  const pParts = cleaned.split(/<\/?p[^>]*>/i);

  for (const part of pParts) {
    // Strip remaining HTML tags
    const text = decodeHtmlEntities(stripTags(part));

    // Split by newlines (from <br> conversion)
    const rawLines = text.split('\n');
    const lines = rawLines
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length > 0) {
      // This <p> block has content — treat it as a stanza
      blocks.push(lines);
    }
    // Empty <p> = blank block = stanza separator (we don't push empty blocks,
    // just let the gap between blocks represent a stanza break)
  }

  // Also handle content not wrapped in <p> tags: look for runs of lines
  // separated by blank lines (double newlines) within the remaining content
  if (blocks.length === 0) {
    // Fall back: just split the entire text by blank lines
    const allText = decodeHtmlEntities(stripTags(cleaned));
    const paragraphs = allText.split(/\n{2,}/);
    for (const para of paragraphs) {
      const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        blocks.push(lines);
      }
    }
  }

  return blocks;
}

// ─── Text Normalization ───────────────────────────────────────────────────────

/**
 * Normalize a line for fuzzy comparison:
 * - Normalize NBSP → space
 * - Normalize smart quotes → straight quotes
 * - Collapse multiple spaces to one
 * - Trim whitespace
 * - Lowercase
 */
function normalizeForMatching(line) {
  return line
    .replace(/\u00a0/g, ' ')          // NBSP → space
    .replace(/\u2018|\u2019/g, "'")   // smart single quotes → '
    .replace(/\u201c|\u201d/g, '"')   // smart double quotes → "
    .replace(/\u2026/g, '...')        // ellipsis → ...
    .replace(/\u2013/g, '-')          // en dash → -
    .replace(/\u2014/g, '--')         // em dash → --
    .replace(/  +/g, ' ')             // collapse multiple spaces
    .replace(/\s+$/, '')              // trim trailing whitespace
    .trim()
    .toLowerCase();
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Similarity between two strings: 1 - (editDistance / maxLen).
 */
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─── Stanza Break Inference ───────────────────────────────────────────────────

/**
 * Get the non-empty lines from a poem body string.
 * Strips trailing "two-space" formatting for comparison purposes.
 */
function getBodyLines(body) {
  return body
    .split('\n')
    .filter(l => l.trim() !== '')
    .map(l => l.trimEnd().replace(/  $/, '').trim());
}

/**
 * Flatten site blocks to a list of lines (for counting).
 */
function flattenBlocks(blocks) {
  return blocks.flat();
}

/**
 * Align local poem lines to site blocks and compute stanza breaks.
 *
 * Returns:
 *   { confidence, stanzaBreaks: Set<number>, matchDetails }
 *
 * stanzaBreaks is a Set of 0-based indices into localLines where a blank
 * line should be inserted BEFORE that line.
 *
 * confidence is the fraction of local lines that matched cleanly.
 */
function inferStanzaBreaks(localLines, siteBlocks) {
  const siteFlat = flattenBlocks(siteBlocks);

  // Quick sanity: if line counts diverge significantly, low confidence
  const lineCountRatio = localLines.length / Math.max(siteFlat.length, 1);
  if (lineCountRatio < 0.7 || lineCountRatio > 1.43) {
    return {
      confidence: 0,
      stanzaBreaks: new Set(),
      reason: `line count mismatch: local=${localLines.length} site=${siteFlat.length}`,
    };
  }

  // Build a map from site line index to {blockIndex, positionInBlock}
  const siteLineMap = [];
  for (let b = 0; b < siteBlocks.length; b++) {
    for (let p = 0; p < siteBlocks[b].length; p++) {
      siteLineMap.push({ blockIndex: b, positionInBlock: p, line: siteBlocks[b][p] });
    }
  }

  // Try to align local lines to site lines in order
  let siteIdx = 0;
  let matchCount = 0;
  const localToSite = new Map(); // localLineIdx → siteLineIdx

  for (let li = 0; li < localLines.length; li++) {
    const localNorm = normalizeForMatching(localLines[li]);

    // Look for a matching site line starting from current position
    let found = false;
    for (let si = siteIdx; si < Math.min(siteIdx + 3, siteLineMap.length); si++) {
      const siteNorm = normalizeForMatching(siteLineMap[si].line);

      // Exact match after normalization
      if (localNorm === siteNorm) {
        localToSite.set(li, si);
        siteIdx = si + 1;
        matchCount++;
        found = true;
        break;
      }

      // Fuzzy match with conservative threshold (0.85 similarity)
      const sim = similarity(localNorm, siteNorm);
      if (sim >= 0.85 && localNorm.length > 5) {
        localToSite.set(li, si);
        siteIdx = si + 1;
        matchCount++;
        found = true;
        break;
      }
    }

    if (!found) {
      // Try a wider search window for potential skip
      for (let si = siteIdx; si < Math.min(siteIdx + 6, siteLineMap.length); si++) {
        const siteNorm = normalizeForMatching(siteLineMap[si].line);
        if (normalizeForMatching(localLines[li]) === siteNorm) {
          localToSite.set(li, si);
          siteIdx = si + 1;
          matchCount++;
          found = true;
          break;
        }
      }
    }
  }

  const confidence = matchCount / localLines.length;

  if (confidence < CONFIDENCE_THRESHOLD) {
    return {
      confidence,
      stanzaBreaks: new Set(),
      reason: `confidence too low: ${(confidence * 100).toFixed(1)}% (${matchCount}/${localLines.length} lines matched)`,
    };
  }

  // Build stanza break set: a break before localLine[li] if:
  //   - localLine[li] maps to a site line
  //   - localLine[li-1] maps to a site line
  //   - The site lines are in different blocks
  const stanzaBreaks = new Set();

  for (let li = 1; li < localLines.length; li++) {
    const prevSiteIdx = localToSite.get(li - 1);
    const currSiteIdx = localToSite.get(li);

    if (prevSiteIdx !== undefined && currSiteIdx !== undefined) {
      const prevBlock = siteLineMap[prevSiteIdx].blockIndex;
      const currBlock = siteLineMap[currSiteIdx].blockIndex;

      if (currBlock > prevBlock) {
        stanzaBreaks.add(li);
      }
    }
  }

  return { confidence, stanzaBreaks, reason: null };
}

// ─── Content Rewriting ────────────────────────────────────────────────────────

/**
 * Apply inferred stanza breaks to a poem body string.
 *
 * @param {string} body - Original poem body (after frontmatter).
 * @param {Set<number>} stanzaBreaks - Set of local-line indices before which to insert blank lines.
 * @returns {string} New body with blank lines inserted.
 */
function applyStanzaBreaks(body, stanzaBreaks) {
  const lines = body.split('\n');

  // Build a list of non-blank line indices (in original file order)
  const nonBlankIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      nonBlankIndices.push(i);
    }
  }

  // stanzaBreaks uses 0-based indices into localLines (non-blank lines)
  // We need to insert blank lines in the original file before the corresponding line

  // Work backwards to avoid shifting indices
  const insertBefore = new Set();
  for (const li of stanzaBreaks) {
    if (li < nonBlankIndices.length) {
      insertBefore.add(nonBlankIndices[li]);
    }
  }

  const result = [];
  for (let i = 0; i < lines.length; i++) {
    if (insertBefore.has(i)) {
      result.push('');
    }
    result.push(lines[i]);
  }

  return result.join('\n');
}

// ─── Sanity Checks ────────────────────────────────────────────────────────────

/**
 * Verify that the proposed new file content is safe to write:
 * 1. Frontmatter block is byte-for-byte identical.
 * 2. Poem body (excluding blank lines) is identical line-by-line.
 * 3. The only differences are newly inserted blank lines.
 *
 * @returns {{ ok: boolean, reason?: string }}
 */
function runSanityChecks(originalContent, newContent, originalFrontmatter) {
  // Check 1: frontmatter must be byte-identical
  const { frontmatter: newFrontmatter } = parseFile(newContent);
  if (newFrontmatter !== originalFrontmatter) {
    return { ok: false, reason: 'frontmatter_changed' };
  }

  // Check 2: body lines (excluding blanks) must be identical
  const { body: originalBody } = parseFile(originalContent);
  const { body: newBody } = parseFile(newContent);

  const origNonBlank = originalBody.split('\n').filter(l => l.trim() !== '');
  const newNonBlank = newBody.split('\n').filter(l => l.trim() !== '');

  if (origNonBlank.length !== newNonBlank.length) {
    return {
      ok: false,
      reason: `body_line_count_changed: orig=${origNonBlank.length} new=${newNonBlank.length}`,
    };
  }

  for (let i = 0; i < origNonBlank.length; i++) {
    if (origNonBlank[i] !== newNonBlank[i]) {
      return {
        ok: false,
        reason: `body_line_mismatch at line ${i + 1}: orig=${JSON.stringify(origNonBlank[i])} new=${JSON.stringify(newNonBlank[i])}`,
      };
    }
  }

  // Check 3: new content should have more blank lines than original (if stanzas inserted)
  const origBlanks = originalBody.split('\n').filter(l => l.trim() === '').length;
  const newBlanks = newBody.split('\n').filter(l => l.trim() === '').length;
  if (newBlanks < origBlanks) {
    return { ok: false, reason: 'blank_lines_decreased' };
  }

  return { ok: true };
}

// ─── File Discovery ───────────────────────────────────────────────────────────

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
  return files.sort(); // deterministic order
}

// ─── Main Processing ──────────────────────────────────────────────────────────

async function processPoem(filepath) {
  const filename = filepath.split('/').pop();
  let content;
  try {
    content = readFileSync(filepath, 'utf-8');
  } catch (err) {
    return { status: 'skipped', reason: `read_error: ${err.message}`, filepath };
  }

  let frontmatter, body;
  try {
    ({ frontmatter, body } = parseFile(content));
  } catch (err) {
    return { status: 'skipped', reason: `parse_error: ${err.message}`, filepath };
  }

  let title, date;
  try {
    ({ title, date } = extractFrontmatterFields(frontmatter));
    if (!title) throw new Error('no title');
    if (!date || isNaN(date.getTime())) throw new Error('invalid date');
  } catch (err) {
    return { status: 'skipped', reason: `frontmatter_field_error: ${err.message}`, filepath };
  }

  const canonicalUrl = computeCanonicalUrl(title, date);

  // Fetch the canonical page
  const { html, error: fetchError } = await fetchPage(canonicalUrl);
  if (!html) {
    return { status: 'skipped', reason: `fetch_failed: ${fetchError}`, filepath, canonicalUrl };
  }

  // Extract poem body from HTML
  const siteBlocks = extractPoemBodyFromHtml(html);
  const siteFlat = flattenBlocks(siteBlocks);

  if (siteFlat.length < 3) {
    return {
      status: 'skipped',
      reason: `extraction_too_short: only ${siteFlat.length} lines extracted from site`,
      filepath,
      canonicalUrl,
    };
  }

  // Get local non-blank lines
  const localLines = getBodyLines(body);

  if (localLines.length < 2) {
    return { status: 'skipped', reason: 'poem_too_short', filepath };
  }

  // Infer stanza breaks
  const { confidence, stanzaBreaks, reason: inferReason } = inferStanzaBreaks(localLines, siteBlocks);

  if (inferReason) {
    return {
      status: 'skipped',
      reason: `low_confidence: ${inferReason}`,
      filepath,
      canonicalUrl,
      confidence,
    };
  }

  if (stanzaBreaks.size === 0) {
    return {
      status: 'no_changes',
      reason: 'no stanza breaks detected (single stanza or already correct)',
      filepath,
      canonicalUrl,
      confidence,
    };
  }

  // Apply stanza breaks to body
  const newBody = applyStanzaBreaks(body, stanzaBreaks);
  const newContent = frontmatter + '\n\n' + newBody.replace(/^\n+/, '') + (newBody.endsWith('\n') ? '' : '\n');

  // Run sanity checks before writing
  const sanity = runSanityChecks(content, newContent, frontmatter);
  if (!sanity.ok) {
    return {
      status: 'skipped',
      reason: `sanity_check_failed: ${sanity.reason}`,
      filepath,
      canonicalUrl,
      confidence,
    };
  }

  if (DRY_RUN) {
    return {
      status: 'would_update',
      filepath,
      canonicalUrl,
      confidence,
      stanzasInserted: stanzaBreaks.size,
    };
  }

  // Write mode: use temp file safety valve
  const tmpPath = filepath + '.stanza.tmp.md';

  try {
    writeFileSync(tmpPath, newContent, 'utf-8');
  } catch (err) {
    return {
      status: 'skipped',
      reason: `tmp_write_error: ${err.message}`,
      filepath,
      canonicalUrl,
    };
  }

  // Overwrite original
  try {
    writeFileSync(filepath, newContent, 'utf-8');
  } catch (err) {
    // Leave tmp file for inspection
    return {
      status: 'skipped',
      reason: `write_error: ${err.message}`,
      filepath,
      canonicalUrl,
      tmpPath,
    };
  }

  // Clean up tmp file (unless --keep-tmp)
  if (!KEEP_TMP) {
    try { unlinkSync(tmpPath); } catch (_) { /* ignore */ }
  }

  return {
    status: 'updated',
    filepath,
    canonicalUrl,
    confidence,
    stanzasInserted: stanzaBreaks.size,
  };
}

async function main() {
  console.log('=== Stanza Inference Script ===');
  console.log(`Mode: ${DRY_RUN ? 'dry-run (no files written)' : 'WRITE'}`);
  if (LIMIT < Infinity) console.log(`Limit: ${LIMIT} poems`);
  console.log('');

  const files = getPoetryFiles(POETRY_DIR);
  const filesToProcess = files.slice(0, LIMIT);
  console.log(`Found ${files.length} poem files. Processing ${filesToProcess.length}.\n`);

  const report = {
    stats: {
      total: filesToProcess.length,
      updatedCount: 0,
      wouldUpdateCount: 0,
      noChangesCount: 0,
      skippedCount: 0,
    },
    updated: [],
    wouldUpdate: [],
    noChanges: [],
    skipped: [],
  };

  for (const filepath of filesToProcess) {
    const result = await processPoem(filepath);
    const shortPath = filepath.replace(POETRY_DIR + '/', '');

    switch (result.status) {
      case 'updated':
        report.updated.push(filepath);
        report.stats.updatedCount++;
        console.log(`✓ UPDATED   ${shortPath} (${result.stanzasInserted} stanza break(s), confidence=${(result.confidence * 100).toFixed(1)}%)`);
        break;

      case 'would_update':
        report.wouldUpdate.push({ file: filepath, stanzasInserted: result.stanzasInserted, confidence: result.confidence });
        report.stats.wouldUpdateCount++;
        console.log(`~ DRY-RUN   ${shortPath} (${result.stanzasInserted} stanza break(s), confidence=${(result.confidence * 100).toFixed(1)}%)`);
        break;

      case 'no_changes':
        report.noChanges.push({ file: filepath, reason: result.reason });
        report.stats.noChangesCount++;
        console.log(`= NO-CHANGE ${shortPath} — ${result.reason}`);
        break;

      case 'skipped':
        report.skipped.push({ file: filepath, reason: result.reason });
        report.stats.skippedCount++;
        console.log(`✗ SKIPPED   ${shortPath} — ${result.reason}`);
        break;
    }
  }

  // Summary
  console.log('\n=== Summary ===');
  if (DRY_RUN) {
    console.log(`Would update:  ${report.stats.wouldUpdateCount}`);
  } else {
    console.log(`Updated:       ${report.stats.updatedCount}`);
  }
  console.log(`No changes:    ${report.stats.noChangesCount}`);
  console.log(`Skipped:       ${report.stats.skippedCount}`);
  console.log(`Total:         ${report.stats.total}`);

  // Write JSON report
  const jsonReport = {
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? 'dry-run' : 'write',
    stats: report.stats,
    updated: report.updated,
    wouldUpdate: report.wouldUpdate,
    noChanges: report.noChanges,
    skipped: report.skipped,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(jsonReport, null, 2) + '\n', 'utf-8');
  console.log(`\nReport written to: ${REPORT_PATH}`);

  // Exit with non-zero if nothing was updated and there were failures
  if (!DRY_RUN && report.stats.updatedCount === 0 && report.stats.skippedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
