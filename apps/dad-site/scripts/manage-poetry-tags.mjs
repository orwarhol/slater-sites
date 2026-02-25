#!/usr/bin/env node
/**
 * manage-poetry-tags.mjs
 *
 * Rename or delete tags across all poetry frontmatter files.
 *
 * Usage:
 *   node ./scripts/manage-poetry-tags.mjs rename --from "Old Tag" --to "New Tag" [--dry-run]
 *   node ./scripts/manage-poetry-tags.mjs delete --tag "Tag To Remove" [--dry-run]
 *
 * Only modifies YAML frontmatter `tags:` arrays. Poem body text is never touched.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

const POETRY_DIR = './src/content/poetry';

// ---------------------------------------------------------------------------
// File utilities
// ---------------------------------------------------------------------------

function getPoetryFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...getPoetryFiles(fullPath));
    } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Split file content into frontmatter text and body text.
 * Returns { fmText, body, closingIndex } where fmText is the raw YAML
 * between the opening and closing `---` lines (exclusive), and body is
 * everything after the closing `---\n`.
 */
function splitFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    throw new Error('File does not start with ---');
  }
  let closingIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      closingIndex = i;
      break;
    }
  }
  if (closingIndex === -1) {
    throw new Error('No closing --- found');
  }
  const fmText = lines.slice(1, closingIndex).join('\n');
  const body = lines.slice(closingIndex + 1).join('\n');
  return { fmText, body };
}

/**
 * Reconstruct file content from updated frontmatter text and original body.
 * Preserves the trailing newline convention: body is appended as-is.
 */
function joinFrontmatter(fmText, body) {
  return `---\n${fmText}\n---\n${body}`;
}

// ---------------------------------------------------------------------------
// Tag manipulation
// ---------------------------------------------------------------------------

/**
 * Given a parsed frontmatter object, apply the transform to its tags array.
 * Returns { newTags, changed } where changed is true when tags were modified.
 */
function transformTags(fm, transform) {
  const originalTags = Array.isArray(fm.tags) ? fm.tags : [];
  const newTags = transform(originalTags);
  // Detect change: different length or any element differs
  const changed =
    newTags.length !== originalTags.length ||
    newTags.some((t, i) => t !== originalTags[i]);
  return { newTags, changed, originalTags };
}

// ---------------------------------------------------------------------------
// Main logic
// ---------------------------------------------------------------------------

function processFiles(files, transform, dryRun) {
  const changed = [];

  for (const filepath of files) {
    const content = readFileSync(filepath, 'utf-8');
    let fmText, body;
    try {
      ({ fmText, body } = splitFrontmatter(content));
    } catch (err) {
      console.warn(`  ⚠ Skipping ${filepath}: ${err.message}`);
      continue;
    }

    let fm;
    try {
      fm = parseYaml(fmText);
    } catch (err) {
      console.warn(`  ⚠ Skipping ${filepath}: YAML parse error – ${err.message}`);
      continue;
    }

    if (!fm || !Array.isArray(fm.tags)) {
      // No tags field or not an array — skip silently unless it matters
      continue;
    }

    const { newTags, changed: wasChanged, originalTags } = transformTags(fm, transform);

    if (!wasChanged) continue;

    fm.tags = newTags;

    // Re-serialize only the frontmatter using yaml package.
    // yaml.stringify produces clean YAML. We trim trailing newline from it
    // since joinFrontmatter adds its own structure.
    const newFmText = stringifyYaml(fm).trimEnd();
    const newContent = joinFrontmatter(newFmText, body);

    changed.push({ filepath, originalTags, newTags });

    if (!dryRun) {
      writeFileSync(filepath, newContent, 'utf-8');
    }
  }

  return changed;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const subcommand = args[0];
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--dry-run') {
      flags.dryRun = true;
    } else if (args[i].startsWith('--') && i + 1 < args.length && !args[i + 1].startsWith('--')) {
      flags[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  return { subcommand, flags };
}

function main() {
  const { subcommand, flags } = parseArgs(process.argv);
  const dryRun = flags.dryRun === true;

  if (subcommand === 'rename') {
    const fromTag = flags.from;
    const toTag = flags.to;
    if (!fromTag || !toTag) {
      console.error('Usage: manage-poetry-tags.mjs rename --from "Old Tag" --to "New Tag" [--dry-run]');
      process.exit(1);
    }

    console.log(`${dryRun ? '[DRY RUN] ' : ''}Renaming tag "${fromTag}" → "${toTag}"\n`);

    const files = getPoetryFiles(POETRY_DIR);
    const transform = (tags) => {
      const renamed = tags.map((t) => (t === fromTag ? toTag : t));
      // Dedupe: keep first occurrence of each tag
      return renamed.filter((t, i) => renamed.indexOf(t) === i);
    };

    const changed = processFiles(files, transform, dryRun);

    if (changed.length === 0) {
      console.log(`No files contain tag "${fromTag}". Nothing to do.`);
      process.exit(0);
    }

    for (const { filepath, originalTags, newTags } of changed) {
      console.log(`  ${dryRun ? 'WOULD UPDATE' : 'Updated'}: ${filepath}`);
      console.log(`    before: [${originalTags.join(', ')}]`);
      console.log(`    after:  [${newTags.join(', ')}]`);
    }

    console.log(
      `\n${dryRun ? 'Would update' : 'Updated'} ${changed.length} file(s).`
    );

  } else if (subcommand === 'delete') {
    const tag = flags.tag;
    if (!tag) {
      console.error('Usage: manage-poetry-tags.mjs delete --tag "Tag To Remove" [--dry-run]');
      process.exit(1);
    }

    console.log(`${dryRun ? '[DRY RUN] ' : ''}Deleting tag "${tag}"\n`);

    const files = getPoetryFiles(POETRY_DIR);
    const transform = (tags) => tags.filter((t) => t !== tag);

    const changed = processFiles(files, transform, dryRun);

    if (changed.length === 0) {
      console.log(`No files contain tag "${tag}". Nothing to do.`);
      process.exit(0);
    }

    for (const { filepath, originalTags, newTags } of changed) {
      console.log(`  ${dryRun ? 'WOULD UPDATE' : 'Updated'}: ${filepath}`);
      console.log(`    before: [${originalTags.join(', ')}]`);
      console.log(`    after:  [${newTags.join(', ')}]`);
    }

    console.log(
      `\n${dryRun ? 'Would update' : 'Updated'} ${changed.length} file(s).`
    );

  } else {
    console.error('Unknown subcommand. Use "rename" or "delete".');
    console.error('  node ./scripts/manage-poetry-tags.mjs rename --from "Old Tag" --to "New Tag" [--dry-run]');
    console.error('  node ./scripts/manage-poetry-tags.mjs delete --tag "Tag To Remove" [--dry-run]');
    process.exit(1);
  }
}

main();
