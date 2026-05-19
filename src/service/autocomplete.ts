import { Component } from "obsidian";

import { TimekeepSettings } from "@/settings";
import { createStore, Store } from "@/store";
import { isNumberText } from "@/utils/number";

import { TimekeepEntryItemType, TimekeepRegistry } from "./registry";

import { getEntriesNames, getEntriesTags } from "@/timekeep/queries";

/**
 * Autocomplete registry to provide entry name autocomplete based
 * on all the existing tasks within the vault
 */
export class TimekeepAutocomplete extends Component {
	/** The registry of timekeeps */
	registry: TimekeepRegistry;
	/** Access to settings */
	settings: Store<TimekeepSettings>;
	/** The collection of timekeep names */
	names: Store<string[]>;
	/** The collection of timekeep tags */
	tags: Store<string[]>;

	constructor(registry: TimekeepRegistry, settings: Store<TimekeepSettings>) {
		super();

		this.registry = registry;
		this.settings = settings;

		this.names = createStore<string[]>([]);
		this.tags = createStore<string[]>([]);
	}

	onload() {
		super.onload();

		const onUpdateRegistry = this.onUpdateRegistry.bind(this);
		const unsubscribe = this.settings.subscribe(onUpdateRegistry);
		onUpdateRegistry();
		this.register(unsubscribe);
	}

	private onUpdateRegistry() {
		const settings = this.settings.getState();
		if (!settings.autocompleteEnabled) {
			this.names.setState([]);
			this.tags.setState([]);
			return;
		}

		const onChangeEntries = this.onChangeEntries.bind(this);
		const unsubscribe = this.registry.entries.subscribe(onChangeEntries);
		onChangeEntries();
		this.register(unsubscribe);
	}

	private onChangeEntries() {
		const entries = this.registry.entries.getState();
		const namesSet = new Set<string>();
		const tagsSet = new Set<string>();

		for (const entry of entries) {
			switch (entry.type) {
				case TimekeepEntryItemType.FILE: {
					const timekeep = entry.timekeep;
					getEntriesNames(timekeep.entries, namesSet);
					getEntriesTags(timekeep.entries, tagsSet);
					break;
				}

				case TimekeepEntryItemType.MARKDOWN: {
					for (const timekeep of entry.timekeeps) {
						getEntriesNames(timekeep.timekeep.entries, namesSet);
						getEntriesTags(timekeep.timekeep.entries, tagsSet);
					}
					break;
				}

				/* v8 ignore start -- @preserve */
				default: {
					throw new Error("unknown entry type");
				}
				/* v8 ignore stop -- @preserve */
			}
		}

		const names = Array.from(namesSet)
			//
			.filter((name) => !TimekeepAutocomplete.isIgnoredName(name));

		names.sort();

		const tags = Array.from(tagsSet);
		tags.sort();

		this.names.setState(names);
		this.tags.setState(tags);
	}

	/**
	 * Checks if a name should be ignored from autocomplete
	 *
	 * @param name The name to check
	 * @returns Whether the name should be ignored
	 */
	static isIgnoredName(name: string) {
		if (name.length < 1) {
			return true;
		}

		// Ignore "Part 1" "Part 2", "Block 1" ...etc
		if (name.startsWith("Part") || name.startsWith("Block")) {
			const parts = name.split(" ");
			if (parts.length !== 2) {
				return false;
			}

			const numericPart = parts[1];
			if (isNumberText(numericPart)) {
				return true;
			}
		}

		return false;
	}
}
