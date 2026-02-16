# Dad Site - Ocean Storm Theme Guide

## Overview

The dad-site uses a restrained "Ocean Storm" theme featuring:
- Layered ocean blues with stormy grey accents
- Dark, contemplative backgrounds suitable for long-form poetry reading
- Green accents for interactive elements and CTAs
- High contrast for readability and accessibility

This guide documents the **stable theme contract** and best practices for maintaining consistency.

---

## Theme Contract: Core Tokens

### Backgrounds & Surfaces

Use these tokens for layering content from background to foreground:

```css
--bg              /* Page background: deep ocean #0A1628 */
--surface-1       /* Primary glass panels: rgba(21, 42, 66, 0.70) */
--surface-1-hover /* Hovered glass panels: rgba(21, 42, 66, 0.85) */
--surface-2       /* Solid surface fallback / nested elements: #1E3A56 */
```

**Surface layering hierarchy**: `--bg` → `--surface-1` (glass panel) → `--surface-2` (nested content)

### Text Colors

```css
--text            /* Primary text: #B0BEC5 (main body copy) */
--text-secondary  /* Secondary/muted text: #8B9DA6 */
```

### Accent Colors

```css
--accent       /* Interactive elements, CTAs, links: #26A69A (teal green) */
--accent-hover /* Hover/active state: #00897B (darker teal) */
```

**Note**: We use only TWO greens to keep the palette restrained.

### Borders

```css
--border              /* Standard borders: rgba(120, 144, 156, 0.35) */
--glass-border        /* Glass panel borders: rgba(120, 144, 156, 0.28) */
--glass-border-hover  /* Hovered glass borders: rgba(77, 182, 172, 0.35) */
--fine-border-gradient /* Gradient border (green to sand): linear-gradient(135deg, #26A69A 0%, #C9B896 100%) */
```

### Spacing & Radius

```css
--radius-lg  /* 12px - Large panels, cards */
--radius-md  /* 8px - Medium modules, sections */
--radius-sm  /* 4px - Small elements, tags */

--pad-lg     /* 2.5rem - Large panel padding */
--pad-md     /* 1.5rem - Medium panel padding */
--pad-sm     /* 1rem - Small panel padding */
```

---

## Component-Specific Tokens

### Poetry Dark Reader Mode

**Only for `.poetry-reader-surface.is-dark`**:

```css
--poetry-dark-bg       /* #0F1115 - Darker background */
--poetry-dark-text     /* #D0D8DE - Softer text */
--poetry-dark-heading  /* #E0E8EE - Softer headings */
--poetry-dark-muted    /* rgba(208, 216, 222, 0.70) - Muted text */
--poetry-dark-border   /* rgba(120, 144, 156, 0.35) - Flat grey border */
```

### Gallery Buttons

```css
--button-bg            /* rgba(21, 42, 66, 0.70) - Button background */
--button-bg-hover      /* rgba(21, 42, 66, 0.90) - Hovered button */
--button-shadow-hover  /* rgba(10, 22, 40, 0.2) - Hover shadow */
```

---

## Deprecated: Legacy RGB Vars

**DO NOT USE FOR NEW CODE**:

```css
--black      /* DEPRECATED: Use --text instead */
--gray       /* DEPRECATED: Use --text-secondary instead */
--gray-light /* DEPRECATED: Use --storm-grey-3 instead */
--gray-dark  /* DEPRECATED: Use --storm-grey-1 instead */
```

These legacy variables remain for backwards compatibility only. They use `rgb(var(--name))` syntax which is harder to work with than the semantic tokens.

**Migration rule**: When editing old code, replace `rgb(var(--gray))` with `var(--text-secondary)`, etc.

---

## Typography

### Font Stack

- **Body & Headings (default):** Rubik - clean, modern sans-serif
- **Brand/Logo:** Chonburi - distinctive display font, **always in ALL CAPS**
- **Poetry content:** Georgia, Times New Roman - classic serif for readability

### Usage Rules

```css
/* Body text */
body {
  font-family: var(--font-body);  /* Rubik */
  font-size: 18px;
  line-height: 1.8;
  color: var(--text);
}

/* Standard headings - ALL use Rubik */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);  /* Rubik */
  color: var(--text);
  font-weight: 500;
}

/* Header logo - ONLY place Chonburi is used, always ALL CAPS */
.site-logo {
  font-family: var(--font-brand);  /* Chonburi */
  text-transform: uppercase;
  font-weight: 400;
}

/* Poetry content */
.poem-content {
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.9;
  white-space: pre-wrap;
}
```

