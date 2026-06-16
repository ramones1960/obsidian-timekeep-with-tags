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

			if (preset.tags.length > 0) {
				buttonEl.title = `${preset.name} (${preset.tags.map((tag) => `#${tag}`).join(" ")})`;
			} else {
				buttonEl.title = preset.name;
			}

			this.registerDomEvent(buttonEl, "click", () => this.onStartPreset(preset));
		}
	}

	onStartPreset(preset: TimekeepPreset): void {
		this.timekeep.setState((timekeep) => {
			const currentTime = moment();
			const entries = startNewEntry(preset.name, currentTime, timekeep.entries, preset.tags);

			return { ...timekeep, entries };
		});
	}
}
