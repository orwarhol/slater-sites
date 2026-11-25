import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validateDecorativeImages } from '../../scripts/validate-decorative-images.mjs';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(APP_ROOT, 'scripts/validate-decorative-images.mjs');
const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let fixture: string;

function write(relativePath: string, value: string | Buffer) {
	const filename = join(fixture, relativePath);
	mkdirSync(dirname(filename), { recursive: true });
	writeFileSync(filename, value);
}

function registry(entries: Array<[string, string | null]>) {
	write('src/utils/decorativeImages.ts', `export const DECORATIVE_IMAGE_REGISTRY = {\n${
		entries.map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)},`).join('\n')
	}\n};\n`);
}

function poem(name: string, frontmatter: string) {
	write(`src/content/poetry/${name}`, `---\n${frontmatter}\n---\nPoem body.\n`);
}

function snapshot(directory: string): string[] {
	return readdirSync(directory, { withFileTypes: true })
		.sort((a, b) => a.name.localeCompare(b.name))
		.flatMap(entry => {
			const filename = join(directory, entry.name);
			return entry.isDirectory()
				? snapshot(filename)
				: [`${filename.slice(fixture.length)}:${createHash('sha256').update(readFileSync(filename)).digest('hex')}`];
		});
}

function runFixtureCli() {
	const wrapper = `import { runValidation } from ${JSON.stringify(pathToFileURL(SCRIPT).href)}; process.exitCode = runValidation(process.argv[1]);`;
	return spawnSync(process.execPath, ['--input-type=module', '-e', wrapper, fixture], {
		cwd: tmpdir(),
		encoding: 'utf8',
	});
}

beforeEach(() => {
	fixture = mkdtempSync(join(tmpdir(), 'dad-decorative-images-'));
	registry([
		['nature', 'tree.png'],
		['Comma, Tag', 'tree.png'],
		["Eugene O'Neill", 'drama.png'],
		['Theatre', 'drama.png'],
	]);
	write('public/poetry/tree.png', PNG);
	write('public/poetry/drama.png', PNG);
	poem('inline.md', '"tags": ["nature", "Comma, Tag"]\n"decorativeImage": "Theatre"');
	poem('nested/block.mdx', "tags:\n  - 'Eugene O''Neill'");
	poem('tagless.md', 'tags: []\ndecorativeImage: "nature"');
	poem('omitted.md', 'title: "No tags or decoration"');
});

afterEach(() => {
	rmSync(fixture, { recursive: true, force: true });
});

describe('read-only decorative image validator', () => {
	it('accepts inline and block YAML, independent selections, tagless and omitted fields recursively', () => {
		const before = snapshot(fixture);
		const result = validateDecorativeImages(fixture);
		expect(result.errors).toEqual([]);
		expect(result.warnings).toEqual([]);
		expect(result.infos).toEqual([]);
		expect(result.poemCount).toBe(4);
		expect(snapshot(fixture)).toEqual(before);
	});

	it('discovers the same visible and symlinked Markdown files as the Astro loader', () => {
		poem('.hidden.md', 'tags: ["not mapped"]');
		symlinkSync(join(fixture, 'src/content/poetry/inline.md'), join(fixture, 'src/content/poetry/linked.md'));
		const result = validateDecorativeImages(fixture);
		expect(result.errors).toEqual([]);
		expect(result.poemCount).toBe(5);
	});

	it('reports unreadable poetry paths even when glob discovery skips them', () => {
		symlinkSync(join(fixture, 'missing-poem.md'), join(fixture, 'src/content/poetry/broken.md'));
		expect(validateDecorativeImages(fixture).errors.join('\n')).toContain(
			'src/content/poetry/broken.md: cannot read',
		);
	});

	it('reports warning-only near-duplicates and orphans, plus unused artwork', () => {
		registry([
			['nature', 'tree.png'],
			['Nature', 'drama.png'],
			['orphan', 'drama.png'],
		]);
		poem('inline.md', 'tags: ["nature"]\ndecorativeImage: "nature"');
		poem('nested/block.mdx', 'tags: []');
		write('public/poetry/unused.png', PNG);
		const result = validateDecorativeImages(fixture);
		expect(result.errors).toEqual([]);
		expect(result.warnings.join('\n')).toContain('near-duplicate registry keys');
		expect(result.warnings.join('\n')).toContain('"orphan"');
		expect(result.warnings.join('\n')).not.toContain('registry key "nature" is not referenced');
		expect(result.infos.join('\n')).toContain('drama.png is mapped but unused as a primary');
		expect(result.infos.join('\n')).toContain('unused.png is unused by the registry');
		expect(runFixtureCli().status).toBe(0);
	});

	it('aggregates malformed and duplicate YAML and missing ordinary tags', () => {
		poem('broken.md', 'tags: ["unterminated"');
		poem('duplicate.md', 'tags: []\ndecorativeImage: "nature"\ndecorativeImage: "Theatre"');
		poem('missing.md', 'tags: ["not mapped"]');
		const errors = validateDecorativeImages(fixture).errors.join('\n');
		expect(errors).toContain('broken.md: malformed YAML');
		expect(errors).toContain('duplicate.md: duplicate decorativeImage');
		expect(errors).toContain('missing.md: tag "not mapped" has no exact registry mapping');
		expect(runFixtureCli().status).toBe(1);
	});

	it.each([
		['blank', '""'],
		['whitespace', '"   "'],
		['null', 'null'],
		['non-string', '17'],
		['unknown', '"unknown"'],
		['raw filename', '"tree.png"'],
		['absolute path', '"/poetry/tree.png"'],
		['traversal', '"../tree.png"'],
		['Windows path', JSON.stringify('C:\\poetry\\tree.png')],
		['URL', '"https://example.test/private-token/tree.png"'],
		['constructor', '"constructor"'],
		['toString', '"toString"'],
		['__proto__', '"__proto__"'],
	])('rejects a %s decorativeImage without exposing external URLs', (_name, value) => {
		poem('invalid.md', `tags: []\ndecorativeImage: ${value}`);
		const result = validateDecorativeImages(fixture);
		expect(result.errors.join('\n')).toContain('invalid.md: decorativeImage');
		expect(result.errors.join('\n')).not.toContain('private-token');
	});

	it('rejects filename-shaped selections even if someone adds one as a registry key', () => {
		registry([['tree.png', 'tree.png']]);
		poem('invalid.md', 'tags: []\ndecorativeImage: "tree.png"');
		expect(validateDecorativeImages(fixture).errors.join('\n')).toContain(
			'invalid.md: decorativeImage "tree.png" must be a registry key, not a filename, path or URL',
		);
	});

	it.each([
		['null', null],
		['blank', ''],
		['path', '../tree.png'],
		['URL', 'https://example.test/private-token/tree.png'],
		['missing file', 'missing.png'],
	])('rejects a registry %s mapping', (_name, value) => {
		registry([['nature', value]]);
		const errors = validateDecorativeImages(fixture).errors.join('\n');
		expect(errors).toContain('key "nature"');
		expect(errors).not.toContain('private-token');
	});

	it('rejects non-PNG signatures and non-regular files', () => {
		write('public/poetry/tree.png', 'not a PNG');
		rmSync(join(fixture, 'public/poetry/drama.png'));
		mkdirSync(join(fixture, 'public/poetry/drama.png'));
		const errors = validateDecorativeImages(fixture).errors.join('\n');
		expect(errors).toContain('tree.png does not have a PNG signature');
		expect(errors).toContain('drama.png is not a regular file');
	});

	it('rejects duplicate, malformed and unreadable registries', () => {
		write('src/utils/decorativeImages.ts', 'export const DECORATIVE_IMAGE_REGISTRY = {"nature": "tree.png", "nature": "tree.png"};');
		expect(validateDecorativeImages(fixture).errors.join('\n')).toContain('duplicate exact registry key "nature"');
		write('src/utils/decorativeImages.ts', 'export const DECORATIVE_IMAGE_REGISTRY = {"nature": ;');
		expect(validateDecorativeImages(fixture).errors.join('\n')).toContain('malformed TypeScript registry');
		rmSync(join(fixture, 'src/utils/decorativeImages.ts'));
		expect(validateDecorativeImages(fixture).errors.join('\n')).toContain('cannot read registry');
	});

	it('does not write any fixture on failure', () => {
		poem('invalid.md', 'tags: ["missing"]\ndecorativeImage: "unknown"');
		const before = snapshot(fixture);
		expect(validateDecorativeImages(fixture).errors.length).toBeGreaterThan(0);
		expect(runFixtureCli().status).toBe(1);
		expect(snapshot(fixture)).toEqual(before);
	});

	it('runs the real CLI from another cwd and gates the existing build before Astro', () => {
		const cli = spawnSync(process.execPath, [SCRIPT], { cwd: fixture, encoding: 'utf8' });
		expect(cli.status, cli.stderr).toBe(0);
		const { scripts } = JSON.parse(readFileSync(join(APP_ROOT, 'package.json'), 'utf8'));
		expect(scripts['validate:decorative-images']).toBe('node ./scripts/validate-decorative-images.mjs');
		expect(scripts.build).toBe('npm run validate:decorative-images && astro check && astro build');
		expect(scripts['sync:decorative-images']).toBeUndefined();
	});
});
