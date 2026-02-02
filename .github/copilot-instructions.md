# Copilot Instructions for Slater Sites Monorepo

This monorepo contains two personal Astro websites (ian-site and dad-site) hosted on Cloudflare Pages.

## Tech Stack

- **Astro 5.x** - Static site framework
- **TypeScript** - All code should be properly typed
- **Cloudflare Pages** - Deployment platform
- **npm workspaces** - Monorepo management

## Project Structure

This is an npm workspaces monorepo:
- Root `package.json` defines workspaces in `apps/*`
- `apps/ian-site/` - Ian's personal site (writing, filmmaking, photography)
- `apps/dad-site/` - Charles's site (poetry and novels)

## Coding Conventions

- Use TypeScript for all code files
- Follow existing file structure and naming conventions
- Content is managed via Astro Content Collections
- Each site has its own `package.json` in its app directory

## Build & Development

- Run commands from the root directory
- Use workspace-specific commands: `npm run dev:ian`, `npm run dev:dad`, `npm run build:ian`, `npm run build:dad`
- Build command includes TypeScript checking: `astro check && astro build`
- Build output goes to `dist/` directory in each app

## Content Collections

### Ian Site Collections
- **blog** - Blog posts with title, description, pubDate, heroImage
- **projects** - Creative projects with title, date, type, genre, pages
- **gallery** - Photography with title, src, alt, date, notes, camera, location, order

### Dad Site Collections
- **poetry** - Poems with title, date, tags, excerpt, decorativeImage
- **novels** - Novels with title, publicationDate, printLength, synopsis, purchaseLinks
- **gallery** - Photography (same schema as Ian site)

## Gallery Features

Both sites share common gallery functionality:
- Single-photo viewer with metadata sidebar
- Navigation via buttons and keyboard (arrow keys)
- Shareable URLs via query parameter `?i=NUMBER`
- Sorting: order field → date → title
- Responsive design

## Deployment

Each app deploys independently to Cloudflare Pages:
- Root directory set to `apps/ian-site` or `apps/dad-site`
- Build command: `npm run build`
- Build output: `dist`

## Rules & Restrictions

- Never break the monorepo workspace structure
- Maintain consistency between the two sites where features overlap (e.g., gallery)
- Always run `astro check` before building
- Don't modify `postbuild` scripts without understanding Cloudflare deployment needs
- Test changes in both sites when modifying shared patterns
