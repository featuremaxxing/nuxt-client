import SelectBoardLayoutDialog from "./SelectBoardLayoutDialog.vue";
import { createTestEnvStore } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout } from "@api-server";
import { createTestingPinia } from "@pinia/testing";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";

describe("SelectBoardLayoutDialog", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	const setup = (
		currentLayout?: BoardLayout,
		options: { allowRoomLayouts?: boolean; flag?: boolean; learningPathFlag?: boolean } = {}
	) => {
		createTestEnvStore({
			FEATURE_BOARD_FILE_AREA_ENABLED: options.flag ?? false,
			FEATURE_BOARD_LEARNING_PATH_ENABLED: options.learningPathFlag ?? false,
		});

		const wrapper = mount(SelectBoardLayoutDialog, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				renderStubDefaultSlot: true,
			},
			props: {
				modelValue: true,
				currentLayout,
				allowRoomLayouts: options.allowRoomLayouts,
			},
		});

		return { wrapper };
	};

	describe("when selecting multi column board", () => {
		it("should emit correct event", async () => {
			const { wrapper } = setup();

			const multiColumnButton = wrapper.findComponent("[data-testid=dialog-add-multi-column-board]");
			await multiColumnButton.trigger("click");

			expect(wrapper.emitted("select")).toEqual([[BoardLayout.COLUMNS]]);
		});
	});

	describe("when selecting single column board", () => {
		it("should emit correct event", async () => {
			const { wrapper } = setup();

			const multiColumnButton = wrapper.findComponent("[data-testid=dialog-add-single-column-board]");
			await multiColumnButton.trigger("click");

			expect(wrapper.emitted("select")).toEqual([[BoardLayout.LIST]]);
		});
	});

	describe("when a board layout is changed", () => {
		it("should highlight the currently selected option", async () => {
			const { wrapper } = setup(BoardLayout.COLUMNS);

			const multiColumnButton = wrapper.findComponent("[data-testid=dialog-add-multi-column-board]");

			expect(multiColumnButton.classes()).toContain("selected");
		});
	});

	describe("file area option", () => {
		it("should be offered when creating a board and the feature is enabled", async () => {
			const { wrapper } = setup(undefined, { allowRoomLayouts: true, flag: true });

			await wrapper.findComponent("[data-testid=dialog-add-file-area-board]").trigger("click");

			expect(wrapper.emitted("select")).toEqual([[BoardLayout.FILES]]);
		});

		it("should be hidden when the feature is disabled", () => {
			const { wrapper } = setup(undefined, { allowRoomLayouts: true, flag: false });

			expect(wrapper.find("[data-testid=dialog-add-file-area-board]").exists()).toBe(false);
		});

		it("should be hidden when changing the layout of an existing board", () => {
			const { wrapper } = setup(BoardLayout.COLUMNS, { allowRoomLayouts: false, flag: true });

			expect(wrapper.find("[data-testid=dialog-add-file-area-board]").exists()).toBe(false);
		});
	});

	describe("learning path option", () => {
		it("should be offered when creating a board and the feature is enabled", async () => {
			const { wrapper } = setup(undefined, { allowRoomLayouts: true, learningPathFlag: true });

			await wrapper.findComponent("[data-testid=dialog-add-learning-path-board]").trigger("click");

			expect(wrapper.emitted("select")).toEqual([[BoardLayout.LEARNING_PATH]]);
		});

		it("should be hidden when the feature is disabled", () => {
			const { wrapper } = setup(undefined, { allowRoomLayouts: true, learningPathFlag: false });

			expect(wrapper.find("[data-testid=dialog-add-learning-path-board]").exists()).toBe(false);
		});

		it("should be hidden when changing the layout of an existing board", () => {
			const { wrapper } = setup(BoardLayout.COLUMNS, { allowRoomLayouts: false, learningPathFlag: true });

			expect(wrapper.find("[data-testid=dialog-add-learning-path-board]").exists()).toBe(false);
		});
	});
});
