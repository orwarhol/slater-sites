# Dad Site - Ocean Storm Theme Guide

## Overview

The dad-site uses a restrained "Ocean Storm" theme designed for contemplative long-form reading:
- Deep ocean blues with stormy grey accents
- Dark backgrounds suitable for poetry and prose
- Teal green accents for interactive elements
- High contrast for readability and accessibility

This guide documents the **stable theme contract** and rules for maintaining consistency.

---

## Theme Contract: Semantic Tokens

All semantic tokens are defined in `src/styles/global.css` under `:root`.

### Backgrounds & Surfaces

Surface layering hierarchy: `--bg` → `--surface-1` → `--surface-2`

```css
--bg              /* Page background: deep ocean #0A1628 */
--surface-1       /* Primary glass panels: rgba(21, 42, 66, 0.70) */
--surface-1-hover /* Hovered glass panels: rgba(21, 42, 66, 0.85) */
--surface-2       /* Solid surface / nested elements: #1E3A56 */
```

**Usage**:
- `--bg`: Body background
- `--surface-1`: Main content containers (glass panels with blur effect)
- `--surface-1-hover`: Hover state for interactive glass panels
- `--surface-2`: Nested content, tag chips, secondary surfaces

### Text Colors

```css
--text            /* Primary text: #B0BEC5 */
--text-secondary  /* Secondary/muted text: #8B9DA6 */
```

### Accent Colors

```css
--accent       /* Interactive elements: #26A69A (teal green) */
--accent-hover /* Hover/active state: #00897B (darker teal) */
```

**Note**: We use only TWO greens to keep the palette restrained. Use `--accent` for links/CTAs and `--accent-hover` for their hover states.

### Borders

```css
--border              /* Standard borders: rgba(120, 144, 156, 0.35) */
--glass-border        /* Glass panel borders: rgba(120, 144, 156, 0.28) */
--glass-border-hover  /* Hovered glass: rgba(77, 182, 172, 0.35) */
--fine-border-gradient /* Gradient (green to sand): linear-gradient(135deg, #26A69A 0%, #C9B896 100%) */
```

### Focus States

```css
--focus-ring  /* 2px solid var(--accent) */
```

All interactive elements must have visible focus indicators using `--focus-ring`.

### Spacing & Radius

```css
--radius-lg  /* 12px - Large panels, cards */
--radius-md  /* 8px - Medium modules, sections */
--radius-sm  /* 4px - Small elements, tags */

--pad-lg     /* 2.5rem - Large panel padding */
--pad-md     /* 1.5rem - Medium panel padding */
--pad-sm     /* 1rem - Small panel padding */
```

**Always use these tokens**, not hardcoded pixel values.

---

## Poetry Dark Reader Tokens

The Poetry section has an optional "Dark Reader" mode for inverted colors during long reading sessions. These tokens are **only used inside `.poetry-reader-surface.is-dark`**:

```css
--poetry-dark-bg       /* #0f141b - Dark background (moonlit paper) */
--poetry-dark-heading  /* #d5dce3 - Soft silver headings/titles */
--poetry-dark-text     /* #c2ccd6 - Comfortable body text (slightly dimmer than headings) */
--poetry-dark-muted    /* rgba(194, 204, 214, 0.72) - Muted meta text */
--poetry-dark-border   /* rgba(194, 204, 214, 0.22) - Flat grey border */
```

**Key principle**: Dark Reader uses "moonlit paper" aesthetics — soft, comfortable greys that don't glow or sparkle. Headings are NOT pure white but a muted light grey.

**Application**:
- Headings/titles/links: `var(--poetry-dark-heading)`
- Poem body text: `var(--poetry-dark-text)`
- Meta text (dates/tags): `var(--poetry-dark-muted)`
- Borders: `var(--poetry-dark-border)`

---

## Typography

### Font Stack

```css
--font-body    /* Rubik - body text and headings */
--font-heading /* Rubik - headings */
--font-brand   /* Chonburi - logo ONLY, always ALL CAPS */
```

