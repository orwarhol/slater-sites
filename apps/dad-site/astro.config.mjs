import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com', // Update this to the actual site URL when deploying
	output: 'server',
	adapter: cloudflare({
		// Use passthrough image service: dad-site has no <Image /> usage and the
		// default 'cloudflare-binding' service adds an IMAGES binding that isn't
		// configured in the Cloudflare project, causing the worker to fail at runtime.
		imageService: 'passthrough',
	}),
	// Use in-memory session driver to prevent @astrojs/cloudflare from
	// auto-provisioning a KV namespace on every deploy.
	session: { driver: 'unstorage/drivers/memory' },
});
