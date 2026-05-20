import moment from "moment";
import { parse } from "valibot";
import { expect, it, describe, Mock } from "vitest";

import { timekeepId } from "@/timekeep/id";
import { stripTimekeepRuntimeData, TIMEKEEP } from "@/timekeep/schema";

describe("schema transform", () => {
	it("transforms input with an added id", () => {
		(timekeepId.next as Mock).mockReturnValue(1);

		const input = {
			entries: [
				{
					name: "Block 2",
					startTime: "2024-03-17T01:33:51.630Z",
					endTime: "2024-03-17T01:33:55.151Z",
					subEntries: null,
				},
				{
					name: "Block 2",
					startTime: null,
					endTime: null,
					subEntries: [
						{
							name: "Block 2",
							startTime: "2024-03-17T01:33:51.630Z",
							endTime: "2024-03-17T01:33:55.151Z",
							subEntries: null,
						},
					],
				},
			],
		};
		const result = parse(TIMEKEEP, input);

		expect(result).toEqual({
			entries: [
				{
					id: 1,
					name: "Block 2",
					startTime: moment("2024-03-17T01:33:51.630Z"),
					endTime: moment("2024-03-17T01:33:55.151Z"),
					subEntries: null,
				},
				{
					id: 1,
					name: "Block 2",
					startTime: null,
					endTime: null,
					subEntries: [
						{
							id: 1,
							name: "Block 2",
							startTime: moment("2024-03-17T01:33:51.630Z"),
							endTime: moment("2024-03-17T01:33:55.151Z"),
							subEntries: null,
						},
					],
				},
			],
		});

		expect(timekeepId.next).toHaveBeenCalled();
	});

	it("preserves tags on single entries", () => {
		(timekeepId.next as Mock).mockReturnValue(1);

		const input = {
			entries: [
				{
					name: "Block",
					startTime: "2024-03-17T01:33:51.630Z",
					endTime: "2024-03-17T01:33:55.151Z",
					subEntries: null,
					tags: ["work", "urgent"],
				},
			],
		};

		const result = parse(TIMEKEEP, input);

		expect(result.entries[0]).toMatchObject({
			id: 1,
			name: "Block",
			tags: ["work", "urgent"],
		});
	});

	it("preserves tags on group entries", () => {
		(timekeepId.next as Mock).mockReturnValue(1);

		const input = {
			entries: [
				{
					name: "Group",
					startTime: null,
					endTime: null,
					tags: ["client-a"],
					subEntries: [
						{
							name: "Sub",
							startTime: "2024-03-17T01:33:51.630Z",
							endTime: "2024-03-17T01:33:55.151Z",
							subEntries: null,
						},
					],
				},
			],
		};

		const result = parse(TIMEKEEP, input);

		expect(result.entries[0]).toMatchObject({ tags: ["client-a"] });
	});
});

describe("schema transform", () => {
	it("preserves description on single entries", () => {
		(timekeepId.next as Mock).mockReturnValue(1);

		const input = {
			entries: [
				{
					name: "Block",
					description: "See [[Note]] or [docs](https://example.com)",
					startTime: "2024-03-17T01:33:51.630Z",
					endTime: "2024-03-17T01:33:55.151Z",
					subEntries: null,
				},
			],
		};

		const result = parse(TIMEKEEP, input);

		expect(result.entries[0]).toMatchObject({
			description: "See [[Note]] or [docs](https://example.com)",
		});
	});

	it("preserves description on group entries", () => {
		(timekeepId.next as Mock).mockReturnValue(1);

		const input = {
			entries: [
				{
					name: "Group",
					description: "Group description with [[link]]",
					startTime: null,
					endTime: null,
					subEntries: [],
				},
			],
		};

		const result = parse(TIMEKEEP, input);

		expect(result.entries[0]).toMatchObject({
			description: "Group description with [[link]]",
		});
	});
});

describe("stripTimekeepRuntimeData", () => {
	it("drops empty tag arrays from the stored JSON", () => {
		const timekeep = {
			entries: [
				{
					id: 1,
					name: "Block",
					startTime: moment("2024-03-17T01:33:51.630Z"),
					endTime: moment("2024-03-17T01:33:55.151Z"),
					subEntries: null,
					tags: [] as string[],
				},
			],
		};

		const stripped = stripTimekeepRuntimeData(timekeep) as {
			entries: Array<Record<string, unknown>>;
		};

		expect(stripped.entries[0]).not.toHaveProperty("tags");
		expect(stripped.entries[0]).not.toHaveProperty("id");
	});

	it("keeps non-empty tag arrays in the stored JSON", () => {
		const timekeep = {
			entries: [
				{
					id: 1,
					name: "Block",
					startTime: moment("2024-03-17T01:33:51.630Z"),
					endTime: moment("2024-03-17T01:33:55.151Z"),
					subEntries: null,
					tags: ["work"],
				},
			],
		};

		const stripped = stripTimekeepRuntimeData(timekeep) as {
			entries: Array<Record<string, unknown>>;
		};

		expect(stripped.entries[0].tags).toEqual(["work"]);
	});

	it("drops empty description from the stored JSON", () => {
		const timekeep = {
			entries: [
				{
					id: 1,
					name: "Block",
					description: "",
					startTime: moment("2024-03-17T01:33:51.630Z"),
					endTime: moment("2024-03-17T01:33:55.151Z"),
					subEntries: null,
				},
			],
		};

		const stripped = stripTimekeepRuntimeData(timekeep) as {
			entries: Array<Record<string, unknown>>;
		};

		expect(stripped.entries[0]).not.toHaveProperty("description");
	});

	it("keeps non-empty description in the stored JSON", () => {
		const timekeep = {
			entries: [
				{
					id: 1,
					name: "Block",
					description: "See [[Note]]",
					startTime: moment("2024-03-17T01:33:51.630Z"),
					endTime: moment("2024-03-17T01:33:55.151Z"),
					subEntries: null,
				},
			],
		};

		const stripped = stripTimekeepRuntimeData(timekeep) as {
			entries: Array<Record<string, unknown>>;
		};

		expect(stripped.entries[0].description).toEqual("See [[Note]]");
	});
});
