/**
 * Integration tests for dad-site redirect middleware.
 *
 * These tests spin up the Astro dev server on a dedicated port and make real
 * HTTP requests to verify that the redirect middleware behaves correctly
 * end-to-end.
 *
 * Run with:  npm run test:integration --workspace=dad-site
 *
 * The tests rely on the active redirect rules in src/data/redirects.ts:
 *   { from: '/books',    to: '/novels',    status: 301 }  // exact
 *   { from: '/poems/*',  to: '/poetry/*',  status: 301 }  // prefix
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
			return; // any response means the server is accepting connections
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
			// Kill the entire process group spawned by npm run dev.
			process.kill(-devProcess.pid, "SIGTERM");
		} catch {
			devProcess.kill("SIGTERM");
		}
	}
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function get(path: string) {
	return fetch(`${BASE}${path}`, { redirect: "manual" });
}

// ---------------------------------------------------------------------------
// Exact redirect: /books → /novels
// ---------------------------------------------------------------------------

describe("exact redirect /books → /novels", () => {
	it("returns status 301", async () => {
		const res = await get("/books");
		expect(res.status).toBe(301);
	});

	it("Location header points to /novels", async () => {
		const res = await get("/books");
		expect(res.headers.get("location")).toContain("/novels");
	});

	it("preserves query string", async () => {
		const res = await get("/books?ref=abc");
		expect(res.headers.get("location")).toContain("/novels");
		expect(res.headers.get("location")).toContain("ref=abc");
	});
});

// ---------------------------------------------------------------------------
// Prefix redirect: /poems/* → /poetry/*
// ---------------------------------------------------------------------------

describe("prefix redirect /poems/* → /poetry/*", () => {
	it("returns status 301 for a path under /poems/", async () => {
		const res = await get("/poems/spring");
		expect(res.status).toBe(301);
	});

	it("rewrites the tail onto /poetry/", async () => {
		const res = await get("/poems/spring");
		const location = res.headers.get("location") ?? "";
		expect(location).toContain("/poetry/spring");
	});

	it("preserves query string on prefix redirect", async () => {
		const res = await get("/poems/spring?year=2023");
		const location = res.headers.get("location") ?? "";
		expect(location).toContain("/poetry/spring");
		expect(location).toContain("year=2023");
	});

	it("does not redirect the bare /poems path (no trailing slash)", async () => {
		// '/poems' has no matching exact rule, so it should NOT redirect.
		const res = await get("/poems");
		expect(res.status).not.toBe(301);
		expect(res.status).not.toBe(302);
	});
});

// ---------------------------------------------------------------------------
// Non-redirect paths pass through normally
// ---------------------------------------------------------------------------

describe("non-redirect paths", () => {
	it("home page returns a non-redirect response", async () => {
		const res = await fetch(`${BASE}/`, { redirect: "follow" });
		expect([200, 404]).toContain(res.status);
	});

	it("a completely unknown path does not redirect", async () => {
		const res = await get("/this-path-does-not-match-any-rule");
		expect(res.status).not.toBe(301);
		expect(res.status).not.toBe(302);
	});
});
