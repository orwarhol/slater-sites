import cloudflare from '@astrojs/cloudflare';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com', // Update this to the actual site URL when deploying
	output: 'server',
	adapter: cloudflare(),
});
