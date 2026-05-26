import { getRssResponse } from "../lib/rssFeed";

export const prerender = false;

export async function GET(context) {
	return getRssResponse(context);
}
