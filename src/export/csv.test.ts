import { describe, expect, it } from "vitest";
import moment from "moment";

import { defaultSettings } from "@/settings";

import { createCSV } from "./csv";

const normalizeLineEndings = (s: string) => s.replace(/\r\n?/g, "\n");

describe("createCSV", () => {
	it("should create entry table rows", async () => {
		const { entries, currentTime, output } = await import("./__fixtures__/csv/tableRows");
		const csv = createCSV({ entries }, defaultSettings, currentTime);
		expect(csv).toEqual(normalizeLineEndings(output));
	});

	it("should flatten group entries", async () => {
		const { entries, currentTime, output } =
			await import("./__fixtures__/csv/flattenGroupEntries");
		const csv = createCSV({ entries }, defaultSettings, currentTime);
		expect(csv).toEqual(normalizeLineEndings(output));
	});

	it("should use current time for unfinished entries", async () => {
		const { entries, currentTime, output } =
			await import("./__fixtures__/csv/flattenGroupEntries");

		const csv = createCSV({ entries }, defaultSettings, currentTime);
		expect(csv).toEqual(normalizeLineEndings(output));
	});

	it("should wrap cells containing the delimiter in double quotes", () => {
		const entries = [
			{
				id: 1,
				name: "Task, subtask",
				startTime: moment("2024-01-01T10:00:00Z"),
				endTime: moment("2024-01-01T11:00:00Z"),
				subEntries: null,
			},
		];
		const csv = createCSV({ entries }, defaultSettings, moment());
		expect(csv).toContain('"Task, subtask"');
	});

	it("should escape double quotes inside cell values by doubling them", () => {
		const entries = [
			{
				id: 2,
				name: 'Say "hello"',
				startTime: moment("2024-01-01T10:00:00Z"),
				endTime: moment("2024-01-01T11:00:00Z"),
				subEntries: null,
			},
		];
		const csv = createCSV({ entries }, defaultSettings, moment());
		expect(csv).toContain('"Say ""hello"""');
	});

	it("should wrap cells containing newlines in double quotes", () => {
		const entries = [
			{
				id: 3,
				name: "Line1\nLine2",
				startTime: moment("2024-01-01T10:00:00Z"),
				endTime: moment("2024-01-01T11:00:00Z"),
				subEntries: null,
			},
		];
		const csv = createCSV({ entries }, defaultSettings, moment());
		expect(csv).toContain('"Line1\nLine2"');
	});

	it("should use a custom delimiter from settings", () => {
		const settings = { ...defaultSettings, csvDelimiter: ";" };
		const entries = [
			{
				id: 4,
				name: "Task",
				startTime: moment("2024-01-01T10:00:00Z"),
				endTime: moment("2024-01-01T11:00:00Z"),
				subEntries: null,
			},
		];
		const csv = createCSV({ entries }, settings, moment());
		// Columns should be separated by semicolons
		const dataLine = csv.split("\n")[1];
		expect(dataLine).toContain(";");
	});
});
