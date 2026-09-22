// Shared CSV cell-escaping, used by both the assignments and the polls export (see
// AssignmentSubmissionsOverlay.vue exportCsv and poll-export.util.ts buildPollResultsCsv) -
// kept here so neither export duplicates the same security-sensitive logic.
//
// Quoting a cell (as both exports already did) prevents the delimiter/quote/newline from being
// misread as structure, but it does NOT stop formula injection: Excel and LibreOffice evaluate a
// cell's content as a formula whenever it *starts* with one of a fixed set of characters,
// regardless of surrounding quotes. A student's free-text answer or comment is exactly the kind
// of field an attacker-controlled string can end up in, so every export that includes user input
// must run its cells through this first. Prefixing with a single quote is the standard
// mitigation: spreadsheet apps then render the value as plain text instead of evaluating it,
// while the visible content is unchanged.
const FORMULA_TRIGGER_CHARACTERS = ["=", "+", "-", "@", "\t", "\r"];

export const escapeCsvFormulaInjection = (value: string): string => {
	if (FORMULA_TRIGGER_CHARACTERS.some((char) => value.startsWith(char))) {
		return `'${value}`;
	}
	return value;
};
