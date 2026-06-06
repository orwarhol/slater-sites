/**
 * Integration tests for the dad-site /novels-movies/ listing page.
 *
 * Verifies that:
 * - /novels-movies/ loads with status 200
 * - The page H1 is "Novels and Movies"
 * - The navigation still displays "Novels"
 * - The "Novels" nav link points to /novels-movies/
 *
 * Run with:  npm run test:integration --workspace=dad-site
 */

import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "../..");
const PORT = 4324;
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
// /novels-movies/ listing page
// ---------------------------------------------------------------------------

describe("/novels-movies/ listing page", () => {
	it("returns status 200", async () => {
		const res = await fetch(`${BASE}/novels-movies/`, { redirect: "follow" });
		expect(res.status).toBe(200);
	});

	it('page H1 is "Novels and Movies"', async () => {
		const res = await fetch(`${BASE}/novels-movies/`, { redirect: "follow" });
		const html = await res.text();
		expect(html).toContain("<h1>Novels and Movies</h1>");
	});

	it('navigation displays "Novels" label', async () => {
		const res = await fetch(`${BASE}/novels-movies/`, { redirect: "follow" });
		const html = await res.text();
		// The nav link text should contain "Novels"
		expect(html).toMatch(/href="\/novels-movies"[^>]*>\s*Novels\s*</);
	});

	it('nav "Novels" link points to /novels-movies/', async () => {
		const res = await fetch(`${BASE}/novels-movies/`, { redirect: "follow" });
		const html = await res.text();
		expect(html).toContain('href="/novels-movies"');
	});
});

// ---------------------------------------------------------------------------
// Legacy /novels/ redirects to /novels-movies/
// ---------------------------------------------------------------------------

describe("legacy /novels redirect", () => {
	it("/novels returns 301", async () => {
		const res = await fetch(`${BASE}/novels`, { redirect: "manual" });
		expect(res.status).toBe(301);
	});

	it("/novels Location header points to /novels-movies", async () => {
		const res = await fetch(`${BASE}/novels`, { redirect: "manual" });
		expect(res.headers.get("location")).toContain("/novels-movies");
	});
});
