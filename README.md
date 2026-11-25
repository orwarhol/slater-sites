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

Use Node.js 22.23.4 (also pinned in each app's `.node-version`) and npm 10.9.2, matching the observed Dad-site Cloudflare build. Run commands from the root unless noted:

After changing the shared lockfile, run `npm clean-install --progress=false` on Linux in a clean checkout from the root and each app directory. `npm run test:ian` also checks the native Satteri packages' optional lockfile metadata.

| Command                | Action                                        |
| :--------------------- | :-------------------------------------------- |
| `npm install`          | Install dependencies for all workspaces       |
| `npm run dev:ian`      | Start ian-site dev server at `localhost:4321` |
| `npm run dev:dad`      | Start dad-site dev server at `localhost:4321` |
| `npm run build:ian`    | Build ian-site for production                 |
| `npm run build:dad`    | Build dad-site for production                 |

## 🎨 Features

### Ian Site Features
- **Homepage:** Bio and introduction
- **Projects:** Screenplays, short films, and other writing projects
- **Blog:** Scaffolded but not populated (ready for future content)
- **Gallery:** Photography viewer with keyboard navigation
- **Resume:** Immersive presentation-style resume applet at `/resume`

### Dad Site (apps/dad-site)
- **Homepage:** Author bio with navigation cards
- **Poetry:** Collection of 68+ poems with tags and dates
- **Novels and Movies:** 5 novels with synopses and purchase links (route: `/novels-movies/`)
- **Gallery:** Photography viewer with keyboard navigation

### Gallery Features (both sites)
- Single-photo viewer with metadata sidebar
- Prev/Next navigation buttons
- Keyboard support (Left/Right arrow keys)
- Shareable URLs via query parameter (`?i=NUMBER`)
- Sorting: order field → date → title
- Responsive design

### Resume Applet (ian-site — `/resume`)

An immersive, full-screen presentation-style resume experience. The visitor advances through a 7-slide resume story using keyboard, touch, or on-screen controls.

**Route:** `/resume`

**Content source:** `apps/ian-site/src/content/resume/resumeDeck.mdx`

All slide content lives in a single MDX file. Each slide is a `<ResumeSlide>` component block. Edit only that file to update resume content — no code changes needed.

#### Slide authoring format

```mdx
<ResumeSlide id="slide-id" layout="impact" transition="fade-up" eyebrow="Section Label">

## Slide Heading

Content goes here. Markdown is fully supported — **bold**, lists, links, etc.

- Bullet one
- Bullet two

</ResumeSlide>
```

#### Available `layout` values

| Value | Description |
| :---- | :---------- |
| `hero` | Full-screen opener with large gradient name and LinkedIn CTA button |
| `impact` | Bold thesis statement, left-aligned, large typography |
| `platform` | Platform details with grid card bullets and accent strips |
| `distribution` | Integration / distribution details with icon-prefixed list items |
| `governance` | Policy / governance narrative with highlighted `strong` terms |
| `ai-products` | Two-product showcase; each paragraph renders as a card with accent top edge |
| `close` | Experience timeline + credentials + LinkedIn CTA button |
| `default` | Basic text layout, no special treatment |

#### Available `transition` values

| Value | Description |
| :---- | :---------- |
| `fade-up` | Fade in while translating up (default) |
| `fade` | Simple fade in/out, no vertical motion |

#### Available `accent` values

| Value | Description |
| :---- | :---------- |
| `cyan` | Primary cyan accent for eyebrow label (default) |
| `pink` | Pink eyebrow — use for AI/zero-to-one moments |
| `lime` | Lime eyebrow — use sparingly for rare emphasis |
| `violet` | Violet eyebrow |

#### Navigation features

- **Next / Prev buttons** — bottom navigation bar
- **Keyboard** — Left/Right arrow keys (also Up/Down)
- **Touch / swipe** — swipe left for next, swipe right for previous
- **Dot navigation** — click any dot to jump to that slide
- **Deep linking** — URL hash updates automatically (e.g. `/resume#platform`)
- **Reduced motion** — transitions are disabled when `prefers-reduced-motion: reduce` is set

#### Accessibility

- `role="application"` on the deck wrapper with descriptive `aria-label`
- Each slide has `role="tabpanel"` and `aria-hidden` managed by JavaScript
- Navigation buttons have explicit `aria-label` values
- Progress dots include current-slide indication in their `aria-label`
- `aria-live="polite"` on the slide counter for screen reader announcements
- All content is present in the DOM (not animation-gated)
- Focus moves to the new slide on navigation

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
- **blog** - Blog posts (schema: title, description, pubDate, heroImage, optional seoTitle and seoDescription)
- **projects** - Creative projects (schema: title, date, type, genre, pages, description, heroImage, optional seoTitle and seoDescription)
  - Expected values for project Type: 'feature screenplay' | 'short screenplay' | 'TV script' | 'novel' | 'feature film' | 'short film'
  - Note: `description` and `heroImage` are SEO-only fields (not rendered on project pages)
- **gallery** - Photography (schema: title, src, alt, date, notes, camera, location, order)

Nonblank `seoTitle` (the complete document title) and `seoDescription` override only head metadata; otherwise blog/projects use their title with ` | Ian Slater` and description (or project type/genre fallback).

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
tags: ["nature"]
excerpt: "A short one- or two-sentence teaser shown on the poetry listing page."
decorativeImage: "Theatre"
---
```

##### `tags` field

`tags` is an **array of strings** used to categorize and filter poems. Every ordinary tag needs an exact registry mapping, including tags added through a CMS.

- Use inline syntax, as above, or a YAML block list with one tag per line.
- An empty array (`tags: []`) is valid when no tags apply; the field also defaults to `[]` if omitted entirely.

##### `decorativeImage` field and the Decorative Image Registry

`decorativeImage` is an **optional**, exact, case-sensitive registry key, independent of the poem's ordinary tags. In the example, `Theatre` selects the local `/poetry/drama.png` header image even though it is not in `tags`; this also works with `tags: []`. Omit the field for no image. A blank, unknown, filename, path, or URL value fails validation.

The decorative image is hidden from assistive technology and has empty alternative text. It appears in the upper-right of the header in a 90×90 desktop or 72×72 mobile container.

The canonical registry is `apps/dad-site/src/utils/decorativeImages.ts`. Its alphabetically ordered keys map to **PNG filenames only**, such as `"drama.png"`, under `apps/dad-site/public/poetry/`; there are no null placeholders. Case and spelling variants are distinct keys. To add an illustration, put the approved PNG in that directory. To map a new ordinary tag, manually add its exact key and an existing or new filename to the registry; multiple keys can reuse artwork.

Validate after editing content, artwork or the registry:

```bash
# From the repository root
npm run validate:decorative-images --workspace=dad-site

# From apps/dad-site
npm run validate:decorative-images
```

The validator is read-only and runs first in the dad-site build. Errors fail validation and the build: correct malformed or duplicate frontmatter, map every ordinary tag, use a valid exact `decorativeImage` key when present, and ensure each registry value names an existing regular PNG with a valid signature. Warnings identify unreferenced registry keys and case/whitespace near-duplicates; review them without automatically merging or removing keys. Informational messages identify artwork unused by the registry or not currently selected as a primary illustration. Warnings and information alone do not fail validation.

##### Gotchas

- **Dates** — `date` must be a valid date parsable by JavaScript (e.g. `YYYY-MM-DD`). Avoid month/year-only values like `2023-04` as they may parse incorrectly across environments.
- **`excerpt` is required** — Every poem entry must include an `excerpt`. Omitting it will cause a build error.
- **`decorativeImage` is optional** — Future poems may omit it; any value supplied must be an exact mapped key.
- **Quote strings containing special characters** — If `title` or `excerpt` contains colons, quotes, or other YAML-special characters, wrap the value in double quotes or use a block scalar (`>`).

#### Managing Poetry Tags

**Script:** `apps/dad-site/scripts/manage-poetry-tags.mjs`

Modifies only inline `tags:` arrays in top-level poetry files. It does not change poem bodies, the registry, or independent `decorativeImage` selections; review nested files and block-style tag arrays separately.

**Available npm scripts (run from `apps/dad-site` or with `--workspace=dad-site`):**

| Command | Action |
| :------ | :----- |
| `npm run tags:rename -- --from "Old Tag" --to "New Tag"` | Rename / merge a tag everywhere |
| `npm run tags:delete -- --tag "Tag To Remove"` | Delete a tag everywhere |

Add `--dry-run` to either command to preview changes without writing any files.

> **Note:** Matching is **exact and case-sensitive**. Near-duplicate warnings (e.g. `"War"` and `"war"`) are informational; merge variants only after an intentional editorial decision.

##### Recommended workflow

1. **Identify** the tag and decide whether the taxonomy should change.
2. **Dry-run** to confirm which files would change.
3. **Apply** the change.
4. **Review** ordinary tags, registry mappings and independent `decorativeImage` references manually. Map new keys and retain any keys still referenced by a poem.
5. **Validate** before committing.

##### Rename / merge example

```bash
# Preview
npm run --workspace=dad-site tags:rename -- --from "war" --to "War" --dry-run

# Apply
npm run --workspace=dad-site tags:rename -- --from "war" --to "War"

# Review registry mappings and decorativeImage references, then validate
npm run validate:decorative-images --workspace=dad-site
```

If a poem already contains both `"war"` and `"War"`, the script deduplicates so `"War"` appears only once.

##### Delete example

```bash
# Preview
npm run --workspace=dad-site tags:delete -- --tag "obsolete tag" --dry-run

# Apply
npm run --workspace=dad-site tags:delete -- --tag "obsolete tag"

# Review registry mappings and decorativeImage references, then validate
npm run validate:decorative-images --workspace=dad-site
```

An unreferenced registry key is reported as a warning. A key used only by `decorativeImage` is still referenced and must be retained unless that selection is intentionally changed.

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
coverImage: "/my-novel-cover.jpg"
coverImageAlt: "Book cover for My Novel Title"
---
```

##### `purchaseLinks` field

`purchaseLinks` is an **array of objects**, each with two required sub-fields:

| Sub-field | Type   | Description                                     |
| :-------- | :----- | :---------------------------------------------- |
| `label`   | string | Display name for the link (e.g. "Amazon")       |
| `url`     | string | Absolute URL to the purchase page               |

An empty array (`purchaseLinks: []`) is valid when no purchase links exist yet.

##### `coverImage` and `coverImageAlt` fields

Both fields are **optional**. When a novel has a cover image:

- Store the image in `apps/dad-site/public/` and reference it with a root-relative path:

  ```yaml
  coverImage: "/cutting-in-cover-shelley-slater-2015_web.jpg"
  coverImageAlt: "Book cover for Cutting In"
  ```

- `coverImageAlt` should always be populated whenever `coverImage` is populated — it is the accessible alt text rendered on the page.
- Leave both blank when no cover is available yet:

  ```yaml
  coverImage: ""
  coverImageAlt: ""
  ```

On wide screens the cover displays in a dedicated right-side column alongside the synopsis. On narrow screens it flows beneath the synopsis and before the purchase links.

##### Gotchas

- **Dates** — `publicationDate` must be a valid date parsable by JavaScript (e.g. `YYYY-MM-DD`). Avoid month/year-only values like `2023-09` as they may parse incorrectly across environments.
- **URLs must be absolute** — `url` values in `purchaseLinks` must start with `https://` (or `http://`). Relative URLs will not work as purchase links.
- **Quote strings containing special characters** — If `title` or `synopsis` contains colons, quotes, or other YAML-special characters, wrap the value in double quotes or use a block scalar (`>`).
- **`printLength` is a number** — Do not quote it (write `printLength: 312`, not `printLength: "312"`).
- **`publicationDate` and `printLength` are optional** — The site builds without them, but including them makes the entry a complete record.

## 🔀 Redirect Management

Content/path redirects are managed **in-app**, not in the Cloudflare dashboard. Each app owns its own redirect rules so they can be reviewed, edited, and version-controlled alongside the content they describe.

### Where redirect rules live

| App | Registry file |
| :-- | :------------ |
| ian-site | `apps/ian-site/src/data/redirects.ts` |
| dad-site | `apps/dad-site/src/data/redirects.ts` |

Each file exports a typed `RedirectRule[]` array. Middleware in each app (`src/middleware.ts`) reads this registry on every incoming request and performs an exact-path or prefix redirect when a match is found. Query strings are preserved automatically.

`dad-site` also auto-generates exact redirects for legacy poem URLs in the old dated formats (`/poetry/YYYY/MM/slug` and `/poetry/YYYY/M/slug`) by reading each poem's frontmatter date and mapping those paths to the current `/poetry/slug` route. You do not need to add those one-by-one.

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
