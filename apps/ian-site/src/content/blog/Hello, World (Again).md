---
title: "Hello, World (Again)"
description: "Learning Astro, shipping on Cloudflare Pages, and rediscovering what “control” can feel like."
pubDate: "Feb 07 2026"
heroImage: "/palette-reference-image-chatgpt.png"
---

Hello, world.

This site is my latest attempt to build a small, intentional corner of the internet—and a record of a new (to me) way of doing it: **Astro + Cloudflare Pages + GitHub Copilot Coding Agent**.

For most of my career as a digital product manager, my website-building home base has been **WordPress**. Themes, plugins, an admin UI, content workflows, and the familiar separation between “the thing that stores the content” and “the thing that presents it.” It’s an incredibly capable ecosystem, and I’ve shipped plenty of real work on it.

But it also has a way of smoothing over the mechanics. You can build quickly while staying a little removed from the *how*—from the seams and decisions that turn content into an experience.

This stack is the opposite of that.

It’s static. Content lives in files. The “CMS” is the repo. And yes: even small changes often mean running a build and triggering a deploy.

That *should* feel like friction.

Instead, it’s been surprisingly refreshing.

## Static, but oddly clarifying

The thing I didn’t fully expect is how much this workflow would increase my sense of control.

With WordPress, the control is abstracted. The system is powerful, but also layered—UI settings, plugin behavior, caching, and an entire runtime that can become “mysterious” in a way you mostly learn to work around.

With Astro (and a clean deploy pipeline), control comes from **legibility**:

* I can point to where content lives.
* I can point to where layout lives.
* I can point to where styles live.
* I can follow the path from change → build → deploy → live site.

Having to deploy for changes doesn’t feel like busywork—it feels like a healthy boundary between *drafting* and *publishing*. It encourages a slower, more deliberate rhythm. I find myself thinking in terms of shipping a coherent update, not just editing a living document in place.

And there’s something satisfying about that. It makes the site feel built, not merely configured.

## Where Copilot has helped

GitHub Copilot Coding Agent has been a huge part of making this enjoyable instead of intimidating.

Not because it replaces the thinking (it doesn’t), but because it reduces the drag between idea and implementation. I can describe what I’m trying to accomplish, set guardrails, specify acceptance criteria—then iterate quickly. The speed doesn’t come from skipping decisions. It comes from moving through the mechanics faster so I can stay focused on intent: structure, voice, and design.

## The styling “ah-ha” moment

One of the most satisfying breakthroughs so far came from something deceptively small: **the Gallery metadata card**.

I had a clear presentation goal: the labels and values needed stronger hierarchy. Specifically, I wanted to get rid of the indentation where values were sitting under labels, and instead make the labels feel like labels—smaller, heavier, uppercase, and styled with `--pink`, with a bit of breathing room between fields.

I thought this would be a straightforward CSS tweak. It wasn’t.

The snag was subtle and deeply “Astro”: **scoped CSS**.

Astro scopes component CSS by attaching `data-astro-cid-*` attributes so styles only apply where intended. But in the gallery, the `dt` and `dd` elements were being created dynamically via JavaScript—meaning they *didn’t* receive those scoping attributes. So my selectors weren’t matching, and the styles weren’t applying in the way I expected.

That was the moment the stack clicked a little more for me—not just “how do I fix this?” but “oh, I understand *why* this is happening.”

The fix was clean once the cause was clear: use `:global()` selectors so the styles apply to those dynamically created elements:

* `.gallery-meta :global(dt)` for labels
* `.gallery-meta :global(dd)` for values

And just like that, the metadata card snapped into the hierarchy I’d been aiming for. The end result wasn’t just a nicer card. It was that feeling of getting closer to the underlying truth of the system: *this is how scoping works, this is how the DOM is being created, this is how I can intentionally target it.*

That kind of clarity is addictive.

## A new appreciation for the production process

I’m still early in this exploration, but I already feel more connected to the web production process than I have in a long time.

Not because WordPress is lesser—it isn’t—but because this path forces me to engage with the pipeline end-to-end. The site isn’t a black box with knobs. It’s a small, understandable machine. I can trace the moving parts. I can reason about them. And when something doesn’t work, I can usually learn *why* instead of just learning a workaround.

That’s been the most surprising part of all: this “static” setup—deploys and all—has given me a stronger sense of agency. More understanding. More appreciation.

And, honestly, more calm.

So: hello, world.
I’m glad you’re here.
