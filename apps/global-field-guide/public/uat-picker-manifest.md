# UAT Picker Stress-Test Fixture Manifest

**Purpose:** Disposable image corpus for stress-testing the Surface CMS Draft body-media picker in the Global Field Guide workspace.

## Summary

| Item | Value |
|---|---|
| Total eligible images | 240 |
| Seed images (root-level, user-added) | 16 |
| Generated fixture images | 224 |
| Status | Disposable UAT data — safe to delete |

## Counts by format

| Extension | Count |
|---|---|
| `.jpg` / `.jpeg` | 121 |
| `.png` | 66 |
| `.webp` | 26 |
| `.svg` | 15 |
| `.gif` | 12 |
| **Total** | **240** |

## Directories created

```
apps/global-field-guide/public/
├── photos/          (42 files: JPG + PNG)
├── illustrations/   (47 files: JPG + PNG)
├── diagrams/        (30 files: PNG + SVG)
├── animations/      (17 files: GIF + PNG)
├── webp/            (26 files: WebP)
├── events/          (23 files: JPG + PNG)
└── guides/          (39 files: JPG + PNG + SVG)
```

## Intentional test edge cases

### Duplicate basenames in different directories
- `events/header.png` and `guides/header.png`
- `photos/cover.jpg` and `illustrations/cover.jpg`
- `events/thumbnail.jpg` and `guides/thumbnail.jpg`
- `diagrams/overview.svg` and `guides/overview.svg`

### Long filenames (examples)
- `global-field-guide-featured-photograph-landscape-panorama-2026-edition-001.jpg`
- `global-field-guide-botanical-illustration-rare-endemic-species-northwest-region-001.jpg`
- `field-guide-taxonomic-classification-diagram-full-resolution-print-ready-v2-001.png`
- `annual-field-guide-editors-symposium-group-photograph-session-a-morning-2026.jpg`
- `complete-field-guide-habitat-survey-methodology-reference-sheet-appendix-a.png`
- `field-guide-cover-art-high-resolution-web-optimized-primary-edition-2026.webp`

## Notes

- All generated images are minimal solid-color files created with Pillow — realistic for picker listing purposes, not design deliverables.
- Sequential naming (`photo-001.jpg`, `photo-002.jpg`, …) ensures deterministic ordering.
- The 16 seed images at the root level are freely-licensed real photos added by the product owner.
- No application code, routes, styles, or `surface.config.json` were modified.
- This corpus is **disposable** and should be removed or replaced before production.
