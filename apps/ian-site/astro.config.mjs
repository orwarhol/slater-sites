// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://iancharlesslater.com",
	integrations: [mdx()],
	adapter: cloudflare(),
	// Neither site uses sessions; use memory driver to prevent @astrojs/cloudflare
	// from auto-provisioning a KV namespace on every deploy.
	session: { driver: "unstorage/drivers/memory" },
});
