import { anchorOf, edgeBetween, edgeMiddle, sidesBetween, TILE_HEIGHT, TILE_WIDTH } from "./canvas";

describe("learning path canvas geometry", () => {
	it("should run arrows between tiles side by side from right to left", () => {
		expect(sidesBetween({ x: 0, y: 0 }, { x: 400, y: 50 })).toEqual(["right", "left"]);
		expect(sidesBetween({ x: 400, y: 0 }, { x: 0, y: 0 })).toEqual(["left", "right"]);
	});

	it("should run arrows between stacked tiles from bottom to top", () => {
		expect(sidesBetween({ x: 0, y: 0 }, { x: 50, y: 300 })).toEqual(["bottom", "top"]);
		expect(sidesBetween({ x: 0, y: 300 }, { x: 0, y: 0 })).toEqual(["top", "bottom"]);
	});

	it("should start and end an arrow in the middle of the chosen sides", () => {
		const d = edgeBetween({ x: 0, y: 0 }, { x: 0, y: 300 });

		expect(d.startsWith(`M ${TILE_WIDTH / 2} ${TILE_HEIGHT} `)).toBe(true);
		expect(d.endsWith(`${TILE_WIDTH / 2} 300`)).toBe(true);
		expect(anchorOf({ x: 10, y: 20 }, "left")).toEqual({ x: 10, y: 20 + TILE_HEIGHT / 2 });
	});

	it("should find the middle of an arrow between the tiles", () => {
		// side by side on one line: the arrow runs straight, its middle is halfway between the anchors
		const middle = edgeMiddle({ x: 0, y: 0 }, { x: 400, y: 0 });

		expect(middle.x).toBeCloseTo((TILE_WIDTH + 400) / 2);
		expect(middle.y).toBeCloseTo(TILE_HEIGHT / 2);
	});
});
