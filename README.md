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

#### dad-site: Poetry content frontmatter

The schema lives in `apps/dad-site/src/content.config.ts`.

**Complete frontmatter example:**

```yaml
---
title: "My Poem Title"
date: 2023-04-01
tags:
  - nature
  - reflection
excerpt: "A short one- or two-sentence teaser shown on the poetry listing page."
decorativeImage: "Theatre"
---
```

##### `tags` field

`tags` is an **array of strings** used to categorize and filter poems.

- Provide one tag per line using YAML list syntax (see example above), or use inline syntax: `tags: ["nature", "reflection"]`
- An empty array (`tags: []`) is valid when no tags apply; the field also defaults to `[]` if omitted entirely.

##### `decorativeImage` field and the Decorative Image Registry

`decorativeImage` is **optional**. When present it drives a small decorative image shown in the upper-right of the poem header. The value can be:

| Form | Example | Behavior |
| :--- | :------ | :------- |
| **Tag name (preferred)** | `decorativeImage: "Theatre"` | Resolved via the registry → `/poetry/drama.png` |
| **Direct path (legacy / backwards-compatible)** | `decorativeImage: "/poetry/rose.png"` | Used as-is |

**Registry location:** `apps/dad-site/src/utils/decorativeImages.ts`

**Images location:** `apps/dad-site/public/poetry/`

**How to map a tag to an image:**

1. Open `apps/dad-site/src/utils/decorativeImages.ts`.
2. Find the tag key in `DECORATIVE_IMAGE_REGISTRY` (entries are alphabetical).
3. Change its value from `null` to the image **filename only** — no leading slash, no `/poetry/` prefix (e.g. `"rose.png"`).
4. Ensure the image file exists in `apps/dad-site/public/poetry/`.

**How to run the sync command** (adds any tags missing from the registry, keeps existing entries):

```bash
npm run --workspace=dad-site sync:decorative-images
# or, from inside apps/dad-site:
npm run sync:decorative-images
```

**What the sync script does:**

- Scans every `.md` / `.mdx` file in `apps/dad-site/src/content/poetry/`.
- Adds any tags not yet in the registry (with `null` as the default value, or a seed value if one was pre-configured).
- Does **not** remove existing registry entries even if a tag no longer appears in content.
- Registry entries are kept in **alphabetical order** (case-insensitive) — the script re-sorts the file on every run.
- Prints **warnings** (but does not fail) for:
  - **Near-duplicate tags** — tags that differ only by casing or extra whitespace (e.g. `"War"` vs `"war"`).
  - **Missing mapped files** — registry entries whose filename does not exist in `apps/dad-site/public/poetry/`.

##### Gotchas

- **Dates** — `date` must be a valid date parsable by JavaScript (e.g. `YYYY-MM-DD`). Avoid month/year-only values like `2023-04` as they may parse incorrectly across environments.
- **`excerpt` is required** — Every poem entry must include an `excerpt`. Omitting it will cause a build error.
- **`decorativeImage` is optional** — Omit the field entirely when no decorative image is needed. When provided, prefer a tag name (resolved via registry); a direct path is also accepted for backwards compatibility.
- **Quote strings containing special characters** — If `title` or `excerpt` contains colons, quotes, or other YAML-special characters, wrap the value in double quotes or use a block scalar (`>`).

#### Managing Poetry Tags

Because the `sync:decorative-images` script is **additive** (it re-adds any tags found in content), simply editing the registry is not enough to remove or rename a tag — the next sync run would just add it back. The correct workflow is always to **change the source of truth first** (poem frontmatter), then re-run the sync.

**Script:** `apps/dad-site/scripts/manage-poetry-tags.mjs`

Modifies only the `tags:` array in YAML frontmatter across all poetry files. Never touches poem body text or the decorative image registry directly.

**Available npm scripts (run from `apps/dad-site` or with `--workspace=dad-site`):**

| Command | Action |
| :------ | :----- |
| `npm run tags:rename -- --from "Old Tag" --to "New Tag"` | Rename / merge a tag everywhere |
| `npm run tags:delete -- --tag "Tag To Remove"` | Delete a tag everywhere |

Add `--dry-run` to either command to preview changes without writing any files.

> **Note:** Matching is **exact and case-sensitive**. Copy the tag string directly from the registry or frontmatter to avoid typos.
> The `sync:decorative-images` warnings about near-duplicate tags (e.g. `"War"` vs `"war"`) are a useful guide for identifying candidates to merge.

##### Recommended workflow

1. **Identify** the duplicate/unwanted tag (e.g. from sync script warnings).
2. **Dry-run** to confirm which files would change.
3. **Apply** the change.
4. **Re-sync** the registry so it reflects the updated tag set.

##### Rename / merge example

```bash
# Preview
npm run --workspace=dad-site tags:rename -- --from "war" --to "War" --dry-run

# Apply
npm run --workspace=dad-site tags:rename -- --from "war" --to "War"

# Re-sync registry
npm run --workspace=dad-site sync:decorative-images
```

If a poem already contains both `"war"` and `"War"`, the script deduplicates so `"War"` appears only once.

##### Delete example

```bash
# Preview
npm run --workspace=dad-site tags:delete -- --tag "obsolete tag" --dry-run

# Apply
npm run --workspace=dad-site tags:delete -- --tag "obsolete tag"

# Re-sync registry (tag no longer in content → will not be re-added)
npm run --workspace=dad-site sync:decorative-images
```

After deleting, if the tag had a registry entry it will remain in the registry (the sync script never removes entries), but it will no longer appear in the near-duplicate warnings and won't be re-added from content.

#### dad-site: Novels content frontmatter

