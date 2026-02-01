# Cloudflare Pages Configuration

## Root Cause of Previous Build Failures

The npm install failures were caused by **invalid JSON syntax** in both app package.json files:
- Missing commas after the `postbuild` script in `apps/ian-site/package.json` and `apps/dad-site/package.json`
- This caused npm to crash with: "Exit prior to config file resolving"

## Fix Applied

1. **Fixed JSON syntax errors** - Added missing commas after `postbuild` scripts
2. **Created per-app lockfiles** - Generated `package-lock.json` files in each app directory for independent installs

## Cloudflare Pages Settings

### Ian's Site (ian-site)

**Project Name:** `ian-site`

**Build Configuration:**
- **Framework preset:** None (or Astro if available)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `apps/ian-site`
- **Environment variables:** None required

**Build System:**
- **Node version:** 20.x or later (recommended: 20.20.0)
- **Package manager:** npm (uses `npm ci` by default)

**Deployment:**
- Cloudflare will run `npm ci` from the `apps/ian-site` directory
- The per-app `package-lock.json` ensures all dependencies install correctly
- Build runs `npm run build` which executes `astro check && astro build`
- Postbuild automatically copies `.assetsignore` to dist directory

### Dad's Site (dad-site)

**Project Name:** `dad-site`

**Build Configuration:**
- **Framework preset:** None (or Astro if available)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `apps/dad-site`
- **Environment variables:** None required

**Build System:**
- **Node version:** 20.x or later (recommended: 20.20.0)
- **Package manager:** npm (uses `npm ci` by default)

**Deployment:**
- Cloudflare will run `npm ci` from the `apps/dad-site` directory
- The per-app `package-lock.json` ensures all dependencies install correctly
- Build runs `npm run build` which executes `astro check && astro build`
- Postbuild automatically copies `.assetsignore` to dist directory

## Wrangler Configuration

Both projects have properly configured `wrangler.json` files:

### ian-site (wrangler.json)
```json
{
  "name": "ian-site",
  "compatibility_date": "2025-10-08",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./dist/_worker.js/index.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  },
  "observability": {
    "enabled": true
  },
  "upload_source_maps": true
}
```

### dad-site (wrangler.json)
```json
{
  "name": "dad-site",
  "compatibility_date": "2025-10-08",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./dist/_worker.js/index.js",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  },
  "observability": {
    "enabled": true
  },
  "upload_source_maps": true
}
```

## Verification

Both projects have been tested and verified to:
1. ✅ Parse package.json without errors
2. ✅ Install dependencies with `npm ci` in isolated context
3. ✅ Build successfully with `npm run build`
4. ✅ Generate proper dist directory with worker files
5. ✅ Copy .assetsignore to dist directory via postbuild

## Troubleshooting

If builds still fail:

1. **Check Node version:** Ensure Cloudflare is using Node 20.x
2. **Verify Root directory:** Must be set to `apps/ian-site` or `apps/dad-site`
3. **Check lockfile:** Ensure `package-lock.json` exists in the app directory
4. **Review build logs:** Look for specific error messages in Cloudflare dashboard

## Local Development

To work on projects locally while maintaining Cloudflare compatibility:

```bash
# Install all workspace dependencies from root
cd /path/to/slater-sites
npm install

# Or install per-app (simulates Cloudflare)
cd apps/ian-site
npm ci
npm run build

cd ../dad-site
npm ci
npm run build
```
