import { expect, it, describe } from "vitest";

import { createPresetId } from "./PresetModal";

describe("createPresetId", () => {
	it("generates a non-empty string", () => {
		expect(createPresetId().length).toBeGreaterThan(0);
	});

	it("generates unique ids", () => {
		const ids = new Set(Array.from({ length: 100 }, () => createPresetId()));
		expect(ids.size).toBe(100);
	});
});
