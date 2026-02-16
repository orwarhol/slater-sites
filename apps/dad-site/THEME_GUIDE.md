# Dad Site - Ocean Storm Theme Guide

## Overview

The dad-site uses a restrained "Ocean Storm" theme featuring:
- Layered ocean blues with stormy grey accents
- Dark, contemplative backgrounds suitable for long-form poetry reading
- Green accents for interactive elements and CTAs
- High contrast for readability and accessibility

## Color Palette

### Core Colors
```css
--bg: #0A1628           /* Deep ocean background */
--surface-1: rgba(21, 42, 66, 0.70)  /* Primary glass panel */
--surface-1-hover: rgba(21, 42, 66, 0.85)  /* Glass panel hover */
--surface-2: #1E3A56    /* Solid surface fallback / stronger blocks */
--storm-grey-1: #546E7A /* Primary storm grey - muted text */
--storm-grey-2: #78909C /* Secondary storm grey - borders/dividers */
--storm-grey-3: #B0BEC5 /* Tertiary storm grey - subtle accents */
--text: #E8F4F8         /* Primary text - high contrast */
--muted: #B0BEC5        /* Secondary text - brighter for readability */
```

### Accent Colors (Two Greens Only)
```css
--accent: #26A69A       /* Green accent - links, CTAs, interactive base */
--accent-hover: #00897B /* Darker green - hover/active states */
--accent-dark: #00897B  /* Same as hover - consolidated to two greens */
```

### Glass Effect
```css
--glass-border: rgba(120, 144, 156, 0.28)
--glass-blur: 12px
```

### Fine Outer Border - Gradient
```css
--fine-border-gradient: linear-gradient(135deg, #26A69A 0%, #C9B896 100%)
```

The fine outer border is a distinctive gradient that runs from the accent green (#26A69A) to a warm sand color (#C9B896). This gradient is applied to:
- Glass panel static surfaces (home page CTAs, novels, gallery metadata)
- Poetry reader surfaces (poetry index and single poem pages)
- Gallery image viewer
- Header navigation bar (bottom edge)

The gradient creates visual consistency across content surfaces while adding a subtle warmth that complements the ocean storm theme.

### Helper Tokens
```css
--border: rgba(120, 144, 156, 0.35)
--focus-ring: 2px solid var(--accent)
--shadow: 0 2px 8px rgba(0,0,0,0.3), 0 10px 30px rgba(0,0,0,0.25)
```

### Poetry Dark Reader Tokens (Poetry-only)
```css
--poetry-dark-bg: #0F1115
--poetry-dark-text: #F2F5F7
--poetry-dark-muted: rgba(242, 245, 247, 0.72)
```

### Spacing & Radius
```css
--radius-lg: 12px       /* Large panels, cards */
--radius-md: 8px        /* Medium modules, sections */
--radius-sm: 4px        /* Small elements, tags */
--pad-lg: 2.5rem        /* Large panel padding */
--pad-md: 1.5rem        /* Medium panel padding */
--pad-sm: 1rem          /* Small panel padding */
```

## Typography

### Font Stack
- **Body & Headings (default):** Rubik - clean, modern sans-serif
- **Brand/Logo:** Chonburi - distinctive display font, always in ALL CAPS
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

## Surface Layering System

### Layer 1: Page Background
The deepest layer - the page background.

```css
html, body {
  background: var(--bg);
  color: var(--text);
}
```

**Usage:** Applied globally to html and body elements.

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
  border-color: rgba(77, 182, 172, 0.35);
}

.glass-panel--padded {
  padding: var(--pad-lg);
}
```

**When to use:**
- Main content areas (novels index/singles)
- Home page cards (Poetry/Novels)
- Gallery metadata sidebar
- Poetry reader surface
- Any primary content container

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

**When to use:**
- Tag chips
- Nested content within main panels (like purchase links in novels)
- Metadata sections

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
  color: var(--muted);
  transition: all 0.2s ease;
}

.tag:hover {
  background: var(--accent);
  color: white;
  border-color: var(--accent-hover);
}
```

### Poetry Content Formatting
```css
.poem-content {
  white-space: pre-wrap;
  font-family: Georgia, 'Times New Roman', serif;
  line-height: 1.9;
  color: var(--text);
}

.poem-meta {
  color: var(--muted);
  font-size: 0.95em;
}
```

## Poetry Dark Reader

The Poetry section includes an optional Dark Reader mode for users who prefer inverted colors for long reading sessions.

### Implementation
```astro
<!-- Toggle component -->
<div class="poetry-dark-reader-toggle">
  <label>
    <input type="checkbox" id="dark-reader-toggle" />
    <span>Dark Reader</span>
  </label>
</div>

<!-- Wrapper for content that inverts -->
<div class="poetry-reader-surface" data-poetry-reader>
  <!-- Poetry content here -->
</div>
```

### Styles
```css
/* Default state */
.poetry-reader-surface {
  background: var(--surface-1);
  color: var(--text);
  padding: var(--pad-lg);
  border-radius: var(--radius-md);
  transition: background 0.3s ease, color 0.3s ease;
}

/* Dark Reader active - uses token-based colors */
.poetry-reader-surface.is-dark {
  background: var(--poetry-dark-bg);
  color: var(--poetry-dark-text);
}

.poetry-reader-surface.is-dark a {
  color: var(--accent);
}

.poetry-reader-surface.is-dark a:hover {
  color: var(--accent-hover);
}

.poetry-reader-surface.is-dark .poem-meta {
  color: var(--poetry-dark-muted);
}
```

### Behavior
- Toggle appears only on Poetry pages (index, single poem, tag views)
- State persists via localStorage with key `dadsite:poetry-dark-reader`
- Only affects the poetry content surface, not header/footer/navigation
- Default: OFF

## Accessibility Notes

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
✅ Header nav links readable against dark header background
✅ Body text comfortable for long-form reading
✅ Links distinguishable in both normal and Dark Reader modes
✅ Focus states clearly visible
✅ Tag chips maintain contrast in hover states
✅ Poetry content readable in both light and dark surface modes

## Best Practices

### DO:
✅ Use green accent sparingly for CTAs and interactive elements
✅ Maintain the surface layering hierarchy (bg → surface-1 → surface-2)
✅ Ensure high contrast for poetry content (readability is paramount)
✅ Use storm greys for muted text, borders, and subtle separators
✅ Preload Rubik and Chonburi fonts for performance

### DON'T:
❌ Use Chonburi for anything except the header logo
❌ Overuse the green accent - it should be reserved for interactive elements
❌ Create more than 3 levels of surface nesting
❌ Use pure white (#FFFFFF) or pure black (#000000) for backgrounds
❌ Mix old color values with new tokens
❌ Change Dark Reader toggle appearance outside Poetry section
❌ Hardcode colors in Dark Reader mode - always use CSS tokens

## Files Modified

The following files implement the Ocean Storm theme:

- `src/styles/global.css` - Core palette, typography, and surface system
- `src/components/BaseHead.astro` - Font preloads
- `src/components/Header.astro` - Navigation with Chonburi logo
- `src/components/PoetryDarkReaderToggle.astro` - Dark Reader toggle component
- `src/pages/poetry/index.astro` - Poetry index with Dark Reader
- `src/pages/poetry/[slug].astro` - Single poem with Dark Reader
- `src/pages/poetry/tags/[tag].astro` - Tag page with Dark Reader

## Maintenance

When updating styles:
- Keep color tokens in `global.css` `:root`
- Maintain the surface layering hierarchy
- Test accessibility with contrast checkers
- Verify focus states are clearly visible
- Ensure Dark Reader mode only affects Poetry content surface
