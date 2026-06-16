import moment from "moment";

import type { TimekeepSettings, TimekeepPreset } from "@/settings";
import type { Store } from "@/store";

import { DomComponent } from "@/components/DomComponent";

import type { Timekeep } from "@/timekeep/schema";
import { startNewEntry } from "@/timekeep/start";

/**
 * Bar of quick-start preset buttons shown above the start form.
 *
 * Each preset starts a new entry using its block name and tags with a single
 * click, so the user doesn't have to type them in every time.
 */
export class TimesheetPresetBar extends DomComponent {
	/** Access to the timekeep */
	timekeep: Store<Timekeep>;
	/** Access to the timekeep settings */
	settings: Store<TimekeepSettings>;

	constructor(
		containerEl: HTMLElement,
		timekeep: Store<Timekeep>,
		settings: Store<TimekeepSettings>
	) {
		super(containerEl);
		this.timekeep = timekeep;
		this.settings = settings;
	}

	onload(): void {
		super.onload();

		const wrapperEl = this.containerEl.createDiv({ cls: "timekeep-preset-bar" });
		wrapperEl.setAttribute("data-area", "presets");
		this.wrapperEl = wrapperEl;

		// A single delegated click listener is registered once on the stable
		// wrapper so rebuilding the buttons in render() doesn't accumulate
		// listeners over the lifetime of the component.
		this.registerDomEvent(wrapperEl, "click", this.onClick.bind(this));

		const onUpdate = this.render.bind(this);
		this.register(this.settings.subscribe(onUpdate));
		onUpdate();
	}

	render(): void {
		const wrapperEl = this.wrapperEl;
		if (!wrapperEl) return;

		wrapperEl.empty();

		const settings = this.settings.getState();
		const presets = settings.presetsEnabled ? settings.presets : [];

		// Hide the bar entirely when there is nothing to show
		wrapperEl.hidden = presets.length === 0;
		if (presets.length === 0) return;

		for (const preset of presets) {
			const label = preset.label.length > 0 ? preset.label : preset.name;

			const buttonEl = wrapperEl.createEl("button", {
				cls: "timekeep-preset",
				text: label,
				attr: { type: "button" },
			});
			buttonEl.setAttribute("data-preset-id", preset.id);

			if (preset.tags.length > 0) {
				buttonEl.title = `${preset.name} (${preset.tags.map((tag) => `#${tag}`).join(" ")})`;
			} else {
				buttonEl.title = preset.name;
			}
		}
	}

	onClick(event: MouseEvent): void {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;

		const buttonEl = target.closest(".timekeep-preset");
		if (!(buttonEl instanceof HTMLElement)) return;

		const presetId = buttonEl.getAttribute("data-preset-id");
		if (presetId === null) return;

		const preset = this.settings.getState().presets.find((p) => p.id === presetId);
		if (preset === undefined) return;

		this.onStartPreset(preset);
	}

	onStartPreset(preset: TimekeepPreset): void {
		this.timekeep.setState((timekeep) => {
			const currentTime = moment();
			const entries = startNewEntry(preset.name, currentTime, timekeep.entries, preset.tags);

			return { ...timekeep, entries };
		});
	}
}