---

## Surface Layering System

### Layer 1: Page Background

The deepest layer - the page background.

```css
html, body {
  background: var(--bg);
  color: var(--text);
}
```

### Layer 2: Glass Panel Surfaces

Primary content containers using subtle glassmorphism.

```css
.glass-panel {
  background: var(--surface-1);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
}

.glass-panel:hover {
  background: var(--surface-1-hover);
  border-color: var(--glass-border-hover);
}
```

**Use cases**:
- Main content areas (novels index/singles)
- Home page cards (Poetry/Novels)
- Gallery metadata sidebar
- Poetry reader surface

### Layer 3: Nested Panels

Secondary surfaces that sit inside content surfaces.

```css
.panel {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--pad-md);
}
```

**Use cases**:
- Tag chips
- Nested content within main panels
- Metadata sections

---

## Critical: Astro Scoped CSS Rules

### The Problem

Astro's scoped CSS adds `data-astro-cid-*` attributes to elements, making page-scoped styles **more specific** than global styles. This breaks state-based overrides like `.poetry-reader-surface.is-dark`.

**Example of what goes wrong**:

```astro
<!-- In a .astro page file -->
<style>
  .poem-title {
    color: var(--text);  /* This is scoped, so more specific */
  }
</style>
```

The global override in `global.css`:

```css
.poetry-reader-surface.is-dark .poem-title {
  color: var(--poetry-dark-heading);  /* This WON'T win - scoped CSS beats it */
}
```

### The Solution

**Any style that needs to be overridden by a state class (like `.is-dark`) MUST be global.**

You have two options:

1. **Move it to `global.css`** (preferred for shared styles):

```css
/* global.css */
.poetry-reader-surface .poem-title {
  color: var(--text);
}

.poetry-reader-surface.is-dark .poem-title {
  color: var(--poetry-dark-heading);
}
```

2. **Use `:global()` wrapper** in page-scoped CSS:

```astro
<style>
  /* Scoped styles for layout */
  .poem-entry {
    break-inside: avoid;
  }

  /* Global styles for state-dependent properties */
  :global(.poetry-reader-surface .poem-title) {
    color: var(--text);
  }
</style>
```

### Rules of Thumb

- **Structure/layout** (columns, gaps, padding) → Can be scoped
- **Colors that respond to `.is-dark`** → MUST be global
- **Text properties that respond to state** → MUST be global
- **Interactive hover states** → Usually safe to scope

**Files affected**: Poetry pages (`poetry/index.astro`, `poetry/[slug].astro`, `poetry/tags/[tag].astro`) must avoid scoped color declarations for elements inside `.poetry-reader-surface`.

---

## Poetry Dark Reader

The Poetry section includes an optional Dark Reader mode for users who prefer inverted colors for long reading sessions.

### Implementation

```astro
<!-- Toggle component -->
<PoetryDarkReaderToggle />

<!-- Wrapper for content that inverts -->
<div class="poetry-reader-surface" data-poetry-reader>
  <!-- Poetry content here -->
</div>
```

### Default State Styles

```css
.poetry-reader-surface {
  background: var(--surface-1);
  color: var(--text);
  padding: var(--pad-lg);
  border-radius: var(--radius-md);
  transition: background 0.3s ease, color 0.3s ease;
}

/* Gradient border */
.poetry-reader-surface::before {
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
```

### Dark Reader Active Styles

```css
/* Dark Reader active - uses token-based colors */
.poetry-reader-surface.is-dark {
  background: var(--poetry-dark-bg);
  color: var(--poetry-dark-text);
}

.poetry-reader-surface.is-dark h1,
.poetry-reader-surface.is-dark h2,
.poetry-reader-surface.is-dark h3,
.poetry-reader-surface.is-dark .poem-title,
.poetry-reader-surface.is-dark .year-label,
.poetry-reader-surface.is-dark .poem-link {
  color: var(--poetry-dark-heading);
}

.poetry-reader-surface.is-dark a {
  color: var(--accent);
}

.poetry-reader-surface.is-dark .poem-meta {
  color: var(--poetry-dark-muted);
}

/* Override gradient border with flat grey in dark mode */
.poetry-reader-surface.is-dark::before {
  background: var(--poetry-dark-border);
}
```

