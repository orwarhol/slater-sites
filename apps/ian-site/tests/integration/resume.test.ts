/**
 * Integration tests for the /resume presentation page in ian-site.
 *
 * These tests spin up the Astro dev server on a dedicated port and make real
 * HTTP requests to verify the resume page renders correctly and contains the
 * expected structural elements.
 *
 * Run with:  npm run test:integration --workspace=ian-site
 */

import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "../..");
const PORT = 4323;
const BASE = `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

let devProcess: ChildProcess;

async function waitForServer(port: number, timeoutMs = 60_000): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fetch(`http://localhost:${port}/`, {
				signal: AbortSignal.timeout(2_000),
			});
			return;
		} catch {
			await new Promise((resolve) => setTimeout(resolve, 400));
		}
	}
	throw new Error(`Dev server on port ${port} did not start within ${timeoutMs}ms`);
}

beforeAll(async () => {
	devProcess = spawn(
		"npm",
		["run", "dev", "--", "--port", String(PORT)],
		{
			cwd: APP_ROOT,
			stdio: "ignore",
			detached: true,
			env: { ...process.env, NO_COLOR: "1", BROWSER: "none" },
		},
	);
	devProcess.unref();
	await waitForServer(PORT);
}, 120_000);

afterAll(() => {
	if (devProcess.pid) {
		try {
			process.kill(-devProcess.pid, "SIGTERM");
		} catch {
			devProcess.kill("SIGTERM");
		}
	}
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getPage(path: string) {
	return fetch(`${BASE}${path}`, { redirect: "follow" });
}

async function getPageText(path: string): Promise<string> {
	const res = await getPage(path);
	return res.text();
}

// ---------------------------------------------------------------------------
// /resume — HTTP basics
// ---------------------------------------------------------------------------

describe("/resume page", () => {
	it("returns HTTP 200", async () => {
		const res = await getPage("/resume");
		expect(res.status).toBe(200);
	});

	it("returns HTML content-type", async () => {
		const res = await getPage("/resume");
		expect(res.headers.get("content-type")).toMatch(/text\/html/);
	});
});

// ---------------------------------------------------------------------------
// /resume — Page structure
// ---------------------------------------------------------------------------

describe("/resume page structure", () => {
	let html: string;

	beforeAll(async () => {
		html = await getPageText("/resume");
	});

	it("has a <title> tag", () => {
		expect(html).toMatch(/<title>/i);
	});

	it("title contains 'Ian Slater'", () => {
		// Match inside the actual <title> element, not just anywhere in the HTML
		const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
		expect(titleMatch).not.toBeNull();
		expect(titleMatch![1]).toMatch(/Ian Slater/i);
	});

	it("contains the deck-slide sections (slides rendered from MDX)", () => {
		expect(html).toMatch(/class="[^"]*deck-slide/);
	});

	it("renders at least 6 slides", () => {
		const matches = html.match(/class="[^"]*deck-slide[^"]*"/g) ?? [];
		expect(matches.length).toBeGreaterThanOrEqual(6);
	});

	it("renders no more than 7 slides", () => {
		const matches = html.match(/class="[^"]*deck-slide[^"]*"/g) ?? [];
		expect(matches.length).toBeLessThanOrEqual(7);
	});

	it("contains the opening slide (id=opening)", () => {
		expect(html).toMatch(/data-slide-id="opening"/);
	});

	it("contains the closing slide (id=close)", () => {
		expect(html).toMatch(/data-slide-id="close"/);
	});

	it("contains prev/next navigation buttons", () => {
		expect(html).toMatch(/id="prev-btn"/);
		expect(html).toMatch(/id="next-btn"/);
	});

	it("navigation buttons have accessible aria-labels", () => {
		expect(html).toMatch(/aria-label="Previous slide"/);
		expect(html).toMatch(/aria-label="Next slide"/);
	});

	it("contains the progress dots container", () => {
		expect(html).toMatch(/id="deck-dots"/);
	});

	it("contains Ian Slater's name in the slide content", () => {
		expect(html).toMatch(/Ian Slater/);
	});

	it("contains the LinkedIn CTA link", () => {
		expect(html).toMatch(/linkedin\.com/i);
	});

	it("LinkedIn CTA links have target='_blank'", () => {
		// Both Slide 1 and Slide 7 LinkedIn anchors must open in a new tab.
		const linkedinLinks = [...html.matchAll(/<a[^>]*linkedin[^>]*>/gi)].map(
			(m) => m[0],
		);
		expect(linkedinLinks.length).toBeGreaterThanOrEqual(2);
		for (const tag of linkedinLinks) {
			expect(tag).toMatch(/target="_blank"/);
		}
	});

	it("LinkedIn CTA links have rel='noopener noreferrer'", () => {
		const linkedinLinks = [...html.matchAll(/<a[^>]*linkedin[^>]*>/gi)].map(
			(m) => m[0],
		);
		for (const tag of linkedinLinks) {
			expect(tag).toMatch(/rel="noopener noreferrer"/);
		}
	});

	it("eyebrow elements are inside .slide-content (aligned with body text)", () => {
		// The slide-eyebrow must be a descendant of .slide-content, not a sibling.
		expect(html).toMatch(/class="slide-content"[^]*?class="slide-eyebrow"/);
	});

	it("does NOT contain a site header", () => {
		// The resume page intentionally omits the site Header component
		expect(html).not.toMatch(/<header[^>]*class="[^"]*site-header/i);
	});

	it("does NOT contain a site footer", () => {
		expect(html).not.toMatch(/<footer[^>]*class="[^"]*site-footer/i);
	});

	it("slides have role=tabpanel for accessibility", () => {
		expect(html).toMatch(/role="tabpanel"/);
	});

	it("application wrapper has aria-label", () => {
		expect(html).toMatch(/aria-label="Resume presentation for Ian Slater"/);
	});

	it("contains the slide counter element", () => {
		expect(html).toMatch(/id="slide-counter"/);
	});
});

// ---------------------------------------------------------------------------
// /resume — Key slide content
// ---------------------------------------------------------------------------

describe("/resume slide content", () => {
	let html: string;

	beforeAll(async () => {
		html = await getPageText("/resume");
	});

	it("mentions Disney Sites", () => {
		expect(html).toMatch(/Disney Sites/i);
	});

	it("mentions Content Syndication", () => {
		expect(html).toMatch(/Content Syndication/i);
	});

	it("mentions Dynamic Footer", () => {
		expect(html).toMatch(/Dynamic Footer/i);
	});

	it("mentions Program FRIDAY", () => {
		expect(html).toMatch(/Program FRIDAY/i);
	});

	it("mentions Disney Vibes", () => {
		expect(html).toMatch(/Disney Vibes/i);
	});

	it("mentions The Walt Disney Company", () => {
		expect(html).toMatch(/Walt Disney Company/i);
	});

	it("mentions PMP credential", () => {
		expect(html).toMatch(/PMP/);
	});
});
