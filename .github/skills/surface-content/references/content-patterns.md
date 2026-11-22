# Content patterns

Choose the editorial home based on the next maintainer's task, the site's existing architecture and its version. These synthetic examples are fragments, not complete applications. They are not a format mandate or a statement that Surface CMS can edit every resulting representation.

## Decision guide

| Situation | Consider | Preserve |
| --- | --- | --- |
| Single readable static section | Keep co-located | Meaning, DOM, CSS scope, route |
| Related copy has an established record | Use that record and its existing reader | Schema, identities, sibling consumers |
| Repeated editorial entries maintained together | Existing collection or small typed data module | Order, semantics, loader behavior |
| Existing translation catalog | Use the established keys and pipeline | Locale approval, interpolation, fallback |
| Existing supported content is already well structured | No source change; assess an applicable contract if present | Source and effective ownership |
| Content derives from logic or external authority | Keep the source of truth and behavior; modify only authorized editorial input | Runtime, permissions, data ownership |

Prefer existing public framework APIs and the installed version's conventions. Avoid creating a new MDX toolchain, loader, dependency or compatibility layer just to accommodate an editor. Check whether adding a format makes the next framework upgrade harder.

## Example: Astro guide introduction

An existing guide collection already accepts an optional string `intro`. A shared layout currently holds a special-case introduction.

Before:

```astro
{guide.id === 'harbor' && <p class="intro">Meet at the west gate.</p>}
```

After, if the existing schema and all consumers make this safe:

```astro
{guide.data.intro && <p class="intro">{guide.data.intro}</p>}
```

Add `intro: Meet at the west gate.` to the Harbor guide's existing frontmatter. Confirm no sibling guide unexpectedly renders an existing `intro` value. Keep route, layout, heading, class and render order unchanged. If a simple one-page site already has a readable paragraph and no sensible content home, keep it; moving children outside a layout to expose text is not acceptable.

## Example: Next.js localized label

A page already consumes its locale dictionary. Repeated button copy is maintained there instead of in presentation.

Before:

```tsx
<ActionLink href={routes.booking} onActivate={recordBookingIntent} label="Book a visit" />
```

After:

```tsx
<ActionLink href={routes.booking} onActivate={recordBookingIntent} label={copy.visit.bookLabel} />
```

Use the existing dictionary schema, translations and fallback. Preserve the action, destination and server/client boundary. Do not invent missing translations. This is valid editorial architecture even when the dictionary or TSX is not writable in Surface.

## Example: repeated opening-hours records

Where rows already repeat and are maintained jointly, use the site's existing data convention:

```json
[
  {"day":"Saturday","time":"10–4"},
  {"day":"Sunday","time":"12–4"}
]
```

Render precisely the prior rows using the existing semantic list and styles. A short co-located array may be better than creating a file per row. Preserve day order, localized labels, accessible associations and any corresponding structured data. If hours come from an external booking system, do not create a second source of truth.

## Example: MDX and interactive boundaries

```mdx
Bring a printed ticket.

<SeatPicker inventory={liveSeats} onSelect={reserveSeat} />

Doors open at noon.
```

Keep the readable prose and protected expression-driven component where they belong. Do not convert the widget to Markdown, expose its props simply because they render text, or change its import, order, adjacent formatting or behavior. A well-organized article may need no refactor.

## Preservation checklist

Select the checks that matter for the actual task. A successful build alone does not prove equivalent behavior.

- Compare relevant rendered routes, visible text, heading and landmark structure, whitespace, inline links, escaping, CSS/slots and responsive presentation. Keep identities, redirects, URLs and canonical metadata intact.
- Confirm functionality, keyboard and focus behavior, label/ARIA relationships, image dimensions, alt semantics, asset resolution and any affected interaction. Preserve hydration, server/client restrictions, static/dynamic generation and cache/revalidation.
- Compare metadata, social tags and structured data if touched; do not turn escaped values into raw HTML. Keep translations, locale keys, fallback, interpolation and approval boundaries.
- Check other consumers of changed data or components. Preserve external origin, file identities and known dependent work. Review the actual diff.

Other frameworks: favor their documented, established content and rendering mechanisms using the same decision principles. Astro and Next.js are examples, not dependencies. Useful public references: [Astro content collections](https://docs.astro.build/en/guides/content-collections/), [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure), [Next.js MDX](https://nextjs.org/docs/app/guides/mdx), [MDX syntax](https://mdxjs.com/docs/what-is-mdx/).
