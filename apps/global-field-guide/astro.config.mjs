import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Placeholder production URL — update to the final domain when deploying.
	site: 'https://global-field-guide.com',
	output: 'server',
	adapter: cloudflare({
		// Use passthrough image service: this site has no <Image /> usage and the
		// default 'cloudflare-binding' service adds an IMAGES binding that isn't
		// configured in the Cloudflare project, causing the worker to fail at runtime.
		imageService: 'passthrough',
	}),
	// Use the unstorage in-memory driver to prevent @astrojs/cloudflare from
	// auto-provisioning a KV namespace on every deploy. (Astro 7's typed
	// `sessionDrivers.memory()` helper is missing from the generated .d.ts,
	// so we construct the SessionDriverConfig object directly.)
	session: { driver: { entrypoint: 'unstorage/drivers/memory' } },
});