### Font Usage Rules

- **Body & Headings**: Use Rubik for all text (via `--font-body` or `--font-heading`)
- **Logo**: Use Chonburi ONLY for the site logo in Header, always in ALL CAPS
- **Poetry content**: Use Georgia/Times New Roman serif for poem text

```css
/* Standard headings */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);  /* Rubik */
  color: var(--text);
  font-weight: 500;
}

/* Site logo - ONLY use case for Chonburi */
.site-logo {
  font-family: var(--font-brand);  /* Chonburi */
  text-transform: uppercase;
}

/* Poetry content */
.poem-content {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.9;
}
```

---

## Critical Rule: Astro Scoped CSS

### The Problem

Astro's scoped CSS adds `data-astro-cid-*` attributes, making page-scoped styles **more specific** than global styles. This breaks state-based overrides like `.poetry-reader-surface.is-dark`.

**Example of the problem**:

```astro
<!-- DON'T: Scoped color rule in .astro file -->
<style>
  .poem-title {
    color: var(--text);  /* This is scoped, so it's too specific */
  }
</style>
```

The global dark mode override won't work because scoped CSS wins:

```css
/* global.css - this WON'T override the scoped rule above */
.poetry-reader-surface.is-dark .poem-title {
  color: var(--poetry-dark-heading);
}
```

### The Solution

**Any style that changes based on state (like `.is-dark`) MUST be global.**

Two options:

1. **Move to `global.css`** (preferred):

```css
/* global.css */
.poetry-reader-surface .poem-title {
  color: var(--text);
}

.poetry-reader-surface.is-dark .poem-title {
  color: var(--poetry-dark-heading);
}
```

2. **Use `:global()` in page CSS**:

```astro
<style>
  /* Layout/structure can be scoped */
  .poem-entry {
    break-inside: avoid;
  }

  /* State-dependent styles must be global */
  :global(.poetry-reader-surface .poem-title) {
    color: var(--text);
  }
</style>
```

### Rules of Thumb

In `.astro` page files:

- **Structure/layout** (columns, gaps, padding, sizing) → **Can be scoped**
- **Colors that respond to `.is-dark`** → **MUST be global**
- **Text colors inside `.poetry-reader-surface`** → **MUST be global**
- **Interactive hover states** → Usually safe to scope unless state-dependent

**Files that must follow this rule**:
- `src/pages/poetry/index.astro`
- `src/pages/poetry/[slug].astro`
- `src/pages/poetry/tags/[tag].astro`

---

## Poetry Dark Reader Implementation

### Toggle Component

`src/components/PoetryDarkReaderToggle.astro` provides the toggle checkbox. It:
- Stores preference in localStorage: `dadsite:poetry-dark-reader`
- Toggles `.is-dark` class on `.poetry-reader-surface`
- Toggles `poetry-dark-enabled` class on `<body>` (for page-level headings)
- Default state: OFF

### Usage in Pages

```astro
<PoetryDarkReaderToggle />

<div class="poetry-reader-surface" data-poetry-reader>
  <!-- Poetry content here -->
</div>
```

### Styling Contract

**Base (light mode)** in `global.css`:

```css
.poetry-reader-surface {
  background: var(--surface-1);
  color: var(--text);
}

.poetry-reader-surface .poem-title,
.poetry-reader-surface .poem-link,
.poetry-reader-surface .year-label {
  color: var(--text);
}

.poetry-reader-surface .poem-meta {
  color: var(--text-secondary);
}

.poetry-reader-surface .poem-content {
  color: var(--text);
}
```

**Dark mode** in `global.css`:

```css
.poetry-reader-surface.is-dark {
  background: var(--poetry-dark-bg);
  color: var(--poetry-dark-text);
}

.poetry-reader-surface.is-dark h1,
.poetry-reader-surface.is-dark h2,
.poetry-reader-surface.is-dark h3,
.poetry-reader-surface.is-dark .poem-title,
.poetry-reader-surface.is-dark .poem-link,
.poetry-reader-surface.is-dark .year-label {
  color: var(--poetry-dark-heading);
}

.poetry-reader-surface.is-dark .poem-meta {
  color: var(--poetry-dark-muted);
}

.poetry-reader-surface.is-dark .poem-content {
  color: var(--poetry-dark-text);
}

/* Flat border instead of gradient in dark mode */
.poetry-reader-surface.is-dark::before {
  background: var(--poetry-dark-border);
}
```

