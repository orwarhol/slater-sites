import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
		// Unit tests are fast; integration tests spin up a dev server so they
		// need generous timeouts for the beforeAll server-startup hook.
		testTimeout: 15_000,
		hookTimeout: 120_000,
	},
});
