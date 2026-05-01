import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com', // Update this to the actual site URL when deploying
	output: 'server',
	adapter: cloudflare(),
	// Neither site uses sessions; use memory driver to prevent @astrojs/cloudflare
	// from auto-provisioning a KV namespace on every deploy.
	session: { driver: 'unstorage/drivers/memory' },
});