**Page-level headings** (outside the surface):

```css
/* When Poetry Dark Reader is enabled, page heading also uses dark color */
body.poetry-dark-enabled main > h1 {
  color: var(--poetry-dark-heading);
}
```

This ensures headings like "Poetry" and "Tag: memory" also shift to the soft grey when Dark Reader is active, preventing stark white text.

---

## Gallery Viewer Styling

The Gallery page (`src/pages/gallery.astro`) displays photos in a windowed viewer with metadata sidebar.

### Image Viewer Window

```css
.image-area {
  background: var(--bg);
  border-radius: var(--radius-md);  /* Rounded corners for windowed feel */
  overflow: hidden;
  position: relative;
  border: 1px solid transparent;
}

/* Gradient border using pseudo-element */
.image-area::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: var(--radius-md);
  padding: 1px;
  background: var(--fine-border-gradient);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: -1;
}

.main-image {
  border-radius: var(--radius-md);
  max-height: 80vh;
  object-fit: contain;
}
```

**Key features**:
- Rounded corners (`var(--radius-md)`) create a "window" effect
- Background uses `var(--bg)` to prevent white letterboxing
- Gradient border matches Ocean Storm theme

### Navigation Buttons

```css
.nav-button {
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: 50%;
  color: var(--text);
  transition: all 0.2s;
}

.nav-button:hover:not(:disabled) {
  background: var(--surface-1-hover);
  border-color: var(--glass-border-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.nav-button:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 2px;
}

.nav-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  color: var(--text-secondary);
}
```

**Requirements**:
- Use surface tokens (NOT white background)
- Visible border for definition
- Clear hover state with elevated shadow
- Focus-visible for keyboard navigation
- Muted disabled state with lower opacity

---

## Glass Panel System

### Standard Glass Panel

```css
.glass-panel {
  background: var(--surface-1);
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.glass-panel:hover {
  background: var(--surface-1-hover);
  border-color: var(--glass-border-hover);
}
```

**Use cases**: Home page cards, novels index/singles, gallery metadata sidebar

### Static Glass Panel (Enhanced)

```css
.glass-panel-static {
  background: var(--surface-1-hover);
  border: 1px solid transparent;
  position: relative;
}

/* Gradient border via pseudo-element */
.glass-panel-static::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: var(--radius-lg);
  padding: 1px;
  background: var(--fine-border-gradient);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: -1;
}
```

