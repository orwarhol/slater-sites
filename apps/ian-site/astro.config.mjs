// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://iancharlesslater.com",
	output: 'server',
	integrations: [mdx()],
	adapter: cloudflare(),
	// Neither site uses sessions; use the unstorage in-memory driver to prevent
	// @astrojs/cloudflare from auto-provisioning a KV namespace on every deploy.
	// (Astro 7's typed `sessionDrivers.memory()` helper is missing from the
	// generated .d.ts, so we construct the SessionDriverConfig object directly.)
	session: { driver: { entrypoint: "unstorage/drivers/memory" } },
});
