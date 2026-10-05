import { isInMergeZone } from "./roomGridDragAndDrop.composable";
import { describe, expect, it } from "vitest";

describe("isInMergeZone", () => {
	const card = {
		getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 200 }),
	} as unknown as Element;

	it("should be true in the center of a card", () => {
		expect(isInMergeZone(card, { x: 200, y: 100 })).toBe(true);
		expect(isInMergeZone(card, { x: 300, y: 140 })).toBe(true);
	});

	it("should be false on the edge of a card", () => {
		expect(isInMergeZone(card, { x: 20, y: 100 })).toBe(false);
		expect(isInMergeZone(card, { x: 200, y: 190 })).toBe(false);
	});
});