**Use case**: Gallery metadata sidebar (always enhanced, doesn't respond to hover)

---

## Component Patterns

### Links

```css
a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

a:focus-visible {
  outline: var(--focus-ring);
  outline-offset: 2px;
}
```

### Tag Chips

```css
.tag {
  background: var(--surface-2);
  border: 1px solid var(--storm-grey-2);
  padding: 0.25em 0.75em;
  border-radius: var(--radius-sm);
  font-size: 0.85em;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.tag:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent-hover);
}
```

---

## Testing Checklist

Before considering changes complete:

### Poetry Pages

- [ ] **Poetry index** (`/poetry`):
  - [ ] Titles and year labels readable in both modes
  - [ ] Dark Reader: titles NOT pure white, use soft grey
  - [ ] Page-level "Poetry" heading shifts to dark heading color when Dark Reader enabled
  - [ ] Hover states work in both modes
  - [ ] Focus states visible on keyboard navigation

- [ ] **Single poem** (`/poetry/[slug]`):
  - [ ] Poem title readable in both modes
  - [ ] Dark Reader: title NOT pure white
  - [ ] Poem content comfortable to read in dark mode
  - [ ] Tags work in both modes

- [ ] **Tag page** (`/poetry/tags/[tag]`):
  - [ ] "Tag: X" heading shifts to dark color when Dark Reader enabled
  - [ ] Poem links readable in both modes
  - [ ] Dark Reader: links NOT pure white

### Gallery

- [ ] Image viewer has rounded corners (windowed feel)
- [ ] Border is visible and matches theme (gradient in normal mode)
- [ ] Nav buttons have clear hover state
- [ ] Nav buttons have focus-visible state
- [ ] Disabled nav buttons look muted but still on-theme
- [ ] Buttons are NOT white

### Contrast & Accessibility

- [ ] Body text on background: 7:1 minimum (AAA)
- [ ] Links maintain 4.5:1 contrast
- [ ] Focus indicators visible on all interactive elements
- [ ] Poetry Dark Reader headings comfortable to read (not glaring white)

---

## Best Practices

### DO:

✅ Use semantic tokens (`--text`, `--surface-1`, `--accent`, etc.)  
✅ Use `--radius-*` tokens instead of hardcoded pixel values  
✅ Use green accent sparingly (interactive elements only)  
✅ Maintain surface layering hierarchy (bg → surface-1 → surface-2)  
✅ Move state-dependent styles to `global.css` (or use `:global()`)  
✅ Test Dark Reader mode after changes to Poetry pages  
✅ Ensure focus-visible states on all interactive elements  
✅ Use `var(--poetry-dark-heading)` for titles in dark mode (NOT pure white)

### DON'T:

❌ Use Chonburi for anything except the header logo  
❌ Overuse the green accent (reserve for CTAs and links)  
❌ Create more than 3 levels of surface nesting  
❌ Use pure white (#FFFFFF) or pure black (#000000)  
❌ Use deprecated legacy RGB vars (`--black`, `--gray`, etc.)  
❌ Set `color` in scoped CSS for elements inside `.poetry-reader-surface`  
❌ Use hardcoded `8px` instead of `var(--radius-md)`  
❌ Make Dark Reader headings pure white (use soft grey tokens)  

---

## Files Reference

### Core Theme Files

- **`src/styles/global.css`** - All tokens, typography, surface system, Poetry styles
- **`src/components/PoetryDarkReaderToggle.astro`** - Dark Reader toggle
- **`src/pages/poetry/index.astro`** - Poetry index (layout only in scoped CSS)
- **`src/pages/poetry/[slug].astro`** - Single poem (layout only in scoped CSS)
- **`src/pages/poetry/tags/[tag].astro`** - Tag page (layout only in scoped CSS)
- **`src/pages/gallery.astro`** - Gallery with rounded viewer window

### Key Principles

1. **Single source of truth**: All color tokens in `global.css` `:root`
2. **Surface layering**: bg → surface-1 → surface-2 (max 3 levels)
3. **Scoped CSS rule**: State-dependent colors must be global
4. **Dark Reader**: Soft grey headings, NOT pure white
5. **Accessibility**: High contrast, visible focus states
6. **Tokens over literals**: Use `var(--radius-md)` not `8px`

---

## Maintenance

When updating styles:

1. **Keep tokens in `global.css` `:root`** - Single source of truth
2. **Don't break surface hierarchy** - Avoid mixing layers
3. **Test accessibility** - Check contrast ratios
4. **Verify focus states** - Test keyboard navigation
5. **Test Dark Reader** - Check Poetry pages in both modes
6. **Use semantic tokens** - Prefer `var(--text)` over hardcoded colors
7. **Respect the scoped CSS rule** - Move state-dependent styles to global

---

## Summary

The Ocean Storm theme is built on stable semantic tokens that separate structure from state. By following the scoped CSS rules and using the documented tokens, you maintain a consistent, accessible design system for dad-site.

**Core contract**:
- Semantic tokens for all colors, spacing, and radius
- State-dependent styles in `global.css` (not scoped)
- Poetry Dark Reader uses soft grey, not pure white
- Gallery viewer has rounded corners and proper button states
- All interactive elements have visible focus indicators