### Behavior

- Toggle appears only on Poetry pages (index, single poem, tag views)
- State persists via localStorage with key `dadsite:poetry-dark-reader`
- Only affects the poetry content surface, not header/footer/navigation
- Default: OFF

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

a:focus {
  outline: var(--focus-ring);
  outline-offset: 2px;
}
```

### Navigation Active State

```css
nav a.active {
  border-bottom-color: var(--accent);
  color: var(--text);
}

nav a:hover {
  border-bottom-color: var(--accent);
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

## Accessibility

### Contrast Requirements

- Body text on background: Minimum 7:1 (AAA level)
- Links must maintain 4.5:1 contrast minimum
- Header navigation links: Ensure high contrast against header background
- Focus indicators: Visible 2px outline with offset

### Focus Visibility

All interactive elements must have clear focus states:

```css
a:focus, button:focus, input:focus {
  outline: var(--focus-ring);
  outline-offset: 2px;
}
```

### Testing Checklist

- ✅ Header nav links readable against dark header background
- ✅ Body text comfortable for long-form reading
- ✅ Links distinguishable in both normal and Dark Reader modes
- ✅ Focus states clearly visible
- ✅ Tag chips maintain contrast in hover states
- ✅ Poetry content readable in both light and dark surface modes

---

## Best Practices

### DO:

✅ Use semantic tokens from the theme contract (`--text`, `--surface-1`, etc.)  
✅ Use green accent sparingly for CTAs and interactive elements  
✅ Maintain the surface layering hierarchy (bg → surface-1 → surface-2)  
✅ Ensure high contrast for poetry content (readability is paramount)  
✅ Use storm greys for muted text, borders, and subtle separators  
✅ Move state-dependent styles to `global.css` or use `:global()` wrapper  
✅ Test Dark Reader mode on Poetry pages after making changes  

### DON'T:

❌ Use Chonburi for anything except the header logo  
❌ Overuse the green accent - reserve for interactive elements  
❌ Create more than 3 levels of surface nesting  
❌ Use pure white (#FFFFFF) or pure black (#000000) for backgrounds  
❌ Use deprecated legacy RGB vars (`--black`, `--gray`, etc.) in new code  
❌ Set `color` in scoped CSS for elements inside `.poetry-reader-surface`  
❌ Change Dark Reader toggle appearance outside Poetry section  
❌ Hardcode colors in Dark Reader mode - always use CSS tokens  

---

## Files Modified

The following files implement the Ocean Storm theme:

- `src/styles/global.css` - Core palette, typography, surface system, and Poetry styles
- `src/components/BaseHead.astro` - Font preloads
- `src/components/Header.astro` - Navigation with Chonburi logo
- `src/components/PoetryDarkReaderToggle.astro` - Dark Reader toggle component
- `src/pages/poetry/index.astro` - Poetry index (layout only in scoped CSS)
- `src/pages/poetry/[slug].astro` - Single poem (layout only in scoped CSS)
- `src/pages/poetry/tags/[tag].astro` - Tag page (layout only in scoped CSS)
- `src/pages/gallery.astro` - Gallery with gradient-bordered image viewer
- `src/pages/novels/index.astro` - Novels index with glass panels
- `src/pages/novels/[slug].astro` - Single novel with glass panels

---

## Maintenance

When updating styles:

1. **Keep color tokens in `global.css` `:root`** - This is the single source of truth
2. **Maintain the surface layering hierarchy** - Don't mix layers or create too many
3. **Test accessibility with contrast checkers** - Especially for new color uses
4. **Verify focus states are clearly visible** - Test with keyboard navigation
5. **Test Dark Reader mode** - After any changes to Poetry pages
6. **Prefer semantic tokens over hard-coded colors** - Use `var(--text)` not `#B0BEC5`
7. **Avoid scoped CSS for state-dependent properties** - Move to global or use `:global()`

---

## Summary

The Ocean Storm theme is built on a stable contract of semantic tokens that separate structure from state. By following the Astro scoped CSS rules and using the documented tokens, you can maintain a consistent, accessible, and maintainable design system for the dad-site.
