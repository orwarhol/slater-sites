import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "../..");
const PORT = 4334;
const BASE = `http://localhost:${PORT}`;
const parser = new XMLParser({ ignoreAttributes: false });

type ParsedRss = {
	rss: {
		channel: {
			title: string;
			description: string;
			link: string;
			item?: Array<{ title?: string; link?: string; pubDate?: string }>;
		};
	};
};

let previewProcess: ChildProcess;

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
	throw new Error(`Preview server on port ${port} did not start within ${timeoutMs}ms`);
}

function toArray<T>(value: T | T[] | undefined): T[] {
	if (!value) return [];
	return Array.isArray(value) ? value : [value];
}

async function getXml(path: string) {
	const response = await fetch(`${BASE}${path}`, { redirect: "manual" });
	const xml = await response.text();
	return { response, xml };
}

beforeAll(async () => {
	const buildResult = spawnSync("npm", ["run", "build"], {
		cwd: APP_ROOT,
		stdio: "ignore",
		env: { ...process.env, NO_COLOR: "1", BROWSER: "none" },
	});

	if (buildResult.status !== 0) {
		throw new Error("ian-site build failed before RSS integration checks");
	}

	previewProcess = spawn(
		"npm",
		["run", "preview", "--", "--port", String(PORT)],
		{
			cwd: APP_ROOT,
			stdio: "ignore",
			detached: true,
			env: { ...process.env, NO_COLOR: "1", BROWSER: "none" },
		},
	);
	previewProcess.unref();
	await waitForServer(PORT);
}, 180_000);

afterAll(() => {
	if (previewProcess.pid) {
		try {
			process.kill(-previewProcess.pid, "SIGTERM");
		} catch {
			previewProcess.kill("SIGTERM");
		}
	}
});

describe("RSS endpoints", () => {
	it("GET /feed returns RSS XML with channel and item data", async () => {
		const { response, xml } = await getXml("/feed");
		const parsed = parser.parse(xml) as ParsedRss;
		const items = toArray(parsed.rss.channel.item);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type") ?? "").toContain("xml");
		expect(parsed.rss.channel.title).toBe("Ian Slater");
		expect(parsed.rss.channel.description.length).toBeGreaterThan(0);
		expect(items.length).toBeGreaterThan(0);
		expect(items[0]?.title).toBeTruthy();
		expect(items[0]?.link).toMatch(/^https:\/\/iancharlesslater\.com\/blog\//);
		expect(Number.isNaN(Date.parse(items[0]?.pubDate ?? ""))).toBe(false);
	});

	it("GET /rss.xml still returns RSS XML with equivalent feed semantics", async () => {
		const feed = await getXml("/feed");
		const rssXml = await getXml("/rss.xml");
		const parsedFeed = parser.parse(feed.xml) as ParsedRss;
		const parsedRss = parser.parse(rssXml.xml) as ParsedRss;
		const feedItems = toArray(parsedFeed.rss.channel.item);
		const rssItems = toArray(parsedRss.rss.channel.item);

		expect(rssXml.response.status).toBe(200);
		expect(rssXml.response.headers.get("content-type") ?? "").toContain("xml");
		expect(parsedRss.rss.channel.title).toBe(parsedFeed.rss.channel.title);
		expect(parsedRss.rss.channel.description).toBe(parsedFeed.rss.channel.description);
		expect(parsedRss.rss.channel.link).toBe(parsedFeed.rss.channel.link);
		expect(rssItems.map((item) => item.title)).toEqual(
			feedItems.map((item) => item.title),
		);
		expect(rssItems.map((item) => item.link)).toEqual(
			feedItems.map((item) => item.link),
		);
	});
});
