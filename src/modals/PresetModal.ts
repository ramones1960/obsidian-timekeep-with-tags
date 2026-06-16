import type { App } from "obsidian";

import { Modal, Setting } from "obsidian";

import type { TimekeepPreset } from "@/settings";

import { formatTagsInput, parseTagsInput } from "@/utils/tags";

/**
 * Modal for creating or editing a {@link TimekeepPreset}.
 *
 * When editing, the provided preset's values pre-populate the fields and the
 * resulting preset keeps the same id. When creating, a new id is generated.
 */
export class PresetModal extends Modal {
	/** The preset being edited, or undefined when creating a new one */
	preset: TimekeepPreset | undefined;

	/** Callback invoked with the resulting preset when saved */
	callback: (preset: TimekeepPreset) => void;

	/** Working copy of the field values */
	#label: string;
	#name: string;
	#tags: string;

	constructor(
		app: App,
		preset: TimekeepPreset | undefined,
		callback: (preset: TimekeepPreset) => void
	) {
		super(app);
		this.preset = preset;
		this.callback = callback;

		this.#label = preset?.label ?? "";
		this.#name = preset?.name ?? "";
		this.#tags = formatTagsInput(preset?.tags);
	}

	onOpen(): void {
		this.setTitle(this.preset ? "Edit preset" : "Add preset");

		new Setting(this.contentEl)
			.setName("Label")
			.setDesc("Optional display name for the preset button (defaults to the block name)")
			.addText((t) => {
				t.setValue(this.#label);
				t.onChange((v) => {
					this.#label = v;
				});
			});

		new Setting(this.contentEl)
			.setName("Block name")
			.setDesc("The block name applied when starting from this preset")
			.addText((t) => {
				t.setValue(this.#name);
				t.onChange((v) => {
					this.#name = v;
				});
			});

		new Setting(this.contentEl)
			.setName("Tags")
			.setDesc("Tags applied when starting from this preset (space or comma separated)")
			.addText((t) => {
				t.setPlaceholder("tag1, tag2");
				t.setValue(this.#tags);
				t.onChange((v) => {
					this.#tags = v;
				});
			});

		new Setting(this.contentEl)
			.addButton((btn) => {
				btn.buttonEl.setAttribute("data-action", "save");
				btn.setButtonText("Save").setCta().onClick(this.onSave.bind(this));
			})
			.addButton((btn) => {
				btn.buttonEl.setAttribute("data-action", "cancel");
				btn.setButtonText("Cancel").onClick(() => this.close());
			});
	}

	onSave(): void {
		const name = this.#name.trim();
		// A preset is meaningless without a block name
		if (name.length === 0) {
			return;
		}

		const preset: TimekeepPreset = {
			id: this.preset?.id ?? createPresetId(),
			label: this.#label.trim(),
			name,
			tags: parseTagsInput(this.#tags),
		};

		this.close();
		this.callback(preset);
	}
}

/**
 * Generate a stable unique identifier for a preset.
 */
export function createPresetId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}

	return `preset-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
