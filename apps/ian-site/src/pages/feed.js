import { getRssResponse } from "../lib/rssFeed";

export async function GET(context) {
	return getRssResponse(context);
}
