#!/usr/bin/env node
/**
 * sync-decorative-image-registry.mjs
 *
 * Scans all poetry content files, collects unique tags, and ensures every tag
 * appears in the decorative image registry. Adds missing tags (alphabetically)
 * with a null value. Does NOT remove existing registry entries.
 *
 * Also warns about:
 *  - Near-duplicate tags (differ only by casing / whitespace)
 *  - Registry-mapped filenames that do not exist in public/poetry/
 *
 * Usage (from apps/dad-site):
 *   node ./scripts/sync-decorative-image-registry.mjs
 */

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = join(__dirname, '..');
const POETRY_CONTENT_DIR = join(SITE_ROOT, 'src', 'content', 'poetry');
const REGISTRY_FILE = join(SITE_ROOT, 'src', 'utils', 'decorativeImages.ts');
const PUBLIC_POETRY_DIR = join(SITE_ROOT, 'public', 'poetry');

// ---------------------------------------------------------------------------
// Step 1: Collect unique tags from all poetry content files
// ---------------------------------------------------------------------------
const contentFiles = readdirSync(POETRY_CONTENT_DIR).filter(f =>
  f.endsWith('.md') || f.endsWith('.mdx')
);

const allTags = new Set();

for (const file of contentFiles) {
  const content = readFileSync(join(POETRY_CONTENT_DIR, file), 'utf-8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) continue;
  const fm = fmMatch[1];
  const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
  if (!tagsMatch) continue;
  const tagsList = tagsMatch[1];
  const tags = tagsList
    .split(',')
    .map(t => t.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);
  for (const tag of tags) {
    allTags.add(tag);
  }
}

// ---------------------------------------------------------------------------
// Step 2: Warn about near-duplicate tags
// ---------------------------------------------------------------------------
const normalizeTag = tag => tag.trim().replace(/\s+/g, ' ').toLowerCase();
const normalizedMap = new Map(); // normalized -> [original, ...]

for (const tag of allTags) {
  const norm = normalizeTag(tag);
  if (!normalizedMap.has(norm)) normalizedMap.set(norm, []);
  normalizedMap.get(norm).push(tag);
}

for (const [norm, originals] of normalizedMap) {
  if (originals.length > 1) {
    console.warn(
      `WARN: Near-duplicate tags (differ only by casing/whitespace): ${originals.map(t => JSON.stringify(t)).join(', ')}`
    );
  }
}

// ---------------------------------------------------------------------------
// Step 3: Parse existing registry
// ---------------------------------------------------------------------------
const SEED_MAPPINGS = {
  'Alfa Romeo': 'car.png',
  'cars': 'car.png',
  'Shakespeare': 'rose.png',
  'Theatre': 'drama.png',
  'War': 'war.png',
};

let existingRegistry = {};

if (existsSync(REGISTRY_FILE)) {
  const src = readFileSync(REGISTRY_FILE, 'utf-8');
  // Extract entries from the DECORATIVE_IMAGE_REGISTRY object literal
  const registryMatch = src.match(
    /export const DECORATIVE_IMAGE_REGISTRY[^=]*=\s*\{([\s\S]*?)\};/
  );
  if (registryMatch) {
    const body = registryMatch[1];
    const entryRe = /^\s*"([^"]+)":\s*(null|"[^"]*"),?\s*$/gm;
    let m;
    while ((m = entryRe.exec(body)) !== null) {
      const key = m[1];
      const val = m[2] === 'null' ? null : m[2].slice(1, -1);
      existingRegistry[key] = val;
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: Determine missing tags and build merged registry
// ---------------------------------------------------------------------------
const mergedRegistry = { ...existingRegistry };

let added = 0;
for (const tag of allTags) {
  if (!Object.prototype.hasOwnProperty.call(mergedRegistry, tag)) {
    mergedRegistry[tag] = SEED_MAPPINGS[tag] ?? null;
    added++;
    console.log(`Added missing tag: ${JSON.stringify(tag)}`);
  }
}

// Also ensure seed-only tags exist even if not in content
for (const [tag, filename] of Object.entries(SEED_MAPPINGS)) {
  if (!Object.prototype.hasOwnProperty.call(mergedRegistry, tag)) {
    mergedRegistry[tag] = filename;
    added++;
    console.log(`Added seed tag: ${JSON.stringify(tag)}`);
  }
}

// ---------------------------------------------------------------------------
// Step 5: Warn about mapped filenames that don't exist in public/poetry/
// ---------------------------------------------------------------------------
for (const [tag, filename] of Object.entries(mergedRegistry)) {
  if (filename !== null) {
    const filePath = join(PUBLIC_POETRY_DIR, filename);
    if (!existsSync(filePath)) {
      console.warn(
        `WARN: Tag normalization collision for "${filename}" not found in public/poetry/`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Step 6: Sort registry entries alphabetically (case-insensitive)
// ---------------------------------------------------------------------------
const sortedEntries = Object.entries(mergedRegistry).sort(([a], [b]) =>
  a.localeCompare(b, undefined, { sensitivity: 'base' })
);

// ---------------------------------------------------------------------------
// Step 7: Re-generate the registry file
// ---------------------------------------------------------------------------
const entriesTs = sortedEntries
  .map(([tag, val]) => `\t"${tag}": ${val === null ? 'null' : `"${val}"`},`)
  .join('\n');

const newSrc = `/**
 * Decorative Image Registry for Poetry tags.
 *
 * Keys are exact tag strings (case-sensitive, alphabetical order).
 * Values are image FILENAMES only (e.g. "rose.png") stored under
 * apps/dad-site/public/poetry/, or null when unmapped.
 *
 * Run \`npm run sync:decorative-images\` (from apps/dad-site) to add
 * any missing tags discovered in the poetry collection.
 */
export const DECORATIVE_IMAGE_REGISTRY: Record<string, string | null> = {
${entriesTs}
};

/**
 * Returns the resolved image path \`/poetry/<filename>\` if the tag is
 * mapped in the registry, otherwise returns null.
 * This is the ONLY place that prepends \`/poetry/\`.
 */
export function getDecorativeImageForTag(tag: string): string | null {
\tconst filename = DECORATIVE_IMAGE_REGISTRY[tag];
\treturn filename ? \`/poetry/\${filename}\` : null;
}

/** Returns true if the tag exists as a key in the registry. */
export function hasRegistryTag(tag: string): boolean {
\treturn Object.prototype.hasOwnProperty.call(DECORATIVE_IMAGE_REGISTRY, tag);
}

/** Returns all registry tag keys, sorted alphabetically (case-insensitive). */
export function getRegistryTags(): string[] {
\treturn Object.keys(DECORATIVE_IMAGE_REGISTRY).sort((a, b) =>
\t\ta.localeCompare(b, undefined, { sensitivity: 'base' })
\t);
}
`;

writeFileSync(REGISTRY_FILE, newSrc, 'utf-8');

console.log(
  added > 0
    ? `Done. Added ${added} new tag(s) to the registry.`
    : 'Done. Registry is already up to date.'
);
