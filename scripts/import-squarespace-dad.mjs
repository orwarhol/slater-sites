#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TurndownService from 'turndown';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const xmlPath = path.join(repoRoot, 'Charles-Slater-Squarespace-Wordpress-Export-01-31-2026.xml');
const poetryOutputDir = path.join(repoRoot, 'apps/dad-site/src/content/poetry');
const novelsOutputDir = path.join(repoRoot, 'apps/dad-site/src/content/novels');

// Initialize Turndown for HTML to Markdown conversion
// Preserve line breaks for poetry
const turndownService = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	br: '\n', // Preserve <br> as line breaks
});

// Add rule to preserve paragraph breaks in poetry
turndownService.addRule('preserveParagraphs', {
	filter: 'p',
	replacement: function (content) {
		return '\n\n' + content + '\n\n';
	}
});

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

function decodeHtmlEntities(text) {
	return text
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&nbsp;/g, ' ');
}

function extractTextContent(html) {
	// Simple text extraction - remove tags
	return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseXML() {
	console.log('Reading XML file:', xmlPath);
	const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
	
	// Parse items from XML
	const itemRegex = /<item>([\s\S]*?)<\/item>/g;
	const items = [];
	let match;
	
	while ((match = itemRegex.exec(xmlContent)) !== null) {
		const itemContent = match[1];
		
		// Extract fields
		const titleMatch = itemContent.match(/<title>(.*?)<\/title>/);
		const linkMatch = itemContent.match(/<link>(.*?)<\/link>/);
		const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
		const excerptMatch = itemContent.match(/<excerpt:encoded>(.*?)<\/excerpt:encoded>/);
		const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
		const postTypeMatch = itemContent.match(/<wp:post_type>(.*?)<\/wp:post_type>/);
		
		// Extract categories and tags
		const categoryMatches = itemContent.matchAll(/<category domain="category"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g);
		const tagMatches = itemContent.matchAll(/<category domain="post_tag"[^>]*><!\[CDATA\[(.*?)\]\]><\/category>/g);
		
		const categories = [];
		for (const catMatch of categoryMatches) {
			categories.push(catMatch[1]);
		}
		
		const tags = [];
		for (const tagMatch of tagMatches) {
			tags.push(tagMatch[1]);
		}
		
		if (titleMatch) {
			let title = decodeHtmlEntities(titleMatch[1]);
			const link = linkMatch ? linkMatch[1] : '';
			const content = contentMatch ? contentMatch[1] : '';
			const excerpt = excerptMatch ? decodeHtmlEntities(excerptMatch[1]) : '';
			const pubDate = dateMatch ? dateMatch[1] : '';
			const postType = postTypeMatch ? postTypeMatch[1] : 'post';
			
			items.push({
				title,
				link,
				content,
				excerpt,
				pubDate,
				postType,
				categories,
				tags,
			});
		}
	}
	
	return items;
}

function importPoetry(items) {
	// Filter for poetry posts (posts with /poetry/ in URL or tagged with poetry)
	const poetryItems = items.filter(item => {
		return item.postType === 'post' && (
			item.link.includes('/poetry/') ||
			item.categories.some(cat => cat.toLowerCase().includes('poetry')) ||
			item.tags.some(tag => tag.toLowerCase().includes('poetry'))
		);
	});
	
	console.log(`\nFound ${poetryItems.length} poetry posts to import`);
	
	// Ensure output directory exists
	if (!fs.existsSync(poetryOutputDir)) {
		fs.mkdirSync(poetryOutputDir, { recursive: true });
	}
	
	poetryItems.forEach(item => {
		const slug = slugify(item.title);
		const outputPath = path.join(poetryOutputDir, `${slug}.md`);
		
		// Convert HTML to Markdown, preserving poetry formatting
		let markdownContent = '';
		if (item.content) {
			markdownContent = turndownService.turndown(item.content);
		}
		
		// Parse date
		let date = new Date().toISOString().split('T')[0];
		if (item.pubDate) {
			try {
				date = new Date(item.pubDate).toISOString().split('T')[0];
			} catch (e) {
				console.warn(`Could not parse date for ${item.title}`);
			}
		}
		
		// Combine tags and categories
		const allTags = [...new Set([...item.categories, ...item.tags])];
		
		// Create excerpt
		let excerptText = item.excerpt || extractTextContent(item.content).substring(0, 160);
		
		// Extract first image if present
		const imgMatch = item.content.match(/<img[^>]+src="([^"]+)"/);
		const decorativeImage = imgMatch ? imgMatch[1] : '';
		
		// Create frontmatter
		let frontmatter = `---
title: "${item.title.replace(/"/g, '\\"')}"
date: ${date}
tags: ${JSON.stringify(allTags)}
excerpt: "${excerptText.replace(/"/g, '\\"')}"`;
		
		if (decorativeImage) {
			frontmatter += `\ndecorativeImage: "${decorativeImage}"`;
		}
		
		frontmatter += `\n---

${markdownContent}
`;
		
		fs.writeFileSync(outputPath, frontmatter, 'utf-8');
		console.log(`  ✓ Created: ${slug}.md`);
	});
	
	return poetryItems.length;
}

