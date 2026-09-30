import { lockedHintByBoardId, stepInfoByBoardId, visibleChain } from "./room-learning-paths";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { roomBoardGridItemFactory } from "@@/tests/test-utils";
import {
	RoomLearningPathResponse,
	RoomLearningPathStepResponse,
	RoomLearningPathStepResponseStatusEnum as Status,
	RoomLearningPathStepResponseUnlockModeEnum as UnlockMode,
} from "@api-server";
import { describe, expect, it } from "vitest";

const step = (props: Partial<RoomLearningPathStepResponse> & { id: string }): RoomLearningPathStepResponse => ({
	boardId: `board-${props.id}`,
	title: props.id.toUpperCase(),
	isVisible: true,
	status: Status.Open,
	prerequisiteStepIds: [],
	unlockMode: UnlockMode.All,
	positionX: 0,
	positionY: 0,
	...props,
});

const pathBoard = (id: string, learningPath: RoomLearningPathResponse): RoomBoardItem =>
	roomBoardGridItemFactory.build({ id, title: `Path ${id}`, layout: BoardLayout.LEARNING_PATH, learningPath });

describe("room-learning-paths", () => {
	// a -> c, b placed above a but after it in the arrows' order does not matter
	const steps = [
		step({ id: "c", prerequisiteStepIds: ["a"], positionY: 0, status: Status.Locked }),
		step({ id: "a", positionY: 100, status: Status.Done }),
		step({ id: "d", positionY: 200, status: Status.Unavailable, title: "", isVisible: false }),
	];

	describe("visibleChain", () => {
		it("should order the steps after their prerequisites and hide drafts from students", () => {
			expect(visibleChain({ steps }).map((s) => s.id)).toEqual(["a", "c"]);
		});

		it("should show teachers every step", () => {
			expect(visibleChain({ steps, studentCount: 3, completedStudentCount: 0 }).map((s) => s.id)).toEqual([
				"a",
				"c",
				"d",
			]);
		});
	});

	describe("stepInfoByBoardId", () => {
		it("should number the boards of a learning path", () => {
			const info = stepInfoByBoardId([pathBoard("p1", { steps })]);

			expect(info).toEqual({
				"board-a": { title: "Path p1", position: 1 },
				"board-c": { title: "Path p1", position: 2 },
			});
		});

		it("should keep the first learning path of the room for a board on several", () => {
			const info = stepInfoByBoardId([
				pathBoard("p1", { steps: [step({ id: "a" })] }),
				pathBoard("p2", { steps: [step({ id: "x" }), step({ id: "a", positionY: 10 })] }),
			]);

			expect(info["board-a"]).toEqual({ title: "Path p1", position: 1 });
		});
	});

	describe("lockedHintByBoardId", () => {
		const locked = (boardId: string, pathId: string): RoomBoardItem =>
			roomBoardGridItemFactory.build({ id: boardId, lockedByLearningPath: { id: pathId, title: "Path" } });

		it("should name the prerequisites that are not done yet", () => {
			const path = pathBoard("p1", {
				steps: [
					step({ id: "a" }),
					step({ id: "b", status: Status.Done }),
					step({ id: "c", prerequisiteStepIds: ["a", "b"], status: Status.Locked }),
				],
			});

			expect(lockedHintByBoardId([path, locked("board-c", "p1")])).toEqual({
				"board-c": { mode: "all", titles: ["A"] },
			});
		});

		it("should say when one of several prerequisites is enough", () => {
			const path = pathBoard("p1", {
				steps: [
					step({ id: "a" }),
					step({ id: "b" }),
					step({ id: "c", prerequisiteStepIds: ["a", "b"], unlockMode: UnlockMode.Any, status: Status.Locked }),
				],
			});

			expect(lockedHintByBoardId([path, locked("board-c", "p1")])["board-c"]).toEqual({
				mode: "any",
				titles: ["A", "B"],
			});
		});

		it("should give no hint when the learning path is not in the list", () => {
			expect(lockedHintByBoardId([locked("board-c", "p1")])).toEqual({});
		});
	});
});
