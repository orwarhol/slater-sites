# Existing Surface CMS contract

**Compatibility review: November 19, 2026. Pre-release candidate.** This is a deliberately narrow guidance reference, checked against current product definitions and relevant test source, not a validator or a record of an executed hosted edit. It describes possible operations, not guaranteed eligibility. Product updates may change the envelope. Recheck current semantics before unsupported or uncertain changes.

No Surface contract is necessary to use the skill. Do not create one. This reference applies only to an existing applicable configuration.

## Resolve scope and preserve policy

Resolve the intended website, canonical configured contract location, actual repository-relative workspace root and collection-relative file scope. Do not treat a sample, fixture or sibling config as authoritative. Read the raw contract and actual site readers/schema before editing. A file's presence, JSON syntax, configuration validity, Library discovery, a readable region and a successful Save are separate claims.

Recognized JSON contract version values at the review date: `1.0.0`, `1.1.0` and `1.2.0`. Preserve the existing version and engine. The plural extension lists belong to 1.2.0, include the singular default, and must contain no duplicates. Do not silently upgrade. If version or relevant semantics are unknown, hold the affected change. Preserve unknown keys at every level, IDs, paths, ordering where meaningful, branch and repository selections, locale/variant policy, publishing strategy, media/component policies, other collections and formatting where feasible. Do not regenerate the entire file or use a lossy conversion.

## Supported representations and boundaries

| Representation | Possible operation | Important limitations |
| --- | --- | --- |
| Markdown-family content (`.md`, `.markdown`, `.mdx`) in an eligible managed collection | Draft editing of supported prose and compatible configured frontmatter fields | Collection policy, field type/control, parser and actual mutation validation govern. Unsupported YAML shapes, expressions, imports, opaque structures, unmapped component data and unsafe regions may be protected or refused. A valid MDX file is not universally editable. |
| Native Astro source (`.astro`) | Draft editing of qualifying static regions | Explicit native collection with both extension and sourceFormat set to astro, directory at or below src/pages, nonoverlapping scope, Draft only, empty fields list. No file registry, mixed Markdown extension list, nonempty exclusions, mapped metadata, enabled body media or enabled Regionalize. Not every static paragraph qualifies; custom-component descendants, program/dynamic areas and interactive owners are protected. Size/parser limits apply. Never evade them or broaden directory ownership just to expose a sentence. |
| TSX, JSX, arbitrary JSON/YAML, standalone HTML or other site data | May be excellent editorial source for the website | No ordinary native item editing is implied by this guidance. Next.js may use eligible Markdown-family sources; native TSX page editing is not supported by the reviewed envelope. |

Presentation selectors are not permission grants. Body media, components, other Surfaces and publishing have separate policies; this skill does not add those capabilities or imply that a supported format makes an operation available.

## Narrow mapping changes

`schema.fields` is the global field registry. For ordinary collections, an explicit `contentLibrary.collections[].fields` list selects registered fields and their order. Omitting the list inherits all global fields; an explicit empty list is body-only. A new global definition can therefore expose a field across unrelated collections inheriting the registry. Removing an allowlist or replacing an omitted list with a short explicit list can unintentionally broaden or remove existing access. Inspect all affected consumers. Check actual version, extensions, roots, exclusions, enabled Surfaces and applicable limits.

A synthetic existing collection fragment:

```diff
  "id": "guides",
- "fields": ["title"]
+ "fields": ["title", "intro"]
```

This assumes `intro` already exists as a compatible registered field, the explicit list already exists, the site's actual content schema supports it and the requested authority covers the entire collection, including future items. It is not a complete contract and cannot be copied into an unrelated site. If already exposed, do nothing. If a new field or collection is justified, confirm the effective scope and applicable supported semantics before editing. If the user authorized one item but the mapping affects a whole collection, ask for that necessary decision. Do not seek redundant confirmation for changes already clearly delegated.

## Contribution and verification

An authorized developer PR can include source and existing-contract changes together, or a contract-only correction. If a dependent mapping cannot safely be corrected, hold that source move. Use relevant trusted existing validation if present; without it, distinguish a bounded, reviewable proposal from verified behavior. Invalid, ambiguous or unknown contract semantics stop dependent changes.

A currently active Surface workspace ordinarily reads current target-branch configuration via its existing guards. A pending approved configuration proposal may require proof of its exact hosted configuration PR; an external mixed PR cannot substitute for that separate approval. First setup and activation also have their own checks. Do not claim automatic activation or invoke a hosted proposal, change publication policy, or discard or transplant saved drafts. Inspect ordinary Git overlap; if a move affects potentially open work and the hosted state is unknown, identify the coordination needed.

After an authorized merge, an Owner/Admin may reopen the affected item in a fresh Content Library view, inspect the intended field/region and attempt an ordinary safe edit/Save on an authorized test item or working branch. Inspect the resulting Git diff and protected neighbors. If configuration needs review, follow normal site configuration reconciliation; do not reflexively abandon saved work. Publishing and deployment need separate authority. Report only observed results; if no hosted check was done, say “Surface verification not performed.” The skill does not require a hosted connection to complete its task.
