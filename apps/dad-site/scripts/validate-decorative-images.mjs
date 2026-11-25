#!/usr/bin/env node

import {
	closeSync,
	lstatSync,
	openSync,
	readFileSync,
	readdirSync,
	readSync,
	realpathSync,
	statSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { globSync } from 'tinyglobby';
import { isMap, isScalar, LineCounter, parseDocument } from 'yaml';

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function describe(value) {
	if (typeof value !== 'string') return value === null ? 'null' : typeof value;
	if (/(?:[a-z][a-z\d+.-]*:\/\/|^\/\/)/i.test(value)) return '"<external URL>"';
	return JSON.stringify(value.length > 160 ? `${value.slice(0, 157)}...` : value);
}

function isPlainPngFilename(value) {
	// Filenames are inserted into /poetry/<filename> unencoded, so allow only URL-safe portable names.
	return typeof value === 'string'
		&& value === value.trim()
		&& /^[A-Za-z0-9_-]+\.png$/.test(value);
}

function isUnsafeImageKey(value) {
	return /[\/\\]/.test(value)
		|| value.includes('..')
		|| /\.png$/i.test(value)
		|| /^[a-z][a-z\d+.-]*:/i.test(value);
}

function loadRegistry(filename, errors) {
	const label = 'src/utils/decorativeImages.ts';
	let source;
	try {
		source = readFileSync(filename, 'utf8');
	} catch (error) {
		errors.push(`${label}: cannot read registry (${error.code ?? 'read error'})`);
		return null;
	}

	const diagnostics = ts.transpileModule(source, { reportDiagnostics: true }).diagnostics ?? [];
	if (diagnostics.some(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error)) {
		errors.push(`${label}: malformed TypeScript registry`);
		return null;
	}

	const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const declarations = file.statements
		.filter(statement => ts.isVariableStatement(statement)
			&& statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword))
		.flatMap(statement => [...statement.declarationList.declarations])
		.filter(declaration => ts.isIdentifier(declaration.name)
			&& declaration.name.text === 'DECORATIVE_IMAGE_REGISTRY');
	if (declarations.length !== 1 || !declarations[0].initializer
		|| !ts.isObjectLiteralExpression(declarations[0].initializer)) {
		errors.push(`${label}: expected one exported DECORATIVE_IMAGE_REGISTRY object literal`);
		return null;
	}

	const registry = new Map();
	for (const property of declarations[0].initializer.properties) {
		if (!ts.isPropertyAssignment(property)
			|| !(ts.isStringLiteral(property.name) || ts.isIdentifier(property.name))) {
			errors.push(`${label}: registry entries must have literal keys and values`);
			continue;
		}
		const key = property.name.text;
		if (registry.has(key)) {
			errors.push(`${label}: duplicate exact registry key ${describe(key)}`);
			continue;
		}
		if (!key.trim() || key === '__proto__') {
			errors.push(`${label}: invalid registry key ${describe(key)}`);
		}
		const value = ts.isStringLiteral(property.initializer) ? property.initializer.text : null;
		registry.set(key, value);
	}
	return registry;
}

function discoverPoems(directory, errors) {
	const readErrors = new Set();
	const reportErrors = operation => (target, ...args) => {
		try {
			return operation(target, ...args);
		} catch (error) {
			const path = relative(directory, String(target)).split('\\').join('/') || '.';
			readErrors.add(`src/content/poetry/${path}: cannot read (${error.code ?? 'read error'})`);
			throw error;
		}
	};
	try {
		if (!statSync(directory).isDirectory()) throw new Error('not a directory');
		const files = globSync('**/*.{md,mdx}', {
			cwd: directory,
			expandDirectories: false,
			fs: {
				readdirSync: reportErrors(readdirSync),
				realpathSync: reportErrors(realpathSync),
				statSync: reportErrors(statSync),
			},
		})
			.sort()
			.map(filename => join(directory, filename));
		errors.push(...[...readErrors].sort());
		return files;
	} catch (error) {
		errors.push(...[...readErrors].sort());
		errors.push(`src/content/poetry: cannot read directory (${error.code ?? 'read error'})`);
		return [];
	}
}

function readFrontmatter(filename, label, errors) {
	let source;
	try {
		source = readFileSync(filename, 'utf8');
	} catch (error) {
		errors.push(`${label}: cannot read frontmatter (${error.code ?? 'read error'})`);
		return null;
	}
	const lines = source.split(/\r\n|\n|\r/);
	if (!/^---[ \t]*$/.test(lines[0].replace(/^\uFEFF/, ''))) {
		errors.push(`${label}: missing frontmatter opening delimiter`);
		return null;
	}
	const end = lines.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line));
	if (end === -1) {
		errors.push(`${label}: missing frontmatter closing delimiter`);
		return null;
	}

	const lineCounter = new LineCounter();
	let document;
	try {
		document = parseDocument(lines.slice(1, end).join('\n'), {
			uniqueKeys: true,
			lineCounter,
		});
	} catch {
		errors.push(`${label}: malformed YAML frontmatter`);
		return null;
	}
	if (isMap(document.contents)) {
		const decorativeFields = document.contents.items.filter(pair =>
			isScalar(pair.key) && pair.key.value === 'decorativeImage');
		if (decorativeFields.length > 1) {
			errors.push(`${label}: duplicate decorativeImage field`);
		}
	}
	if (document.errors.length) {
		for (const error of document.errors) {
			const line = error.pos ? lineCounter.linePos(error.pos[0]).line + 1 : '?';
			errors.push(`${label}: malformed YAML frontmatter (${error.code}, line ${line})`);
		}
		return null;
	}
	if (!isMap(document.contents)) {
		errors.push(`${label}: frontmatter must be a YAML mapping`);
		return null;
	}
	try {
		return document.toJS({ maxAliasCount: 100 });
	} catch {
		errors.push(`${label}: cannot resolve YAML frontmatter`);
		return null;
	}
}

