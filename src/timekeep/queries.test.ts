import moment from "moment";
import { expect, it, describe } from "vitest";

import {
	getAllTags,
	getDurationByTag,
	getEffectiveTags,
	getEntriesByTag,
	getEntryById,
	isKeepRunning,
	getPathToEntry,
	isEntryRunning,
	getRunningEntry,
	getEntryDuration,
	getTotalDuration,
	getEntriesNames,
	getStartTime,
} from "./queries";
import { TimeEntry } from "./schema";

describe("getEntryById", () => {
	it("find top level entry", async () => {
		const { input, targetEntry, targetEntryId } =
			await import("./__fixtures__/checking/findEntryById");

		const output = getEntryById(targetEntryId, input);
		expect(output).toEqual(targetEntry);
	});

	it("find nested entry", async () => {
		const { input, targetEntry, targetEntryId } =
			await import("./__fixtures__/checking/findEntryByIdNested");

		const output = getEntryById(targetEntryId, input);
		expect(output).toEqual(targetEntry);
	});

	it("find nested entry second element", async () => {
		const { input, targetEntry, targetEntryId } =
			await import("./__fixtures__/checking/findEntryByIdNestedSecond");

		const output = getEntryById(targetEntryId, input);
		expect(output).toEqual(targetEntry);
	});

	it("find entry non existent", async () => {
		const { input, targetEntryId } =
			await import("./__fixtures__/checking/findEntryByIdMissing");

		const output = getEntryById(targetEntryId, input);
		expect(output).toBeUndefined();
	});

	it("find entry non existent nested", async () => {
		const { input, targetEntryId } =
			await import("./__fixtures__/checking/findEntryByIdMissingNested");

		const output = getEntryById(targetEntryId, input);
		expect(output).toBeUndefined();
	});
});

describe("getPathToEntry", () => {
	it("path not found", async () => {
		const { targetEntry, entries, expected } = await import("./__fixtures__/path/pathNotFound");
		const output = getPathToEntry(entries, targetEntry);
		expect(output).toEqual(expected);
	});

	it("top level path found", async () => {
		const { targetEntry, entries, expected } = await import("./__fixtures__/path/pathTopLevel");
		const output = getPathToEntry(entries, targetEntry);
		expect(output).toEqual(expected);
	});

	it("child path found", async () => {
		const { targetEntry, entries, expected } = await import("./__fixtures__/path/pathChild");
		const output = getPathToEntry(entries, targetEntry);
		expect(output).toEqual(expected);
	});

	it("deep child path found", async () => {
		const { targetEntry, entries, expected } =
			await import("./__fixtures__/path/pathDeepChild");
		const output = getPathToEntry(entries, targetEntry);
		expect(output).toEqual(expected);
	});

	it("deep child path not found", async () => {
		const { targetEntry, entries, expected } =
			await import("./__fixtures__/path/pathNotFoundDeep");
		const output = getPathToEntry(entries, targetEntry);
		expect(output).toEqual(expected);
	});

	it("should find running entry path", async () => {
		const { input, runningEntry, path } =
			await import("./__fixtures__/checking/findRunningEntryPath");

		const output = getPathToEntry(input, runningEntry);
		expect(output).toEqual(path);
	});
});

describe("isEntryRunning", () => {
	it("should determine entry running state", async () => {
		const { running, notRunning } = await import("./__fixtures__/checking/runningState");

		expect(isEntryRunning(running)).toBe(true);
		expect(isEntryRunning(notRunning)).toBe(false);
	});

	it("should determine entry running state (nested)", async () => {
		const { runningNested, stoppedNested } =
			await import("./__fixtures__/checking/runningState");

		expect(isEntryRunning(runningNested)).toBe(true);
		expect(isEntryRunning(stoppedNested)).toBe(false);
	});
});

describe("getRunningEntry", () => {
	it("should find running entry", async () => {
		const { input, runningEntry } =
			await import("./__fixtures__/checking/shouldFindRunningEntry");

		const output = getRunningEntry(input);

		expect(output).toBe(runningEntry);
	});

	it("should find nested running entry", async () => {
		const { input, runningEntry } =
			await import("./__fixtures__/checking/shouldFindRunningEntryNested");

		const output = getRunningEntry(input);

		expect(output).toBe(runningEntry);
	});

	it("should not find running entry", async () => {
		const { input } = await import("./__fixtures__/checking/shouldNotFindRunningEntry");

		const output = getRunningEntry(input);

		expect(output).toBe(null);
	});
});

describe("isKeepRunning", () => {
	it("should show keep running", async () => {
		const { input } = await import("./__fixtures__/checking/shouldBeRunning");

		expect(isKeepRunning(input)).toBe(true);
	});

	it("should show keep not running", async () => {
		const { input } = await import("./__fixtures__/checking/shouldNotBeRunning");

		expect(isKeepRunning(input)).toBe(false);
	});
});

describe("getEntryDuration", () => {
	it("should get entry duration", async () => {
		const { input, currentTime, durationMs } =
			await import("./__fixtures__/duration/shouldGetEntryDuration");

		const output = getEntryDuration(input, currentTime);

		expect(output).toBe(durationMs);
	});

	it("duration of non started entry should be zero", async () => {
		const { input, currentTime, durationMs } =
			await import("./__fixtures__/duration/nonStartedZeroDuration");

		const output = getEntryDuration(input, currentTime);

		expect(output).toBe(durationMs);
	});

	it("duration should include children", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/duration/durationIncludeChildren");

		const output = getEntryDuration(input, currentTime);

		expect(output).toBe(expected);
	});

	it("duration should use current as end for unfinished entries", async () => {
		const { input, endTime, durationMs } =
			await import("./__fixtures__/duration/currentEndUnfinished");

		const output = getEntryDuration(input, endTime);

		expect(output).toBe(durationMs);
	});
});

