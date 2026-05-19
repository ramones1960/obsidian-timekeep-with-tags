import Fuse, { FuseResult } from "fuse.js";

import { assert } from "@/utils/assert";
import { debounced } from "@/utils/debounce";

import { DomComponent } from "@/components/DomComponent";

import { TimekeepAutocomplete } from "@/service/autocomplete";

const SEPARATOR_PATTERN = /[,\s#]/;

/**
 * Tag input with token-aware suggestions: only the token currently being
 * edited (the text around the cursor between separators) drives the
 * filtered suggestions, and selecting a suggestion replaces just that
 * token instead of the whole input value.
 */
export class TimesheetTagsInput extends DomComponent {
	/** Access to autocomplete */
	autocomplete: TimekeepAutocomplete;

	/** Input element id */
	inputId: string;
	/** Suggestions container id */
	suggestionsId: string;
	/** Input placeholder */
	placeholder: string;
	/** Extra classes applied to the input element */
	inputClasses: string;

	/** Tag input */
	#inputEl: HTMLInputElement | undefined;
	/** Suggestions container element */
	#suggestionsEl: HTMLDivElement | undefined;

	/** Current list of suggestions */
	#suggestions: FuseResult<string>[] = [];
	/** Whether the suggestions should be open */
	#suggestionsOpen: boolean = false;
	/** Index of the currently focused suggestion */
	#suggestionFocusIndex: number = -1;

	constructor(
		containerEl: HTMLElement,
		autocomplete: TimekeepAutocomplete,
		options: {
			inputId?: string;
			suggestionsId?: string;
			placeholder?: string;
			inputClasses?: string;
		} = {}
	) {
		super(containerEl);

		this.autocomplete = autocomplete;
		this.inputId = options.inputId ?? "timekeepBlockTags";
		this.suggestionsId = options.suggestionsId ?? `${this.inputId}-suggestions`;
		this.placeholder = options.placeholder ?? "tag1, tag2";
		this.inputClasses = options.inputClasses ?? "timekeep-input timekeep-tags-input";
	}

	onload(): void {
		super.onload();

		const wrapperEl = this.containerEl.createDiv({ cls: "timekeep-tags-container" });
		this.wrapperEl = wrapperEl;

		const inputEl = wrapperEl.createEl("input", {
			cls: this.inputClasses,
			type: "text",
			attr: {
				placeholder: this.placeholder,
			},
		});
		inputEl.id = this.inputId;
		inputEl.name = "tags";
		inputEl.role = "combobox";
		inputEl.setAttribute("aria-expanded", "false");
		inputEl.setAttribute("aria-controls", this.suggestionsId);
		inputEl.setAttribute("aria-autocomplete", "list");
		this.#inputEl = inputEl;

		const suggestionsEl = wrapperEl.createDiv({ cls: "timekeep-suggestions" });
		suggestionsEl.id = this.suggestionsId;
		suggestionsEl.role = "listbox";
		suggestionsEl.hidden = true;
		this.#suggestionsEl = suggestionsEl;

		this.registerDomEvent(inputEl, "input", debounced(this.onDebouncedChange.bind(this), 200));

		this.registerDomEvent(inputEl, "focus", this.onFocus.bind(this));
		this.registerDomEvent(inputEl, "keydown", this.onKeyDown.bind(this));

		this.registerDomEvent(document, "mousedown", this.onClickOutside.bind(this));
		this.registerDomEvent(document, "touchstart", this.onClickOutside.bind(this), {
			passive: true,
		});

		this.registerDomEvent(suggestionsEl, "mousedown", this.onClickSuggestions.bind(this));
	}

	/**
	 * Compute the token currently being edited based on the input
	 * value and cursor position. The token spans from the last
	 * separator before the cursor up to the next separator after it.
	 */
	getCurrentToken(): { start: number; end: number; text: string } {
		const inputEl = this.#inputEl;
		assert(inputEl, "Input element should be defined");

		const value = inputEl.value;
		const cursor = inputEl.selectionStart ?? value.length;

		let start = 0;
		for (let i = cursor - 1; i >= 0; i--) {
			if (SEPARATOR_PATTERN.test(value[i])) {
				start = i + 1;
				break;
			}
		}

		let end = value.length;
		for (let i = cursor; i < value.length; i++) {
			if (SEPARATOR_PATTERN.test(value[i])) {
				end = i;
				break;
			}
		}

		const text = value.slice(start, end).replace(/^#+/, "");
		return { start, end, text };
	}

	/**
	 * Filter the available tag suggestions against the token being
	 * edited. When the token is empty all tags are returned so that
	 * focusing an empty input still shows recent tags.
	 */
	getFilteredSuggestions(): FuseResult<string>[] {
		const tags = this.autocomplete.tags.getState();
		if (tags.length === 0) return [];

		const { text } = this.getCurrentToken();

		// Determine tokens already in the input so we can exclude
		// them from the suggestion list.
		const existing = new Set(
			this.#inputEl?.value
				.split(/[,\s]+/g)
				.map((token) => token.replace(/^#+/, ""))
				.filter((token) => token.length > 0 && token !== text) ?? []
		);

		const candidates = tags.filter((tag) => !existing.has(tag));

		if (text.length === 0) {
			return candidates.map((tag, index) => ({ item: tag, refIndex: index }));
		}

		const fuse = new Fuse(candidates, {
			includeMatches: true,
			shouldSort: true,
			ignoreLocation: true,
			minMatchCharLength: 1,
		});
		return fuse.search(text);
	}

	/**
	 * Renders the suggestion children within the suggestion container
	 * for the current available suggestions
	 */
	renderSuggestions() {
		const suggestionsEl = this.#suggestionsEl;
		assert(suggestionsEl, "Suggestions element should be defined");

		suggestionsEl.empty();
		const suggestions = this.#suggestions;
		if (suggestions.length < 1) return;

		for (let i = 0; i < suggestions.length; i += 1) {
			const result = suggestions[i];
			const suggestion = result.item;

			const suggestionEl = suggestionsEl.createDiv({ cls: "timekeep-suggestion" });
			suggestionEl.role = "option";
			suggestionEl.id = `${this.suggestionsId}-${i}`;
			suggestionEl.setAttribute("aria-selected", "false");
			suggestionEl.setAttribute("value", suggestion);

			let lastIndex = 0;

			if (result.matches && result.matches.length > 0) {
				const match = result.matches[0];

				for (const [start, end] of match.indices) {
					if (start > lastIndex) {
						suggestionEl.appendText(suggestion.slice(lastIndex, start));
					}

					const text = suggestion.slice(start, end + 1);
					suggestionEl.createEl("mark", { text });
					lastIndex = end + 1;
				}
			}

			if (lastIndex < suggestion.length) {
				suggestionEl.appendText(suggestion.slice(lastIndex));
			}
		}
	}

	/**
	 * Handle clicking suggestion elements
	 *
	 * @param event The click event
	 */
	onClickSuggestions(event: MouseEvent) {
		const target = event.target;

		/* v8 ignore start -- @preserve */
		if (!(target instanceof HTMLElement)) return;
		/* v8 ignore stop -- @preserve */

		const suggestionEl = target.closest(".timekeep-suggestion");
		if (!(suggestionEl instanceof HTMLElement)) return;
		if (!suggestionEl.id.startsWith(`${this.suggestionsId}-`)) return;

		// Prevent input from losing focus so the cursor position is preserved
		event.preventDefault();

		const value = suggestionEl.getAttribute("value");
		assert(value !== null, "Suggestion value should not be null");
		this.onSelectSuggestion(value);
	}

	/**
	 * Handle changes to the input value, this updates the filtered
	 * suggestions list and triggers re-rendering of the suggestions
	 */
	onDebouncedChange() {
		const suggestions = this.getFilteredSuggestions();
		this.#suggestions = suggestions;

		this.setSuggestionsOpen(true);
		this.renderSuggestions();
	}

	/**
	 * Handle clicks and close the suggestion box if they are
	 * outside of the container
	 *
	 * @param event The click / touch event
	 */
	onClickOutside(event: MouseEvent | TouchEvent) {
		assert(this.wrapperEl, "Wrapper element must be defined");

		if (this.wrapperEl.contains(event.target as Node | null)) return;

		this.setSuggestionsOpen(false);
	}

	/**
	 * Handle input focus, this should open the suggestions
	 * box if it is not already open
	 */
	onFocus() {
		this.#suggestions = this.getFilteredSuggestions();
		this.renderSuggestions();
		this.setSuggestionsOpen(true);
	}

	/**
	 * Handle keyboard events for selecting the suggestion
	 * items using the keyboard
	 *
	 * @param event The keyboard event
	 */
	onKeyDown(event: KeyboardEvent) {
		const suggestionsEl = this.#suggestionsEl;
		assert(suggestionsEl, "Suggestions element should be defined");

		const suggestionsHidden = suggestionsEl.hidden;
		const suggestionsOpen = !suggestionsHidden;

		if (!suggestionsOpen && event.key === "ArrowDown") {
			this.setSuggestionsOpen(true);
			this.setSuggestionFocus(0);
			return;
		}

		switch (event.key) {
			case "ArrowDown": {
				event.preventDefault();

				const focusIndex = this.#suggestionFocusIndex;
				const nextFocusIndex = Math.min(focusIndex + 1, this.#suggestions.length - 1);
				this.setSuggestionFocus(nextFocusIndex);

				break;
			}

			case "ArrowUp": {
				event.preventDefault();

				const focusIndex = this.#suggestionFocusIndex;
				const prevFocusIndex = Math.max(focusIndex - 1, 0);
				this.setSuggestionFocus(prevFocusIndex);

				break;
			}

			case "Tab":
			case "Enter": {
				this.clampSuggestionFocus();

				const focusIndex = this.#suggestionFocusIndex;
				if (focusIndex < 0) return;
				if (!this.#suggestionsOpen) return;

				event.preventDefault();
				const suggestion = this.#suggestions[focusIndex];
				assert(suggestion, "Suggestion should always be within defined bounds");

				this.onSelectSuggestion(suggestion.item);
				break;
			}

			case "Escape": {
				this.setSuggestionsOpen(false);
				this.setSuggestionFocus(-1);
				break;
			}

			default:
				break;
		}
	}

	/**
	 * Clamps the current suggestion focus index to be within
	 * the current suggestion bounds
	 */
	clampSuggestionFocus() {
		if (this.#suggestions.length > 0) {
			const focusIndex = this.#suggestionFocusIndex;
			const newFocusIndex =
				focusIndex === -1 ? -1 : Math.min(focusIndex, this.#suggestions.length - 1);

			this.setSuggestionFocus(newFocusIndex);
		} else {
			this.setSuggestionFocus(-1);
		}
	}

	/**
	 * Set the focused suggestion index within the drop down menu.
	 *
	 * @param index The index that is focused
	 */
	setSuggestionFocus(index: number) {
		this.#suggestionFocusIndex = index;

		const inputEl = this.#inputEl;
		const suggestionsEl = this.#suggestionsEl;

		assert(inputEl && suggestionsEl, "Expected elements should be defined");

		const children = suggestionsEl.querySelectorAll(".timekeep-suggestion");
		for (let i = 0; i < children.length; i++) {
			const child = children.item(i);

			const selected = index === i;
			child.setAttribute("aria-selected", String(selected));

			if (selected) {
				child.scrollIntoView({ block: "nearest" });
			}
		}

		if (index === -1) {
			inputEl.removeAttribute("aria-activedescendant");
			suggestionsEl.scrollTo({ top: 0 });
		} else {
			inputEl.setAttribute("aria-activedescendant", `${this.suggestionsId}-${index}`);
		}
	}

	/**
	 * Set the open state of the suggestions box
	 *
	 * @param value The open state of the box
	 */
	setSuggestionsOpen(value: boolean) {
		this.#suggestionsOpen = value;
		this.updateSuggestionsOpen();
	}

	/**
	 * Updates the open state of the suggestion box to actually show or
	 * hide the element, this is to ensure an empty suggestion box is
	 * not shown
	 */
	updateSuggestionsOpen() {
		const inputEl = this.#inputEl;
		const suggestionsEl = this.#suggestionsEl;
		assert(inputEl && suggestionsEl, "Expected elements should be defined");

		const open = this.#suggestions.length < 1 ? false : this.#suggestionsOpen;

		suggestionsEl.hidden = !open;
		inputEl.setAttribute("aria-expanded", String(open));

		this.clampSuggestionFocus();
	}

	/**
	 * Handle selecting a suggestion value: replace the currently
	 * edited token with the chosen tag and append a trailing space
	 * so the user can continue entering further tags.
	 *
	 * @param value The suggestion value
	 */
	onSelectSuggestion(value: string) {
		const inputEl = this.#inputEl;
		assert(inputEl, "Input element should be defined");

		const current = inputEl.value;
		const { start, end } = this.getCurrentToken();

		const before = current.slice(0, start);
		const after = current.slice(end);

		// Append a trailing space when there's no following separator
		// so subsequent characters start a new token.
		const needsTrailingSpace = after.length === 0 || !SEPARATOR_PATTERN.test(after[0]);
		const insertion = needsTrailingSpace ? `${value} ` : value;

		inputEl.value = `${before}${insertion}${after}`;

		const newCursor = before.length + insertion.length;
		inputEl.setSelectionRange(newCursor, newCursor);
		inputEl.focus();

		this.setSuggestionsOpen(false);
		this.setSuggestionFocus(-1);

		// Refresh suggestions for the (now empty) next token
		this.#suggestions = this.getFilteredSuggestions();
		this.renderSuggestions();
	}

	/**
	 * Getter for the tags input value
	 */
	getValue(): string {
		return this.#inputEl?.value ?? "";
	}

	/**
	 * Set the tags input value
	 */
	setValue(value: string) {
		if (!this.#inputEl) return;
		this.#inputEl.value = value;
	}

	/**
	 * Reset the tags input value to an empty string
	 */
	resetValue() {
		this.setValue("");
	}
}
