# Cloudflare Pages Deployment Configuration

## Issue: Automatic Deployments Not Triggering

If automatic deployments have stopped triggering in Cloudflare Pages for this monorepo, the most likely cause is that **Build Watch Paths** are not properly configured.

## Root Cause

Cloudflare Pages does **NOT** automatically restrict build triggers based on the "Root Directory" setting. By default:

- **ANY** change in the repository triggers a build for **ALL** connected Pages projects
- Setting "Root Directory" to `apps/ian-site` only tells Cloudflare **where to run the build**, not **when to trigger it**

This means:
- A change in `apps/dad-site/` will trigger a rebuild of `ian-site` (and vice versa)
- A change in root-level files will trigger rebuilds of both projects
- Without Build Watch Paths configured, Cloudflare may not trigger builds as expected in monorepos

## Solution: Configure Build Watch Paths

Build Watch Paths tell Cloudflare to only trigger builds when specific files/directories change. **This configuration must be done in the Cloudflare Pages dashboard** (cannot be configured via repository files).

### Steps to Configure Build Watch Paths

#### For ian-site Project

1. Log into Cloudflare Dashboard
2. Navigate to **Workers & Pages** → Select **ian-site** project
3. Go to **Settings** → **Builds & deployments**
4. Scroll to **Build watch paths** section
5. Click **Add path** and configure:

**Include paths (add all of these):**
```
apps/ian-site/**
```

**Exclude paths (optional):**
```
apps/dad-site/**
```

6. Click **Save**

#### For dad-site Project

1. Log into Cloudflare Dashboard
2. Navigate to **Workers & Pages** → Select **dad-site** project
3. Go to **Settings** → **Builds & deployments**
4. Scroll to **Build watch paths** section
5. Click **Add path** and configure:

**Include paths (add all of these):**
```
apps/dad-site/**
```

**Exclude paths (optional):**
```
apps/ian-site/**
```

6. Click **Save**

### How Build Watch Paths Work

1. When a commit is pushed to the repository, Cloudflare checks which files changed
2. If any changed files match an **exclude path**, they are ignored
3. If any remaining changed files match an **include path**, a build is triggered
4. If no files match the include paths (after exclusions), the build is skipped

### Example Scenarios

With the configuration above:

✅ **ian-site WILL build when:**
- Files in `apps/ian-site/src/` are changed
- Files in `apps/ian-site/public/` are changed
- `apps/ian-site/package.json` is changed
- Any file under `apps/ian-site/` is changed

❌ **ian-site will NOT build when:**
- Files in `apps/dad-site/` are changed
- Root-level files like `README.md` or `package.json` are changed (unless you want this)

✅ **dad-site WILL build when:**
- Files in `apps/dad-site/src/` are changed
- Files in `apps/dad-site/public/` are changed
- `apps/dad-site/package.json` is changed
- Any file under `apps/dad-site/` is changed

❌ **dad-site will NOT build when:**
- Files in `apps/ian-site/` are changed
- Root-level files like `README.md` or `package.json` are changed (unless you want this)

## Alternative: Trigger Builds for Both Sites on Shared Changes

If you want root-level changes (like workspace configuration) to trigger rebuilds of both sites, use this configuration instead:

### For Both Projects

**Include paths:**
```
apps/ian-site/**
package.json
package-lock.json
```
(Replace `ian-site` with `dad-site` for the dad-site project)

**Exclude paths:**
```
apps/dad-site/**
*.md
```
(Replace `dad-site` with `ian-site` for the dad-site project, and add `*.md` to exclude documentation changes)

## Verification

After configuring Build Watch Paths:

1. Make a small change to a file in `apps/ian-site/` (e.g., update a blog post)
2. Commit and push to the main branch
3. Check Cloudflare Pages dashboard - only `ian-site` should trigger a new deployment
4. Make a small change to a file in `apps/dad-site/` (e.g., update a poem)
5. Commit and push to the main branch
6. Check Cloudflare Pages dashboard - only `dad-site` should trigger a new deployment

## Current Build Configuration

### ian-site
- **Project Name:** `ian-site`
- **Production branch:** `main` (or `master`)
- **Root directory:** `apps/ian-site`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 20.x or later

### dad-site
- **Project Name:** `dad-site`
- **Production branch:** `main` (or `master`)
- **Root directory:** `apps/dad-site`
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 20.x or later

## Troubleshooting

### Builds Still Not Triggering

If builds still don't trigger after configuring Build Watch Paths:

1. **Verify Git Integration**
   - Go to Cloudflare Dashboard → Account Home → Configurations → Integrations
   - Check if GitHub integration is still authorized
   - Try disconnecting and reconnecting the integration if needed

2. **Check Branch Settings**
   - Go to Settings → Builds & deployments → Configure Production deployments
   - Ensure automatic deployments are enabled for your production branch
   - Verify the correct branch name is configured (e.g., `main` vs `master`)

3. **Check Build System Version**
   - Cloudflare Pages Build System V2 is required for proper monorepo support
   - Most projects should already be on V2, but you can verify in Settings

4. **Manual Trigger Test**
   - Try manually triggering a deployment from the Cloudflare dashboard
   - Go to project → Deployments → **Create deployment**
   - If manual builds work but automatic ones don't, it's definitely a watch path or Git integration issue

### Other Common Issues

1. **Builds Triggering Too Often**
   - If both sites build on every commit, Build Watch Paths are not configured
   - Follow the configuration steps above

2. **Build Failures**
   - Check the build logs in Cloudflare dashboard
   - Common issues: Node version mismatch, missing dependencies
   - See `CLOUDFLARE_SETUP.md` for build troubleshooting

3. **Old Deployments**
   - The deployment IDs mentioned (0b875e5b, 1cbc0a75) are from before Build Watch Paths were configured
   - Once configured, new deployments will have different IDs

## References

- [Cloudflare Pages Monorepo Documentation](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Build Watch Paths Documentation](https://developers.cloudflare.com/pages/configuration/build-watch-paths/)
- [Troubleshooting Cloudflare Pages Builds](https://developers.cloudflare.com/pages/configuration/git-integration/troubleshooting/)

## Additional Notes

- Build Watch Paths configuration is stored in Cloudflare, not in the repository
- There is currently no way to configure Build Watch Paths via `wrangler.toml` or repository files
- Each Cloudflare Pages project needs its own Build Watch Paths configuration
- Changes to Build Watch Paths take effect immediately on the next push

---

**Last Updated:** 2026-02-12  
**Issue:** Automatic deployments not triggering for ian-site and dad-site
