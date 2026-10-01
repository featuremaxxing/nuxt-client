import { LEARNING_PATH_COLORS, LearningPathColor, learningPathColorValue } from "./learning-path-colors";

describe("learning path colors", () => {
	it("should give every color its own value", () => {
		const values = LEARNING_PATH_COLORS.map((color) => learningPathColorValue(color));

		expect(new Set(values).size).toBe(LEARNING_PATH_COLORS.length);
	});

	it("should offer the eight colors", () => {
		expect(LEARNING_PATH_COLORS).toHaveLength(8);
		expect(LEARNING_PATH_COLORS).toContain(LearningPathColor.Blue);
	});

	it("should fall back to a neutral color", () => {
		expect(learningPathColorValue(undefined)).toBe("#757575");
	});
});