The schema lives in `apps/dad-site/src/content.config.ts`.

**Complete frontmatter example:**

```yaml
---
title: "My Novel Title"
publicationDate: 2023-09-15
printLength: 312
synopsis: "A one-paragraph description of the novel shown on the novels listing page."
purchaseLinks:
  - label: "Amazon"
    url: "https://www.amazon.com/dp/XXXXXXXXXX"
  - label: "Barnes & Noble"
    url: "https://www.barnesandnoble.com/w/my-novel-title/XXXXXXXXXX"
---
```

##### `purchaseLinks` field

`purchaseLinks` is an **array of objects**, each with two required sub-fields:

| Sub-field | Type   | Description                                     |
| :-------- | :----- | :---------------------------------------------- |
| `label`   | string | Display name for the link (e.g. "Amazon")       |
| `url`     | string | Absolute URL to the purchase page               |

An empty array (`purchaseLinks: []`) is valid when no purchase links exist yet.

##### Gotchas

- **Dates** — `publicationDate` must be a valid date parsable by JavaScript (e.g. `YYYY-MM-DD`). Avoid month/year-only values like `2023-09` as they may parse incorrectly across environments.
- **URLs must be absolute** — `url` values in `purchaseLinks` must start with `https://` (or `http://`). Relative URLs will not work as purchase links.
- **Quote strings containing special characters** — If `title` or `synopsis` contains colons, quotes, or other YAML-special characters, wrap the value in double quotes or use a block scalar (`>`).
- **`printLength` is a number** — Do not quote it (write `printLength: 312`, not `printLength: "312"`).
- **`publicationDate` and `printLength` are optional** — The site builds without them, but including them makes the entry a complete record.

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

## 🔀 Redirect Management

Content/path redirects are managed **in-app**, not in the Cloudflare dashboard. Each app owns its own redirect rules so they can be reviewed, edited, and version-controlled alongside the content they describe.

### Where redirect rules live

| App | Registry file |
| :-- | :------------ |
| ian-site | `apps/ian-site/src/data/redirects.ts` |
| dad-site | `apps/dad-site/src/data/redirects.ts` |

Each file exports a typed `RedirectRule[]` array. Middleware in each app (`src/middleware.ts`) reads this registry on every incoming request and performs an exact-path or prefix redirect when a match is found. Query strings are preserved automatically.

### Redirect rule format — exact match

```ts
{ from: '/old-path', to: '/new-path', status: 301 }
```

| Field    | Type                        | Required | Notes                             |
| :------- | :-------------------------- | :------- | :-------------------------------- |
| `from`   | `string`                    | ✅       | Exact pathname, must start with `/` |
| `to`     | `string`                    | ✅       | Destination pathname or absolute URL |
| `status` | `301 \| 302 \| 307 \| 308` | ❌       | Defaults to `301` when omitted    |

### Redirect rule format — prefix (wildcard) match

End `from` with `/*` to redirect an entire section. If `to` also ends with `/*`, the captured path tail is rewritten onto the destination; otherwise the tail is dropped.

```ts
// /films/my-film   → /projects/my-film   (tail rewritten)
{ from: '/films/*', to: '/projects/*', status: 301 }

// /old-section/anything  → /new-section  (tail dropped)
{ from: '/old-section/*', to: '/new-section', status: 301 }
```

`/*` matches paths that begin with the prefix followed by `/`. It does **not** match the bare prefix without a trailing slash — add a separate exact rule for that if needed.

Exact rules always take priority over prefix rules.

### Status code quick guide

- **301** — Permanent. Use when a URL has moved for good. Search engines transfer ranking signals to the new URL. *(Default)*
- **302** — Temporary. Use when a move is not permanent.
- **307 / 308** — Like 302/301, but preserve the HTTP method (e.g. keep POST as POST).

### When to use in-app redirects vs Cloudflare

| Scenario | Where to configure |
| :------- | :----------------- |
| Renamed page slug, restructured section, migrated URL | **In-app registry** (`src/data/redirects.ts`) |
| Apex ↔ www normalisation (`www.example.com → example.com`) | **Cloudflare** |
| Old domain → new domain | **Cloudflare** |

### Testing redirects locally

1. Add a rule to the relevant `src/data/redirects.ts`.
2. Start the dev server (`npm run dev:ian` or `npm run dev:dad`).
3. Visit the `from` path in your browser — you should be redirected.
4. Open DevTools → Network tab and confirm the status code.
5. Test with a query string (e.g. `/old-path?ref=abc`) and confirm it is preserved in the destination URL.

### Automated tests

Unit tests cover the redirect matching logic (`buildLookup` / `resolveRedirect`) and run in milliseconds — no server required. Integration tests spin up the Astro dev server on a dedicated port and make real HTTP requests.

```bash
# Unit tests (fast — run these routinely)
npm run test:ian
npm run test:dad

# Integration tests (slower — spins up dev servers)
npm run test:ian:integration
npm run test:dad:integration
```

When adding new redirect rules or changing the matching logic, add corresponding unit tests in each app's `tests/unit/redirects.test.ts`.

### Testing after deploy

After a Cloudflare deployment, use `curl -I` to verify:

```bash
curl -I https://iancharlesslater.com/old-path
# → HTTP/2 301
# → location: /new-path
```

## 🛠️ Tech Stack

- **[Astro](https://astro.build)** - Static site framework
- **[Cloudflare Pages](https://pages.cloudflare.com)** - Hosting & deployment
- **[Turndown](https://github.com/mixmark-io/turndown)** - HTML to Markdown conversion
- **TypeScript** - Type safety
- **npm workspaces** - Monorepo management

