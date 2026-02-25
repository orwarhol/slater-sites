#!/usr/bin/env node
/**
 * manage-poetry-tags.mjs
 *
 * Rename or delete tags in Poetry content frontmatter across all poem files.
 * Only modifies the `tags:` array in YAML frontmatter — never touches poem bodies.
 *
 * Usage (from apps/dad-site):
 *
 *   Rename / merge a tag:
 *     node ./scripts/manage-poetry-tags.mjs rename --from "Old Tag" --to "New Tag" [--dry-run]
 *
 *   Delete a tag:
 *     node ./scripts/manage-poetry-tags.mjs delete --tag "Tag To Remove" [--dry-run]
 *
 * After running, re-run `npm run sync:decorative-images` to keep the registry consistent.
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POETRY_CONTENT_DIR = join(__dirname, '..', 'src', 'content', 'poetry');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const subcommand = args[0];
const dryRun = args.includes('--dry-run');

function getArg(flag) {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

if (subcommand !== 'rename' && subcommand !== 'delete') {
  console.error(
    'Usage:\n' +
    '  node ./scripts/manage-poetry-tags.mjs rename --from "Old Tag" --to "New Tag" [--dry-run]\n' +
    '  node ./scripts/manage-poetry-tags.mjs delete --tag "Tag To Remove" [--dry-run]'
  );
  process.exit(1);
}

let fromTag, toTag, deleteTag;

if (subcommand === 'rename') {
  fromTag = getArg('--from');
  toTag = getArg('--to');
  if (!fromTag || !toTag) {
    console.error('rename requires --from "Old Tag" --to "New Tag"');
    process.exit(1);
  }
} else {
  deleteTag = getArg('--tag');
  if (!deleteTag) {
    console.error('delete requires --tag "Tag To Remove"');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers: parse tags line and rebuild it
// ---------------------------------------------------------------------------

/**
 * Parse the inline tags array from a `tags: [...]` line.
 * Returns an array of tag strings.
 */
function parseTagsLine(line) {
  const match = line.match(/^tags:\s*\[([^\]]*)\]/);
  if (!match) return null;
  const inner = match[1].trim();
  if (!inner) return [];
  return inner
    .split(',')
    .map(t => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
}

/**
 * Serialize a tags array back to an inline YAML tags line.
 */
function buildTagsLine(tags) {
  if (tags.length === 0) return 'tags: []';
  const items = tags.map(t => `"${t}"`).join(',');
  return `tags: [${items}]`;
}

// ---------------------------------------------------------------------------
// Process files
// ---------------------------------------------------------------------------
const contentFiles = readdirSync(POETRY_CONTENT_DIR)
  .filter(f => f.endsWith('.md') || f.endsWith('.mdx'))
  .sort();

let filesChanged = 0;
let totalOperations = 0;

for (const file of contentFiles) {
  const filePath = join(POETRY_CONTENT_DIR, file);
  const original = readFileSync(filePath, 'utf-8');

  // Locate the frontmatter block (must start at top of file)
  const fmEnd = original.indexOf('\n---', 3);
  if (!original.startsWith('---\n') || fmEnd === -1) continue;

  const fmBlock = original.slice(4, fmEnd); // content between opening and closing ---
  const afterFm = original.slice(fmEnd); // includes closing \n--- and body

  // Find and update the tags line within frontmatter only
  const fmLines = fmBlock.split('\n');
  let tagsLineIdx = -1;
  for (let i = 0; i < fmLines.length; i++) {
    if (/^tags:\s*\[/.test(fmLines[i])) {
      tagsLineIdx = i;
      break;
    }
  }

  if (tagsLineIdx === -1) continue; // no inline tags line — skip

  const originalTags = parseTagsLine(fmLines[tagsLineIdx]);
  if (originalTags === null) continue;

  let newTags;

  if (subcommand === 'rename') {
    newTags = originalTags.map(t => (t === fromTag ? toTag : t));
    // Deduplicate: if a poem already had toTag, remove duplicates
    const seen = new Set();
    newTags = newTags.filter(t => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
  } else {
    newTags = originalTags.filter(t => t !== deleteTag);
  }

  // Check if anything changed
  const changed =
    newTags.length !== originalTags.length ||
    newTags.some((t, i) => t !== originalTags[i]);

  if (!changed) continue;

  const ops = subcommand === 'rename'
    ? originalTags.filter(t => t === fromTag).length
    : originalTags.filter(t => t === deleteTag).length;

  filesChanged++;
  totalOperations += ops;

  if (dryRun) {
    console.log(`[dry-run] ${file}`);
    console.log(`  before: ${buildTagsLine(originalTags)}`);
    console.log(`  after:  ${buildTagsLine(newTags)}`);
  } else {
    fmLines[tagsLineIdx] = buildTagsLine(newTags);
    const newFmBlock = fmLines.join('\n');
    const newContent = `---\n${newFmBlock}${afterFm}`;
    writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated: ${file}`);
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
if (filesChanged === 0) {
  if (subcommand === 'rename') {
    console.log(`No files contain the tag ${JSON.stringify(fromTag)}. Nothing to do.`);
  } else {
    console.log(`No files contain the tag ${JSON.stringify(deleteTag)}. Nothing to do.`);
  }
  process.exit(0);
}

if (dryRun) {
  console.log(
    `\n[dry-run] Would ${subcommand === 'rename' ? 'rename' : 'delete'} tag in ${filesChanged} file(s) (${totalOperations} replacement(s)).`
  );
} else {
  console.log(
    `Done. ${subcommand === 'rename' ? 'Renamed' : 'Deleted'} tag in ${filesChanged} file(s) (${totalOperations} replacement(s)).`
  );
}
