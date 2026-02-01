# Ian Site - Neon "Awake" Theme Guide

## Overview

The ian-site now uses a high-contrast "awake" neon theme featuring:
- Deep night background (#010B18)
- Layered panels/surfaces with borders and subtle glows
- Electric cyan/blue accents with occasional violet pops
- A consistent surface layering system for visual hierarchy

## Color Palette

### Core Colors
```css
--bg: #010B18           /* Deep night background */
--surface-1: #0B1A33    /* Primary surface/panel */
--surface-2: #132B4A    /* Secondary surface/nested panel */
--border: #3181B2       /* Border color */
--text: #F3FAFF         /* Primary text */
--muted: #B7D4F0        /* Secondary text */
```

### Accent Colors
```css
--cyan: #5FE7FF         /* Primary accent - links, highlights */
--blue: #4AA3FF         /* Secondary accent - hover states */
--violet: #A78BFA       /* Tertiary accent - visited links */
--pink: #FF2FD6         /* Rare emphasis - use sparingly */
--lime: #8CFF3A         /* Rare emphasis - use sparingly */
```

### Helper Tokens
```css
--shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)
--glow-cyan: 0 0 8px rgba(95, 231, 255, 0.5), 0 0 16px rgba(95, 231, 255, 0.3)
--glow-pink: 0 0 8px rgba(255, 47, 214, 0.5), 0 0 16px rgba(255, 47, 214, 0.3)
--glow-lime: 0 0 8px rgba(140, 255, 58, 0.5), 0 0 16px rgba(140, 255, 58, 0.3)
```

### Spacing & Radius
```css
--radius-lg: 12px       /* Large panels, cards */
--radius-md: 8px        /* Medium modules, sections */
--radius-sm: 4px        /* Small elements, code blocks */
--pad-lg: 2.5rem        /* Large panel padding */
--pad-md: 1.5rem        /* Medium panel padding */
--pad-sm: 1rem          /* Small panel padding */
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

### Layer 2: Page Cards (.page-card)
Primary surface containers for major sections.

```css
.page-card {
  background: var(--surface-1);
  border: 1px solid rgba(49, 129, 178, 0.55);
  box-shadow: var(--shadow);
  border-radius: var(--radius-lg);
  padding: var(--pad-lg);
}
```

**When to use:**
- Main content containers on pages
- Bio section on home page
- Project detail headers
- Blog post title cards

**Example:**
```astro
<section class="bio page-card">
  <h1>Ian Slater</h1>
  <p>Writer, filmmaker, and photographer...</p>
</section>
```

### Layer 3: Panels/Modules (.panel, .module)
Secondary surfaces that sit inside page cards.

```css
.panel, .module {
  background: var(--surface-2);
  border: 1px solid rgba(49, 129, 178, 0.45);
  border-radius: var(--radius-md);
  padding: var(--pad-md);
  position: relative;
}

/* Accent strip at top */
.panel::before, .module::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, rgba(95, 231, 255, 0.3), rgba(74, 163, 255, 0.3));
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
```

**When to use:**
- Nested content within page cards
- Individual project items in lists
- Blog post cards
- Gallery metadata sidebar
- Callouts or featured sections

**Example:**
```astro
<div class="page-card">
  <h1>Projects</h1>
  <div class="panel">
    <h2>Dark Love</h2>
    <p>Feature screenplay...</p>
  </div>
</div>
```

## Typography & Links

### Headings
All headings use `var(--text)` for high contrast.

For gradient effect on important headings:
```css
h1 {
  background: linear-gradient(135deg, var(--cyan), var(--blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Links
```css
a {
  color: var(--cyan);           /* Default */
  text-decoration: none;
}

a:hover {
  color: var(--blue);           /* Hover */
  text-decoration: underline;
}

a:visited {
  color: var(--violet);         /* Visited */
}

a:focus {
  outline: 2px solid var(--cyan);
  outline-offset: 2px;
  box-shadow: var(--glow-cyan);
}
```

## Component Patterns

### Navigation Active State
```css
nav a.active {
  border-image: linear-gradient(90deg, var(--cyan), var(--blue)) 1;
}
```

### Hover States with Glow
```css
.item:hover {
  border-color: var(--cyan);
  box-shadow: var(--glow-cyan);
}
```

### Accent Strips
For panels that need a colored top edge:
```css
.panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--cyan), var(--blue));
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
```

## Best Practices

### DO:
✅ Use cyan/blue as primary accents
✅ Apply surface layering for visual hierarchy
✅ Use glows on interactive elements (hover, focus)
✅ Keep text high contrast (var(--text) on dark backgrounds)
✅ Add borders and shadows to distinguish surfaces

### DON'T:
❌ Overuse pink/lime - they're for rare emphasis only
❌ Skip the surface system and put text directly on background
❌ Mix old RGB color values with new tokens
❌ Create more than 3 levels of surface nesting
❌ Use pure white or pure black

## Adding New Pages

When creating new pages:

1. **Start with page background** - Already set globally
2. **Add main container** - Use `.page-card` or similar styling
3. **Nest content** - Use `.panel`/`.module` for sections
4. **Apply accents** - Use cyan→blue gradients sparingly
5. **Test contrast** - Ensure readability

Example structure:
```astro
<main>
  <section class="page-card">
    <h1>Page Title</h1>
    
    <div class="panel">
      <h2>Section</h2>
      <p>Content...</p>
    </div>
    
    <div class="panel">
      <h2>Another Section</h2>
      <p>More content...</p>
    </div>
  </section>
</main>
```

## Files Modified

The following files implement the neon theme:

- `src/styles/global.css` - Core palette and surface system
- `src/components/Header.astro` - Navigation with gradient accents
- `src/components/Footer.astro` - Footer styling
- `src/pages/index.astro` - Home page with bio card
- `src/pages/projects/index.astro` - Projects list with panels
- `src/layouts/Project.astro` - Project detail layout
- `src/pages/blog/index.astro` - Blog index with cards
- `src/layouts/BlogPost.astro` - Blog post layout
- `src/pages/gallery.astro` - Gallery with metadata sidebar

## Maintenance

When updating styles:
- Keep color tokens in `global.css` `:root`
- Maintain the 3-layer surface hierarchy
- Use helper tokens (--shadow, --glow-*) consistently
- Test on dark mode displays for optimal neon effect
- Verify accessibility with contrast checkers
