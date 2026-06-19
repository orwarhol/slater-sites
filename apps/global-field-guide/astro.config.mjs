import cloudflare from '@astrojs/cloudflare';
import { defineConfig, sessionDrivers } from 'astro/config';

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
	// Use in-memory session driver to prevent @astrojs/cloudflare from
	// auto-provisioning a KV namespace on every deploy.
	session: { driver: sessionDrivers.memory() },
});
