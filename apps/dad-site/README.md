# dad-site

Astro site for Charles Slater — poet, novelist, and photographer.

## Development

```bash
npm install
npm run dev
```

## Build & test

From the repo root:

```bash
npm run build:dad
npm run test:dad
npm run test:dad:integration
```

From the app directory:

```bash
npm run build      # astro check + astro build
npm run test       # unit tests
npm run test:integration  # integration tests (spins up dev server)
```

## Content authoring

### Poetry

Poetry entries live in `src/content/poetry/`. Each file uses frontmatter with:

- `title` — poem title (required)
- `date` — publication date (required)
- `tags` — array of tag strings (optional, defaults to `[]`)
- `excerpt` — short excerpt for listings (required)
- `decorativeImage` — optional decorative image path

### Novels

Novel entries live in `src/content/novels/`. Each file uses frontmatter with:

- `title` — novel title (required)
- `publicationDate` — publication date (optional)
- `printLength` — page count as a number (optional)
- `synopsis` — synopsis text for the novel listing and meta description (required)
- `purchaseLinks` — array of `{ label, url }` objects (optional, defaults to `[]`)
- `coverImage` — root-relative path to a cover image stored in `public/` (optional)
- `coverImageAlt` — accessible alt text for the cover image (optional when no image is present, but **should be populated whenever `coverImage` is populated**)

#### Cover image notes

- Store cover images in `apps/dad-site/public/` and reference them with a root-relative path.
- When a cover is available, populate both fields together:

  ```yaml
  coverImage: "/cutting-in-cover-shelley-slater-2015_web.jpg"
  coverImageAlt: "Book cover for Cutting In"
  ```

- Leave both blank when a novel does not yet have an assigned cover:

  ```yaml
  coverImage: ""
  coverImageAlt: ""
  ```

- On wide screens the cover displays in a dedicated right-side column. On narrow screens it flows beneath the synopsis and before purchase links.

### Gallery

Gallery entries live in `src/content/gallery/`. Each file uses frontmatter with `title`, `src`, `alt`, and optional `date`, `notes`, `camera`, `location`, `order`, and `slug` fields.

## Redirects

Redirect rules are declared in `src/data/redirects.ts`. Legacy poetry URL patterns (`/poetry/YYYY/MM/slug`) are generated automatically from the poetry collection at build time.

## Deployment

The site deploys to Cloudflare Pages via the `wrangler.json` configuration. Run `npm run build` to produce a `dist/` directory suitable for Cloudflare.
