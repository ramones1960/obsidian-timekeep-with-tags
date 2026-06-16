import moment from "moment";
import { expect, it, describe } from "vitest";

import { withEntry, createEntry, withSubEntry } from "./create";
import { stripEntryRuntimeData, stripEntriesRuntimeData } from "./schema";

describe("createEntry", () => {
	it("creating entry should use current time", () => {
		const currentTime = moment();

		const entry = createEntry("Block 1", currentTime);
		expect(stripEntryRuntimeData(entry)).toStrictEqual({
			name: "Block 1",
			startTime: currentTime,
			endTime: null,
			subEntries: null,
		});
	});

	it("each created entry should have a unique id", () => {
		const currentTime = moment();

		const entry1 = createEntry("Block 1", currentTime);
		const entry2 = createEntry("Block 2", currentTime);
		expect(entry1.id).not.toBe(entry2.id);
	});

	it("attaches tags when provided", () => {
		const currentTime = moment();
		const entry = createEntry("Block", currentTime, ["work", "urgent"]);

		expect(stripEntryRuntimeData(entry)).toStrictEqual({
			name: "Block",
			startTime: currentTime,
			endTime: null,
			subEntries: null,
			tags: ["work", "urgent"],
		});
	});

	it("does not attach an empty tags array", () => {
		const currentTime = moment();
		const entry = createEntry("Block", currentTime, []);

		expect(entry.tags).toBeUndefined();
	});

	it("attaches a description when provided", () => {
		const currentTime = moment();
		const entry = createEntry("Block", currentTime, undefined, "Wrote the report");

		expect(stripEntryRuntimeData(entry)).toStrictEqual({
			name: "Block",
			startTime: currentTime,
			endTime: null,
			subEntries: null,
			description: "Wrote the report",
		});
	});

	it("does not attach an empty description", () => {
		const currentTime = moment();
		const entry = createEntry("Block", currentTime, undefined, "");

		expect(entry.description).toBeUndefined();
	});
});

describe("withEntry", () => {
	it("should add new entry to entries", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_entry/addNewEntry");
		const output = withEntry(input, "New Entry", currentTime);
		expect(stripEntriesRuntimeData(output)).toEqual(stripEntriesRuntimeData(expected));
	});

	it("should generate block name when empty", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_entry/addEmptyBlockName");

		const output1 = withEntry(input, "", currentTime);
		expect(stripEntriesRuntimeData(output1)).toEqual(stripEntriesRuntimeData(expected));

		// Empty whitespace string should also count as an empty name
		const output2 = withEntry(input, " ".repeat(5), currentTime);
		expect(stripEntriesRuntimeData(output2)).toEqual(stripEntriesRuntimeData(expected));
	});

	it("should maintain existing entries when adding to a list", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_entry/addEntryToList");

		const output = withEntry(input, "New Test Entry", currentTime);
		expect(stripEntriesRuntimeData(output)).toEqual(stripEntriesRuntimeData(expected));
	});

	it("propagates tags to the new entry", () => {
		const currentTime = moment();
		const output = withEntry([], "Tagged", currentTime, ["project-x"]);

		expect(output[0].tags).toEqual(["project-x"]);
	});

	it("propagates the description to the new entry", () => {
		const currentTime = moment();
		const output = withEntry([], "Described", currentTime, undefined, "Initial setup");

		expect(output[0].description).toEqual("Initial setup");
	});
});

describe("withSubEntry", () => {
	it("adding first entry should convert to group", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_sub_entry/addConvertToGroup");
		const output = withSubEntry(input, "New Entry", currentTime);
		expect(stripEntryRuntimeData(output)).toEqual(stripEntryRuntimeData(expected));
	});

	it("adding first entry for folder should populate subentries", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_sub_entry/addFolderPopulateSubEntries");
		const output = withSubEntry(input, "New Entry", currentTime);
		expect(stripEntryRuntimeData(output)).toEqual(stripEntryRuntimeData(expected));
	});

	it("adding first entry for folder should extend subentries", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_sub_entry/addFolderExtendSubEntries");
		const output = withSubEntry(input, "New Entry 2", currentTime);
		expect(stripEntryRuntimeData(output)).toEqual(stripEntryRuntimeData(expected));
	});

	it("adding to group should extend sub entries", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_sub_entry/addToGroupExtendSubEntries");

		const output = withSubEntry(input, "New Entry", currentTime);
		expect(stripEntryRuntimeData(output)).toEqual(stripEntryRuntimeData(expected));
	});

	it("empty name should generate a part name (single)", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_sub_entry/emptyNameCreatePartNameSingle");

		const output = withSubEntry(input, "", currentTime);
		expect(stripEntryRuntimeData(output)).toEqual(stripEntryRuntimeData(expected));
	});

	it("empty name should generate a part name (group)", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/manipulating/adding_sub_entry/emptyNameCreatePartNameGroup");

		const output = withSubEntry(input, "", currentTime);
		expect(stripEntryRuntimeData(output)).toEqual(stripEntryRuntimeData(expected));
	});

	it("lifts tags from the single entry up to the parent group", () => {
		const currentTime = moment();
		const parent = createEntry("Block 1", currentTime, ["work", "urgent"]);

		const output = withSubEntry(parent, "", currentTime);

		// Tags are held by the parent group only
		expect(output.tags).toEqual(["work", "urgent"]);
		// Child blocks (Part 1, Part 2) remain untagged
		expect(output.subEntries).not.toBeNull();
		for (const child of output.subEntries!) {
			expect(child.tags).toBeUndefined();
		}
	});

	it("does not tag new child blocks, merging incoming tags onto the parent", () => {
		const currentTime = moment();
		const parent = createEntry("Block 1", currentTime, ["work"]);

		const output = withSubEntry(parent, "", currentTime, ["urgent"]);

		expect(output.tags).toEqual(["work", "urgent"]);
		expect(output.subEntries).not.toBeNull();
		for (const child of output.subEntries!) {
			expect(child.tags).toBeUndefined();
		}
	});

	it("keeps an existing group's tags consolidated when extending it", () => {
		const currentTime = moment();
		// First press converts the single entry into a tagged group
		const group = withSubEntry(createEntry("Block 1", currentTime, ["work"]), "", currentTime);

		// Second press extends the group without duplicating or scattering tags
		const output = withSubEntry(group, "", currentTime);

		expect(output.tags).toEqual(["work"]);
		expect(output.subEntries).not.toBeNull();
		expect(output.subEntries!).toHaveLength(3);
		for (const child of output.subEntries!) {
			expect(child.tags).toBeUndefined();
		}
	});
});
