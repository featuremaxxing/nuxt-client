import RoomLearningPathCard from "./RoomLearningPathCard.vue";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { roomBoardGridItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import {
	RoomLearningPathResponse,
	RoomLearningPathStepResponse,
	RoomLearningPathStepResponseStatusEnum as Status,
	RoomLearningPathStepResponseUnlockModeEnum as UnlockMode,
} from "@api-server";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

const step = (id: string, status: Status, positionY: number, isVisible = true): RoomLearningPathStepResponse => ({
	id,
	boardId: `board-${id}`,
	title: status === Status.Unavailable ? "" : id.toUpperCase(),
	isVisible,
	status,
	prerequisiteStepIds: [],
	unlockMode: UnlockMode.All,
	positionX: 0,
	positionY,
});

describe("@feature-room/RoomLearningPathCard", () => {
	const setup = (learningPath: RoomLearningPathResponse | undefined, board: Partial<RoomBoardItem> = {}) => {
		const wrapper = mount(RoomLearningPathCard, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { RouterLink: true },
			},
			props: {
				board: roomBoardGridItemFactory.build({
					id: "path",
					title: "Optik",
					layout: BoardLayout.LEARNING_PATH,
					isVisible: true,
					learningPath,
					...board,
				}),
				index: 0,
			},
		});

		const stepClasses = (id: string) =>
			wrapper.get(`[data-testid='learning-path-card-step-board-${id}'] .lp-chain__step`).classes();

		return { wrapper, stepClasses };
	};

	describe("for a student", () => {
		const learningPath = {
			steps: [
				step("a", Status.Done, 0),
				step("b", Status.Open, 100),
				step("c", Status.Open, 200),
				step("d", Status.Locked, 300),
				step("e", Status.Unavailable, 400, false),
			],
		};

		it("should show the published boards in order with their state", () => {
			const { wrapper, stepClasses } = setup(learningPath);

			const titles = wrapper.findAll(".lp-chain__title").map((title) => title.text());
			expect(titles).toEqual(["A", "B", "C", "D"]);
			expect(stepClasses("a")).toContain("lp-chain__step--done");
			expect(stepClasses("b")).toContain("lp-chain__step--next");
			expect(stepClasses("c")).toContain("lp-chain__step--open");
			expect(stepClasses("d")).toContain("lp-chain__step--locked");
		});

		it("should count the completed boards", () => {
			const { wrapper } = setup(learningPath);

			expect(wrapper.get("[data-testid='learning-path-card-summary-0']").text()).toBe("pages.learningPath.progress");
		});
	});

	describe("for a teacher", () => {
		it("should show every board as configured and the finished students", () => {
			const { wrapper, stepClasses } = setup({
				steps: [step("a", Status.Open, 0), step("b", Status.Open, 100, false)],
				studentCount: 5,
				completedStudentCount: 2,
			});

			expect(stepClasses("a")).toContain("lp-chain__step--open");
			expect(stepClasses("b")).toContain("lp-chain__step--draft");
			expect(wrapper.get("[data-testid='learning-path-card-summary-0']").text()).toBe(
				"pages.room.learningPathCard.classProgress"
			);
		});
	});

	it("should invite to add boards to an empty learning path", () => {
		const { wrapper } = setup({ steps: [] });

		expect(wrapper.find("[data-testid='learning-path-card-empty-0']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='learning-path-card-summary-0']").exists()).toBe(false);
	});

	it("should lead to the learning path", () => {
		const { wrapper } = setup({ steps: [] });

		expect(wrapper.get("[data-testid='board-grid-item-link-0']").attributes("to")).toBe("/boards/path");
	});

	it("should mark a draft", () => {
		const { wrapper } = setup({ steps: [] }, { isVisible: false });

		expect(wrapper.find("[data-testid='board-grid-item-draft-0']").exists()).toBe(true);
	});
});
