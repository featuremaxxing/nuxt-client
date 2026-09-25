// Lernraum palette: the classroom wall chart ("Lernposter").
// Single source for the Vuetify themes and the CSS tokens in src/styles/tokens/_color.scss.
// Contrast (WCAG 2.x) is checked for every text color against surface, background and surface-light.

export const lightColors = {
	background: "#F3F5F7",
	surface: "#FFFFFF",
	"surface-bright": "#FFFFFF",
	"surface-light": "#EBEEF2",
	"surface-variant": "#1C2330",
	"on-surface-variant": "#F3F5F7",
	"on-background": "#141A22",
	"on-surface": "#141A22",
	"on-surface-light": "#141A22",
	"on-white": "#141A22",
	primary: "#1F3F8F",
	"primary-darken-1": "#17306E",
	"primary-darken-2": "#112552",
	"primary-lighten": "#E6ECF8",
	"on-primary": "#FFFFFF",
	secondary: "#141A22",
	"on-secondary": "#FFFFFF",
	white: "#FFFFFF",
	info: "#2459C4",
	success: "#0A7560",
	warning: "#945600",
	error: "#C12A3A",
} as const;

export const darkColors = {
	background: "#0E1117",
	surface: "#161B24",
	"surface-bright": "#232B37",
	"surface-light": "#1E2530",
	"surface-variant": "#E7EBF1",
	"on-surface-variant": "#0E1117",
	"on-background": "#E7EBF1",
	"on-surface": "#E7EBF1",
	"on-surface-light": "#E7EBF1",
	"on-white": "#E7EBF1",
	primary: "#9DB6FF",
	"primary-darken-1": "#7F9CF0",
	"primary-darken-2": "#6583DB",
	"primary-lighten": "#1E2A48",
	"on-primary": "#0E1117",
	secondary: "#E7EBF1",
	"on-secondary": "#0E1117",
	// Legacy components paint surfaces with the theme color "white"; in dark mode that is the surface.
	white: "#161B24",
	info: "#8AAEFF",
	success: "#4FD1AE",
	warning: "#F2B84B",
	error: "#FF8A93",
} as const;

// Category fills (tiles, legend swatches, room identities). Always carry ink text (#141A22),
// 7.6:1 or better, in both themes: the chart is "backlit" in dark mode, not re-tinted.
export const categoryColors = {
	koralle: "#FF8A70",
	senf: "#F7C948",
	petrol: "#3CC4A4",
	himmel: "#7EB2FF",
	violett: "#B79CFF",
	rose: "#FF94BD",
	lime: "#B8DC5A",
	orange: "#FFA95C",
	schiefer: "#AEB9C7",
	sand: "#D9C3A0",
	tuerkis: "#5DD3E0",
	pflaume: "#D59BE6",
	oliv: "#C9C66A",
} as const;

export const categoryInk = "#141A22";
