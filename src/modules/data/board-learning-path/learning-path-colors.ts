import { LearningPathColor } from "@api-server";

export { LearningPathColor };

export const LEARNING_PATH_COLORS: LearningPathColor[] = Object.values(LearningPathColor);

// Dark enough to stand out against white (3:1) when used as a stripe, a dot or a border. The
// color is never the only hint: it always comes with the name of the learning path.
const COLOR_VALUES: Record<LearningPathColor, string> = {
	[LearningPathColor.Blue]: "#1565c0",
	[LearningPathColor.Green]: "#2e7d32",
	[LearningPathColor.Orange]: "#d84315",
	[LearningPathColor.Purple]: "#6a1b9a",
	[LearningPathColor.Red]: "#c62828",
	[LearningPathColor.Teal]: "#00796b",
	[LearningPathColor.Yellow]: "#a66f00",
	[LearningPathColor.Pink]: "#ad1457",
};

const NEUTRAL = "#757575";

export const learningPathColorValue = (color: LearningPathColor | undefined): string =>
	color ? COLOR_VALUES[color] : NEUTRAL;
