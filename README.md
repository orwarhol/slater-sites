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
- **projects** - Creative projects (schema: title, date, type, genre, pages)
  - Expected values for project Type: 'feature screenplay' | 'short screenplay' | 'TV script' | 'novel' | 'feature film' | 'short film'
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