function importNovels(items) {
	// Find the "Novels and Movies" page
	const novelsPage = items.find(item => 
		item.postType === 'page' && 
		(item.title.toLowerCase().includes('novels') || item.link.includes('novels'))
	);
	
	if (!novelsPage) {
		console.log('\nNo "Novels and Movies" page found');
		return 0;
	}
	
	console.log(`\nFound "Novels and Movies" page: ${novelsPage.title}`);
	
	// Ensure output directory exists
	if (!fs.existsSync(novelsOutputDir)) {
		fs.mkdirSync(novelsOutputDir, { recursive: true });
	}
	
	// Split content by H2 headings to separate novels
	const content = novelsPage.content;
	
	// Simple approach: split by <h2> tags
	const sections = content.split(/<h2[^>]*>/i);
	
	let novelCount = 0;
	
	sections.forEach((section, index) => {
		if (index === 0) return; // Skip intro before first h2
		
		// Extract title from the section (it's at the start)
		const titleMatch = section.match(/^([^<]+)</);
		if (!titleMatch) return;
		
		const title = decodeHtmlEntities(titleMatch[1].trim());
		
		// Skip "Movies" section
		if (title.toLowerCase().includes('movie')) {
			console.log(`  - Skipping: ${title}`);
			return;
		}
		
		const slug = slugify(title);
		const outputPath = path.join(novelsOutputDir, `${slug}.md`);
		
		// Extract the rest of the section
		const sectionContent = section.substring(titleMatch[0].length);
		
		// Convert to markdown
		const markdown = turndownService.turndown(sectionContent);
		
		// Extract purchase links
		const linkMatches = sectionContent.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]*)<\/a>/gi);
		const purchaseLinks = [];
		
		for (const linkMatch of linkMatches) {
			const url = linkMatch[1];
			const label = linkMatch[2] || new URL(url).hostname;
			
			// Only include external links that look like purchase links
			if (url.startsWith('http') && 
				(url.includes('amazon') || url.includes('book') || url.includes('publisher'))) {
				purchaseLinks.push({ label, url });
			}
		}
		
		// Create synopsis from text content
		const synopsis = extractTextContent(sectionContent).substring(0, 300);
		
		// Create frontmatter
		const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
synopsis: "${synopsis.replace(/"/g, '\\"')}"
purchaseLinks: ${JSON.stringify(purchaseLinks, null, 2)}
---

${markdown}
`;
		
		fs.writeFileSync(outputPath, frontmatter, 'utf-8');
		console.log(`  ✓ Created: ${slug}.md`);
		novelCount++;
	});
	
	return novelCount;
}

// Main execution
try {
	const items = parseXML();
	console.log(`\nParsed ${items.length} total items from XML`);
	
	const poetryCount = importPoetry(items);
	console.log(`\nPoetry import complete! ${poetryCount} poems imported.`);
	
	const novelsCount = importNovels(items);
	console.log(`\nNovels import complete! ${novelsCount} novels imported.`);
	
} catch (error) {
	console.error('Error during import:', error);
	process.exit(1);
}
