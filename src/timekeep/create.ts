import type { Moment } from "moment";

import { isEmptyString } from "@/utils/text";

import { timekeepId } from "@/timekeep/id";
import { TimeEntry, TimeEntryGroup } from "@/timekeep/schema";

/**
 * Creates a new entry that has just started
 *
 * @param name The name for the entry
 * @param startTime The start time for the entry
 * @returns The created entry
 */
export function createEntry(
	name: string,
	startTime: Moment,
	tags?: string[],
	description?: string
): TimeEntry {
	const entry: TimeEntry = {
		id: timekeepId.next(),
		name,
		startTime,
		endTime: null,
		subEntries: null,
	};

	if (tags && tags.length > 0) {
		entry.tags = tags;
	}

	if (description && description.length > 0) {
		entry.description = description;
	}

	return entry;
}

/**
 * Extends the provided list of entries with a new entry
 * of the provided name
 *
 * @param entries The collection of entries
 * @param name The name for the new entry
 * @param startTime The start time of the new entry
 * @returns The new collection of entries
 */
export function withEntry(
	entries: TimeEntry[],
	name: string,
	startTime: Moment,
	tags?: string[],
	description?: string
): TimeEntry[] {
	const entryName = getEntryName(name, entries);
	return [...entries, createEntry(entryName, startTime, tags, description)];
}

/**
 * Get the name for a new entry
 *
 * If the name is empty "Block {N}" will be used where {N} is the number
 * of entries + 1
 *
 * @param name User provided name
 * @param entries The list of entries
 * @returns The new entry name
 */
function getEntryName(name: string, entries: TimeEntry[]) {
	// Assign a name automatically if not provided
	if (isEmptyString(name)) {
		name = `Block ${entries.length + 1}`;
	}

	return name;
}

/**
 * Creates a new sub entry within the provided `parent`. The parent
 * will be converted to a group if its not already one
 *
 * @param parent The parent entry
 * @param name The name for the new entry
 * @param startTime The start time for the new entry
 * @returns The updated/created entry
 */
export function withSubEntry(
	parent: TimeEntry,
	name: string,
	startTime: Moment,
	tags?: string[]
): TimeEntry {
	const groupEntry = makeGroupEntry(parent);
	const entryName = getSubEntryName(name, groupEntry);
	// Child blocks are kept untagged: tags are consolidated on the parent
	// group so tag-based aggregation isn't scattered across sub-entries.
	const newEntry = createEntry(entryName, startTime);

	const mergedTags = mergeTags(groupEntry.tags, tags);

	const updatedGroup: TimeEntryGroup = {
		...groupEntry,
		subEntries: [...groupEntry.subEntries, newEntry],
	};

	if (mergedTags.length > 0) {
		updatedGroup.tags = mergedTags;
	} else {
		delete updatedGroup.tags;
	}

	return updatedGroup;
}

/**
 * Merges two tag lists, removing duplicates while preserving the order
 * of first appearance.
 *
 * @param existing The existing tags (e.g. from the parent group)
 * @param incoming Additional tags to merge in
 * @returns The merged unique tag list
 */
function mergeTags(existing?: string[], incoming?: string[]): string[] {
	const seen = new Set<string>();
	const result: string[] = [];

	for (const tag of [...(existing ?? []), ...(incoming ?? [])]) {
		if (!seen.has(tag)) {
			seen.add(tag);
			result.push(tag);
		}
	}

	return result;
}

/**
 * Get the name for a new sub entry
 *
 * If the name is empty "Part {N}" will be used where {N} is the number
 * of entries in the group + 1
 *
 * @param name The user provided name
 * @param groupEntry The outer group entry
 * @returns The new entry name
 */
function getSubEntryName(name: string, groupEntry: TimeEntryGroup) {
	// Assign a name automatically if not provided
	if (isEmptyString(name)) {
		return `Part ${groupEntry.subEntries.length + 1}`;
	}

	return name;
}

/**
 * Makes the provided `entry` into a group. If the entry
 * is already a group no change is made.
 *
 * If the entry is not a group, the entry will be converted to a
 * group, the start and end times from the entry will be moved into
 * the group as its first entry titled "Part 1".
 *
 * Any tags on the original entry are lifted up to the group so that
 * tags are only ever held by the parent block. This keeps tag-based
 * time aggregation consolidated on the parent instead of being
 * scattered across child blocks (Part 1, Part 2, ...).
 *
 * @param entry The entry to create a group from
 * @returns The group entry
 */
function makeGroupEntry(entry: TimeEntry): TimeEntryGroup {
	if (entry.subEntries !== null) {
		return entry;
	}

	// Move tags off the child entry and onto the parent group.
	// The description is intentionally left on the child: unlike tags (which
	// are consolidated on the parent for aggregation) a description is a note
	// about a single recording, so it stays with that record as "Part 1".
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- intentionally dropping tags from the child
	const { tags, ...entryWithoutTags } = entry;

	const group: TimeEntryGroup = {
		id: timekeepId.next(),
		name: entry.name,
		subEntries: [{ ...entryWithoutTags, name: "Part 1" }],
		startTime: null,
		endTime: null,
	};

	if (tags && tags.length > 0) {
		group.tags = tags;
	}

	return group;
}
