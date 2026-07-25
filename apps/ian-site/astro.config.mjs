// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
	site: "https://iancharlesslater.com",
	integrations: [mdx()],
	adapter: cloudflare({
		// Prerender static pages with Astro's Node environment instead of workerd.
		// The default 'workerd' prerenderer in @astrojs/cloudflare serializes every
		// prerendered page body as the literal string "[object Object]" (reproducible
		// with a bare page and confirmed on Cloudflare branch previews). The Node
		// prerender environment matches the dev runtime and emits correct HTML.
		prerenderEnvironment: "node",
	}),
	// Neither site uses sessions; use the in-memory session driver to prevent
	// @astrojs/cloudflare from auto-provisioning a KV namespace on every deploy.
	session: { driver: "unstorage/drivers/memory" },
});
