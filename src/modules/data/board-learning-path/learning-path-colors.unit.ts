import {
	LEARNING_PATH_COLORS,
	LearningPathColor,
	learningPathColorValue,
	learningPathShape,
} from "./learning-path-colors";

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

	it("should give every color its own shape", () => {
		const shapes = LEARNING_PATH_COLORS.map((color) => learningPathShape(color));

		expect(new Set(shapes).size).toBe(LEARNING_PATH_COLORS.length);
	});

	it("should fall back to a circle without a color", () => {
		expect(learningPathShape(undefined)).toBe("circle");
	});

	// stripes, shapes and borders have to stand out against a white surface (3:1)
	it.each(LEARNING_PATH_COLORS)("should be dark enough on white: %s", (color) => {
		const hex = learningPathColorValue(color).slice(1);
		const [r, g, b] = [0, 2, 4].map((i) => {
			const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
			return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
		});
		const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

		expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(3);
	});
});
