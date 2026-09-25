import { categoryColors } from "@/themes/lernraum-palette";
import { Colors } from "@api-server";
import colors from "vuetify/lib/util/colors";

export type ColorShade = "lighten3" | "lighten5";

const DEFAULT_COLORS = [
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

const colorToHex = (color: Colors, shade: ColorShade): string =>
	color === Colors.TRANSPARENT ? colors.shades.white : colors[color][shade];

const buildDefaultColors = (shade: ColorShade) =>
	Object.fromEntries(DEFAULT_COLORS.map((color) => [color, colorToHex(color, shade)]));

export const COLORS_LIGHTEN3 = buildDefaultColors("lighten3");
export const COLORS_LIGHTEN5 = buildDefaultColors("lighten5");

export const HEX_TO_COLOR_LIGHTEN3 = Object.fromEntries(
	Object.entries(COLORS_LIGHTEN3).map(([k, v]) => [v, k as Colors])
);
export const HEX_TO_COLOR_LIGHTEN5 = Object.fromEntries(
	Object.entries(COLORS_LIGHTEN5).map(([k, v]) => [v, k as Colors])
);

export const colorToHexLighten3 = (color: Colors) => COLORS_LIGHTEN3[color];
export const colorToHexLighten5 = (color: Colors) => COLORS_LIGHTEN5[color];

export const hexToColorLighten3 = (hex: string) => HEX_TO_COLOR_LIGHTEN3[hex.toLowerCase()];
export const hexToColorLighten5 = (hex: string) => HEX_TO_COLOR_LIGHTEN5[hex.toLowerCase()];

// === Lernposter categories ===
// Server/course colors are arbitrary hex values. The chart maps each one to the closest category fill by hue,
// so a "red" course stays recognisably red while every tile keeps ink-legible contrast.
const CATEGORY_HUES: { name: keyof typeof categoryColors; hue: number }[] = [
	{ name: "koralle", hue: 11 },
	{ name: "orange", hue: 28 },
	{ name: "senf", hue: 45 },
	{ name: "oliv", hue: 58 },
	{ name: "lime", hue: 77 },
	{ name: "petrol", hue: 166 },
	{ name: "tuerkis", hue: 186 },
	{ name: "himmel", hue: 216 },
	{ name: "violett", hue: 255 },
	{ name: "pflaume", hue: 286 },
	{ name: "rose", hue: 337 },
];

const hexToHsl = (hex: string): { h: number; s: number; l: number } | undefined => {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
	if (!match) return undefined;
	const full =
		match[1].length === 3
			? match[1]
					.split("")
					.map((c) => c + c)
					.join("")
			: match[1];
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	if (d === 0) return { h: 0, s: 0, l };
	const s = d / (1 - Math.abs(2 * l - 1));
	let h: number;
	if (max === r) h = ((g - b) / d) % 6;
	else if (max === g) h = (b - r) / d + 2;
	else h = (r - g) / d + 4;
	return { h: (h * 60 + 360) % 360, s, l };
};

const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

export const toCategoryColor = (hex?: string | null): string => {
	const hsl = hex ? hexToHsl(hex) : undefined;
	if (!hsl) return categoryColors.schiefer;
	const isBrown = hsl.l < 0.45 && hsl.h > 10 && hsl.h < 50 && hsl.s > 0.12 && hsl.s < 0.6;
	if (isBrown) return categoryColors.sand;
	if (hsl.s < 0.3) return categoryColors.schiefer;
	const nearest = CATEGORY_HUES.reduce((best, candidate) =>
		hueDistance(candidate.hue, hsl.h) < hueDistance(best.hue, hsl.h) ? candidate : best
	);
	return categoryColors[nearest.name];
};
