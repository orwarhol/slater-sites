import { describe, expect, it } from 'vitest';
import { lstatSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import {
	DECORATIVE_IMAGE_REGISTRY,
	getDecorativeImageForTag,
	hasRegistryTag,
} from '../../src/utils/decorativeImages';
import { validateDecorativeImages } from '../../scripts/validate-decorative-images.mjs';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe('poetry decorative image registry', () => {
	it.each([
		['Sue', 'marriage.png'],
		['Vanagan', 'vanagon.png'],
		['On the Road', 'vanagon.png'],
		['Sand Dunes Tavern', 'sand-dunes.png'],
		['childhood', 'sand-dunes.png'],
		['growing-up', 'sand-dunes.png'],
		['memory', 'sand-dunes.png'],
		['el segundo dairy', 'bull.png'],
		['randall dairy el segundo', 'bull.png'],
		['house', 'house.png'],
		['Silver Street', 'house.png'],
		['New Mexico', 'city.png'],
		['Truman', 'war.png'],
		['authority', 'car.png'],
		['Shakespeare', 'rose.png'],
		['War', 'war.png'],
		['war', 'war.png'],
	])('resolves %s to its approved local image', (key, filename) => {
		expect(hasRegistryTag(key)).toBe(true);
		expect(getDecorativeImageForTag(key)).toBe(`/poetry/${filename}`);
	});

	it.each([
		'not a registry key',
		'theAtre',
		' Theatre',
		'Theatre ',
		'drama.png',
		'/poetry/drama.png',
		'../drama.png',
		'https://example.test/drama.png',
		'constructor',
		'toString',
		'__proto__',
	])('does not resolve unknown or inherited key %s', key => {
		expect(hasRegistryTag(key)).toBe(false);
		expect(getDecorativeImageForTag(key)).toBeNull();
	});

	it('maps every key to a regular local PNG with the expected signature', () => {
		for (const [key, filename] of Object.entries(DECORATIVE_IMAGE_REGISTRY)) {
			expect(typeof filename, key).toBe('string');
			expect(filename, key).toMatch(/^[^/\\:]+\.png$/);
			expect(filename, key).not.toContain('..');
			const path = join(APP_ROOT, 'public/poetry', filename);
			expect(lstatSync(path).isFile(), key).toBe(true);
			expect(readFileSync(path).subarray(0, 8), key).toEqual(PNG_SIGNATURE);
		}
	});

	it('validates published poems while allowing omitted selections', () => {
		const result = validateDecorativeImages(APP_ROOT);
		expect(result.errors).toEqual([]);
	});

	it('supports selections for tagless poems and keys outside ordinary tags', () => {
		for (const filename of ['charles-slater-1932-2022.md', 'boxes-of-childhood-at-the-curb.md']) {
			const source = readFileSync(join(APP_ROOT, 'src/content/poetry', filename), 'utf8');
			const frontmatter = source.slice(4, source.indexOf('\n---', 4));
			const document = parseDocument(frontmatter);
			const { tags = [], decorativeImage } = document.toJS();
			expect(tags).not.toContain(decorativeImage);
			expect(getDecorativeImageForTag(decorativeImage)).not.toBeNull();
		}
	});
});
