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
│   ├── import-squarespace-ian.mjs  # Import script for Ian's content
│   └── import-squarespace-dad.mjs  # Import script for Charles's content
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
| `npm run import:ian`   | Import Ian's Squarespace content              |
| `npm run import:dad`   | Import Charles's Squarespace content          |

## 📥 Importing from Squarespace

This project includes scripts to import content from Squarespace WordPress XML exports.

### Prerequisites

The following export files should be in the repository root:
- `Ian-Slater-Squarespace-Wordpress-Export-01-31-2026.xml`
- `Charles-Slater-Squarespace-Wordpress-Export-01-31-2026.xml`

### Import Ian's Content

```bash
npm run import:ian
```

**What gets imported:**
- **5 specific pages** as projects (Hattie, Perspectives, Alyssa Craft, Dark Love, End of Eden)
- Converts HTML content to Markdown
- Preserves project metadata (title, date, type, genre)
- Outputs to `apps/ian-site/src/content/projects/`
- **Note:** Blog posts are NOT imported (existing blog scaffold is kept)

### Import Charles's Content

```bash
npm run import:dad
```

**What gets imported:**

**Poetry (68 poems):**
- All posts from `/poetry/` URL path
- Converts HTML to Markdown while preserving poetic formatting
- Extracts metadata: title, date, tags, excerpt, decorative images
- Outputs to `apps/dad-site/src/content/poetry/`

**Novels (5 novels):**
- Parsed from the "Novels and Movies" page
- Extracts: title, synopsis, publication info, purchase links
- Outputs to `apps/dad-site/src/content/novels/`

**Important notes:**
- Import scripts are idempotent (can be run multiple times safely)
- Images remain as Squarespace CDN URLs (not downloaded yet)
- Scripts use Turndown for HTML → Markdown conversion

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
- **projects** - Creative projects (schema: title, date, type, genre, pages)
- **gallery** - Photography (schema: title, src, alt, date, notes, camera, location, order)

### Dad Site Collections
- **poetry** - Poems (schema: title, date, tags, excerpt, decorativeImage)
- **novels** - Novels (schema: title, publicationDate, printLength, synopsis, purchaseLinks)
- **gallery** - Photography (schema: title, src, alt, date, notes, camera, location, order)

## 🛠️ Tech Stack

- **[Astro](https://astro.build)** - Static site framework
- **[Cloudflare Pages](https://pages.cloudflare.com)** - Hosting & deployment
- **[Turndown](https://github.com/mixmark-io/turndown)** - HTML to Markdown conversion
- **TypeScript** - Type safety
- **npm workspaces** - Monorepo management

