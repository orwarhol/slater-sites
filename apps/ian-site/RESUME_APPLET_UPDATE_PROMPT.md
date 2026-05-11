# Coding Agent Prompt: Resume Applet Dot Active State + Content/CTA Styling Updates

You are working only in `apps/ian-site`, specifically on the Resume Applet at `/resume`.

## Objective

Implement the requested Resume Applet visual/content updates while following `apps/ian-site/THEME_GUIDE.md`, accessibility guidelines, and the existing Astro/MDX architecture.

## Requirements

### Must follow

- Changes must adhere to accessibility guidelines.
- Follow `apps/ian-site/THEME_GUIDE.md`.
- PR must pass Cloudflare build checks.
- Visual and interactive changes must pass tests using Playwright.
- Keep changes scoped to `apps/ian-site` and the Resume Applet feature.
- Do not make unrelated refactors.

## Current Behavior

The dot navigation feature does not currently have a clear/working active state/style for the dot corresponding to the currently viewed slide.

## Desired Behavior

The progress dot for the currently viewed slide should have a clear active state that matches the neon “awake” theme.

Use theme tokens such as:

- `--cyan`
- `--blue`
- `--glow-cyan`
- `--border`
- `--text`
- `--bg`

The active dot should be visually distinct from inactive dots, hover states, and focus states.

## Files to inspect first

Start with these files:

- `apps/ian-site/src/pages/resume.astro`
- `apps/ian-site/src/content/resume/resumeDeck.mdx`
- `apps/ian-site/src/components/ResumeSlide.astro`
- `apps/ian-site/THEME_GUIDE.md`
- Existing tests under:
  - `apps/ian-site/tests/`

## Implementation Plan

### 1. Fix active dot navigation state

In `apps/ian-site/src/pages/resume.astro`:

- Inspect the dot navigation markup and client-side script.
- Ensure the active slide’s dot receives a reliable active class, likely `.is-active`.
- Ensure inactive dots remove the active class when the slide changes.
- Ensure the active state updates when navigating by:
  - Next button
  - Previous button
  - Dot click
  - Keyboard arrows
  - Initial URL hash load, if supported

The active dot should include:

- A visible active style using the theme guide.
- A clear distinction from hover-only state.
- Accessible state metadata, such as `aria-pressed="true"` or another appropriate ARIA pattern already used by the component.
- An accessible label indicating the current slide, such as `Go to slide 2 of 7 (current)`.

Suggested visual treatment:

- Active dot background: `var(--cyan)` or gradient from `var(--cyan)` to `var(--blue)`.
- Active border: `var(--cyan)`.
- Active glow: `var(--glow-cyan)`.
- Slight scale increase is acceptable if it does not cause layout shift.
- Preserve or improve focus styling with a visible outline.

### 2. Remove unwanted indentation from Slide 1 first line

Slide 1 first line is:

```text
Senior Product Manager
```

This appears to be the `eyebrow` text on the opening slide in:

```mdx
<ResumeSlide id="opening" layout="hero" transition="fade-up" eyebrow="Senior Product Manager">
```

Update the styling so this first line is aligned with the other Slide 1 text and is not indented.

Likely area:

- `.slide-eyebrow`
- `.deck-slide--hero`
- `.slide-content`

Be careful not to break the overall slide layout. The fix should align the eyebrow and main content consistently.

### 3. Make LinkedIn CTAs open in a new tab

Slides 1 and 7 contain LinkedIn CTAs in:

```text
apps/ian-site/src/content/resume/resumeDeck.mdx
```

Update both LinkedIn CTA links so they open in a new tab.

Use:

```html
target="_blank"
rel="noopener noreferrer"
```

If Markdown link syntax cannot express this cleanly in MDX, replace the Markdown links with explicit anchor elements.

Affected CTAs:

- Slide 1 LinkedIn CTA
- Slide 7 LinkedIn CTA

Ensure link styling still matches the existing CTA/button treatment.

### 4. Remove unwanted indentation from Slide 2 first line

Slide 2 first line is:

```text
What I Do
```

This appears to be the `eyebrow` text on the thesis slide:

```mdx
<ResumeSlide id="thesis" layout="impact" transition="fade-up" eyebrow="What I Do">
```

Update styling so this first line is aligned with the other Slide 2 text and is not indented.

Likely area:

- `.slide-eyebrow`
- `.deck-slide--impact`
- `.slide-content`

Prefer a shared alignment fix rather than slide-specific hacks, unless necessary.

### 5. Apply Slide 3 first-line styling to Slides 4 and 5

Slide 3 first line:

```text
Platform Ownership
```

Slides 4 and 5 first lines:

```text
Enterprise Distribution
Governance as an Accelerator
```

The styling applied to `Platform Ownership` looks good. Repeat that styling for the first lines of Slides 4 and 5.

Likely these are all `eyebrow` values:

```mdx
<ResumeSlide id="platform" layout="platform" transition="fade-up" eyebrow="Platform Ownership">
<ResumeSlide id="distribution" layout="distribution" transition="fade-up" eyebrow="Enterprise Distribution">
<ResumeSlide id="governance" layout="governance" transition="fade-up" eyebrow="Governance as an Accelerator">
```

Ensure Slides 4 and 5 use the same visual treatment as Slide 3 for the eyebrow line.

Avoid duplicating CSS unnecessarily. Prefer shared `.slide-eyebrow` styling unless there is an existing layout-specific override causing the inconsistency.

## Accessibility Requirements

Verify:

- Dot buttons remain keyboard focusable.
- Active dot state is exposed to assistive tech.
- Focus state remains clearly visible.
- New-tab LinkedIn links use `rel="noopener noreferrer"`.
- If visible link text does not make the new-tab behavior obvious, consider an accessible label or visually hidden text only if consistent with existing patterns.
- No color-only affordance for active dot if possible; combine color with size, glow, border, or shape treatment.

## Testing Requirements

Run or add tests as appropriate.

At minimum:

```bash
npm run build:ian
```

Also run existing Ian site tests:

```bash
npm run test:ian
npm run test:ian:integration
```

Because this task includes visual and interactive behavior, use Playwright tests for the Resume Applet. If Playwright tests already exist, update them. If they do not exist, add focused coverage for `/resume` that validates:

- Initial active dot corresponds to Slide 1.
- Clicking Next updates the active dot.
- Clicking a dot updates the active slide and active dot.
- Keyboard navigation updates the active dot.
- LinkedIn CTAs on Slides 1 and 7 have `target="_blank"` and `rel="noopener noreferrer"`.
- Slide 1 and Slide 2 eyebrow alignment is not visually indented relative to slide content.
- Slides 3, 4, and 5 eyebrow styling is consistent.

Use Playwright screenshots or style assertions where appropriate for visual/interactive changes.

## Acceptance Criteria

- The currently viewed slide always has a visibly active corresponding dot.
- Dot active state follows the theme guide and remains accessible.
- Slide 1 `Senior Product Manager` is no longer indented relative to the rest of the slide content.
- Slide 2 `What I Do` is no longer indented relative to the rest of the slide content.
- LinkedIn CTAs on Slides 1 and 7 open in a new tab and include safe `rel` attributes.
- Slides 4 and 5 first-line/eyebrow styling matches the styling of Slide 3 `Platform Ownership`.
- Cloudflare build checks pass.
- Relevant Playwright tests pass.
