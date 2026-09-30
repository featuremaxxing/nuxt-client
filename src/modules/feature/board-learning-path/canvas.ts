export const TILE_WIDTH = 220;
export const TILE_HEIGHT = 96;
// the data transfer type of a board dragged from the board list onto the canvas
export const BOARD_DRAG_TYPE = "application/x-learning-path-board";

export type Side = "top" | "right" | "bottom" | "left";
export const SIDES: Side[] = ["top", "right", "bottom", "left"];

type Point = { x: number; y: number };

const NORMAL: Record<Side, Point> = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
};

// the middle of a side of the tile at the given position
export const anchorOf = (position: Point, side: Side): Point => {
	switch (side) {
		case "top":
			return { x: position.x + TILE_WIDTH / 2, y: position.y };
		case "bottom":
			return { x: position.x + TILE_WIDTH / 2, y: position.y + TILE_HEIGHT };
		case "left":
			return { x: position.x, y: position.y + TILE_HEIGHT / 2 };
		default:
			return { x: position.x + TILE_WIDTH, y: position.y + TILE_HEIGHT / 2 };
	}
};

// An arrow leaves and enters along the axis on which the tiles lie further apart (measured in
// tile sizes, tiles are wider than high): side by side it runs right to left, stacked it runs
// bottom to top, so paths can be laid out in any direction.
export const sidesBetween = (from: Point, to: Point): [Side, Side] => {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	if (Math.abs(dx) / TILE_WIDTH >= Math.abs(dy) / TILE_HEIGHT) {
		return dx >= 0 ? ["right", "left"] : ["left", "right"];
	}
	return dy >= 0 ? ["bottom", "top"] : ["top", "bottom"];
};

// a smooth curve that leaves the start side straight out and enters the end side straight in
export const curveBetween = (start: Point, startSide: Side, end: Point, endSide?: Side): string => {
	const bend = Math.max(40, Math.hypot(end.x - start.x, end.y - start.y) / 3);
	const out = NORMAL[startSide];
	const into = endSide ? NORMAL[endSide] : { x: 0, y: 0 };
	const c1 = { x: start.x + out.x * bend, y: start.y + out.y * bend };
	const c2 = { x: end.x + into.x * bend, y: end.y + into.y * bend };
	return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
};

export const edgeBetween = (from: Point, to: Point): string => {
	const [startSide, endSide] = sidesBetween(from, to);
	return curveBetween(anchorOf(from, startSide), startSide, anchorOf(to, endSide), endSide);
};
