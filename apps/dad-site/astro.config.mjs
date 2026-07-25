import cloudflare from '@astrojs/cloudflare';
import { defineConfig, sessionDrivers } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com', // Update this to the actual site URL when deploying
	output: 'server',
	adapter: cloudflare({
		// Use passthrough image service: dad-site has no <Image /> usage and the
		// default 'cloudflare-binding' service adds an IMAGES binding that isn't
		// configured in the Cloudflare project, causing the worker to fail at runtime.
		imageService: 'passthrough',
		// Prerender static pages with Astro's Node environment instead of workerd.
		// The default 'workerd' prerenderer in @astrojs/cloudflare serializes every
		// prerendered page body as the literal string "[object Object]". dad-site's
		// /poetry/tags/[tag] routes explicitly opt in to prerender = true, so they
		// are affected by the same defect as ian-site's homepage. The Node prerender
		// environment matches the dev runtime and emits correct HTML.
		prerenderEnvironment: 'node',
	}),
	// Use in-memory session driver to prevent @astrojs/cloudflare from
	// auto-provisioning a KV namespace on every deploy.
	session: { driver: sessionDrivers.memory() },
});