function checkPng(filename) {
	let fd;
	try {
		if (!lstatSync(filename).isFile()) return 'is not a regular file';
		fd = openSync(filename, 'r');
		const signature = Buffer.alloc(PNG_SIGNATURE.length);
		if (readSync(fd, signature, 0, signature.length, 0) !== signature.length
			|| !signature.equals(PNG_SIGNATURE)) {
			return 'does not have a PNG signature';
		}
		return null;
	} catch (error) {
		return `cannot be read (${error.code ?? 'read error'})`;
	} finally {
		if (fd !== undefined) closeSync(fd);
	}
}

export function validateDecorativeImages(siteRoot = APP_ROOT) {
	const errors = [];
	const warnings = [];
	const infos = [];
	const contentDir = join(siteRoot, 'src', 'content', 'poetry');
	const imageDir = join(siteRoot, 'public', 'poetry');
	const registry = loadRegistry(join(siteRoot, 'src', 'utils', 'decorativeImages.ts'), errors);
	const poems = discoverPoems(contentDir, errors);
	const referencedKeys = new Set();
	const primaryFiles = new Set();
	const mappedFiles = new Set();
	const checkedFiles = new Map();

	if (registry) {
		const normalizedKeys = new Map();
		for (const [key, filename] of registry) {
			const normalized = key.trim().replace(/\s+/g, ' ').toLowerCase();
			if (!normalizedKeys.has(normalized)) normalizedKeys.set(normalized, []);
			normalizedKeys.get(normalized).push(key);

			if (!isPlainPngFilename(filename)) {
				errors.push(`src/utils/decorativeImages.ts: key ${describe(key)} must map to ASCII letters, digits, hyphens or underscores plus lowercase .png (for example "sand-dunes.png"), got ${describe(filename)}`);
				continue;
			}
			mappedFiles.add(filename);
			if (!checkedFiles.has(filename)) checkedFiles.set(filename, checkPng(join(imageDir, filename)));
			const problem = checkedFiles.get(filename);
			if (problem) {
				errors.push(`src/utils/decorativeImages.ts: key ${describe(key)}, public/poetry/${filename} ${problem}`);
			}
		}
		for (const keys of normalizedKeys.values()) {
			if (keys.length > 1) {
				warnings.push(`near-duplicate registry keys: ${keys.map(describe).join(', ')}`);
			}
		}
	}

	for (const filename of poems) {
		const label = `src/content/poetry/${relative(contentDir, filename).split('\\').join('/')}`;
		const data = readFrontmatter(filename, label, errors);
		if (!data) continue;

		if (Object.hasOwn(data, 'tags')) {
			if (!Array.isArray(data.tags)) {
				errors.push(`${label}: tags must be an array of strings`);
			} else {
				for (const [index, tag] of data.tags.entries()) {
					if (typeof tag !== 'string') {
						errors.push(`${label}: tags[${index}] must be a string`);
						continue;
					}
					referencedKeys.add(tag);
					if (registry && !registry.has(tag)) {
						errors.push(`${label}: tag ${describe(tag)} has no exact registry mapping`);
					}
				}
			}
		}

		if (!Object.hasOwn(data, 'decorativeImage')) continue;
		const key = data.decorativeImage;
		if (typeof key !== 'string' || !key.trim()) {
			errors.push(`${label}: decorativeImage ${describe(key)} must be a nonblank registry key`);
			continue;
		}
		referencedKeys.add(key);
		if (isUnsafeImageKey(key)) {
			errors.push(`${label}: decorativeImage ${describe(key)} must be a registry key, not a filename, path or URL`);
		} else if (registry) {
			const mapped = registry.get(key);
			if (!registry.has(key) || !isPlainPngFilename(mapped) || checkedFiles.get(mapped)) {
				errors.push(`${label}: decorativeImage ${describe(key)} has no valid exact registry mapping`);
			} else {
				primaryFiles.add(mapped);
			}
		}
	}

	if (registry) {
		for (const key of registry.keys()) {
			if (!referencedKeys.has(key)) warnings.push(`registry key ${describe(key)} is not referenced by any poem`);
		}
	}
	try {
		const artwork = readdirSync(imageDir, { withFileTypes: true })
			.filter(entry => entry.isFile() && /\.png$/i.test(entry.name))
			.map(entry => entry.name)
			.sort();
		if (registry) {
			for (const filename of artwork) {
				if (!mappedFiles.has(filename)) infos.push(`public/poetry/${filename} is unused by the registry`);
				else if (!primaryFiles.has(filename)) infos.push(`public/poetry/${filename} is mapped but unused as a primary illustration`);
			}
		}
	} catch (error) {
		errors.push(`public/poetry: cannot read artwork directory (${error.code ?? 'read error'})`);
	}

	return { errors, warnings, infos, poemCount: poems.length, registryCount: registry?.size ?? 0 };
}

export function runValidation(siteRoot = APP_ROOT) {
	const result = validateDecorativeImages(siteRoot);
	for (const message of result.errors) console.error(`ERROR: ${message}`);
	for (const message of result.warnings) console.warn(`WARN: ${message}`);
	for (const message of result.infos) console.log(`INFO: ${message}`);
	console.log(`Checked ${result.poemCount} poem(s) and ${result.registryCount} registry key(s): ${result.errors.length} error(s), ${result.warnings.length} warning(s), ${result.infos.length} info message(s).`);
	return result.errors.length ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exitCode = runValidation();
}
