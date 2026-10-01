import ColumnBoardPage from "./ColumnBoard.page.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

vi.mock("vue-router");

const fetchBoardCall = vi.fn();
vi.mock("@data-board", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board")>()),
	useBoardApi: () => ({ fetchBoardCall }),
}));

describe("@pages/ColumnBoard.page.vue", () => {
	const setup = (fileAreaEnabled = false) => {
		createTestEnvStore({ FEATURE_BOARD_FILE_AREA_ENABLED: fileAreaEnabled });
		const boardId = "test-board-id";

		const wrapper = shallowMount(ColumnBoardPage, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				boardId,
			},
		});

		return {
			wrapper,
			boardId,
		};
	};

	beforeEach(() => {
		setActivePinia(createTestingPinia());
		vi.clearAllMocks();
	});

	it("should be rendered in DOM", () => {
		const { wrapper } = setup();

		expect(wrapper.vm).toBeDefined();
	});

	it("should have Board component", () => {
		const { wrapper } = setup();

		const boardComponent = wrapper.findComponent({ name: "Board" });

		expect(boardComponent.vm).toBeDefined();
	});

	describe("with learning paths enabled", () => {
		it("should show a learning path in its own view", async () => {
			createTestEnvStore({ FEATURE_BOARD_LEARNING_PATH_ENABLED: true });
			fetchBoardCall.mockResolvedValue({
				id: "test-board-id",
				title: "Lernweg",
				layout: BoardLayout.LEARNING_PATH,
				isVisible: true,
				columns: [],
			});

			const wrapper = shallowMount(ColumnBoardPage, {
				global: { plugins: [createTestingVuetify(), createTestingI18n()] },
				props: { boardId: "test-board-id" },
			});
			await flushPromises();

			expect(wrapper.findComponent({ name: "LearningPathBoard" }).exists()).toBe(true);
			expect(wrapper.findComponent({ name: "Board" }).exists()).toBe(false);
		});
	});

	describe("with file areas enabled", () => {
		const board = (id: string, layout: BoardLayout) => ({ id, title: id, layout, isVisible: true, columns: [] });

		it("should show a file area in its own view", async () => {
			fetchBoardCall.mockResolvedValue(board("test-board-id", BoardLayout.FILES));

			const { wrapper } = setup(true);
			await flushPromises();

			expect(wrapper.findComponent({ name: "FileAreaBoard" }).exists()).toBe(true);
			expect(wrapper.findComponent({ name: "Board" }).exists()).toBe(false);
		});

		// a link on a card leads from a regular board straight into a file area
		it("should switch to the file area view when the route changes to a file area", async () => {
			fetchBoardCall.mockImplementation((id: string) =>
				Promise.resolve(board(id, id === "file-area" ? BoardLayout.FILES : BoardLayout.COLUMNS))
			);

			const { wrapper } = setup(true);
			await flushPromises();
			expect(wrapper.findComponent({ name: "Board" }).exists()).toBe(true);

			await wrapper.setProps({ boardId: "file-area" });
			await flushPromises();

			expect(fetchBoardCall).toHaveBeenLastCalledWith("file-area");
			expect(wrapper.findComponent({ name: "FileAreaBoard" }).exists()).toBe(true);
			expect(wrapper.findComponent({ name: "Board" }).exists()).toBe(false);
		});
	});
});
