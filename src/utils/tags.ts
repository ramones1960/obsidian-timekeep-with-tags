/**
 * Parses a free-form tag input string into a normalized list of tags.
 *
 * Accepts comma, whitespace, or `#` separated values. The leading `#`
 * on a token (if present) is stripped, duplicates are removed (case
 * sensitive), and order of first appearance is preserved.
 *
 * @param input The user-provided tag string
 * @returns The parsed unique tag list
 */
export function parseTagsInput(input: string): string[] {
	if (!input) return [];

	const tokens = input
		.split(/[,\s]+/g)
		.map((token) => token.trim().replace(/^#+/, ""))
		.filter((token) => token.length > 0);

	const seen = new Set<string>();
	const result: string[] = [];
	for (const token of tokens) {
		if (!seen.has(token)) {
			seen.add(token);
			result.push(token);
		}
	}
	return result;
}

/**
 * Formats a list of tags for display in an input field
 * (space separated, no leading #).
 */
export function formatTagsInput(tags: string[] | undefined): string {
	if (!tags || tags.length === 0) return "";
	return tags.join(" ");
}
