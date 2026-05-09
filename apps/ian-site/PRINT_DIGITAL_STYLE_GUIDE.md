# Ian Slater — Print & Digital Style Guide
*Derived from the Neon "Awake" web theme*

---

## Philosophy

This guide adapts Ian's high-contrast neon web identity into practical,
real-world formats: resumes, cover letters, email signatures, PDFs, and
Word templates. The core idea is to carry the spirit of the theme — sharp
contrast, electric cyan/blue accents, clear visual hierarchy — while
remaining professional and legible in non-screen contexts.

---

## Color Palette

### Print (Resume, Cover Letter)
Print inverts the web theme from dark-on-light to light-on-white.
The accent colors remain the brand anchors.

| Role              | Web Token      | Hex       | Print Use                          |
|-------------------|----------------|-----------|------------------------------------|
| Page background   | `--bg`         | #010B18   | White (#FFFFFF) — invert for print |
| Primary text      | `--text`       | #F3FAFF   | Near-black (#0F1C2E) — invert      |
| Secondary text    | `--muted`      | #B7D4F0   | Mid-slate (#4A6A8A)                |
| Primary accent    | `--cyan`       | #5FE7FF   | Teal (#0097A7) — darkened for ink  |
| Secondary accent  | `--blue`       | #4AA3FF   | Deep blue (#1565C0)                |
| Tertiary accent   | `--violet`     | #A78BFA   | Purple (#6A3FB5)                   |
| Rare emphasis     | `--pink`       | #FF2FD6   | Use sparingly; fuchsia (#C2185B)   |
| Rare emphasis     | `--lime`       | #8CFF3A   | Avoid in print                     |
| Rule/border color | `--border`     | #3181B2   | #3181B2 at ~50% opacity, or solid  |

