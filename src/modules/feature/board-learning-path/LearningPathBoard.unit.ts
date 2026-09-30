import LearningPathBoard from "./LearningPathBoard.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { BoardLayout, type BoardResponse } from "@api-server";
import { type LearningPath, type LearningPathStep } from "@data-board-learning-path";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { ref } from "vue";

const fetchLearningPath = vi.fn();
vi.mock("@/utils/api", () => ({
	$axios: { get: () => fetchLearningPath().then((data: unknown) => ({ data })) },
	mapAxiosErrorToResponseError: vi.fn(),
}));
vi.mock("@data-board-learning-path", async (importOriginal) => ({
	...(await importOriginal<typeof import("@data-board-learning-path")>()),
	useLearningPathSocket: vi.fn(),
}));

vi.mock("@data-board", () => ({
	useBoardApi: () => ({ updateBoardTitleCall: vi.fn(), updateBoardVisibilityCall: vi.fn(), deleteBoardCall: vi.fn() }),
	useSharedBoardPageInformation: () => ({ createPageInformation: vi.fn(), breadcrumbs: ref([]) }),
}));

vi.mock("vue-router", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const step = (id: string, overrides: Partial<LearningPathStep> = {}): LearningPathStep => ({
	id,
	linkedBoardId: `board-${id}`,
	title: `Bereich ${id}`,
	isVisible: true,
	positionX: 0,
	positionY: 0,
	prerequisiteStepIds: [],
	unlockMode: "all",
	lockUntilPrerequisitesDone: false,
	status: "open",
	...overrides,
});

const board: BoardResponse = {
	id: "path",
	title: "Lernweg Optik",
	layout: BoardLayout.LEARNING_PATH,
	isVisible: true,
	readersCanEdit: false,
	columns: [],
	timestamps: { lastUpdatedAt: "", createdAt: "" },
	allowedOperations: {},
} as unknown as BoardResponse;

describe("LearningPathBoard", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	const setup = async (path: Partial<LearningPath>) => {
		fetchLearningPath.mockResolvedValue({ boardId: "path", isEditor: false, steps: [], availableBoards: [], ...path });
		const wrapper = shallowMount(LearningPathBoard, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: {
					DefaultWireframe: { template: "<div><slot name='header' /><slot /></div>" },
					LearningPathCanvas: {
						name: "LearningPathCanvas",
						props: ["steps", "isEditor", "selectedStepId", "hints"],
						template: "<div />",
						methods: { fitView: vi.fn(), freePosition: () => ({ x: 0, y: 0 }) },
					},
				},
			},
			props: { boardId: "path", board },
		});
		await flushPromises();
		return wrapper;
	};

	it("should show the board list and the canvas to editors", async () => {
		const wrapper = await setup({ isEditor: true, steps: [step("a")] });

		expect(wrapper.findComponent({ name: "LearningPathBoardPicker" }).exists()).toBe(true);
		expect(wrapper.findComponent({ name: "LearningPathCanvas" }).props("isEditor")).toBe(true);
	});

	it("should tell students what to complete before a locked step opens", async () => {
		const wrapper = await setup({
			steps: [
				step("a", { status: "done" }),
				step("b"),
				step("c", { status: "locked", prerequisiteStepIds: ["a", "b"], lockUntilPrerequisitesDone: true }),
			],
		});

		expect(wrapper.findComponent({ name: "LearningPathBoardPicker" }).exists()).toBe(false);
		const hints = wrapper.findComponent({ name: "LearningPathCanvas" }).props("hints") as Record<string, string>;
		expect(hints).toEqual({ c: "pages.learningPath.lockedHint.all" });
		expect(wrapper.findComponent({ name: "LearningPathList" }).exists()).toBe(true);
	});

	it("should show an empty state", async () => {
		const wrapper = await setup({ isEditor: true });

		expect(wrapper.find("[data-testid=learning-path-empty]").text()).toBe("pages.learningPath.empty.editor");
	});

	it("should show the settings of the selected step to editors", async () => {
		const wrapper = await setup({ isEditor: true, steps: [step("a")] });

		await wrapper.findComponent({ name: "LearningPathCanvas" }).vm.$emit("select", "a");

		expect(wrapper.findComponent({ name: "LearningPathStepPanel" }).props("step")).toMatchObject({ id: "a" });
	});
});
