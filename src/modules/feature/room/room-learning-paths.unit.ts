import { lockedHintByBoardId, reworkBoardIds, stepInfoByBoardId, visibleChain } from "./room-learning-paths";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { roomBoardGridItemFactory } from "@@/tests/test-utils";
import {
	LearningPathColor,
	RoomBoardLockResponseReasonEnum as LockReason,
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
		it("should number the boards of a learning path the student goes", () => {
			const info = stepInfoByBoardId([pathBoard("p1", { steps, isEnrolled: true, color: LearningPathColor.Green })]);

			expect(info).toEqual({
				"board-a": [{ title: "Path p1", position: 1, color: LearningPathColor.Green }],
				"board-c": [{ title: "Path p1", position: 2, color: LearningPathColor.Green }],
			});
		});

		it("should leave out the learning paths a student does not go", () => {
			expect(stepInfoByBoardId([pathBoard("p1", { steps, isEnrolled: false })])).toEqual({});
		});

		it("should show teachers every learning path", () => {
			const info = stepInfoByBoardId([pathBoard("p1", { steps, studentCount: 2, completedStudentCount: 0 })]);

			expect(Object.keys(info)).toEqual(["board-a", "board-c", "board-d"]);
		});

		it("should not make a board a step because one of its cards is", () => {
			const info = stepInfoByBoardId([
				pathBoard("p1", { steps: [step({ id: "k", boardId: "board-a", cardId: "card-k" })], isEnrolled: true }),
			]);

			expect(info).toEqual({});
		});

		it("should list every learning path a board is part of", () => {
			const info = stepInfoByBoardId([
				pathBoard("p1", { steps: [step({ id: "a" })], isEnrolled: true }),
				pathBoard("p2", { steps: [step({ id: "x" }), step({ id: "a", positionY: 10 })], isEnrolled: true }),
			]);

			expect(info["board-a"].map((entry) => [entry.title, entry.position])).toEqual([
				["Path p1", 1],
				["Path p2", 2],
			]);
		});
	});

	describe("lockedHintByBoardId", () => {
		const locked = (boardId: string, pathId: string): RoomBoardItem =>
			roomBoardGridItemFactory.build({
				id: boardId,
				lockedByLearningPath: { id: pathId, title: "Path", reason: LockReason.Prerequisites },
			});

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

		it("should ask to choose a learning path when none is chosen", () => {
			const board = roomBoardGridItemFactory.build({
				id: "board-c",
				lockedByLearningPath: { id: "p1", title: "Path", reason: LockReason.ChooseLearningPath },
			});

			expect(lockedHintByBoardId([board])).toEqual({ "board-c": { mode: "choose", titles: [] } });
		});

		it("should give no hint when the learning path is not in the list", () => {
			expect(lockedHintByBoardId([locked("board-c", "p1")])).toEqual({});
		});
	});

	describe("reworkBoardIds", () => {
		it("should list the boards a student completed before but has to rework", () => {
			const path = pathBoard("p1", { steps: [step({ id: "a", reopened: true }), step({ id: "b" })], isEnrolled: true });

			expect(Array.from(reworkBoardIds([path]))).toEqual(["board-a"]);
		});

		it("should leave out learning paths the student does not go and teacher views", () => {
			const reopened = [step({ id: "a", reopened: true })];

			expect(reworkBoardIds([pathBoard("p1", { steps: reopened, isEnrolled: false })]).size).toBe(0);
			expect(reworkBoardIds([pathBoard("p1", { steps: reopened, studentCount: 1 })]).size).toBe(0);
		});
	});
});