> **Note:** Teal (#0097A7) is the primary ink-safe stand-in for `--cyan`.
> It renders clearly on both white paper and standard office printers.

### Digital (Email Signature, PDF, Word)
Digital formats can stay closer to the original palette.
Prefer the full hex values from the web theme; avoid glow/shadow effects
(they don't render in email clients or most PDF viewers).

---

## Typography

The web theme does not specify typefaces, so the following are recommended
to match the clean, technical aesthetic:

| Element            | Recommended Font          | Fallback           |
|--------------------|---------------------------|--------------------|
| Name / H1          | **Raleway** or **Exo 2** | Arial              |
| Section headers    | **Raleway SemiBold**      | Arial Bold         |
| Body text          | **Inter** or **Source Sans 3** | Calibri       |
| Monospace/code     | **JetBrains Mono**        | Courier New        |

### Type Scale

| Level         | Size (pt/print) | Size (px/digital) | Weight     | Color           |
|---------------|-----------------|-------------------|------------|-----------------|
| Name / H1     | 22–26 pt        | 28–32 px          | Bold       | Deep blue/teal  |
| Section H2    | 13–14 pt        | 16–18 px          | SemiBold   | Teal accent     |
| Body          | 10–11 pt        | 14–15 px          | Regular    | Near-black/dark |
| Meta/muted    | 9 pt            | 12–13 px          | Regular    | Mid-slate       |

---

## Layout & Visual Hierarchy

The web theme uses a 3-layer surface nesting system. Translate this to
print/digital as structural zones:

| Web Layer       | Print/Digital Equivalent                                       |
|-----------------|----------------------------------------------------------------|
| Page background | White page or very light gray (#F5F8FA) in digital PDFs        |
| `.page-card`    | Full-width section block; use a thin top rule or left border   |
| `.panel`        | Inset content block; light gray fill (#EEF3F8) or subtle rule  |

### Borders & Rules
- **Section divider:** 1 px solid teal (#0097A7) or deep blue (#1565C0)
- **Accent strip (panel top):** 2 px gradient bar — teal → deep blue,
  spanning the full width of the content block
- **Card border:** 1 px #3181B2 at 55% opacity (if supported by format)

### Spacing

| Context          | Web Token    | Print Equivalent | Digital Equivalent |
|------------------|--------------|------------------|--------------------|
| Large section    | `--pad-lg`   | 18–20 pt margin  | 24–32 px padding   |
| Medium section   | `--pad-md`   | 12 pt margin     | 16–20 px padding   |
| Small element    | `--pad-sm`   | 8 pt margin      | 10–12 px padding   |

---

## Format-Specific Guidelines

### 📄 Resume

- **Background:** White
- **Name:** 24 pt, Bold, deep blue (#1565C0) or teal (#0097A7)
- **Section headers:** 12 pt, SemiBold, teal; with a 1–2 px teal underline rule
- **Body:** 10.5 pt Inter or Source Sans, near-black (#0F1C2E)
- **Muted details** (dates, locations): 9.5 pt, mid-slate (#4A6A8A)
- **Left accent bar:** Optional 3 px vertical teal bar on the left margin
  to echo the `.panel::before` accent strip pattern
- **Page margins:** 0.75 in (19 mm) all sides
- **Max nesting:** 2 levels (section → item); mirrors the 3-layer web rule

### ✉️ Cover Letter

- **Header block:** Name, contact info, and date in a styled header card —
  light gray background (#EEF3F8), teal left border (3 px), 12–14 pt padding
- **Body text:** 11 pt, near-black, 1.4 line-height
- **Salutation / closing:** SemiBold, dark blue
- **Accent:** One teal horizontal rule below the header block

### 📧 Email Signature

- **Name:** Bold, 14–15 px, deep blue (#1565C0)
- **Title/role:** Regular, 13 px, mid-slate (#4A6A8A)
- **Links (website, LinkedIn):** Teal (#0097A7), no underline by default;
  underline on hover (in HTML signatures)
- **Divider:** 1 px solid #3181B2 above the signature block
- **Background:** Transparent or white — no dark backgrounds in email
- **Avoid:** Glow effects, drop shadows, gradient text (poor email client support)
- **Max width:** 400–480 px for the signature block

### 📑 PDF Templates (Portfolio, Project One-Pager)

- **Background options:**
  - Light: White or #F5F8FA
  - Dark (for screen-only PDFs): #010B18 — full web theme applies
- **For dark-background PDFs:** Use the full original hex values from the
  web theme; glow/shadow effects are acceptable in PDF viewers
- **Section panels:** Rounded rectangles (radius ~6–8 pt) filled #0B1A33
  with a 1 pt #3181B2 border — directly mirrors `.page-card`
- **Headings:** Cyan-to-blue gradient (#5FE7FF → #4AA3FF) for screen PDFs;
  solid #1565C0 for print PDFs
- **Accent strip:** 2 pt line at top of each panel, teal → blue gradient

### 📝 Word Templates (.docx)

- **Theme colors:** Set custom theme palette with teal and deep blue as
  Accent 1 and Accent 2
- **Styles to define:**
  - `Normal` → 10.5 pt Inter/Calibri, #0F1C2E
  - `Heading 1` → 22 pt Raleway Bold, #1565C0
  - `Heading 2` → 13 pt Raleway SemiBold, #0097A7, bottom border 1 pt teal
  - `Subtle` → 9.5 pt, #4A6A8A
- **Table style:** Header row background #EEF3F8, header text #1565C0 Bold;
  alternating rows white / #F5F8FA
- **Avoid:** WordArt, glow text effects, dark page backgrounds (poor print behavior)

---

## Accent Usage Rules

Carried over directly from the web theme's best practices:

- ✅ Teal/blue are the primary accents — use for headers, links, rules, key highlights
- ✅ Apply hierarchy visually: big section → accent header, sub-item → muted label
- ✅ Keep body text high-contrast against its background at all times
- ⚠️ Violet/purple sparingly — visited links in digital, subtle callouts in print
- ❌ Pink/fuchsia only for rare, intentional emphasis (e.g., a single pull quote)
- ❌ Lime — avoid entirely in print; use only as a rare digital accent if needed
- ❌ No more than 3 levels of visual nesting in any document
- ❌ Never use pure black (#000000) for body text; use near-black (#0F1C2E)

---

## Quick-Reference Ink-Safe Palette

| Token      | Web Hex  | Print/Digital Hex | Name              |
|------------|----------|-------------------|-------------------|
| `--cyan`   | #5FE7FF  | #0097A7           | Ink-safe teal     |
| `--blue`   | #4AA3FF  | #1565C0           | Deep blue         |
| `--violet` | #A78BFA  | #6A3FB5           | Purple            |
| `--text`   | #F3FAFF  | #0F1C2E           | Near-black (inv.) |
| `--muted`  | #B7D4F0  | #4A6A8A           | Mid-slate (inv.)  |
| `--border` | #3181B2  | #3181B2           | Steel blue        |
