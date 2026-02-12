import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
	const blog = await getCollection('blog');
	const projects = await getCollection('projects');

	// Build sitemap XML
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${new URL('/', site).href}</loc>
  </url>
  <url>
    <loc>${new URL('/blog/', site).href}</loc>
  </url>
  <url>
    <loc>${new URL('/projects/', site).href}</loc>
  </url>
  <url>
    <loc>${new URL('/gallery/', site).href}</loc>
  </url>
${blog.map((post) => {
		const url = new URL(`/blog/${post.id}/`, site).href;
		const lastmod = post.data.updatedDate ?? post.data.pubDate;
		return `  <url>
    <loc>${url}</loc>
${lastmod ? `    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`;
	}).join('\n')}
${projects.map((project) => {
		const url = new URL(`/projects/${project.id}/`, site).href;
		const lastmod = project.data.date;
		return `  <url>
    <loc>${url}</loc>
${lastmod ? `    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`;
	}).join('\n')}
</urlset>`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml',
		},
	});
};
