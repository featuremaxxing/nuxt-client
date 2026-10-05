import RoomBoardGridItem from "./RoomBoardGridItem.vue";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LearningPathColor, RoomBoardLockResponseReasonEnum } from "@api-server";
import { mount } from "@vue/test-utils";
import { ComponentProps } from "vue-component-type-helpers";

const mockBoard: RoomBoardItem = {
	id: "59cce2c61113d1132c98dc06",
	title: "A11Y for Beginners",
	layout: BoardLayout.COLUMNS,
	isVisible: false,
	createdAt: "2017-09-28T11:49:39.924Z",
	updatedAt: "2017-09-28T11:49:39.924Z",
	allowedOperations: {},
};

describe("@feature-room/RoomBoardGridItem", () => {
	const setup = (props: ComponentProps<typeof RoomBoardGridItem> = { board: mockBoard, index: 0, roomId: "Mathe" }) => {
		const wrapper = mount(RoomBoardGridItem, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { RouterLink: true },
			},
			props,
		});

		return { wrapper };
	};

	describe("title", () => {
		it("should display the board title", () => {
			const { wrapper } = setup();

			const title = wrapper.get("[data-testid='board-grid-title-0']");
			expect(title.text()).toContain("A11Y for Beginners");
		});
	});

	describe("when board is column board in draft state", () => {
		it("should compute correct subtitle", () => {
			const { wrapper } = setup();

			const subtitle = wrapper.get("[data-testid='board-grid-item-subtitle-0']");
			expect(subtitle.text()).toStrictEqual("pages.room.boardCard.label.columnBoard - common.words.draft");
		});
	});

	describe("when board is visible (not draft)", () => {
		it("should not show draft suffix in subtitle", () => {
			const board = { ...mockBoard, isVisible: true };
			const { wrapper } = setup({ board, index: 0, roomId: "Mathe" });

			const subtitle = wrapper.get("[data-testid='board-grid-item-subtitle-0']");
			expect(subtitle.text()).toStrictEqual("pages.room.boardCard.label.columnBoard");
		});
	});

	describe("kebab menu", () => {
		it("should not render menu when no operations are allowed", () => {
			const board = { ...mockBoard, allowedOperations: {} };
			const { wrapper } = setup({ board, index: 0, roomId: "Mathe" });

			expect(wrapper.find("[data-testid='board-dot-menu-0']").exists()).toBe(false);
		});

		it("should render menu when operations are allowed", () => {
			const board = {
				...mockBoard,
				allowedOperations: { deleteBoard: true, copyBoard: true, updateBoardVisibility: true },
			};
			const { wrapper } = setup({ board, index: 0, roomId: "Mathe" });

			expect(wrapper.find("[data-testid='board-dot-menu-0']").exists()).toBe(true);
		});
	});

	describe("when a learning path locks the board", () => {
		const lockedBoard: RoomBoardItem = {
			...mockBoard,
			isVisible: true,
			lockedByLearningPath: { id: "path-id", title: "Optik", reason: RoomBoardLockResponseReasonEnum.Prerequisites },
		};

		it("should show the lock and name the learning path", () => {
			const { wrapper } = setup({ board: lockedBoard, index: 0, roomId: "Mathe" });

			expect(wrapper.get("[data-testid='board-grid-item-subtitle-0']").text()).toBe(
				"pages.room.boardCard.label.columnBoard - pages.room.boardCard.label.locked"
			);
			expect(wrapper.get("[data-testid='board-grid-item-locked-0']").text()).toContain("pages.room.boardCard.locked");
		});

		it("should lead to the learning path instead of the board", () => {
			const { wrapper } = setup({ board: lockedBoard, index: 0, roomId: "Mathe" });

			expect(wrapper.get("[data-testid='board-grid-item-link-0']").attributes("to")).toBe("/boards/path-id");
			expect(wrapper.get("[data-testid='board-grid-item-0']").attributes("aria-label")).toContain(
				"pages.room.boardCard.label.openLearningPath"
			);
		});

		it("should name what is still missing when the hint is known", () => {
			const { wrapper } = setup({ board: lockedBoard, index: 0, roomId: "Mathe", lockedHint: "Schaffe zuerst: A" });

			expect(wrapper.get("[data-testid='board-grid-item-locked-0']").text()).toBe("Schaffe zuerst: A");
		});
	});

	describe("the whole card", () => {
		it("should lead to the board", () => {
			const { wrapper } = setup();

			expect(wrapper.get("[data-testid='board-grid-item-link-0']").attributes("to")).toBe(`/boards/${mockBoard.id}`);
			expect(wrapper.find("[data-testid='board-open-button-0']").exists()).toBe(false);
		});

		it("should show the progress in percent", () => {
			const { wrapper } = setup({ board: mockBoard, index: 0, roomId: "Mathe", progress: { done: 1, total: 3 } });

			expect(wrapper.get("[data-testid='progress-bar-label']").text()).toBe("pages.room.boardCard.progress");
		});

		it("should show its place in a learning path", () => {
			const { wrapper } = setup({
				board: mockBoard,
				index: 0,
				roomId: "Mathe",
				learningPathSteps: [{ title: "Optik", position: 2, color: LearningPathColor.Blue }],
			});

			expect(wrapper.get("[data-testid='board-grid-item-path-step-0']").text()).toBe("pages.room.boardCard.pathStep");
		});
	});

	describe("when the student has to rework the board", () => {
		it("should say so, and still lead to the board", () => {
			const { wrapper } = setup({
				board: { ...mockBoard, isVisible: true },
				index: 0,
				roomId: "Mathe",
				isRework: true,
			});

			expect(wrapper.get("[data-testid='board-grid-item-rework-0']").text()).toContain("pages.learningPath.reworkHint");
			expect(wrapper.get("[data-testid='board-grid-item-link-0']").attributes("to")).toBe(`/boards/${mockBoard.id}`);
		});

		it("should say nothing otherwise", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid='board-grid-item-rework-0']").exists()).toBe(false);
		});
	});

	describe("when the board is a learning path", () => {
		it("should compute the learning path subtitle", () => {
			const { wrapper } = setup({
				board: { ...mockBoard, isVisible: true, layout: BoardLayout.LEARNING_PATH },
				index: 0,
				roomId: "Mathe",
			});

			expect(wrapper.get("[data-testid='board-grid-item-subtitle-0']").text()).toBe(
				"pages.room.boardCard.label.learningPath"
			);
		});
	});
});
