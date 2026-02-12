# Slater Sites Monorepo

This monorepo contains two personal Astro websites:
- **ian-site** - Ian Slater's personal website (writing, filmmaking, photography)
- **dad-site** - Charles Slater's website (poetry and novels)

## 🚀 Project Structure

This is an npm workspaces monorepo with the following structure:

```
slater-sites/
├── apps/
│   ├── ian-site/          # Ian's personal site
│   │   ├── src/
│   │   │   ├── content/
│   │   │   │   ├── blog/      # Blog posts
│   │   │   │   ├── projects/  # Screenplays and film projects
│   │   │   │   └── gallery/   # Photography gallery
│   │   │   └── pages/
│   │   └── package.json
│   └── dad-site/          # Charles's site
│       ├── src/
│       │   ├── content/
│       │   │   ├── poetry/    # Poetry collection
│       │   │   ├── novels/    # Novel descriptions
│       │   │   └── gallery/   # Photography gallery
│       │   └── pages/
│       └── package.json
├── scripts/
└── package.json           # Root package with workspace config
```

## 🧞 Commands

All commands are run from the root of the project:

| Command                | Action                                        |
| :--------------------- | :-------------------------------------------- |
| `npm install`          | Install dependencies for all workspaces       |
| `npm run dev:ian`      | Start ian-site dev server at `localhost:4321` |
| `npm run dev:dad`      | Start dad-site dev server at `localhost:4321` |
| `npm run build:ian`    | Build ian-site for production                 |
| `npm run build:dad`    | Build dad-site for production                 |

## 🎨 Features

### Ian Site (apps/ian-site)
- **Homepage:** Bio and introduction
- **Projects:** Screenplays, short films, and other writing projects
- **Blog:** Scaffolded but not populated (ready for future content)
- **Gallery:** Photography viewer with keyboard navigation

### Dad Site (apps/dad-site)
- **Homepage:** Author bio with navigation cards
- **Poetry:** Collection of 68+ poems with tags and dates
- **Novels:** 5 novels with synopses and purchase links
- **Gallery:** Photography viewer with keyboard navigation

### Gallery Features (both sites)
- Single-photo viewer with metadata sidebar
- Prev/Next navigation buttons
- Keyboard support (Left/Right arrow keys)
- Shareable URLs via query parameter (`?i=NUMBER`)
- Sorting: order field → date → title
- Responsive design

## 🚢 Deployment

Each app can be deployed independently to Cloudflare Pages by configuring the Git integration:

**For ian-site:**
- Set "Root directory" to `apps/ian-site`
- Build command: `npm run build`
- Build output directory: `dist`

**For dad-site:**
- Set "Root directory" to `apps/dad-site`
- Build command: `npm run build`
- Build output directory: `dist`

## 📝 Content Collections

### Ian Site Collections
- **blog** - Blog posts (schema: title, description, pubDate, heroImage)
- **projects** - Creative projects (schema: title, date, type, genre, pages, description, heroImage)
  - Expected values for project Type: 'feature screenplay' | 'short screenplay' | 'TV script' | 'novel' | 'feature film' | 'short film'
  - Note: `description` and `heroImage` are SEO-only fields (not rendered on project pages)
- **gallery** - Photography (schema: title, src, alt, date, notes, camera, location, order)

### Dad Site Collections
- **poetry** - Poems (schema: title, date, tags, excerpt, decorativeImage)
- **novels** - Novels (schema: title, publicationDate, printLength, synopsis, purchaseLinks)
- **gallery** - Photography (schema: title, src, alt, date, notes, camera, location, order)

## 🗺️ SEO & Sitemaps

### Ian Site SEO Meta Registry

The ian-site uses a **centralized SEO meta registry** to manage all meta tags (title, description, og:image, twitter:card, etc.) from a single location.

**How it works:**
- All SEO meta is defined in `apps/ian-site/src/seo/metaRegistry.ts`
- Pages pass a `metaKey` and fallback values to `BaseHead` component
- Registry entries override fallback values when present
- Missing keys trigger console warnings during build to help discover new content

**Registry key patterns:**
- Pages: `page:/`, `page:/blog`, `page:/projects`, `page:/gallery`
- Blog posts: `blog:<slug>` (e.g., `blog:hello-world-again`)
- Projects: `project:<slug>` (e.g., `project:hattie`)

**Adding new content:**
1. Create your blog post or project markdown file
2. Run `npm run build` - you'll see a warning if the meta key is missing
3. Add the entry to `metaRegistry.ts` with your desired title/description
4. Rebuild to verify the warning is gone

**Adding hero images to projects:**
- Projects support an optional `heroImage` field for SEO meta tags (og:image, twitter:image)
- To add one, include `heroImage: "/path/to/image.jpg"` in the project's frontmatter
- The image will automatically be used in SEO meta tags but won't be rendered on the project page itself
- You can also specify the image in the registry entry for that project

**Benefits:**
- One-stop-shop for all SEO meta across the entire site
- Edit meta without touching page templates or content files
- Registry values take precedence over frontmatter defaults
- Warnings ensure all content has proper SEO coverage

### Ian Site Custom Sitemap

The ian-site uses a **custom sitemap endpoint** at `/sitemap.xml` instead of Astro's built-in `@astrojs/sitemap` integration.

**Why custom?**
- Astro's sitemap integration creates `sitemap-index.xml` and `sitemap-0.xml`
- Our `robots.txt` points to `/sitemap.xml` (custom endpoint)
- Having both could confuse search engines
- Custom implementation provides full control over URLs and metadata

**Implementation:**
- Location: `apps/ian-site/src/pages/sitemap.xml.ts`
- Includes: Homepage, blog index, projects index, gallery, and all blog posts & projects
- Uses Astro Content Collections to dynamically generate URLs
- Includes `lastmod` dates from content metadata

**Important for Astro upgrades:**
- Do **NOT** re-add `@astrojs/sitemap` to integrations in `astro.config.mjs`
- Keep the custom endpoint to maintain consistency with `robots.txt`
- Update `sitemap.xml.ts` if new content collections are added

## 🛠️ Tech Stack

- **[Astro](https://astro.build)** - Static site framework
- **[Cloudflare Pages](https://pages.cloudflare.com)** - Hosting & deployment
- **[Turndown](https://github.com/mixmark-io/turndown)** - HTML to Markdown conversion
- **TypeScript** - Type safety
- **npm workspaces** - Monorepo management

