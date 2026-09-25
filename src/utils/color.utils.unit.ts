import {
	COLORS_LIGHTEN3,
	colorToHexLighten3,
	colorToHexLighten5,
	hexToColorLighten3,
	hexToColorLighten5,
	toCategoryColor,
} from "./color.utils";
import { Colors } from "@api-server";
import colors from "vuetify/lib/util/colors";

describe("color.utils", () => {
	describe("colorToHexLighten3", () => {
		it("should return white for TRANSPARENT", () => {
			const result = colorToHexLighten3(Colors.TRANSPARENT);

			expect(result).toBe(colors.shades.white);
		});

		it.each([
			[Colors.BLUE, colors.blue.lighten3],
			[Colors.GREEN, colors.green.lighten3],
			[Colors.PINK, colors.pink.lighten3],
		])("should return correct hex for %s", (color, expectedHex) => {
			const result = colorToHexLighten3(color);

			expect(result).toBe(expectedHex);
		});
	});

	describe("colorToHexLighten5", () => {
		it("should return white for TRANSPARENT", () => {
			const result = colorToHexLighten5(Colors.TRANSPARENT);

			expect(result).toBe(colors.shades.white);
		});

		it.each([
			[Colors.BLUE, colors.blue.lighten5],
			[Colors.GREEN, colors.green.lighten5],
			[Colors.PINK, colors.pink.lighten5],
		])("should return correct hex for %s", (color, expectedHex) => {
			const result = colorToHexLighten5(color);

			expect(result).toBe(expectedHex);
		});
	});

	describe("hexToColorLighten3", () => {
		it("should return TRANSPARENT for white hex", () => {
			const result = hexToColorLighten3(colors.shades.white);

			expect(result).toBe(Colors.TRANSPARENT);
		});

		it("should return correct color for valid hex", () => {
			const blueHex = colors.blue.lighten3;

			const result = hexToColorLighten3(blueHex);

			expect(result).toBe(Colors.BLUE);
		});

		it("should handle uppercase hex values", () => {
			const blueHex = colors.blue.lighten3.toUpperCase();

			const result = hexToColorLighten3(blueHex);

			expect(result).toBe(Colors.BLUE);
		});

		it("should return undefined for unknown hex", () => {
			const result = hexToColorLighten3("#123456");

			expect(result).toBeUndefined();
		});
	});

	describe("hexToColorLighten5", () => {
		it("should return TRANSPARENT for white hex", () => {
			const result = hexToColorLighten5(colors.shades.white);

			expect(result).toBe(Colors.TRANSPARENT);
		});

		it("should return correct color for valid hex", () => {
			const greenHex = colors.green.lighten5;

			const result = hexToColorLighten5(greenHex);

			expect(result).toBe(Colors.GREEN);
		});

		it("should return undefined for unknown hex", () => {
			const result = hexToColorLighten5("#abcdef");

			expect(result).toBeUndefined();
		});
	});

	describe("COLORS_LIGHTEN3 mapping", () => {
		it("should contain all DEFAULT_COLORS", () => {
			const expectedColors = [
				Colors.TRANSPARENT,
				Colors.LIGHT_GREEN,
				Colors.GREEN,
				Colors.CYAN,
				Colors.BLUE,
				Colors.INDIGO,
				Colors.PURPLE,
				Colors.PINK,
				Colors.DEEP_ORANGE,
				Colors.AMBER,
				Colors.BLUE_GREY,
				Colors.GREY,
			];

			expect(Object.keys(COLORS_LIGHTEN3)).toEqual(expectedColors);
		});
	});

	describe("bidirectional mapping", () => {
		it.each([Colors.TRANSPARENT, Colors.BLUE, Colors.GREEN, Colors.PINK])(
			"should convert %s to hex and back",
			(color) => {
				const hex = colorToHexLighten3(color);
				const result = hexToColorLighten3(hex);

				expect(result).toBe(color);
			}
		);
	});

	describe("toCategoryColor", () => {
		it.each([
			["#d50000", "#FF8A70"], // red -> koralle
			["#0091ea", "#7EB2FF"], // light blue -> himmel
			["#009688", "#3CC4A4"], // teal -> petrol
			["#9c27b0", "#D59BE6"], // purple -> pflaume
			["#ffc107", "#F7C948"], // amber -> senf
			["#795548", "#D9C3A0"], // brown -> sand
			["#ACACAC", "#AEB9C7"], // grey -> schiefer
			["#abc", "#AEB9C7"], // short, low saturation -> schiefer
			["#455b6a", "#AEB9C7"], // blue grey -> schiefer
		])("maps %s to %s", (input, expected) => {
			expect(toCategoryColor(input)).toBe(expected);
		});

		it("falls back to schiefer for missing or invalid input", () => {
			expect(toCategoryColor(undefined)).toBe("#AEB9C7");
			expect(toCategoryColor("not-a-color")).toBe("#AEB9C7");
		});
	});
});
