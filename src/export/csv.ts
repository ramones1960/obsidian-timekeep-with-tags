import type { Moment } from "moment";

import { RawTableRow, createRawTable } from "@/export";
import { TimekeepSettings } from "@/settings";

import { Timekeep } from "@/timekeep/schema";

/**
 * Creates the CSV header row
 *
 * @returns The created row
 */
function createHeader(): RawTableRow {
	return ["Block", "Start Time", "End time", "Duration", "Tags", "Description"];
}

/**
 * Generates a CSV from the timekeep data
 *
 * @param timekeep The timekeep data
 * @param settings The timekeep settings
 * @param currentTime The current time to use for unfinished entries
 * @returns The generated CSV
 */
export function createCSV(
	timekeep: Timekeep,
	settings: TimekeepSettings,
	currentTime: Moment
): string {
	const rawTable: RawTableRow[] = [
		// CSV header row
		createHeader(),
		// CSV raw table contents
		...createRawTable(timekeep.entries, settings, currentTime),
	];

	const delimiter = settings.csvDelimiter;
	const escapeCell = (cell: string): string => {
		if (cell.includes(delimiter) || cell.includes('"') || cell.includes("\n")) {
			return `"${cell.replace(/"/g, '""')}"`;
		}
		return cell;
	};

	let output = "";

	for (const row of rawTable) {
		output += row.map(escapeCell).join(delimiter);
		output += "\n";
	}

	return output;
}
