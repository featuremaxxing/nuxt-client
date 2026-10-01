import RoomLearningPathCard from "./RoomLearningPathCard.vue";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { roomBoardGridItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import {
	LearningPathColor,
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
	const setup = (
		learningPath: RoomLearningPathResponse | undefined,
		board: Partial<RoomBoardItem> = {},
		canChoose = false
	) => {
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
				canChoose,
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

	describe("when the room has several learning paths", () => {
		it("should offer a student to go a learning path", async () => {
			const { wrapper } = setup({ steps: [], isEnrolled: false }, {}, true);

			await wrapper.get("[data-testid='learning-path-card-enroll-0']").trigger("click");

			expect(wrapper.emitted("enroll:path")).toHaveLength(1);
			expect(wrapper.find("[data-testid='learning-path-card-leave-0']").exists()).toBe(false);
		});

		it("should tell a student which learning path they go and let them leave it", async () => {
			const { wrapper } = setup({ steps: [], isEnrolled: true }, {}, true);

			expect(wrapper.find("[data-testid='learning-path-card-enrolled-0']").exists()).toBe(true);
			await wrapper.get("[data-testid='learning-path-card-leave-0']").trigger("click");

			expect(wrapper.emitted("leave:path")).toHaveLength(1);
		});

		it("should not offer a teacher to go a learning path", () => {
			const { wrapper } = setup({ steps: [], studentCount: 3, completedStudentCount: 1 }, {}, true);

			expect(wrapper.find("[data-testid='learning-path-card-enroll-0']").exists()).toBe(false);
		});
	});

	it("should not offer a choice when the room has a single learning path", () => {
		const { wrapper } = setup({ steps: [], isEnrolled: true }, {}, false);

		expect(wrapper.find("[data-testid='learning-path-card-enroll-0']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='learning-path-card-leave-0']").exists()).toBe(false);
	});

	it("should take the color of the learning path", () => {
		const { wrapper } = setup({ steps: [], color: LearningPathColor.Purple });

		expect(wrapper.get("[data-testid='board-grid-item-0']").attributes("style")).toContain("--lp-color: #6a1b9a");
	});

	it("should mark a board to rework in the chain, but not for a teacher", () => {
		const reopened = { ...step("a", Status.Open, 0), reopened: true };

		const student = setup({ steps: [reopened] }).wrapper;
		expect(
			student
				.get("[data-testid='learning-path-card-step-board-a']")
				.find("[data-testid='learning-path-rework']")
				.exists()
		).toBe(true);

		const teacher = setup({ steps: [reopened], studentCount: 2, completedStudentCount: 0 }).wrapper;
		expect(teacher.find("[data-testid='learning-path-rework']").exists()).toBe(false);
	});
});
