import { readFileSync } from "node:fs";
import { posix } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type LockPackage = {
	version?: string;
	optional?: boolean;
	optionalDependencies?: Record<string, string>;
};

const lockfile = JSON.parse(
	readFileSync(fileURLToPath(new URL("../../../../package-lock.json", import.meta.url)), "utf8"),
) as { packages: Record<string, LockPackage> };

function resolvePackage(from: string, name: string): LockPackage | undefined {
	let directory = from;
	while (true) {
		const location = directory
			? `${directory}/node_modules/${name}`
			: `node_modules/${name}`;
		if (lockfile.packages[location]) return lockfile.packages[location];
		if (!directory) return undefined;
		const parent = posix.dirname(directory);
		directory = parent === "." ? "" : parent;
	}
}

describe("Satteri platform dependencies in the shared lockfile", () => {
	it("keeps every native package optional and every declared variant resolvable", () => {
		const entries = Object.entries(lockfile.packages);
		const binaries = entries.filter(([location]) =>
			/(^|\/)node_modules\/@bruits\/satteri-[^/]+$/.test(location),
		);
		expect(binaries.length).toBeGreaterThan(0);
		for (const [location, entry] of binaries) {
			expect(entry.optional, location).toBe(true);
		}

		const owners = entries.filter(([location]) =>
			/(^|\/)node_modules\/satteri$/.test(location),
		);
		expect(owners.length).toBeGreaterThan(0);
		for (const [location, owner] of owners) {
			const variants = Object.entries(owner.optionalDependencies ?? {}).filter(([name]) =>
				name.startsWith("@bruits/satteri-"),
			);
			expect(variants.length, location).toBeGreaterThan(0);
			for (const [name, version] of variants) {
				const entry = resolvePackage(location, name);
				expect(entry, `${location}: ${name}`).toBeDefined();
				expect(entry?.version, `${location}: ${name}`).toBe(version);
				expect(entry?.optional, `${location}: ${name}`).toBe(true);
			}
		}
	});
});
