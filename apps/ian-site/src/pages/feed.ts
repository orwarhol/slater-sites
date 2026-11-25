import type { APIRoute } from "astro";

// Keep a runtime redirect so the static site's middleware still has a Worker.
export const prerender = false;

export const GET: APIRoute = ({ redirect, url }) =>
	redirect(`/rss.xml${url.search}`, 301);
