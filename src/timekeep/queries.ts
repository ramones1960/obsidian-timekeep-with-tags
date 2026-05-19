import type { Moment } from "moment";

import { Timekeep, TimeEntry } from "@/timekeep/schema";

/**
 * Find an entry within the entries using the ID of the entry
 *
 * @param entryId ID of the entry to find
 * @param entries List of entries to search
 * @returns The found entry or undefined
 */
export function getEntryById(entryId: number, entries: TimeEntry[]): TimeEntry | undefined {
	for (const entry of entries) {
		if (entry.id === entryId) {
			return entry;
		}

		if (entry.subEntries) {
			const nestedEntry = getEntryById(entryId, entry.subEntries);

			if (nestedEntry) {
				return nestedEntry;
			}
		}
	}

	return undefined;
}

/**
 * Get the path to the provided target entry
 *
 * @param entries The collection of entries
 * @param target The target entry
 * @returns The path to the entry
 */
export function getPathToEntry(
	entries: TimeEntry[],
	target: TimeEntry
): { id: number; name: string }[] {
	const path: { id: number; name: string }[] = [];

	function dfs(entry: TimeEntry): boolean {
		path.push({ id: entry.id, name: entry.name });

		if (entry.id === target.id) {
			return true;
		}

		if (entry.subEntries) {
			for (const sub of entry.subEntries) {
				if (dfs(sub)) {
					return true;
				}
			}
		}

		path.pop();
		return false;
	}

	for (const entry of entries) {
		if (dfs(entry)) {
			return path;
		}
	}

	return [];
}

/**
 * Searches through the nested list of time entries using
 * a "stack" depth-first search approach attempting to
 * find an entry that is running
 *
 * @param entries The entries to search
 * @return The running entry if found or null
 */
export function getRunningEntry(entries: TimeEntry[]): TimeEntry | null {
	const stack: TimeEntry[] = [...entries];

	while (stack.length > 0) {
		const entry: TimeEntry = stack.pop()!;

		if (entry.subEntries !== null) {
			stack.push(...entry.subEntries);
		} else if (entry.startTime !== null && entry.endTime === null) {
			return entry;
		}
	}

	return null;
}

/**
 * Checks whether the provided entry is still running. For groups
 * this will check all of the sub-entries for running
 *
 * @param entry The entry to check
 * @returns Whether the entry or any sub-entries are running
 */
export function isEntryRunning(entry: TimeEntry) {
	if (entry.subEntries !== null) {
		return getRunningEntry(entry.subEntries) !== null;
	}

	return entry.startTime !== null && entry.endTime === null;
}

/**
 * Determines whether any of the entries in the provided timekeep
 * are actively running
 *
 * @param timekeep The timekeep to check
 * @returns Whether the timekeep is running
 */
export function isKeepRunning(timekeep: Timekeep): boolean {
	return getRunningEntry(timekeep.entries) !== null;
}

/**
 * Gets the duration in milliseconds of the entry
 * and the entry children if it is a group
 *
 * @param entry The entry to get the duration from
 * @param currentTime The current time to use for unfinished entries
 * @returns The duration in milliseconds
 */
export function getEntryDuration(entry: TimeEntry, currentTime: Moment): number {
	if (entry.subEntries !== null) {
		return getTotalDuration(entry.subEntries, currentTime);
	}

	// Entry is not started
	if (entry.startTime === null) {
		return 0;
	}

	// Get the end time or use current time if not ended
	const endTime = entry.endTime ?? currentTime;
	return endTime.diff(entry.startTime);
}

/**
 * Gets the total duration of all the provided entries
 * in milliseconds
 *
 * @param entries The entries
 * @param currentTime The current time to use for unfinished entries
 * @returns The total duration in milliseconds
 */
export function getTotalDuration(entries: TimeEntry[], currentTime: Moment): number {
	return entries.reduce(
		(totalDuration, entry) => totalDuration + getEntryDuration(entry, currentTime),
		0
	);
}

/**
 * Gets either the newest or oldest start time from a entry
 *
 * @internal Used internal when sorting
 *
 * @param entry The entry to get the start time from
 * @param newest Whether to get the newest or oldest
 * @returns The start time or null if none were available
 */
