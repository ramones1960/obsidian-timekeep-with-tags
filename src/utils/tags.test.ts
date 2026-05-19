import { describe, it, expect } from "vitest";

import { formatTagsInput, parseTagsInput } from "@/utils/tags";

describe("parseTagsInput", () => {
	it("returns an empty list for empty input", () => {
		expect(parseTagsInput("")).toEqual([]);
	});

	it("splits on commas", () => {
		expect(parseTagsInput("a,b,c")).toEqual(["a", "b", "c"]);
	});

	it("splits on whitespace", () => {
		expect(parseTagsInput("a b\tc")).toEqual(["a", "b", "c"]);
	});

	it("strips leading # characters", () => {
		expect(parseTagsInput("#project #urgent")).toEqual(["project", "urgent"]);
	});

	it("removes duplicate tags while preserving first appearance", () => {
		expect(parseTagsInput("a, b, a, c, b")).toEqual(["a", "b", "c"]);
	});

	it("ignores empty tokens from extra separators", () => {
		expect(parseTagsInput("  a,, ,b  ")).toEqual(["a", "b"]);
	});

	it("treats bare # as empty token and skips it", () => {
		expect(parseTagsInput("# a")).toEqual(["a"]);
	});
});

describe("formatTagsInput", () => {
	it("returns empty string for undefined", () => {
		expect(formatTagsInput(undefined)).toBe("");
	});

	it("returns empty string for empty array", () => {
		expect(formatTagsInput([])).toBe("");
	});

	it("joins tags with a space", () => {
		expect(formatTagsInput(["a", "b", "c"])).toBe("a b c");
	});
});
