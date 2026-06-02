// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { createMockContainer, MockVault } from "@/__mocks__/obsidian";
import { defaultSettings, type TimekeepSettings } from "@/settings";
import { createStore, type Store } from "@/store";
import * as debounceUtil from "@/utils/debounce";

import { TimekeepAutocomplete } from "@/service/autocomplete";
import { TimekeepRegistry } from "@/service/registry";

import { TimesheetTagsInput } from "./TimesheetTagsInput";

describe("TimesheetTagsInput", () => {
	let containerEl: HTMLElement;
	let vault: MockVault;
	let settings: Store<TimekeepSettings>;
	let registry: TimekeepRegistry;
	let autocomplete: TimekeepAutocomplete;
	let debounced: Mock<typeof debounceUtil.debounced>;
	let component: TimesheetTagsInput;

	beforeEach(() => {
		vi.clearAllMocks();

		vault = new MockVault();
		containerEl = createMockContainer();
		settings = createStore(defaultSettings);

		registry = new TimekeepRegistry(vault.asVault(), settings);
		autocomplete = new TimekeepAutocomplete(registry, settings);

		debounced = vi
			.spyOn(debounceUtil, "debounced")
			.mockImplementation((callback) => {
				return function (...args) {
					callback(...args);
				};
			});

		component = new TimesheetTagsInput(containerEl, autocomplete);
	});

	afterEach(() => {
		component.unload();
	});

	it("should load without error", () => {
		expect(() => component.load()).not.toThrow();
	});

	it("should create input element with correct ARIA attributes", () => {
		component.load();
		const inputEl = containerEl.querySelector("input") as HTMLInputElement;
		expect(inputEl).not.toBeNull();
		expect(inputEl.getAttribute("aria-expanded")).toBe("false");
		expect(inputEl.getAttribute("role")).toBe("combobox");
		expect(inputEl.getAttribute("aria-autocomplete")).toBe("list");
	});

	it("should create a hidden suggestions container on load", () => {
		component.load();
		const suggestionsEl = containerEl.querySelector(".timekeep-suggestions") as HTMLElement;
		expect(suggestionsEl).not.toBeNull();
		expect(suggestionsEl.hidden).toBe(true);
	});

	describe("getCurrentToken", () => {
		it("returns full value as a single token when no separators are present", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work";
			inputEl.setSelectionRange(4, 4);
			expect(component.getCurrentToken()).toEqual({ start: 0, end: 4, text: "work" });
		});

		it("returns the token after the last separator before the cursor", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work, client";
			inputEl.setSelectionRange(12, 12);
			expect(component.getCurrentToken()).toEqual({ start: 6, end: 12, text: "client" });
		});

		it("returns an empty token when cursor is immediately after a separator", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work, ";
			inputEl.setSelectionRange(6, 6);
			expect(component.getCurrentToken()).toEqual({ start: 6, end: 6, text: "" });
		});

		it("strips a leading # from the token text", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "#work";
			inputEl.setSelectionRange(5, 5);
			expect(component.getCurrentToken()).toEqual({ start: 1, end: 5, text: "work" });
		});

		it("returns only the token around the cursor when cursor is in the middle", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work client";
			inputEl.setSelectionRange(2, 2);
			expect(component.getCurrentToken()).toEqual({ start: 0, end: 4, text: "work" });
		});
	});

	describe("getFilteredSuggestions", () => {
		it("returns an empty array when no tags are available", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work";
			inputEl.setSelectionRange(4, 4);
			expect(component.getFilteredSuggestions()).toEqual([]);
		});

		it("returns all tags when the current token is empty", () => {
			autocomplete.tags.setState(["work", "client", "urgent"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			const suggestions = component.getFilteredSuggestions();
			expect(suggestions.map((s) => s.item)).toEqual(["work", "client", "urgent"]);
		});

		it("filters tags with Fuse.js when the current token is non-empty", () => {
			autocomplete.tags.setState(["work", "client", "urgent"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "wo";
			inputEl.setSelectionRange(2, 2);
			const suggestions = component.getFilteredSuggestions();
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions.some((s) => s.item === "work")).toBe(true);
		});

		it("excludes tags that are already present in the input", () => {
			autocomplete.tags.setState(["work", "client", "urgent"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work, cl";
			inputEl.setSelectionRange(8, 8);
			const suggestions = component.getFilteredSuggestions();
			expect(suggestions.some((s) => s.item === "work")).toBe(false);
		});
	});

	describe("getValue / setValue / resetValue", () => {
		it("getValue returns an empty string before load", () => {
			expect(component.getValue()).toBe("");
		});

		it("getValue returns the current input value after load", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "work";
			expect(component.getValue()).toBe("work");
		});

		it("setValue updates the input element value", () => {
			component.load();
			component.setValue("client urgent");
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			expect(inputEl.value).toBe("client urgent");
		});

		it("setValue before load does nothing", () => {
			expect(() => component.setValue("work")).not.toThrow();
		});

		it("resetValue clears the input value to an empty string", () => {
			component.load();
			component.setValue("work client");
			component.resetValue();
			expect(component.getValue()).toBe("");
		});
	});

	describe("typing input", () => {
		it("typing with no available tags produces no suggestions", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			inputEl.value = "wo";
			inputEl.setSelectionRange(2, 2);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			expect(debounced).toHaveBeenCalledOnce();
			const suggestions = containerEl.querySelectorAll(".timekeep-suggestion");
			expect(suggestions.length).toBe(0);
		});

		it("typing renders matching tag suggestions", () => {
			autocomplete.tags.setState(["work", "client", "urgent"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			inputEl.value = "wo";
			inputEl.setSelectionRange(2, 2);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			const suggestions = containerEl.querySelectorAll(".timekeep-suggestion");
			expect(suggestions.length).toBeGreaterThan(0);
		});
	});

	describe("focus", () => {
		it("focusing the input opens suggestions when tags are available", () => {
			autocomplete.tags.setState(["work", "client"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);

			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			inputEl.dispatchEvent(new Event("focus", { bubbles: true }));

			expect(setSuggestionsOpen).toHaveBeenCalledWith(true);
		});
	});

	describe("keyboard navigation", () => {
		it("ArrowDown moves focus to the first suggestion", () => {
			autocomplete.tags.setState(["work", "client"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			const setSuggestionFocus = vi.spyOn(component, "setSuggestionFocus");
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
			);

			expect(setSuggestionFocus).toHaveBeenLastCalledWith(0);
		});

		it("ArrowDown opens suggestions when they are closed", () => {
			autocomplete.tags.setState(["work", "client"]);
			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			// Close suggestions first
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" })
			);
			// ArrowDown should reopen
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
			);

			expect(setSuggestionsOpen).toHaveBeenLastCalledWith(true);
		});

		it("ArrowUp moves focus toward the first suggestion", () => {
			autocomplete.tags.setState(["work", "client", "urgent"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
			);
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
			);
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowUp" })
			);
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })
			);

			expect(onSelectSuggestion).toHaveBeenLastCalledWith("work");
		});

		it("Tab selects the focused suggestion", () => {
			autocomplete.tags.setState(["work", "client"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
			);
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Tab" })
			);

			expect(onSelectSuggestion).toHaveBeenCalledWith("work");
		});

		it("Enter selects the focused suggestion", () => {
			autocomplete.tags.setState(["work", "client"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" })
			);
			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })
			);

			expect(onSelectSuggestion).toHaveBeenCalledWith("work");
		});

		it("Enter without a focused suggestion does nothing", () => {
			autocomplete.tags.setState(["work", "client"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })
			);

			expect(onSelectSuggestion).not.toHaveBeenCalled();
		});

		it("Escape closes the suggestions dropdown", () => {
			autocomplete.tags.setState(["work", "client"]);
			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Escape" })
			);

			expect(setSuggestionsOpen).toHaveBeenLastCalledWith(false);
		});

		it("other keys are ignored without triggering a selection", () => {
			autocomplete.tags.setState(["work", "client"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			inputEl.dispatchEvent(
				new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "a" })
			);

			expect(onSelectSuggestion).not.toHaveBeenCalled();
		});
	});

	describe("onSelectSuggestion", () => {
		it("replaces the current token with the selected suggestion", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "wo";
			inputEl.setSelectionRange(2, 2);

			component.onSelectSuggestion("work");

			expect(inputEl.value).toBe("work ");
		});

		it("appends a trailing space when the cursor is at the end of the input", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "wo";
			inputEl.setSelectionRange(2, 2);

			component.onSelectSuggestion("work");

			expect(inputEl.value).toContain("work ");
		});

		it("does not append a trailing space when a separator immediately follows", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "wo, client";
			inputEl.setSelectionRange(2, 2);

			component.onSelectSuggestion("work");

			expect(inputEl.value).toBe("work, client");
		});

		it("replaces a middle token while leaving surrounding text intact", () => {
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "urgent, wo, client";
			inputEl.setSelectionRange(10, 10);

			component.onSelectSuggestion("work");

			expect(inputEl.value).toBe("urgent, work, client");
		});

		it("closes suggestions after a selection is made", () => {
			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "wo";
			inputEl.setSelectionRange(2, 2);

			component.onSelectSuggestion("work");

			expect(setSuggestionsOpen).toHaveBeenLastCalledWith(false);
		});
	});

	describe("click outside", () => {
		it("clicking outside the input container closes suggestions", () => {
			autocomplete.tags.setState(["work", "client"]);
			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			component.load();

			document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

			expect(setSuggestionsOpen).toHaveBeenLastCalledWith(false);
		});

		it("touching outside the input container closes suggestions", () => {
			autocomplete.tags.setState(["work", "client"]);
			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			component.load();

			document.dispatchEvent(new MouseEvent("touchstart", { bubbles: true }));

			expect(setSuggestionsOpen).toHaveBeenLastCalledWith(false);
		});

		it("clicking inside the input container does not close suggestions", () => {
			document.body.appendChild(containerEl);
			autocomplete.tags.setState(["work", "client"]);
			const setSuggestionsOpen = vi.spyOn(component, "setSuggestionsOpen");
			component.load();

			component.wrapperEl!.dispatchEvent(
				new MouseEvent("mousedown", { bubbles: true, cancelable: true })
			);

			expect(setSuggestionsOpen).not.toHaveBeenLastCalledWith(false);

			document.body.removeChild(containerEl);
		});
	});

	describe("renderSuggestions", () => {
		it("renders no suggestion elements when the list is empty", () => {
			component.load();
			component.renderSuggestions();
			const suggestions = containerEl.querySelectorAll(".timekeep-suggestion");
			expect(suggestions.length).toBe(0);
		});

		it("wraps matched characters in mark elements", () => {
			autocomplete.tags.setState(["work", "workflow"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			inputEl.value = "work";
			inputEl.setSelectionRange(4, 4);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			const suggestions = containerEl.querySelectorAll(".timekeep-suggestion");
			expect(suggestions.length).toBeGreaterThan(0);
			expect(suggestions.item(0).querySelector("mark")).not.toBeNull();
		});

		it("renders suggestions without mark elements when there are no match indices", () => {
			autocomplete.tags.setState(["work", "client"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			// Empty token returns all tags without Fuse match data
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			const suggestions = containerEl.querySelectorAll(".timekeep-suggestion");
			expect(suggestions.length).toBe(2);
			expect(suggestions.item(0).querySelector("mark")).toBeNull();
		});
	});

	describe("setSuggestionsOpen", () => {
		it("does not show the suggestions container when the suggestion list is empty", () => {
			component.load();
			component.setSuggestionsOpen(true);
			const suggestionsEl = containerEl.querySelector(".timekeep-suggestions") as HTMLElement;
			expect(suggestionsEl.hidden).toBe(true);
		});

		it("shows the suggestions container when suggestions are present and open is true", () => {
			autocomplete.tags.setState(["work", "client"]);
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;
			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);

			inputEl.dispatchEvent(new Event("focus", { bubbles: true }));

			const suggestionsEl = containerEl.querySelector(".timekeep-suggestions") as HTMLElement;
			expect(suggestionsEl.hidden).toBe(false);
		});
	});

	describe("clicking a suggestion", () => {
		it("clicking a suggestion element selects it", () => {
			autocomplete.tags.setState(["work", "client"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			const suggestions = containerEl.querySelectorAll(".timekeep-suggestion");
			expect(suggestions.length).toBeGreaterThan(0);

			suggestions
				.item(0)
				.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));

			expect(onSelectSuggestion).toHaveBeenCalled();
		});

		it("clicking the suggestions container but not a suggestion element is ignored", () => {
			autocomplete.tags.setState(["work", "client"]);
			const onSelectSuggestion = vi.spyOn(component, "onSelectSuggestion");
			component.load();
			const inputEl = containerEl.querySelector("input") as HTMLInputElement;

			inputEl.value = "";
			inputEl.setSelectionRange(0, 0);
			inputEl.dispatchEvent(new Event("input", { bubbles: true }));

			const suggestionsEl = containerEl.querySelector(".timekeep-suggestions");
			suggestionsEl!.dispatchEvent(
				new MouseEvent("mousedown", { bubbles: true, cancelable: true })
			);

			expect(onSelectSuggestion).not.toHaveBeenCalled();
		});
	});
});
