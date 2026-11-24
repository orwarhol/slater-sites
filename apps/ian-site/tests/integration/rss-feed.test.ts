import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { SITE_TITLE, SITE_DESCRIPTION } from "../../src/consts";

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
			item?: Array<{
				title: string;
				description: string;
				link: string;
				pubDate: string;
				guid: { "#text": string; "@_isPermaLink": string };
				"content:encoded"?: string;
			}>;
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
	// Reuse a preceding normal build when running the full verification sequence.
	if (process.env.SKIP_BUILD !== "1") {
		const buildResult = spawnSync("npm", ["run", "build"], {
			cwd: APP_ROOT,
			stdio: "inherit",
			env: { ...process.env, NO_COLOR: "1", BROWSER: "none" },
		});
		if (buildResult.status !== 0) {
			throw new Error("ian-site build failed before RSS integration checks");
		}
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
	it("GET /rss.xml preserves editorial channel, items, dates, links and GUIDs", async () => {
		const { response, xml } = await getXml("/rss.xml");
		expect(XMLValidator.validate(xml)).toBe(true);
		const parsed = parser.parse(xml) as ParsedRss;
		const items = toArray(parsed.rss.channel.item);

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("application/rss+xml; charset=utf-8");
		expect(parsed.rss.channel.title).toBe(SITE_TITLE);
		expect(parsed.rss.channel.description).toBe(SITE_DESCRIPTION);
		expect(parsed.rss.channel.link).toBe("https://iancharlesslater.com/");
		const posts = [
			["Beyond the Branching Path - Building Narrative Game Engines in OpenClaw", "beyond-the-branching-path---building-narrative-game-engines-in-openclaw"],
			["Hello, World (Again)", "hello-world-again"],
		];
		const contentFiles = readdirSync(resolve(APP_ROOT, "src/content/blog"), { recursive: true })
			.filter(file => /\.(md|mdx)$/.test(file));
		expect(items).toHaveLength(contentFiles.length);
		for (const [filename, slug] of posts) {
			const source = readFileSync(resolve(APP_ROOT, `src/content/blog/${filename}.md`), "utf8");
			const data = parse(source.split("---")[1]) as { title: string; description: string; pubDate: string };
			const link = `https://iancharlesslater.com/blog/${slug}/`;
			const item = items.find(item => item.link === link);
			expect(item).toMatchObject({
				title: data.title,
				description: data.description,
				link,
				pubDate: new Date(data.pubDate).toUTCString(),
				guid: { "#text": link, "@_isPermaLink": "true" },
			});
			expect(item?.["content:encoded"]).toBeUndefined();
		}
		const dates = items.map(item => Date.parse(item.pubDate));
		expect(dates).toEqual([...dates].sort((a, b) => b - a));
	});

	it.each(["/feed", "/feed/", "/feed?ref=abc", "/feed/?ref=abc"])("%s permanently redirects in one hop to the equivalent canonical feed", async (path) => {
		const legacy = await getXml(path);
		expect(legacy.response.status).toBe(301);
		const target = new URL(legacy.response.headers.get("location")!, BASE);
		expect(target.pathname).toBe("/rss.xml");
		expect(target.search).toBe(new URL(path, BASE).search);
		const redirected = await getXml(target.pathname + target.search);
		expect(redirected.response.status).toBe(200);
		expect(parser.parse(redirected.xml)).toEqual(parser.parse((await getXml("/rss.xml")).xml));
	});
});
