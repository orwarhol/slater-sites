import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const entryPath = process.argv[2];
if (!entryPath) {
  console.error('Usage: node scripts/patch-astro-server-entry.mjs <dist/server/entry.mjs>');
  process.exit(1);
}

const absolutePath = path.resolve(entryPath);
if (!existsSync(absolutePath)) {
  console.error(`Entry file not found: ${absolutePath}`);
  process.exit(1);
}

const original = readFileSync(absolutePath, 'utf8');
const target = `const componentFactory = componentInstance?.default;
				const resolvedComponentFactory = typeof componentFactory === "function" && componentFactory.length === 0 && componentFactory.name === "default" ? componentFactory() : componentFactory;
				response = await renderPage(result, resolvedComponentFactory, props, state.slots ?? EMPTY_SLOTS, streaming, state.routeData);`;
const replacement = `const componentFactory = componentInstance?.default;
				const resolvedComponentFactory = typeof componentFactory === "function" && componentFactory.length === 0 && componentFactory.name === "default" ? componentFactory() : componentFactory;
				response = await renderPage(result, resolvedComponentFactory, props, state.slots ?? EMPTY_SLOTS, streaming, state.routeData);`;

if (!original.includes('response = await renderPage(result, componentInstance?.default, props, state.slots ?? EMPTY_SLOTS, streaming, state.routeData);')) {
  console.warn(`No matching renderPage call found in ${absolutePath}`);
  process.exit(0);
}

writeFileSync(absolutePath, original.replace('response = await renderPage(result, componentInstance?.default, props, state.slots ?? EMPTY_SLOTS, streaming, state.routeData);', replacement));
console.log(`Patched ${absolutePath}`);
