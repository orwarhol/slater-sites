#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import TurndownService from 'turndown';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const xmlPath = path.join(repoRoot, 'Ian-Slater-Squarespace-Wordpress-Export-01-31-2026.xml');
const outputDir = path.join(repoRoot, 'apps/ian-site/src/content/projects');

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
});

// List of pages to import as projects
const ALLOWED_PAGES = [
	'Hattie',
	'Perspectives',
	'Alyssa Craft',
	'Dark Love',
	'End of Eden – A Short Film by Ian Slater & Micah Caldwell', // Note: & not &amp;
];

// Type mapping for projects
const TYPE_MAPPING = {
	'End of Eden – A Short Film by Ian Slater & Micah Caldwell': 'short film',
	// All others default to 'feature screenplay'
};

function slugify(text) {
	return text
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
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
		const contentMatch = itemContent.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
		const dateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/);
		const postTypeMatch = itemContent.match(/<wp:post_type>(.*?)<\/wp:post_type>/);
		
		if (titleMatch) {
			// Decode HTML entities in title
			let title = titleMatch[1];
			title = title.replace(/&amp;/g, '&')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.replace(/&#039;/g, "'");
			
			const content = contentMatch ? contentMatch[1] : '';
			const pubDate = dateMatch ? dateMatch[1] : '';
			const postType = postTypeMatch ? postTypeMatch[1] : 'post';
			
			items.push({
				title,
				content,
				pubDate,
				postType,
			});
		}
	}
	
	return items;
}

function convertToMarkdown(items) {
	console.log(`Found ${items.length} total items in XML`);
	
	// Filter for allowed pages
	const projectItems = items.filter(item => {
		return ALLOWED_PAGES.includes(item.title) && item.postType === 'page';
	});
	
	console.log(`Filtered to ${projectItems.length} project pages to import:`);
	projectItems.forEach(item => console.log(`  - ${item.title}`));
	
	// Ensure output directory exists
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}
	
	// Convert each item to markdown
	projectItems.forEach(item => {
		const slug = slugify(item.title);
		const outputPath = path.join(outputDir, `${slug}.md`);
		
		// Determine type
		const type = TYPE_MAPPING[item.title] || 'feature screenplay';
		
		// Convert HTML to Markdown
		let markdownContent = '';
		if (item.content) {
			markdownContent = turndownService.turndown(item.content);
		}
		
		// Parse date or use today
		let date = new Date().toISOString().split('T')[0];
		if (item.pubDate) {
			try {
				date = new Date(item.pubDate).toISOString().split('T')[0];
			} catch (e) {
				console.warn(`Could not parse date for ${item.title}, using today`);
			}
		}
		
		// Create frontmatter
		const frontmatter = `---
title: "${item.title.replace(/"/g, '\\"')}"
date: ${date}
type: "${type}"
genre: []
pages: null
---

${markdownContent}
`;
		
		fs.writeFileSync(outputPath, frontmatter, 'utf-8');
		console.log(`✓ Created: ${outputPath}`);
	});
	
	console.log(`\nImport complete! ${projectItems.length} projects imported.`);
}

// Main execution
try {
	const items = parseXML();
	convertToMarkdown(items);
} catch (error) {
	console.error('Error during import:', error);
	process.exit(1);
}