describe("getTotalDuration", () => {
	it("should get total duration", async () => {
		const { input, currentTime, expected } =
			await import("./__fixtures__/duration/totalDuration");

		const output = getTotalDuration(input, currentTime);

		expect(output).toBe(expected);
	});
});

describe("getEntriesNames", () => {
	it("empty list should return no names", () => {
		const input: TimeEntry[] = [];
		const expected: string[] = [];

		const output = new Set<string>();

		getEntriesNames(input, output);

		// Sort output for consistent result
		const outputSet = Array.from(output).sort();
		expect(outputSet).toEqual(expected);
	});

	it("should return all names from a flat list", async () => {
		const { input, expected } = await import("./__fixtures__/names/flatNames");

		const output = new Set<string>();

		getEntriesNames(input, output);

		// Sort output for consistent result
		const outputSet = Array.from(output).sort();
		expect(outputSet).toEqual(expected);
	});

	it("should return all names including names from nested entries", async () => {
		const { input, expected } = await import("./__fixtures__/names/nestedNames");

		const output = new Set<string>();
		getEntriesNames(input, output);

		// Sort output for consistent result
		const outputSet = Array.from(output).sort();
		expect(outputSet).toEqual(expected);
	});
});

describe("getStartTime", () => {
	it("should pick the earliest start time", async () => {
		const { entry, output } = await import("./__fixtures__/startTime/earlyStartTime");

		expect(getStartTime(entry, false)).toEqual(output);
	});
});

describe("tag queries", () => {
	const start = moment("2024-01-01T10:00:00Z");
	const currentTime = moment("2024-01-01T20:00:00Z");

	// 1h leaf with own tags
	const leafA: TimeEntry = {
		id: 1,
		name: "A",
		startTime: moment(start),
		endTime: moment(start).add(1, "hour"),
		subEntries: null,
		tags: ["work", "project-x"],
	};

	// 2h leaf with no own tags
	const leafB: TimeEntry = {
		id: 2,
		name: "B",
		startTime: moment(start),
		endTime: moment(start).add(2, "hour"),
		subEntries: null,
	};

	// Group with tag and a 30min sub-entry that adds another tag
	const group: TimeEntry = {
		id: 3,
		name: "G",
		startTime: null,
		endTime: null,
		tags: ["client-a"],
		subEntries: [
			{
				id: 4,
				name: "G-1",
				startTime: moment(start),
				endTime: moment(start).add(30, "minutes"),
				subEntries: null,
				tags: ["urgent"],
			},
		],
	};

	describe("getEffectiveTags", () => {
		it("returns own tags when nothing inherited", () => {
			expect(getEffectiveTags(leafA)).toEqual(["work", "project-x"]);
		});

		it("returns empty list for untagged entry with no inheritance", () => {
			expect(getEffectiveTags(leafB)).toEqual([]);
		});

		it("merges inherited tags first then own tags, de-duped", () => {
			expect(getEffectiveTags(leafA, ["client-a", "work"])).toEqual([
				"client-a",
				"work",
				"project-x",
			]);
		});
	});

	describe("getAllTags", () => {
		it("collects tags from leaves and groups recursively", () => {
			const tags = getAllTags([leafA, leafB, group]);
			expect(Array.from(tags).sort()).toEqual(
				["work", "project-x", "client-a", "urgent"].sort()
			);
		});

		it("returns an empty set for untagged entries", () => {
			expect(Array.from(getAllTags([leafB]))).toEqual([]);
		});
	});

	describe("getDurationByTag", () => {
		it("aggregates leaf durations by tag", () => {
			const totals = getDurationByTag([leafA], currentTime);
			expect(totals).toEqual({
				work: 60 * 60 * 1000,
				"project-x": 60 * 60 * 1000,
			});
		});

		it("groups untagged duration under the empty-string key", () => {
			const totals = getDurationByTag([leafB], currentTime);
			expect(totals).toEqual({ "": 2 * 60 * 60 * 1000 });
		});

		it("inherits parent group tags into sub-entry totals", () => {
			const totals = getDurationByTag([group], currentTime);
			expect(totals).toEqual({
				"client-a": 30 * 60 * 1000,
				urgent: 30 * 60 * 1000,
			});
		});

		it("handles mixed input and skips zero-duration entries", () => {
			const totals = getDurationByTag([leafA, leafB, group], currentTime);
			expect(totals).toEqual({
				work: 60 * 60 * 1000,
				"project-x": 60 * 60 * 1000,
				"": 2 * 60 * 60 * 1000,
				"client-a": 30 * 60 * 1000,
				urgent: 30 * 60 * 1000,
			});
		});
	});

	describe("getEntriesByTag", () => {
		it("returns leaf entries that match the tag directly", () => {
			expect(getEntriesByTag([leafA, leafB], "work")).toEqual([leafA]);
		});

		it("returns leaves that inherit the tag from a parent group", () => {
			const matches = getEntriesByTag([group], "client-a");
			expect(matches).toHaveLength(1);
			expect(matches[0].name).toBe("G-1");
		});

		it("returns empty list when no entry has the tag", () => {
			expect(getEntriesByTag([leafA, leafB, group], "missing")).toEqual([]);
		});
	});
});
