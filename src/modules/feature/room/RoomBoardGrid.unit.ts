import RoomBoardGrid from "./RoomBoardGrid.vue";
import RoomBoardGridItem from "./RoomBoardGridItem.vue";
import RoomFileAreaItem from "./RoomFileAreaItem.vue";
import RoomLearningPathCard from "./RoomLearningPathCard.vue";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { roomBoardGridItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import {
	RoomItemResponseAllowedOperations,
	RoomLearningPathStepResponseStatusEnum,
	RoomLearningPathStepResponseUnlockModeEnum,
} from "@api-server";
import { useRoomDetailsStore } from "@data-room";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("@feature-room/RoomBoardGrid", () => {
	beforeEach(() => {
		useRoomDetailsStore(createTestingPinia({ stubActions: true }));
		vi.clearAllMocks();
	});

	const setup = (
		options: Partial<{
			allowedOperations: Partial<RoomItemResponseAllowedOperations> | undefined;
			boards: RoomBoardItem[];
		}> = {}
	) => {
		const boards = options.boards ?? roomBoardGridItemFactory.buildList(3);

		const wrapper = mount(RoomBoardGrid, {
			global: {
				plugins: [
					createTestingVuetify(),
					createTestingI18n(),
					createTestingPinia({
						initialState: {
							roomDetailsStore: {
								room: {
									id: "test-room",
									name: "Test Room",
									allowedOperations: options?.allowedOperations,
								},
							},
						},
					}),
				],
				stubs: { RoomContentGridItem: true },
			},
			props: {
				roomId: "test-room",
				boards,
			},
		});

		return { wrapper, boards };
	};

	it("should render RoomBoardGridItem for each board", () => {
		const { wrapper, boards } = setup();
		expect(wrapper.findAllComponents(RoomBoardGridItem)).toHaveLength(boards.length);
	});

	it("should call moveBoard on drag and drop reorder", () => {
		const { wrapper, boards } = setup();

		const sortable = wrapper.findComponent({ name: "Sortable" });
		sortable.vm.$emit("end", { oldIndex: 0, newIndex: 2 });

		expect(useRoomDetailsStore().moveBoard).toHaveBeenCalledWith("test-room", boards[0].id, 2);
	});

	it("should not call reorderRoom when position unchanged", () => {
		const { wrapper } = setup();

		const sortable = wrapper.findComponent({ name: "Sortable" });
		sortable.vm.$emit("end", { oldIndex: 1, newIndex: 1 });

		expect(useRoomDetailsStore().moveBoard).not.toHaveBeenCalled();
	});

	describe("when using arrow key reorder features", () => {
		it("should handle keyboard navigation - ArrowRight", () => {
			const { wrapper, boards } = setup({ allowedOperations: { editContent: true } });

			const boardItem = wrapper.findAllComponents(RoomBoardGridItem).at(0);
			boardItem?.vm.$emit("keydown", { key: "ArrowRight" });

			expect(useRoomDetailsStore().moveBoard).toHaveBeenCalledWith("test-room", boards[0].id, 1);
		});

		it("should handle keyboard navigation - ArrowLeft", () => {
			const { wrapper, boards } = setup({ allowedOperations: { editContent: true } });

			const boardItem = wrapper.findAllComponents(RoomBoardGridItem).at(2);
			boardItem?.vm.$emit("keydown", { key: "ArrowLeft" });

			expect(useRoomDetailsStore().moveBoard).toHaveBeenCalledWith("test-room", boards[2].id, 1);
		});

		it("should handle keyboard navigation - ArrowDown", () => {
			const { wrapper, boards } = setup({ allowedOperations: { editContent: true } });

			const boardItem = wrapper.findAllComponents(RoomBoardGridItem)[0];
			boardItem.vm.$emit("keydown", { key: "ArrowDown" });

			expect(useRoomDetailsStore().moveBoard).toHaveBeenCalledWith("test-room", boards[0].id, 1);
		});

		it("should handle keyboard navigation - ArrowUp", () => {
			const { wrapper, boards } = setup({ allowedOperations: { editContent: true } });

			const boardItem = wrapper.findAllComponents(RoomBoardGridItem)[2];
			boardItem.vm.$emit("keydown", { key: "ArrowUp" });

			expect(useRoomDetailsStore().moveBoard).toHaveBeenCalledWith("test-room", boards[2].id, 1);
		});
	});

	it("should respect board boundaries in keyboard navigation", () => {
		const { wrapper } = setup();
		const boardItems = wrapper.findAllComponents(RoomBoardGridItem);
		// Attempt to go left at first index
		boardItems[0].vm.$emit("keydown", { key: "ArrowLeft" });
		// Attempt to go right at last index
		boardItems[2].vm.$emit("keydown", { key: "ArrowRight" }, 2);
		expect(useRoomDetailsStore().moveBoard).not.toHaveBeenCalled();
	});

	it("should disable sorting when user cannot edit room content", async () => {
		const { wrapper } = setup({ allowedOperations: { editContent: false } });
		const sortable = wrapper.findComponent({ name: "Sortable" });
		expect(sortable.props("options").disabled).toBe(true);
	});

	it("should render board items with default cursor and no editable outline marker for view-only users", () => {
		const { wrapper } = setup({ allowedOperations: { editContent: false } });

		const boardItem = wrapper.get("[data-testid='board-grid-item-0']");

		expect(boardItem.classes()).toContain("cursor-default");
		expect(boardItem.classes()).not.toContain("room-content-grid-item-editable");
	});

	it("should render board items with grab cursor and editable outline marker for editors", () => {
		const { wrapper } = setup({ allowedOperations: { editContent: true } });

		const boardItem = wrapper.get("[data-testid='board-grid-item-0']");

		expect(boardItem.classes()).toContain("cursor-grab");
		expect(boardItem.classes()).toContain("room-content-grid-item-editable");
		expect(boardItem.classes()).not.toContain("room-content-grid-item--view-only");
	});

	describe("sections", () => {
		const mixedBoards = () => {
			const [first, second] = roomBoardGridItemFactory.buildList(2);
			const files = roomBoardGridItemFactory.build({ layout: BoardLayout.FILES });
			const path = roomBoardGridItemFactory.build({
				title: "Optik",
				layout: BoardLayout.LEARNING_PATH,
				learningPath: {
					isEnrolled: true,
					steps: [
						{
							id: "step-1",
							boardId: second.id,
							title: second.title,
							isVisible: true,
							status: RoomLearningPathStepResponseStatusEnum.Open,
							prerequisiteStepIds: [],
							unlockMode: RoomLearningPathStepResponseUnlockModeEnum.All,
							positionX: 0,
							positionY: 0,
						},
					],
				},
			});
			// room order: board, file area, learning path, board
			return [first, files, path, second];
		};

		it("should show a room with only boards without headings", () => {
			const { wrapper } = setup();

			expect(wrapper.find("[data-testid='room-section-boards'] h2").exists()).toBe(false);
		});

		it("should group boards, learning paths and files under headings, in this order", () => {
			const { wrapper } = setup({ boards: mixedBoards() });

			const sections = wrapper.findAll("section");
			expect(sections.map((section) => section.attributes("data-testid"))).toEqual([
				"room-section-boards",
				"room-section-paths",
				"room-section-files",
			]);
			expect(sections[1].get("h2").text()).toBe("pages.room.section.learningPaths");
			expect(wrapper.findAllComponents(RoomLearningPathCard)).toHaveLength(1);
			expect(wrapper.findAllComponents(RoomBoardGridItem)).toHaveLength(2);
			expect(wrapper.findAllComponents(RoomFileAreaItem)).toHaveLength(1);
		});

		it("should tell a board its place in the learning path", () => {
			const boards = mixedBoards();
			const { wrapper } = setup({ boards });

			const items = wrapper.findAllComponents(RoomBoardGridItem);
			expect(items[0].props("learningPathSteps")).toEqual([]);
			expect(items[1].props("learningPathSteps")).toEqual([{ title: "Optik", position: 1, color: undefined }]);
			// the index stays the position in the whole room
			expect(items[1].props("index")).toBe(3);
		});

		it("should move a board within its section to the room position of the target", () => {
			const boards = mixedBoards();
			const { wrapper } = setup({ boards, allowedOperations: { editContent: true } });

			const sortable = wrapper.get("[data-testid='room-section-boards']").findComponent({ name: "Sortable" });
			sortable.vm.$emit("end", { oldIndex: 0, newIndex: 1 });

			expect(useRoomDetailsStore().moveBoard).toHaveBeenCalledWith("test-room", boards[0].id, 3);
		});

		it("should only offer to choose when the room has several published learning paths", () => {
			const makePath = (title: string) =>
				roomBoardGridItemFactory.build({ title, layout: BoardLayout.LEARNING_PATH, isVisible: true });

			const single = setup({ boards: [makePath("Eins")] }).wrapper;
			expect(single.getComponent(RoomLearningPathCard).props("canChoose")).toBe(false);

			const several = setup({ boards: [makePath("Eins"), makePath("Zwei")] }).wrapper;
			expect(several.findAllComponents(RoomLearningPathCard)[0].props("canChoose")).toBe(true);
		});

		it("should pass on the choice of a student", () => {
			const board = roomBoardGridItemFactory.build({ layout: BoardLayout.LEARNING_PATH, isVisible: true });
			const { wrapper } = setup({ boards: [board] });

			wrapper.getComponent(RoomLearningPathCard).vm.$emit("enroll:path", board);
			wrapper.getComponent(RoomLearningPathCard).vm.$emit("leave:path", board);

			expect(wrapper.emitted("enroll:path")).toEqual([[board]]);
			expect(wrapper.emitted("leave:path")).toEqual([[board]]);
		});
	});
});
