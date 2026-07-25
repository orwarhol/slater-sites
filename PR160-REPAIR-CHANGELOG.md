# PR 160 repair handoff

## What changed
- Fixed the app-path Cloudflare build failures for dad-site and global-field-guide by excluding app-local Playwright config files from the Astro TypeScript scope.
- Added built-Worker Playwright smoke coverage for ian-site, dad-site, and global-field-guide so smoke validation exercises the real worker artifact instead of only `astro dev`.
- Patched the generated Astro server entry for the Cloudflare worker path to ensure Ian’s homepage no longer renders visible `[object Object]` in built-worker mode.
- Strengthened homepage smoke assertions to reject malformed serialization markers like `[object Object]` and `[object Promise]`.
- Added a favicon to global-field-guide to eliminate the browser-requested 404 that was surfacing as a false-positive smoke failure.

## What was ruled out
- The Ian defect was not caused by the homepage content itself or the homepage component tree.
- The dad/global build failures were not caused by missing runtime dependencies in the app builds; they were caused by the Playwright config files being included in the Astro TypeScript scope.
- The global-field-guide smoke failure was not a real app rendering bug; it was a browser-requested favicon 404 that surfaced in the smoke assertions.

## Remaining follow-up / next places to check
- If the built-worker runtime regresses again, inspect the generated Cloudflare server entry and the `renderPage`/page-export resolution path in the Astro 7 output under each app’s `dist/server` tree.
- If broader Playwright coverage is re-enabled, the existing Ian resume route tests may still need attention because they are currently outside the scope of this repair and were not part of the smoke fix.
- If Cloudflare branch previews still diverge from local worker output, compare the deployed worker bundle with the local `dist/server` artifact and confirm the patched server entry is present in the deployed build.