export function getStartTime(entry: TimeEntry, newest: boolean): Moment | null {
	// Find the latest start time from entry
	if (entry.subEntries !== null) {
		return entry.subEntries.reduce(
			(previousValue, currentValue) => {
				if (previousValue === null) {
					return currentValue.startTime;
				}

				// Use the current value if its newer
				if (currentValue.startTime !== null) {
					const timeDiff = newest
						? previousValue.diff(currentValue.startTime)
						: currentValue.startTime.diff(previousValue);

					if (timeDiff > 0) {
						return currentValue.startTime;
					}
				}

				return previousValue;
			},
			null as Moment | null
		);
	}

	return entry.startTime;
}

/**
 * Collect the names of all entries within a collection
 * of entries and any nested entries
 *
 * @param entries The entries to extract names from
 * @param names The set to store collected names in
 * @returns The list of names
 */
export function getEntriesNames(entries: TimeEntry[], names: Set<string>) {
	const stack: TimeEntry[] = [...entries];

	while (stack.length > 0) {
		const entry: TimeEntry = stack.pop()!;

		names.add(entry.name);

		if (entry.subEntries !== null) {
			stack.push(...entry.subEntries);
		}
	}
}

/**
 * Resolves the effective tags of an entry by combining its own tags
 * with `inheritedTags` from any parent groups. Duplicates are removed
 * while preserving the order: inherited first, own tags appended.
 *
 * @param entry The entry to resolve tags for
 * @param inheritedTags Tags inherited from parent groups
 * @returns The full resolved tag list
 */
export function getEffectiveTags(entry: TimeEntry, inheritedTags: string[] = []): string[] {
	const own = entry.tags ?? [];
	if (own.length === 0 && inheritedTags.length === 0) return [];

	const seen = new Set<string>();
	const result: string[] = [];
	for (const tag of [...inheritedTags, ...own]) {
		if (!seen.has(tag)) {
			seen.add(tag);
			result.push(tag);
		}
	}
	return result;
}

/**
 * Collect all unique tags within the provided entries
 * (including nested entries).
 *
 * @param entries The entries to scan
 * @returns A set of all unique tags found
 */
export function getAllTags(entries: TimeEntry[]): Set<string> {
	const tags = new Set<string>();
	const stack: TimeEntry[] = [...entries];

	while (stack.length > 0) {
		const entry = stack.pop()!;

		if (entry.tags) {
			for (const tag of entry.tags) {
				tags.add(tag);
			}
		}

		if (entry.subEntries !== null) {
			stack.push(...entry.subEntries);
		}
	}

	return tags;
}

/**
 * Aggregates duration (in milliseconds) by tag across the
 * provided entries. Tags on parent groups are inherited by
 * all sub-entries: a leaf entry's duration contributes to
 * every tag in its own + inherited tag set.
 *
 * Untagged time (after inheritance) is grouped under the
 * empty-string key `""`. Callers can ignore that key when
 * displaying only tagged totals.
 *
 * @param entries The entries to aggregate
 * @param currentTime The current time for running entries
 * @returns A map of tag -> total duration in milliseconds
 */
export function getDurationByTag(
	entries: TimeEntry[],
	currentTime: Moment
): Record<string, number> {
	const totals: Record<string, number> = {};

	const walk = (entry: TimeEntry, inheritedTags: string[]) => {
		const effective = getEffectiveTags(entry, inheritedTags);

		if (entry.subEntries !== null) {
			for (const sub of entry.subEntries) {
				walk(sub, effective);
			}
			return;
		}

		const duration = getEntryDuration(entry, currentTime);
		if (duration === 0) return;

		if (effective.length === 0) {
			totals[""] = (totals[""] ?? 0) + duration;
			return;
		}

		for (const tag of effective) {
			totals[tag] = (totals[tag] ?? 0) + duration;
		}
	};

	for (const entry of entries) {
		walk(entry, []);
	}

	return totals;
}

/**
 * Returns the flat list of leaf entries that carry the given tag
 * (either directly or via parent group inheritance).
 *
 * @param entries Entries to search
 * @param tag The target tag
 * @returns Matching leaf entries
 */
export function getEntriesByTag(entries: TimeEntry[], tag: string): TimeEntry[] {
	const matches: TimeEntry[] = [];

	const walk = (entry: TimeEntry, inheritedTags: string[]) => {
		const effective = getEffectiveTags(entry, inheritedTags);

		if (entry.subEntries !== null) {
			for (const sub of entry.subEntries) {
				walk(sub, effective);
			}
			return;
		}

		if (effective.includes(tag)) {
			matches.push(entry);
		}
	};

	for (const entry of entries) {
		walk(entry, []);
	}

	return matches;
}
