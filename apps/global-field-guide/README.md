# Global Field Guide

**Global Field Guide** is a small editorial travel & culture site: short, practical field notes about markets, regional rail, coastal weekends, and museum afternoons. It is published in several **regional editions** (locales), so each guide can be read in the edition closest to where the reader actually is.

It is a real, self-contained Astro site in the `slater-sites` monorepo, built and deployed with the same Astro + Cloudflare adapter pattern as `ian-site` and `dad-site`. It is **not** a Surface CMS-specific runtime: there is no CMS route, login, or demo mode baked into the site. Surface CMS can connect to it generically as a Git-backed workspace via [`surface.config.json`](./surface.config.json).

## Locales & fallback

The site serves four locales with a directory-based content layout (`src/content/guides/{locale}/{slug}.md`):

| Locale  | Edition             | Fallback chain          |
| ------- | ------------------- | ----------------------- |
| `en-us` | English (US) — master | (none — final fallback) |
| `fr-fr` | Français (France)   | `en-us`                 |
| `es-mx` | Español (México)    | `en-us`                 |
| `fr-ca` | Français (Canada)   | `fr-fr` → `en-us`       |

The master (source) locale is **`en-us`**. When a guide has no physical file for the requested locale, the site resolves content through the fallback chain and shows a clear inherited/fallback notice. Missing variants are never silently treated as real localized files. The locale model lives in [`src/lib/locales.ts`](./src/lib/locales.ts) and the content resolution helpers in [`src/lib/guides.ts`](./src/lib/guides.ts).

## Pages

- `/` — site intro, edition chooser, and recent guides.
- `/{locale}/` — guides available/resolvable for an edition, with inherited content labeled.
- `/{locale}/guides/{slug}/` — a single guide in the requested edition (or its fallback), with a locale switcher and fallback notice.

## Local development

```bash
npm run dev --workspace=global-field-guide
```

## Build

```bash
npm run build --workspace=global-field-guide
```

## Tests

```bash
npm run test --workspace=global-field-guide
```

The unit tests cover the locale fallback helpers.

## Root aliases

From the monorepo root:

```bash
npm run dev:global
npm run build:global
npm run test:global
```

## Cloudflare Worker / application setup

This app is intended to deploy as the **third Cloudflare Worker/application** beside `ian-site` and `dad-site`, using the same dashboard-managed Astro + `@astrojs/cloudflare` pattern. (An app-local `wrangler.json` is included to match the existing apps, which each ship one.)

If the Cloudflare project root is set to the app directory:

```text
Cloudflare application / Worker name: global-field-guide
Repository:                           orwarhol/slater-sites
App path / root directory:            apps/global-field-guide
Build command:                        npm run build
Build output directory:               dist
```

If the Cloudflare dashboard runs from the repository root instead:

```text
Build command:          npm run build --workspace=global-field-guide
Build output directory: apps/global-field-guide/dist
```

Recommended build watch path:

```text
apps/global-field-guide/**
```

Root files that may also trigger builds:

```text
package.json
package-lock.json
```

## Surface CMS workspace registration

Surface CMS can register this app as a normal Git-backed workspace. The contract lives at [`surface.config.json`](./surface.config.json) and uses app-relative paths with `monorepoSubdir: "apps/global-field-guide"`.

```text
workspaceId:    global-field-guide
owner:          orwarhol
repo:           slater-sites
branch:         main
defaultBranch:  main
workspaceRoot:  apps/global-field-guide
contractPath:   apps/global-field-guide/surface.config.json
```

Safer UAT branch option:

```text
branch: surface-uat/regionalize-global-field-guide
```

The `guides` collection enables the Regionalize surface with `en-us` as the master locale and the fallback matrix above. Localized variants carry optional `surfaceSystemMeta` (system metadata, not an editable field) whose `surfaceDriftStatus` seeds cover `synchronized`, `drifted`, `unreviewed`, and `manualOverride`.

No secrets, tokens, or credentials are stored in this app or its config.
